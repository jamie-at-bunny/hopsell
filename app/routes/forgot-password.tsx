import { redirect, data } from "react-router";
import { authClient } from "~/lib/auth-client";
import { AuthCard } from "~/components/auth-card";
import { ForgotPasswordForm } from "~/components/forgot-password-form";
import type { Route } from "./+types/forgot-password";

export function meta() {
  return [{ title: "Forgot Password" }];
}

export async function clientAction({ request }: Route.ClientActionArgs) {
  const formData = await request.formData();
  const intent = String(formData.get("intent"));

  if (intent === "send-otp") {
    const email = String(formData.get("email"));
    const { error } = await authClient.emailOtp.sendVerificationOtp({
      email,
      type: "forget-password",
    });

    if (error) {
      return data({ error: error.message || "Failed to send code" }, { status: 400 });
    }

    return { step: "otp" as const };
  }

  if (intent === "reset-password") {
    const email = String(formData.get("email"));
    const otp = String(formData.get("otp"));
    const password = String(formData.get("password"));

    const { error } = await authClient.emailOtp.resetPassword({
      email,
      otp,
      password,
    });

    if (error) {
      return data({ error: error.message || "Failed to reset password" }, { status: 400 });
    }

    throw redirect("/login");
  }

  return data({ error: "Invalid intent" }, { status: 400 });
}

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Forgot your password?"
      description="Enter your email and we'll send you a code to reset your password"
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
