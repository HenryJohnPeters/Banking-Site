import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { LedgerService } from "./ledger.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { LedgerEntry } from "../../models/Ledger";

@ApiTags("Ledger")
@ApiBearerAuth()
@Controller("ledger")
@UseGuards(JwtAuthGuard)
export class LedgerController {
  constructor(private readonly ledgerService: LedgerService) {}

  @Get("transaction/:id")
  @ApiOperation({
    summary: "Get ledger entries for a transaction",
    description:
      "Retrieve all ledger entries associated with a specific transaction ID for audit purposes",
  })
  @ApiResponse({
    status: 200,
    description: "Ledger entries retrieved successfully",
    schema: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          transaction_id: { type: "string", format: "uuid" },
          account_id: { type: "string", format: "uuid" },
          amount: { type: "number" },
          description: { type: "string" },
          created_at: { type: "string", format: "date-time" },
        },
      },
    },
  })
  async getTransactionLedgerEntries(
    @Param("id") transactionId: string
  ): Promise<LedgerEntry[]> {
    return this.ledgerService.getLedgerEntriesByTransaction(transactionId);
  }
}
