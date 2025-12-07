import { Module } from "@nestjs/common";
import { LedgerService } from "./ledger.service";
import { LedgerRepository } from "./ledger.repository";
import { DatabaseService } from "../../shared/database/client";

@Module({
  providers: [LedgerService, LedgerRepository, DatabaseService],
  exports: [LedgerService, LedgerRepository],
})
export class LedgerModule {}
