/**
 * Frontend Application Constants
 * Centralized configuration for magic numbers and business rules
 */

// ==================== FINANCIAL CONSTANTS ====================

/**
 * Exchange Rates (should match backend)
 */
export const EXCHANGE_RATES = {
  USD_TO_EUR: 0.92,
  EUR_TO_USD: 1.0869565217391304,
} as const;

/**
 * Minimum transaction amount
 */
export const MIN_TRANSACTION_AMOUNT = 0.01;

/**
 * Currency precision
 */
export const CURRENCY_PRECISION = {
  DECIMAL_PLACES: 2,
  DECIMAL_STEP: 0.01,
} as const;

// ==================== PAGINATION CONSTANTS ====================

/**
 * Default pagination settings
 */
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  TRANSACTIONS_PER_PAGE: 10,
} as const;

// ==================== UI CONSTANTS ====================

/**
 * Dashboard display settings
 */
export const DASHBOARD = {
  RECENT_TRANSACTIONS_COUNT: 5,
} as const;

/**
 * Input validation messages
 */
export const VALIDATION_MESSAGES = {
  MIN_AMOUNT: `Minimum transfer amount is $${MIN_TRANSACTION_AMOUNT}`,
  INVALID_AMOUNT: "Please enter a valid amount",
  MAX_DECIMALS: `Maximum ${CURRENCY_PRECISION.DECIMAL_PLACES} decimal places allowed`,
} as const;
