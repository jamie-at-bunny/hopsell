import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3";
import { drizzle as drizzleLibsql } from "drizzle-orm/libsql";
import Database from "better-sqlite3";
import { createClient } from "@libsql/client";
import * as schema from "./schema";

function createDb() {
  const url = process.env.BUNNY_DATABASE_URL || "file:dev.db";

  if (url.startsWith("file:") || url.endsWith(".db")) {
    const sqlite = new Database(url.replace("file:", ""));
    return drizzleSqlite(sqlite, { schema });
  }

  const client = createClient({
    url,
    authToken: process.env.BUNNY_DATABASE_AUTH_TOKEN,
  });

  return drizzleLibsql(client, { schema });
}

export const db = createDb();
