import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import { AuthModule } from "./modules/auth/auth.module";
import { AccountsModule } from "./modules/accounts/accounts.module";
import { TransactionsModule } from "./modules/transactions/transactions.module";
import { LedgerModule } from "./modules/ledger/ledger.module";
import { AuditLogService } from "./shared/audit.service";
import { BalanceGateway } from "./shared/gateways/balance.gateway";
import { HealthService } from "./shared/health.service";
import { JwtModule } from "@nestjs/jwt";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { INestApplication } from "@nestjs/common";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // Global rate limiting to prevent abuse
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // Time window in milliseconds (1 minute)
        limit: 100, // Max requests per time window
      },
    ]),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: "24h" },
    }),
    AuthModule,
    AccountsModule,
    TransactionsModule,
    LedgerModule,
  ],
  providers: [
    HealthService,
    AuditLogService,
    BalanceGateway,
    // Apply rate limiting globally
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
  exports: [AuditLogService, BalanceGateway],
})
export class AppModule {
  static setupSwagger(app: INestApplication) {
    const config = new DocumentBuilder()
      .setTitle("Banking API")
      .setDescription("Mini banking platform API documentation")
      .setVersion("1.0")
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup("/api/docs", app, document);
  }
}
