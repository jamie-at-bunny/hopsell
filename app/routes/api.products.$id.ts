import { redirect } from "react-router";
import { eq } from "drizzle-orm";
import { z } from "zod";
import type { Route } from "./+types/api.products.$id";
import { auth } from "~/lib/auth.server";
import { db } from "~/db/index.server";
import { products, orders } from "~/db/marketplace-schema";
import { user as userTable } from "~/db/auth-schema";

const updateSchema = z.object({
  title: z.string().min(1).max(120),
  description: z
    .string()
    .max(2000)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  price: z
    .string()
    .transform((v) => Number.parseFloat(v))
    .refine((n) => Number.isFinite(n) && n >= 0.5, {
      message: "Price must be at least £0.50",
    }),
});

export async function action({ request, params }: Route.ActionArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return Response.json({ error: "Sign in required" }, { status: 401 });
  }

  const product = await db.query.products.findFirst({
    where: eq(products.id, params.id!),
  });
  if (!product || product.userId !== session.user.id) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const formData = await request.formData();
  const intent = String(formData.get("_action") || "");

  if (intent === "update") {
    const parsed = updateSchema.safeParse({
      title: formData.get("title"),
      description: formData.get("description"),
      price: formData.get("price"),
    });
    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid form" },
        { status: 400 },
      );
    }
    await db
      .update(products)
      .set({
        title: parsed.data.title,
        description: parsed.data.description,
        priceCents: Math.round(parsed.data.price * 100),
      })
      .where(eq(products.id, product.id));
    return Response.json({ ok: true });
  }

  if (intent === "pause") {
    await db
      .update(products)
      .set({ status: "paused" })
      .where(eq(products.id, product.id));
    return Response.json({ ok: true });
  }

  if (intent === "unpause") {
    const seller = await db.query.user.findFirst({
      where: eq(userTable.id, product.userId),
      columns: { chargesEnabled: true },
    });
    const nextStatus = seller?.chargesEnabled ? "live" : "pending_connect";
    await db
      .update(products)
      .set({ status: nextStatus })
      .where(eq(products.id, product.id));
    return Response.json({ ok: true });
  }

  if (intent === "delete") {
    const existingOrder = await db.query.orders.findFirst({
      where: eq(orders.productId, product.id),
      columns: { id: true },
    });
    if (existingOrder) {
      return Response.json(
        {
          error:
            "This product has orders. Pause it to take it offline instead.",
        },
        { status: 409 },
      );
    }
    await db.delete(products).where(eq(products.id, product.id));
    throw redirect("/dashboard");
  }

  return Response.json({ error: "Unknown action" }, { status: 400 });
}
