import { Module } from "@nestjs/common";
import { TransactionsService } from "./transactions.service";
import { TransactionsController } from "./transactions.controller";
import { AccountsModule } from "../accounts/accounts.module";
import { LedgerModule } from "../ledger/ledger.module";
import { AuditLogService } from "../../shared/audit.service";
import { BalanceGateway } from "../../shared/gateways/balance.gateway";
import { JwtModule } from "@nestjs/jwt";
import { TransactionsRepository } from "./transactions.repository";

@Module({
  imports: [
    AccountsModule,
    LedgerModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || "your-secret-key",
      signOptions: { expiresIn: "24h" },
    }),
  ],
  controllers: [TransactionsController],
  providers: [
    TransactionsService,
    AuditLogService,
    BalanceGateway,
    TransactionsRepository,
  ],
  exports: [TransactionsService],
})
export class TransactionsModule {}
