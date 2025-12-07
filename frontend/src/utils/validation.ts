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
 * Validates if an amount is within acceptable transfer limits
 * @param amount - The amount to validate
 * @returns object with isValid boolean and optional error message
 */
export const validateTransferAmount = (
  amount: number
): { isValid: boolean; error?: string } => {
  if (isNaN(amount) || amount <= 0) {
    return { isValid: false, error: "Amount must be a positive number" };
  }

  if (amount < 0.01) {
    return { isValid: false, error: "Minimum transfer amount is $0.01" };
  }

  if (amount > 999999.99) {
    return { isValid: false, error: "Maximum transfer amount is $999,999.99" };
  }

  return { isValid: true };
};
