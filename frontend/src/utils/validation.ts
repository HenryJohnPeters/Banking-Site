import {
  MIN_TRANSACTION_AMOUNT,
  CURRENCY_PRECISION,
  VALIDATION_MESSAGES,
} from "./constants";

/**
 * Validates if a string is a valid UUID (v4 format)
 * @param uuid - The string to validate
 * @returns true if the string is a valid UUID, false otherwise
 */
export const isValidUUID = (uuid: string): boolean => {
  const UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return UUID_REGEX.test(uuid.trim());
};

/**
 * Validates and sanitizes numeric input for financial amounts
 * Prevents scientific notation, invalid decimals, and locale issues
 * @param input - The input string to validate
 * @returns sanitized number or null if invalid
 */
export const sanitizeNumericInput = (input: string): number | null => {
  // Remove any whitespace
  const trimmed = input.trim();

  // Reject scientific notation (e.g., 1e10, 1E5)
  if (/[eE]/.test(trimmed)) {
    return null;
  }

  // Reject multiple decimal points
  if ((trimmed.match(/\./g) || []).length > 1) {
    return null;
  }

  // Parse as float
  const parsed = parseFloat(trimmed);

  // Check for valid number
  if (isNaN(parsed) || !isFinite(parsed)) {
    return null;
  }

  return parsed;
};

/**
 * Validates if an amount is within acceptable transfer limits
 * @param amount - The amount to validate
 * @returns object with isValid boolean and optional error message
 */
export const validateTransferAmount = (
  amount: number | string
): { isValid: boolean; error?: string } => {
  // Sanitize if string input
  let numAmount: number;

  if (typeof amount === "string") {
    const sanitized = sanitizeNumericInput(amount);
    if (sanitized === null) {
      return { isValid: false, error: VALIDATION_MESSAGES.INVALID_AMOUNT };
    }
    numAmount = sanitized;
  } else {
    numAmount = amount;
  }

  if (isNaN(numAmount) || !isFinite(numAmount) || numAmount <= 0) {
    return { isValid: false, error: "Amount must be a positive number" };
  }

  if (numAmount < MIN_TRANSACTION_AMOUNT) {
    return { isValid: false, error: VALIDATION_MESSAGES.MIN_AMOUNT };
  }

  if (numAmount > 999999.99) {
    return { isValid: false, error: "Maximum transfer amount is $999,999.99" };
  }

  // Check decimal places (max 2)
  const decimalPlaces = (numAmount.toString().split(".")[1] || "").length;
  if (decimalPlaces > CURRENCY_PRECISION.DECIMAL_PLACES) {
    return {
      isValid: false,
      error: VALIDATION_MESSAGES.MAX_DECIMALS,
    };
  }

  return { isValid: true };
};

/**
 * Validates email format
 * @param email - The email to validate
 * @returns true if valid email format
 */
export const isValidEmail = (email: string): boolean => {
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return EMAIL_REGEX.test(email.trim());
};

/**
 * Validates password strength
 * @param password - The password to validate
 * @returns object with isValid boolean and optional error message
 */
export const validatePassword = (
  password: string
): { isValid: boolean; error?: string } => {
  if (password.length < 8) {
    return { isValid: false, error: "Password must be at least 8 characters" };
  }

  return { isValid: true };
};
