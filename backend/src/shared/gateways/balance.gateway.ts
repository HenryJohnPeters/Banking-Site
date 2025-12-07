import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

export interface BalanceUpdate {
  accountId: string;
  newBalance: number;
  currency: string;
  userId: string;
  timestamp: Date;
}

@Injectable()
@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_ORIGIN || "http://localhost:5174",
    credentials: true,
  },
  namespace: "/balance",
})
export class BalanceGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private userSockets = new Map<string, Set<string>>(); // userId -> Set of socketIds

  constructor(private jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace("Bearer ", "");

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = await this.jwtService.verifyAsync(token);
      const userId = payload.sub;

      // Store user-socket mapping
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(client.id);

      // Join user-specific room
      client.join(`user:${userId}`);

      console.log(`Client ${client.id} connected for user ${userId}`);
    } catch (error) {
      console.error("WebSocket authentication failed:", error);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    // Remove socket from user mapping
    for (const [userId, sockets] of this.userSockets.entries()) {
      if (sockets.has(client.id)) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.userSockets.delete(userId);
        }
        console.log(`Client ${client.id} disconnected for user ${userId}`);
        break;
      }
    }
  }

  @SubscribeMessage("subscribe:balance")
  handleSubscribeToBalance(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { accountId: string },
  ) {
    client.join(`account:${data.accountId}`);
    return { event: "subscribed", accountId: data.accountId };
  }

  @SubscribeMessage("unsubscribe:balance")
  handleUnsubscribeFromBalance(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { accountId: string },
  ) {
    client.leave(`account:${data.accountId}`);
    return { event: "unsubscribed", accountId: data.accountId };
  }

  // Method to emit balance updates (called from services)
  emitBalanceUpdate(update: BalanceUpdate) {
    // Skip if server is not initialized (e.g., in test environment)
    if (!this.server) {
      return;
    }

    // Emit to user-specific room
    this.server.to(`user:${update.userId}`).emit("balance:updated", {
      accountId: update.accountId,
      newBalance: update.newBalance,
      currency: update.currency,
      timestamp: update.timestamp,
    });

    // Also emit to account-specific room for any subscribers
    this.server.to(`account:${update.accountId}`).emit("balance:updated", {
      accountId: update.accountId,
      newBalance: update.newBalance,
      currency: update.currency,
      timestamp: update.timestamp,
    });

    console.log(
      `Balance update emitted for account ${update.accountId}: ${update.newBalance} ${update.currency}`,
    );
  }

  // Method to emit transaction notifications
  emitTransactionNotification(
    userId: string,
    transaction: { id: string; amount: number; type: string },
  ) {
    // Skip if server is not initialized (e.g., in test environment)
    if (!this.server) {
      return;
    }

    this.server.to(`user:${userId}`).emit("transaction:new", {
      transaction,
      timestamp: new Date(),
    });
  }

  // Get connected users count (for monitoring)
  getConnectedUsersCount(): number {
    return this.userSockets.size;
  }

  // Get total socket connections
  getTotalConnectionsCount(): number {
    let total = 0;
    for (const sockets of this.userSockets.values()) {
      total += sockets.size;
    }
    return total;
  }
}
