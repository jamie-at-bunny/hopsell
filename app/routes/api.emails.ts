import React from "react";
import { eq, and } from "drizzle-orm";
import { db } from "~/db/index.server";
import { userEmail } from "~/db/user-email-schema";
import { getSession } from "~/lib/session.server";
import { sendEmail } from "~/lib/email.server";
import VerifyEmailOtp from "~/emails/verify-email-otp";
import {
  getUserEmails,
  addUserEmail,
  verifyUserEmail,
  setPrimaryEmail,
  removeUserEmail,
} from "~/lib/emails.server";
import type { Route } from "./+types/api.emails";

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getSession(request);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const emails = await getUserEmails(session.user.id);
  return Response.json({ emails });
}

export async function action({ request }: Route.ActionArgs) {
  const session = await getSession(request);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  switch (intent) {
    case "add": {
      const email = formData.get("email") as string;
      if (!email) {
        return Response.json({ error: "Email is required" }, { status: 400 });
      }

      // Check if email already exists in userEmail table
      const existing = await db
        .select()
        .from(userEmail)
        .where(eq(userEmail.email, email))
        .then((rows) => rows[0]);

      if (existing) {
        return Response.json(
          { error: "This email is already in use" },
          { status: 400 },
        );
      }

      const id = await addUserEmail(session.user.id, email);

      // Generate a 6-digit OTP and store it
      const otp = String(Math.floor(100000 + Math.random() * 900000));
      // Store OTP in a simple way — using the verification table via a cookie-like approach
      // For simplicity, we'll store it in memory (short-lived)
      otpStore.set(id, { otp, expiresAt: Date.now() + 10 * 60 * 1000 });

      void sendEmail({
        to: email,
        subject: "Verify your email address",
        react: React.createElement(VerifyEmailOtp, { otp }),
      });

      return Response.json({ id, email });
    }

    case "verify": {
      const emailId = formData.get("emailId") as string;
      const otp = formData.get("otp") as string;

      // Verify ownership
      const emailRecord = await db
        .select()
        .from(userEmail)
        .where(and(eq(userEmail.id, emailId), eq(userEmail.userId, session.user.id)))
        .then((rows) => rows[0]);

      if (!emailRecord) {
        return Response.json({ error: "Email not found" }, { status: 404 });
      }

      const stored = otpStore.get(emailId);
      if (!stored || stored.otp !== otp || Date.now() > stored.expiresAt) {
        return Response.json(
          { error: "Invalid or expired code" },
          { status: 400 },
        );
      }

      await verifyUserEmail(emailId);
      otpStore.delete(emailId);

      return Response.json({ success: true });
    }

    case "set-primary": {
      const emailId = formData.get("emailId") as string;

      // Verify ownership
      const emailRecord = await db
        .select()
        .from(userEmail)
        .where(and(eq(userEmail.id, emailId), eq(userEmail.userId, session.user.id)))
        .then((rows) => rows[0]);

      if (!emailRecord) {
        return Response.json({ error: "Email not found" }, { status: 404 });
      }

      try {
        await setPrimaryEmail(session.user.id, emailId);
      } catch (e) {
        return Response.json(
          { error: e instanceof Error ? e.message : "Failed" },
          { status: 400 },
        );
      }

      return Response.json({ success: true });
    }

    case "remove": {
      const emailId = formData.get("emailId") as string;

      // Verify ownership
      const emailRecord = await db
        .select()
        .from(userEmail)
        .where(and(eq(userEmail.id, emailId), eq(userEmail.userId, session.user.id)))
        .then((rows) => rows[0]);

      if (!emailRecord) {
        return Response.json({ error: "Email not found" }, { status: 404 });
      }

      try {
        await removeUserEmail(emailId);
      } catch (e) {
        return Response.json(
          { error: e instanceof Error ? e.message : "Failed" },
          { status: 400 },
        );
      }

      return Response.json({ success: true });
    }

    default:
      return Response.json({ error: "Invalid intent" }, { status: 400 });
  }
}

// Simple in-memory OTP store for email verification
const otpStore = new Map<string, { otp: string; expiresAt: number }>();
