import { eq } from "drizzle-orm";
import { db } from "~/db/index.server";
import { products } from "~/db/marketplace-schema";

const RESERVED = new Set([
  "dashboard",
  "library",
  "api",
  "p",
  "d",
  "login",
  "logout",
  "admin",
  "about",
  "terms",
  "privacy",
  "help",
  "sell",
  "home",
  "settings",
  "account",
  "_bunny",
]);

function randomSuffix(len: number): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < len; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);
}

export async function uniqueSlug(base: string): Promise<string> {
  let candidate = base;
  if (RESERVED.has(candidate) || candidate.length === 0) {
    candidate = `product-${randomSuffix(6)}`;
  }
  let n = 2;
  while (
    await db.query.products.findFirst({
      where: eq(products.slug, candidate),
      columns: { id: true },
    })
  ) {
    candidate = `${base || "product"}-${n++}`;
  }
  return candidate;
}
