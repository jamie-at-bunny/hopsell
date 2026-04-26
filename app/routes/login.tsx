import { redirect, data } from "react-router";
import { authClient, signIn } from "~/lib/auth-client";
import { AuthCard } from "~/components/auth-card";
import { LoginForm } from "~/components/login-form";
import type { Route } from "./+types/login";

export function meta() {
  return [{ title: "Login" }];
}

export async function clientAction({ request }: Route.ClientActionArgs) {
  const formData = await request.formData();
  const intent = String(formData.get("intent"));
  const redirectTo = String(formData.get("redirectTo") || "/");

  if (intent === "send-otp") {
    const email = String(formData.get("email"));
    const { error } = await authClient.emailOtp.sendVerificationOtp({
      email,
      type: "sign-in",
    });

    if (error) {
      return data({ error: error.message || "Failed to send code" }, { status: 400 });
    }

    return { step: "otp" as const };
  }

  if (intent === "verify-otp") {
    const email = String(formData.get("email"));
    const otp = String(formData.get("otp"));
    const { error } = await authClient.signIn.emailOtp({ email, otp });

    if (error) {
      return data({ error: error.message || "Invalid code" }, { status: 400 });
    }

    throw redirect(redirectTo);
  }

  if (intent === "password") {
    const email = String(formData.get("email"));
    const password = String(formData.get("password"));
    const { error } = await signIn.email({ email, password });

    if (error) {
      return data({ error: error.message || "Invalid email or password" }, { status: 400 });
    }

    throw redirect(redirectTo);
  }

  if (intent === "sso") {
    const email = String(formData.get("email"));
    const { error } = await (authClient as any).sso.signIn({
      email,
      callbackURL: redirectTo,
    });

    if (error) {
      return data({ error: error.message || "SSO sign-in failed. No SSO provider found for this email." }, { status: 400 });
    }

    return { step: "sso-redirect" as const };
  }

  return data({ error: "Invalid intent" }, { status: 400 });
}

export default function LoginPage() {
  return (
    <AuthCard
      title="Login to your account"
      description="Enter your email and we'll send you a login code"
    >
      <LoginForm />
    </AuthCard>
  );
}
