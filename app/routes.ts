import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/_index.tsx"),
  route("dashboard", "routes/dashboard.tsx"),
  route("library", "routes/library.tsx"),
  route("p/:slug", "routes/p.$slug.tsx"),
  route("p/:slug/thanks", "routes/p.$slug.thanks.tsx"),
  route("d/:token", "routes/d.$token.tsx"),
  route("listings/verify", "routes/listings.verify.tsx"),

  route("api/auth/*", "routes/api.auth.$.ts"),
  route("api/health", "routes/api.health.ts"),
  route("api/checkout/:productId", "routes/api.checkout.$productId.ts"),
  route("api/products/:id", "routes/api.products.$id.ts"),
  route("api/products/:id/connect", "routes/api.products.$id.connect.ts"),
  route("api/connect/dashboard", "routes/api.connect.dashboard.ts"),
  route("api/webhooks/stripe", "routes/api.webhooks.stripe.ts"),
  route("api/webhooks/stripe-connect", "routes/api.webhooks.stripe-connect.ts"),

  route(".bunny/upload", "routes/_bunny.upload.ts"),
] satisfies RouteConfig;
