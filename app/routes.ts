import {
  type RouteConfig,
  index,
  route,
  layout,
} from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("api/auth/*", "routes/api.auth.$.ts"),
  route("api/upload", "routes/api.upload.ts"),
  route("api/emails", "routes/api.emails.ts"),
  route("api/billing", "routes/api.billing.ts"),
  route("api/audit-log", "routes/api.audit-log.ts"),
  route("api/audit", "routes/api.audit.ts"),
  route("api/health", "routes/api.health.ts"),
  route("api/notifications/stream", "routes/api.notifications.stream.ts"),
  route("api/webhooks/resend", "routes/api.webhooks.resend.ts"),
  route("invite/:token", "routes/invite.$token.tsx"),
  route("login", "routes/login.tsx"),
  route("signup", "routes/signup.tsx"),
  route("forgot-password", "routes/forgot-password.tsx"),
  route("onboarding", "routes/onboarding.tsx"),
  route("home", "routes/home-page.tsx"),
  route("account", "routes/account.tsx"),
  route(":slug", "routes/workspace.tsx", [
    index("routes/workspace-index.tsx"),
    route("settings", "routes/workspace-settings.tsx"),
    route("example-members-only", "routes/workspace-example-members-only.tsx"),
    route("example-admin-only", "routes/workspace-example-admin-only.tsx"),
  ]),
] satisfies RouteConfig;
