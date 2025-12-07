import { describe, it, expect } from "vitest";
import { formatCurrency, formatDate } from "./formatters";
import { Currency } from "../models/Banking";

describe("Formatters", () => {
  describe("formatCurrency", () => {
    it("should format USD amounts correctly", () => {
      expect(formatCurrency(100, Currency.USD)).toBe("$100.00");
      expect(formatCurrency(1234.56, Currency.USD)).toBe("$1,234.56");
      expect(formatCurrency(0.01, Currency.USD)).toBe("$0.01");
    });

    it("should format EUR amounts correctly", () => {
      expect(formatCurrency(100, Currency.EUR)).toBe("€100.00");
      expect(formatCurrency(1234.56, Currency.EUR)).toBe("€1,234.56");
      expect(formatCurrency(0.01, Currency.EUR)).toBe("€0.01");
    });

    it("should handle large amounts", () => {
      expect(formatCurrency(999999.99, Currency.USD)).toBe("$999,999.99");
      expect(formatCurrency(1000000, Currency.USD)).toBe("$1,000,000.00");
    });

    it("should handle zero", () => {
      expect(formatCurrency(0, Currency.USD)).toBe("$0.00");
      expect(formatCurrency(0, Currency.EUR)).toBe("€0.00");
    });
  });

  describe("formatDate", () => {
    it("should format dates correctly", () => {
      const formatted = formatDate("2024-12-07T10:30:00Z");
      expect(formatted).toMatch(/Dec 7, 2024/);
    });

    it("should handle date strings", () => {
      const formatted = formatDate("2024-12-07T10:30:00Z");
      expect(formatted).toMatch(/Dec 7, 2024/);
    });
  });
});
