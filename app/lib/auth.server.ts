import { betterAuth } from "better-auth";
import {
  organization,
  lastLoginMethod,
  multiSession,
} from "better-auth/plugins";
import { twoFactor } from "better-auth/plugins/two-factor";
import { emailOTP } from "better-auth/plugins/email-otp";
import { haveIBeenPwned } from "better-auth/plugins/haveibeenpwned";
import { passkey } from "@better-auth/passkey";
import { sso } from "@better-auth/sso";
import { inviteLink } from "~/lib/plugins/invite-link";
import { notification } from "~/lib/plugins/notification";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { stripe } from "@better-auth/stripe";
import Stripe from "stripe";

import Redis from "ioredis";
import { eq, and } from "drizzle-orm";
import { db } from "~/db/index.server";
import { member as memberTable, organization as orgTable, user as userTable } from "~/db/auth-schema";
import React from "react";
import { sendEmail } from "~/lib/email.server";
import { seedPrimaryEmail, syncEmailVerified } from "~/lib/emails.server";
import { logAudit } from "~/lib/audit.server";
import { config } from "~/lib/config";
import VerifyEmail from "~/emails/verify-email";
import ResetPassword from "~/emails/reset-password";
import VerifyNewEmail from "~/emails/verify-new-email";
import OtpCode from "~/emails/otp-code";
import Welcome from "~/emails/welcome";
import SubscriptionUpgraded from "~/emails/subscription-upgraded";
import SubscriptionCancelled from "~/emails/subscription-cancelled";

const baseURL = process.env.BETTER_AUTH_URL || "http://localhost:5173";

const redis = process.env.REDIS_URL
  ? new Redis(process.env.REDIS_URL)
  : null;

export const stripeEnabled = !!process.env.STRIPE_SECRET_KEY;

export const stripeClient = stripeEnabled
  ? new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2026-02-25.clover",
    })
  : null;

