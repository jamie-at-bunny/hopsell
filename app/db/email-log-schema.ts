import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

export const emailLog = sqliteTable(
  "email_log",
  {
    id: text("id").primaryKey(),
    resendEmailId: text("resend_email_id").notNull(),
    to: text("to").notNull(),
    subject: text("subject").notNull(),
    status: text("status").notNull().default("sent"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [
    index("emailLog_resendEmailId_idx").on(table.resendEmailId),
    index("emailLog_to_idx").on(table.to),
    index("emailLog_status_idx").on(table.status),
  ],
);
