import { Injectable, BadRequestException } from "@nestjs/common";
import { PoolClient } from "pg";
import { LedgerRepository } from "./ledger.repository";
import { LedgerEntryInput, LedgerEntry } from "../../models/Ledger";

@Injectable()
export class LedgerService {
  constructor(private readonly ledgerRepository: LedgerRepository) {}

  /**
   * Creates double-entry ledger entries for a transaction
   * Every transaction creates exactly 2 balanced entries (sum = 0)
   */
  async createLedgerEntries(
    ledgerEntries: LedgerEntryInput[],
    client: PoolClient,
  ): Promise<LedgerEntry[]> {
    // Validate that client is provided (transaction context required)
    if (!client) {
      throw new BadRequestException(
        "Transaction context required for creating ledger entries",
      );
    }

    // Validate that entries are balanced (sum = 0)
    const totalAmount = ledgerEntries.reduce((sum, entry) => {
      return entry.type === "CREDIT"
        ? sum + entry.amount
        : sum - Math.abs(entry.amount);
    }, 0);

    if (Math.abs(totalAmount) > 0.001) {
      // Allow for minimal floating point precision issues
      throw new BadRequestException(
        "Ledger entries must be balanced (sum to zero)",
      );
    }

    // Create the entries in the database
    const createdEntries: LedgerEntry[] = [];
    for (const entry of ledgerEntries) {
      const created = await this.ledgerRepository.createLedgerEntry(
        entry,
        client,
      );
      createdEntries.push(created);
    }

    return createdEntries;
  }

  /**
   * Creates cross-currency ledger entries for exchange transactions
   * Handles different currencies while maintaining double-entry principles
   */
  async createCrossLedgerEntries(
    ledgerEntries: LedgerEntryInput[],
    client: PoolClient,
  ): Promise<LedgerEntry[]> {
    // For cross-currency, we don't validate sum=0 since currencies differ
    // But we validate that we have exactly 2 entries (debit + credit)
    if (ledgerEntries.length !== 2) {
      throw new BadRequestException(
        "Cross-currency exchange must have exactly 2 ledger entries",
      );
    }

    const debitEntry = ledgerEntries.find((e) => e.type === "DEBIT");
    const creditEntry = ledgerEntries.find((e) => e.type === "CREDIT");

    if (!debitEntry || !creditEntry) {
      throw new BadRequestException(
        "Cross-currency exchange must have one DEBIT and one CREDIT entry",
      );
    }

    // Create the entries in the database
    const createdEntries: LedgerEntry[] = [];
    for (const entry of ledgerEntries) {
      const created = await this.ledgerRepository.createLedgerEntry(
        entry,
        client,
      );
      createdEntries.push(created);
    }

    return createdEntries;
  }

  /**
   * Retrieves all ledger entries for a specific transaction
   */
  async getLedgerEntriesByTransaction(
    transactionId: string,
    client?: PoolClient,
  ): Promise<LedgerEntry[]> {
    return this.ledgerRepository.getLedgerEntriesByTransaction(
      transactionId,
      client,
    );
  }

  /**
   * Verifies if a specific transaction's ledger entries are balanced
   * Expected by tests: should return {isBalanced: boolean, totalAmount: number}
   */
  async verifyTransactionBalance(transactionId: string): Promise<{
    isBalanced: boolean;
    totalAmount: number;
  }> {
    const entries = await this.getLedgerEntriesByTransaction(transactionId);
    const totalAmount = entries.reduce((sum, entry) => sum + entry.amount, 0);

    return {
      isBalanced: Math.abs(totalAmount) < 0.001,
      totalAmount: Math.round(totalAmount * 100) / 100, // Round to 2 decimal places
    };
  }

  /**
   * Calculates account balance by delegating to repository
   * Expected by tests
   */
  async calculateAccountBalance(
    accountId: string,
    client?: PoolClient,
  ): Promise<number> {
    return this.ledgerRepository.calculateAccountBalance(accountId, client);
  }

  /**
   * Verifies all account balances consistency
   * Expected by tests: should return {consistentAccounts: number, inconsistentAccounts: array}
   */
  async verifyAllAccountBalances(): Promise<{
    consistentAccounts: number;
    inconsistentAccounts: Array<{
      accountId: string;
      accountBalance: number;
      ledgerBalance: number;
      difference: number;
    }>;
  }> {
    const balanceChecks = await this.ledgerRepository.getAllAccountBalances();
    let consistentAccounts = 0;
    const inconsistentAccounts: Array<{
      accountId: string;
      accountBalance: number;
      ledgerBalance: number;
      difference: number;
    }> = [];

    for (const check of balanceChecks) {
      const difference = Math.abs(check.account_balance - check.ledger_balance);
      if (difference < 0.001) {
        consistentAccounts++;
      } else {
        inconsistentAccounts.push({
          accountId: check.id,
          accountBalance: check.account_balance,
          ledgerBalance: check.ledger_balance,
          difference: Math.round(difference * 100) / 100,
        });
      }
    }

    return {
      consistentAccounts,
      inconsistentAccounts,
    };
  }

  /**
   * Verifies the integrity of the entire ledger system
   * Ensures all transactions are properly balanced and account balances are consistent
   */
  async verifyLedgerIntegrity(): Promise<{
    isValid: boolean;
    errors: string[];
    summary: {
      totalTransactions: number;
      unbalancedTransactions: number;
      accountsChecked: number;
      balanceDiscrepancies: number;
    };
  }> {
    const errors: string[] = [];
    let totalTransactions = 0;
    let unbalancedTransactions = 0;
    let accountsChecked = 0;
    let balanceDiscrepancies = 0;

    try {
      // 1. Check that all transactions have balanced ledger entries
      const transactionBalances =
        await this.ledgerRepository.getTransactionBalances();

      for (const txBalance of transactionBalances) {
        totalTransactions++;
        if (Math.abs(txBalance.total_amount) > 0.001) {
          unbalancedTransactions++;
          errors.push(
            `Transaction ${txBalance.transaction_id} is unbalanced: ${txBalance.total_amount}`,
          );
        }
      }

      // 2. Verify account balance consistency
      const accountBalanceChecks =
        await this.ledgerRepository.verifyAccountBalances();

      for (const check of accountBalanceChecks) {
        accountsChecked++;
        const difference = Math.abs(
          check.stored_balance - check.calculated_balance,
        );
        if (difference > 0.001) {
          balanceDiscrepancies++;
          errors.push(
            `Account ${check.account_id} balance mismatch: stored=${check.stored_balance}, calculated=${check.calculated_balance}`,
          );
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        summary: {
          totalTransactions,
          unbalancedTransactions,
          accountsChecked,
          balanceDiscrepancies,
        },
      };
    } catch (error) {
      errors.push(`Ledger integrity check failed: ${error.message}`);
      return {
        isValid: false,
        errors,
        summary: {
          totalTransactions,
          unbalancedTransactions,
          accountsChecked,
          balanceDiscrepancies,
        },
      };
    }
  }
}
