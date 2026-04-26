import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function stripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is required");
  _stripe = new Stripe(key, { apiVersion: "2026-02-25.clover" });
  return _stripe;
}
