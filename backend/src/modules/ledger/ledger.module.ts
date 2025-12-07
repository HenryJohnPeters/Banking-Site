import { Module } from "@nestjs/common";
import { LedgerService } from "./ledger.service";
import { LedgerController } from "./ledger.controller";
import { LedgerRepository } from "./ledger.repository";

@Module({
  controllers: [LedgerController],
  providers: [LedgerService, LedgerRepository],
  exports: [LedgerService, LedgerRepository],
})
export class LedgerModule {}
