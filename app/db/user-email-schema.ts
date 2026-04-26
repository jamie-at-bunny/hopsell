import { sql, relations } from "drizzle-orm";
import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { user } from "./auth-schema";

export const userEmail = sqliteTable(
  "user_email",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    verified: integer("verified", { mode: "boolean" }).default(false).notNull(),
    primary: integer("primary", { mode: "boolean" }).default(false).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [
    index("userEmail_userId_idx").on(table.userId),
    uniqueIndex("userEmail_email_uidx").on(table.email),
  ],
);

export const userEmailRelations = relations(userEmail, ({ one }) => ({
  user: one(user, {
    fields: [userEmail.userId],
    references: [user.id],
  }),
}));
