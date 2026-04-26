/**
 * Central configuration for the LaunchMade SaaS boilerplate.
 *
 * Edit this file to customize your app's branding, features, and defaults.
 * Environment variables are still used for secrets and deployment-specific
 * values — this file controls the application-level choices.
 */

import type { InferOrganizationRolesFromOption } from "better-auth/plugins/organization";

type OrgRole = InferOrganizationRolesFromOption<undefined>;

export const config = {
  /** App name used in emails, passkey prompts, 2FA issuer, and meta tags */
  name: "LaunchMade",

  /** Default "from" address for transactional emails */
  emailFrom: "noreply@yourdomain.com",

  /** Invite link defaults */
  inviteLink: {
    /** How long invite links remain valid (ms). Default: 36 hours */
    expiresInMs: 36 * 60 * 60 * 1000,
    /** Roles that can create and revoke invite links */
    allowedRoles: ["owner", "admin"] as OrgRole[],
  },

  /** Session configuration */
  session: {
    /** How long a session lasts (seconds). Default: 7 days */
    expiresIn: 60 * 60 * 24 * 7,
    /** How often the session token is refreshed (seconds). Default: 24 hours */
    updateAge: 60 * 60 * 24,
    /** Cookie cache duration to reduce DB lookups (seconds). Default: 5 minutes */
    cookieCacheMaxAge: 60 * 5,
  },

  /** Rate limiting defaults (per-endpoint overrides in auth.server.ts) */
  rateLimit: {
    /** Global rate limit window (seconds) */
    window: 10,
    /** Global max requests per window */
    max: 100,
  },

  /** Cleanup thresholds used by scripts/cleanup.ts */
  cleanup: {
    /** Delete unverified accounts older than this (ms). Default: 7 days */
    unverifiedAccountMaxAge: 7 * 24 * 60 * 60 * 1000,
  },

  /** Stripe billing configuration. Only active when STRIPE_SECRET_KEY is set. */
  stripe: {
    /** Create a Stripe customer automatically on sign-up */
    createCustomerOnSignUp: false,
  },
} as const;