export const auth = betterAuth({
  baseURL,
  trustedOrigins: [baseURL],
  database: drizzleAdapter(db, { provider: "sqlite" }),
  ...(redis
    ? {
        secondaryStorage: {
          get: async (key: string) => {
            const value = await redis.get(key);
            return value ?? null;
          },
          set: async (key: string, value: string, ttl?: number) => {
            if (ttl) {
              await redis.set(key, value, "EX", ttl);
            } else {
              await redis.set(key, value);
            }
          },
          delete: async (key: string) => {
            await redis.del(key);
          },
        },
      }
    : {}),
  rateLimit: {
    enabled: true,
    storage: redis ? "secondary-storage" : "database",
    window: config.rateLimit.window,
    max: config.rateLimit.max,
    customRules: {
      "/api/auth/sign-in/email": { window: 60, max: 5 },
      "/api/auth/sign-up/email": { window: 60, max: 3 },
      "/api/auth/forget-password": { window: 60, max: 3 },
      "/api/auth/change-password": { window: 60, max: 5 },
      "/api/auth/change-email": { window: 60, max: 5 },
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
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }) => {
      void sendEmail({
        to: user.email,
        subject: "Reset your password",
        react: React.createElement(ResetPassword, { url }),
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, url }) => {
      void sendEmail({
        to: user.email,
        subject: "Verify your email",
        react: React.createElement(VerifyEmail, { url }),
      });
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    },
  },
  user: {
    changeEmail: {
      enabled: true,
      sendChangeEmailVerification: async ({
        user,
        newEmail,
        url,
      }: {
        user: { email: string };
        newEmail: string;
        url: string;
      }) => {
        void sendEmail({
          to: newEmail,
          subject: "Verify your new email",
          react: React.createElement(VerifyNewEmail, { url }),
        });
      },
    },
    deleteUser: {
      enabled: true,
    },
    additionalFields: {
      timezone: {
        type: "string",
        required: false,
        defaultValue: "UTC",
      },
      appearance: {
        type: "string",
        required: false,
        defaultValue: "system",
      },
      defaultOrganizationId: {
        type: "string",
        required: false,
      },
      notifyInApp: {
        type: "boolean",
        required: false,
        defaultValue: true,
      },
      notifyEmail: {
        type: "boolean",
        required: false,
        defaultValue: true,
      },
    },
  },
  account: {
    accountLinking: {
      enabled: true,
    },
    encryptOAuthTokens: true,
  },
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
    ipAddress: {
      ipAddressHeaders: ["x-forwarded-for", "x-real-ip"],
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await seedPrimaryEmail(user.id, user.email);
          void sendEmail({
            to: user.email,
            subject: `Welcome to ${config.name}`,
            react: React.createElement(Welcome, {
              name: user.name,
              url: baseURL,
            }),
          });
        },
      },
      update: {
        after: async (user) => {
          const u = user as Record<string, unknown>;
          if (u.emailVerified) {
            await syncEmailVerified(u.id as string, u.email as string);
          }
        },
      },
    },
    session: {
      create: {
        after: async (session) => {
          await logAudit({
            actorId: session.userId,
            action: "session.created",
            targetType: "session",
            targetId: session.id,
            ipAddress: (session as Record<string, unknown>).ipAddress as string | undefined,
          });
        },
      },
    },
    account: {
      create: {
        after: async (account) => {
          await logAudit({
            actorId: account.userId,
            action: "account.linked",
            targetType: "account",
            metadata: { provider: account.providerId },
          });
        },
      },
    },
  },
  plugins: [
    organization({
      allowUserToCreateOrganization: true,
      teams: { enabled: true },
    }),
    emailOTP({
      sendVerificationOTP: async ({ email, otp, type }) => {
        const subjects: Record<string, string> = {
          "sign-in": "Your login code",
          "email-verification": "Your verification code",
          "forget-password": "Your password reset code",
          "change-email": "Your email change code",
        };
        void sendEmail({
          to: email,
          subject: subjects[type] || "Your verification code",
          react: React.createElement(OtpCode, { otp, type }),
        });
      },
    }),
    twoFactor({
      issuer: config.name,
    }),
    passkey({
      rpID: new URL(baseURL).hostname,
      rpName: config.name,
      origin: baseURL,
    }),
    multiSession(),
    lastLoginMethod(),
    haveIBeenPwned(),
    sso({
      organizationProvisioning: {
        defaultRole: "member",
      },
    }),
    inviteLink({
      expiresInMs: config.inviteLink.expiresInMs,
      allowedRoles: config.inviteLink.allowedRoles,
    }),
    notification(),
    ...(stripeEnabled && stripeClient
      ? [
          stripe({
            stripeClient,
            stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
            createCustomerOnSignUp: config.stripe.createCustomerOnSignUp,
            organization: {
              enabled: true,
            },
            subscription: {
              enabled: true,
              plans: [
                {
                  name: "pro",
                  priceId: process.env.STRIPE_PRO_PRICE_ID!,
                },
              ],
              getCheckoutSessionParams: async () => ({
                params: {
                  allow_promotion_codes: true,
                },
              }),
              onSubscriptionComplete: async ({ subscription }) => {
                const [org] = await db.select().from(orgTable).where(eq(orgTable.id, subscription.referenceId));
                const owners = await (db as any)
                  .select({ userId: memberTable.userId })
                  .from(memberTable)
                  .where(and(eq(memberTable.organizationId, subscription.referenceId), eq(memberTable.role, "owner")));
                for (const { userId } of owners) {
                  const [u] = await db.select().from(userTable).where(eq(userTable.id, userId));
                  if (u?.email) {
                    void sendEmail({
                      to: u.email,
                      subject: `${org?.name || "Your workspace"} has been upgraded`,
                      react: React.createElement(SubscriptionUpgraded, {
                        workspaceName: org?.name || "Your workspace",
                        plan: subscription.plan || "Pro",
                      }),
                    });
                  }
                }
              },
              onSubscriptionCancel: async ({ subscription, stripeSubscription }) => {
                const [org] = await db.select().from(orgTable).where(eq(orgTable.id, subscription.referenceId));
                const stripeSub = stripeSubscription as any;
                const endDate = stripeSub.current_period_end
                  ? new Date(stripeSub.current_period_end * 1000).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })
                  : "the end of your billing period";
                const owners = await (db as any)
                  .select({ userId: memberTable.userId })
                  .from(memberTable)
                  .where(and(eq(memberTable.organizationId, subscription.referenceId), eq(memberTable.role, "owner")));
                for (const { userId } of owners) {
                  const [u] = await db.select().from(userTable).where(eq(userTable.id, userId));
                  if (u?.email) {
                    void sendEmail({
                      to: u.email,
                      subject: `${org?.name || "Your workspace"} subscription cancelled`,
                      react: React.createElement(SubscriptionCancelled, {
                        workspaceName: org?.name || "Your workspace",
                        endDate,
                      }),
                    });
                  }
                }
              },
              authorizeReference: async ({ user, referenceId, action }: { user: { id: string }; referenceId: string; action: string }) => {
                const [memberRecord] = await (db as any)
                  .select()
                  .from(memberTable)
                  .where(and(
                    eq(memberTable.organizationId, referenceId),
                    eq(memberTable.userId, user.id),
                  ));
                return memberRecord?.role === "owner" || memberRecord?.role === "admin";
              },
            },
          }),
        ]
      : []),
  ],
});
