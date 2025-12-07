import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: [
      "src/**/*.{ts,tsx}",
      "*.{ts,tsx,js,jsx}",
      "tests/**/*.{ts,tsx}",
      "**/*.config.{ts,js}",
      "**/*.config.*.cjs",
    ],
    languageOptions: {
      parser: tseslint.parser,
      // No parserOptions.project to avoid config/vite parsing errors
    },
    rules: {
      // Focus on unused vars/imports, keep TS rules lenient for now
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrors: "all",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-explicit-any": "off",
      "no-useless-catch": "off",
    },
  }
);
