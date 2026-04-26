import { betterAuth } from "better-auth";
import { magicLink } from "better-auth/plugins";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { randomUUID } from "node:crypto";
import React from "react";
import { db } from "~/db/index.server";
import { sendEmail } from "~/lib/email.server";
import { config } from "~/lib/config";
import MagicLinkEmail from "~/emails/magic-link";

const baseURL = process.env.BETTER_AUTH_URL || "http://localhost:5173";

export const auth = betterAuth({
  baseURL,
  trustedOrigins: [baseURL],
  database: drizzleAdapter(db, { provider: "sqlite" }),
  rateLimit: {
    enabled: true,
    storage: "database",
    window: config.rateLimit.window,
    max: config.rateLimit.max,
    customRules: {
      "/sign-in/magic-link": { window: 60, max: 5 },
    },
  },
  session: {
    expiresIn: config.session.expiresIn,
    updateAge: config.session.updateAge,
    cookieCache: {
      enabled: true,
      maxAge: config.session.cookieCacheMaxAge,
    },
  },
  emailAndPassword: { enabled: false },
  user: {
    additionalFields: {
      storagePrefix: {
        type: "string",
        required: true,
        input: false,
        defaultValue: () => randomUUID(),
      },
      stripeAccountId: { type: "string", required: false, input: false },
      stripeAccountStatus: { type: "string", required: false, input: false },
      chargesEnabled: {
        type: "boolean",
        required: false,
        input: false,
        defaultValue: false,
      },
      payoutsEnabled: {
        type: "boolean",
        required: false,
        input: false,
        defaultValue: false,
      },
    },
  },
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
    ipAddress: {
      ipAddressHeaders: ["x-forwarded-for", "x-real-ip"],
    },
  },
  plugins: [
    magicLink({
      expiresIn: 60 * 60 * 24 * 7,
      sendMagicLink: async ({ email, url }) => {
        await sendEmail({
          to: email,
          subject: `Sign in to ${config.name}`,
          react: React.createElement(MagicLinkEmail, { url }),
        });
      },
    }),
  ],
});
