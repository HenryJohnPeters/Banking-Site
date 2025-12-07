/**
 * Application-wide constants
 * Centralized configuration for magic numbers and business rules
 */

// ==================== FINANCIAL CONSTANTS ====================

/**
 * Exchange Rates (Fixed for this implementation)
 * In production, these would come from an external API
 *
 * IMPORTANT: The bank makes profit on the spread between buy/sell rates
 * Current implementation uses ZERO SPREAD for simplicity (not production-ready)
 */
export const EXCHANGE_RATES = {
  USD_TO_EUR: 0.92,
  EUR_TO_USD: 1.0869565217391304, // Calculated: 1 / 0.92
} as const;

/**
 * Bank fees and operational accounts
 *
 * PRODUCTION NOTE: In a real banking system, currency exchanges would:
 * 1. Use different BUY and SELL rates (e.g., buy EUR at 0.90, sell at 0.92)
 * 2. Route the spread to a bank revenue account
 * 3. Maintain separate currency pool accounts (USD pool, EUR pool)
 *
 * Current simplified implementation:
 * - Uses 1:1 inverse rates (no spread/fee)
 * - Does NOT capture exchange profit
 * - Violates conservation of value in ledger
 *
 * To fix for production:
 * - Add EXCHANGE_FEE_PERCENTAGE (e.g., 1-2%)
 * - Create BANK_REVENUE_ACCOUNT_ID for fee collection
 * - Use asymmetric rates with built-in spread
 */
export const BANK_CONFIG = {
  // Exchange fee configuration
  // NOTE: Currently set to 0 for simplified implementation
  // In production, typical exchange fees are 1-2%
  EXCHANGE_FEE_PERCENTAGE: 0,

  // Bank internal accounts (not implemented in current scope)
  // These would be used in production to:
  // - Track currency pools (USD/EUR reserves)
  // - Capture exchange spread as revenue
  // - Maintain regulatory capital requirements
  // BANK_USD_POOL_ACCOUNT_ID: null,
  // BANK_EUR_POOL_ACCOUNT_ID: null,
  // BANK_REVENUE_ACCOUNT_ID: null,
} as const;

/**
 * Initial account balances for new user registration
 */
export const INITIAL_BALANCES = {
  USD: 1000.0,
  EUR: 500.0,
} as const;

/**
 * Minimum transaction amount (in base currency units)
 */
export const MIN_TRANSACTION_AMOUNT = 0.01;

/**
 * Ledger balance tolerance for double-entry validation
 * Allows for minor floating-point rounding errors
 *
 * NOTE: With Decimal.js, this can be very strict (0.001)
 * Previously was 0.01 but changed to 0.001 for stricter validation
 */
export const LEDGER_BALANCE_TOLERANCE = 0.001;

/**
 * Account balance consistency tolerance
 * Used when comparing ledger-calculated vs cached account balance
 */
export const ACCOUNT_BALANCE_TOLERANCE = 0.01;

// ==================== PAGINATION CONSTANTS ====================

/**
 * Default pagination settings
 */
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

// ==================== SECURITY CONSTANTS ====================

/**
 * BCrypt salt rounds for password hashing
 * Higher = more secure but slower
 * 10 is a good balance for most applications
 */
export const BCRYPT_SALT_ROUNDS = 10;

/**
 * JWT Configuration
 * Note: JWT_SECRET and JWT_EXPIRES_IN should come from environment variables
 * These are just defaults/documentation
 */
export const JWT_CONFIG = {
  DEFAULT_EXPIRES_IN: "24h",
  MIN_SECRET_LENGTH: 32,
} as const;

// ==================== CURRENCY PRECISION ====================

/**
 * Currency decimal places
 */
export const CURRENCY_PRECISION = {
  DECIMAL_PLACES: 2,
  DECIMAL_STEP: 0.01,
} as const;

// ==================== TYPE EXPORTS ====================

export type Currency = "USD" | "EUR";
export type TransactionType =
  | "TRANSFER"
  | "EXCHANGE"
  | "DEPOSIT"
  | "WITHDRAWAL";
export type TransactionStatus = "PENDING" | "COMPLETED" | "FAILED";
