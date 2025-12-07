import { Injectable, UnauthorizedException, Logger } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { db } from "../../shared/database/client";
import { User, CreateUserDto, LoginDto } from "../../models/User";
import { Currency } from "../../models/Account";
import { v4 as uuidv4 } from "uuid";
import { LedgerService } from "../ledger/ledger.service";
import { LedgerEntryInput } from "../../models/Ledger";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private jwtService: JwtService,
    private readonly ledgerService: LedgerService
  ) {}

  async register(
    createUserDto: CreateUserDto
  ): Promise<{ user: Omit<User, "password_hash">; token: string }> {
    const { email, password, first_name, last_name } = createUserDto;

    // Check if user already exists
    const existingUser = await db.query(
      "SELECT id FROM users WHERE email = $1",
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      throw new UnauthorizedException("User already exists with this email");
    }

    // Hash password
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);
    const userId = uuidv4();

    const client = await db.getPool().connect();

    try {
      await client.query("BEGIN");

      // Create user
      const userResult = await client.query(
        "INSERT INTO users (id, email, password_hash, first_name, last_name) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, first_name, last_name, created_at, updated_at",
        [userId, email.toLowerCase(), password_hash, first_name, last_name]
      );

      const user = userResult.rows[0];

      // Create USD and EUR accounts with zero initial balance
      const usdAccountId = uuidv4();
      const eurAccountId = uuidv4();

      await client.query(
        "INSERT INTO accounts (id, user_id, currency, balance) VALUES ($1, $2, $3, 0.00), ($4, $2, $5, 0.00)",
        [usdAccountId, userId, Currency.USD, eurAccountId, Currency.EUR]
      );

      // Create initial deposit transactions
      const usdDepositId = uuidv4();
      const eurDepositId = uuidv4();
      const initialUsdBalance = 1000.0;
      const initialEurBalance = 500.0;

      // USD initial deposit transaction
      await client.query(
        `INSERT INTO transactions (id, to_account_id, amount, currency, type, status, description)
         VALUES ($1, $2, $3, $4, 'DEPOSIT', 'COMPLETED', 'Initial account balance')`,
        [usdDepositId, usdAccountId, initialUsdBalance, Currency.USD]
      );

      // EUR initial deposit transaction
      await client.query(
        `INSERT INTO transactions (id, to_account_id, amount, currency, type, status, description)
         VALUES ($1, $2, $3, $4, 'DEPOSIT', 'COMPLETED', 'Initial account balance')`,
        [eurDepositId, eurAccountId, initialEurBalance, Currency.EUR]
      );

      // Create ledger entries using the shared ledger_entries table and service
      const initialEntries: LedgerEntryInput[] = [
        {
          transaction_id: usdDepositId,
          account_id: usdAccountId,
          amount: initialUsdBalance,
          description: `Initial deposit of $${initialUsdBalance}`,
        },
        {
          transaction_id: eurDepositId,
          account_id: eurAccountId,
          amount: initialEurBalance,
          description: `Initial deposit of ${initialEurBalance}`,
        },
      ];

      await this.ledgerService.createLedgerEntries(initialEntries, client);

      // Recalculate and persist account balances from ledger_entries, same as TransactionsService
      for (const accountId of [usdAccountId, eurAccountId]) {
        const { rows } = await client.query(
          `SELECT COALESCE(SUM(amount), 0) as balance FROM ledger_entries WHERE account_id = $1`,
          [accountId]
        );
        const balance = parseFloat(rows[0].balance);
        await client.query(`UPDATE accounts SET balance = $1 WHERE id = $2`, [
          balance,
          accountId,
        ]);
      }

      await client.query("COMMIT");

      // Generate JWT token
      const payload = { sub: user.id, email: user.email };
      const token = this.jwtService.sign(payload);

      return { user, token };
    } catch (error) {
      await client.query("ROLLBACK");
      this.logger.error("Failed to register user", error as Error);
      throw error;
    } finally {
      client.release();
    }
  }

  async login(
    loginDto: LoginDto
  ): Promise<{ user: Omit<User, "password_hash">; token: string }> {
    const { email, password } = loginDto;

    try {
      const result = await db.query(
        "SELECT id, email, password_hash, first_name, last_name, created_at, updated_at FROM users WHERE email = $1",
        [email.toLowerCase()]
      );

      if (result.rows.length === 0) {
        throw new UnauthorizedException("Invalid credentials");
      }

      const user = result.rows[0];
      const isPasswordValid = await bcrypt.compare(
        password,
        user.password_hash
      );

      if (!isPasswordValid) {
        throw new UnauthorizedException("Invalid credentials");
      }

      // Generate JWT token
      const payload = { sub: user.id, email: user.email };
      const token = this.jwtService.sign(payload);

      // Remove password hash from response
      const { password_hash, ...userWithoutPassword } = user;

      return { user: userWithoutPassword, token };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException("Login failed");
    }
  }

  async validateUser(
    userId: string
  ): Promise<Omit<User, "password_hash"> | null> {
    const result = await db.query(
      "SELECT id, email, first_name, last_name, created_at, updated_at FROM users WHERE id = $1",
      [userId]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  }
}
