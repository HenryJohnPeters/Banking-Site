import type { Config } from "drizzle-kit";

export default {
  schema: "./scripts/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    host: "localhost",
    port: 5433,
    user: "postgres",
    password: "postgres",
    database: "banking",
    ssl: false,
  },
} satisfies Config;
