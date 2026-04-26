import type { Config } from "drizzle-kit";

export default {
  schema: "./app/db/schema.ts",
  out: "./drizzle",
  dialect: "turso",
  dbCredentials: {
    url: process.env.BUNNY_DATABASE_URL ?? "file:dev.db",
    authToken: process.env.BUNNY_DATABASE_AUTH_TOKEN,
  },
} satisfies Config;
