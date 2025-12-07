import { Injectable, BadRequestException } from "@nestjs/common";
import { LedgerEntry, LedgerEntryInput } from "../../models/Ledger";
import { PoolClient } from "pg";
import { LedgerRepository } from "./ledger.repository";

@Injectable()
export class LedgerService {
  constructor(private readonly ledgerRepository: LedgerRepository) {}

  // Create ledger entries for a transaction (ensures double-entry bookkeeping)
  async createLedgerEntries(
    entries: LedgerEntryInput[],
    client?: PoolClient
  ): Promise<void> {
    if (entries.length === 0) {
      throw new BadRequestException("At least one ledger entry is required");
    }

    // Validate that entries balance (sum must equal zero for double-entry)
    const totalAmount = entries.reduce((sum, entry) => sum + entry.amount, 0);
    if (Math.abs(totalAmount) > 0.01) {
      // Allow for minor rounding errors
      throw new BadRequestException(
        `Ledger entries must balance. Current sum: ${totalAmount}`
      );
    }

    if (!client) {
      // If no client is provided, we expect the caller to manage transaction scope elsewhere.
      throw new BadRequestException(
        "Ledger entries must be created within an existing database transaction context"
      );
    }

    for (const entry of entries) {
      await this.ledgerRepository.insertEntry(client, {
        transactionId: entry.transaction_id,
        accountId: entry.account_id,
        amount: entry.amount,
        description: entry.description,
      });
    }
  }

  // Get ledger entries for a specific transaction
  async getLedgerEntriesByTransaction(
    transactionId: string
  ): Promise<LedgerEntry[]> {
    return this.ledgerRepository.getEntriesByTransaction(transactionId);
  }

  // Get ledger entries for a specific account (with pagination)
  async getLedgerEntriesByAccount(
    accountId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<{ entries: LedgerEntry[]; total: number }> {
    return this.ledgerRepository.getEntriesByAccount(accountId, page, limit);
  }

  // Calculate account balance from ledger entries
  async calculateAccountBalance(accountId: string): Promise<number> {
    return this.ledgerRepository.calculateAccountBalance(accountId);
  }

  // Verify ledger integrity for a transaction (entries must sum to zero)
  async verifyTransactionBalance(transactionId: string): Promise<{
    isBalanced: boolean;
    totalAmount: number;
    entries: LedgerEntry[];
  }> {
    const entries = await this.getLedgerEntriesByTransaction(transactionId);
    const totalAmount = entries.reduce((sum, entry) => sum + entry.amount, 0);

    return {
      isBalanced: Math.abs(totalAmount) < 0.01, // Allow for minor rounding
      totalAmount,
      entries,
    };
  }

  // Verify that all account balances match their ledger calculations
  async verifyAllAccountBalances(): Promise<{
    consistentAccounts: number;
    inconsistentAccounts: Array<{
      accountId: string;
      ledgerBalance: number;
      accountBalance: number;
      difference: number;
    }>;
  }> {
    const balances = await this.ledgerRepository.getAllAccountBalances();

    const inconsistentAccounts: Array<{
      accountId: string;
      ledgerBalance: number;
      accountBalance: number;
      difference: number;
    }> = [];
    let consistentAccounts = 0;

    for (const row of balances) {
      const accountBalance = row.account_balance;
      const ledgerBalance = row.ledger_balance;
      const difference = Math.abs(accountBalance - ledgerBalance);

      if (difference > 0.01) {
        inconsistentAccounts.push({
          accountId: row.id,
          ledgerBalance,
          accountBalance,
          difference,
        });
      } else {
        consistentAccounts++;
      }
    }

    return {
      consistentAccounts,
      inconsistentAccounts,
    };
  }

  // Comprehensive ledger integrity verification
  async verifyLedgerIntegrity(): Promise<{
    isValid: boolean;
    errors: string[];
    summary: {
      totalTransactions: number;
      balancedTransactions: number;
      unbalancedTransactions: number;
      totalAccounts: number;
      consistentAccounts: number;
      inconsistentAccounts: number;
    };
  }> {
    const errors: string[] = [];

    const unbalancedTransactions =
      await this.ledgerRepository.findUnbalancedTransactions();
    const totalTransactions =
      await this.ledgerRepository.countDistinctTransactions();

    const unbalancedCount = unbalancedTransactions.length;
    const balancedCount = totalTransactions - unbalancedCount;

    if (unbalancedCount > 0) {
      errors.push(`Found ${unbalancedCount} unbalanced transactions`);
    }

    const accountVerification = await this.verifyAllAccountBalances();

    if (accountVerification.inconsistentAccounts.length > 0) {
      errors.push(
        `Found ${accountVerification.inconsistentAccounts.length} accounts with inconsistent balances`
      );
    }

    const totalAccounts =
      accountVerification.consistentAccounts +
      accountVerification.inconsistentAccounts.length;

    return {
      isValid: errors.length === 0,
      errors,
      summary: {
        totalTransactions,
        balancedTransactions: balancedCount,
        unbalancedTransactions: unbalancedCount,
        totalAccounts,
        consistentAccounts: accountVerification.consistentAccounts,
        inconsistentAccounts: accountVerification.inconsistentAccounts.length,
      },
    };
  }
}
