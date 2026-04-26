import { relations, sql } from "drizzle-orm";
import {
  sqliteTable,
  text,
  integer,
  index,
} from "drizzle-orm/sqlite-core";
import { user } from "./auth-schema";

export const products = sqliteTable(
  "products",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    description: text("description"),
    priceCents: integer("price_cents").notNull(),
    currency: text("currency").notNull().default("gbp"),
    status: text("status").notNull(),
    fileId: text("file_id").notNull(),
    fileSizeBytes: integer("file_size_bytes").notNull(),
    fileMimeType: text("file_mime_type").notNull(),
    fileExtension: text("file_extension").notNull(),
    originalFilename: text("original_filename").notNull(),
    storagePath: text("storage_path").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("products_user_idx").on(table.userId),
    index("products_status_idx").on(table.status),
  ],
);

export const orders = sqliteTable(
  "orders",
  {
    id: text("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id),
    buyerUserId: text("buyer_user_id")
      .notNull()
      .references(() => user.id),
    buyerEmail: text("buyer_email").notNull(),
    stripeSessionId: text("stripe_session_id").notNull().unique(),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    amountCents: integer("amount_cents").notNull(),
    applicationFeeCents: integer("application_fee_cents").notNull(),
    currency: text("currency").notNull(),
    status: text("status").notNull(),
    downloadToken: text("download_token").notNull().unique(),
    downloadTokenExpiresAt: integer("download_token_expires_at", {
      mode: "timestamp_ms",
    }),
    downloadCount: integer("download_count").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    paidAt: integer("paid_at", { mode: "timestamp_ms" }),
  },
  (table) => [
    index("orders_buyer_idx").on(table.buyerUserId),
    index("orders_product_idx").on(table.productId),
  ],
);

export const pendingListings = sqliteTable(
  "pending_listings",
  {
    id: text("id").primaryKey(),
    token: text("token").notNull().unique(),
    email: text("email").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    priceCents: integer("price_cents").notNull(),
    currency: text("currency").notNull(),
    fileId: text("file_id").notNull(),
    fileSizeBytes: integer("file_size_bytes").notNull(),
    fileMimeType: text("file_mime_type").notNull(),
    fileExtension: text("file_extension").notNull(),
    originalFilename: text("original_filename").notNull(),
    storagePath: text("storage_path").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [
    index("pending_listings_token_idx").on(table.token),
    index("pending_listings_email_idx").on(table.email),
  ],
);

export const productsRelations = relations(products, ({ one, many }) => ({
  user: one(user, {
    fields: [products.userId],
    references: [user.id],
  }),
  orders: many(orders),
}));

export const ordersRelations = relations(orders, ({ one }) => ({
  product: one(products, {
    fields: [orders.productId],
    references: [products.id],
  }),
  buyer: one(user, {
    fields: [orders.buyerUserId],
    references: [user.id],
  }),
}));
