import { redirect, data } from "react-router";
import { signUp } from "~/lib/auth-client";
import { getGravatarUrl } from "~/lib/avatars";
import { AuthCard } from "~/components/auth-card";
import { SignUpForm } from "~/components/sign-up-form";
import type { Route } from "./+types/signup";

export function meta() {
  return [{ title: "Sign Up" }];
}

export async function clientAction({ request }: Route.ClientActionArgs) {
  const formData = await request.formData();
  const name = String(formData.get("name"));
  const email = String(formData.get("email"));
  const password = String(formData.get("password"));
  const redirectTo = String(formData.get("redirectTo") || "");

  const gravatarUrl = await getGravatarUrl(email);

  const { error } = await signUp.email({
    name,
    email,
    password,
    image: gravatarUrl,
  });

  if (error) {
    return data(
      { error: error.message || "Something went wrong" },
      { status: 400 },
    );
  }

  // If signing up via an invite link, go straight to it — skip onboarding
  if (redirectTo.startsWith("/invite/")) {
    throw redirect(redirectTo);
  }

  throw redirect("/onboarding");
}

export default function SignupPage() {
  return (
    <AuthCard
      title="Create an account"
      description="Enter your details below to create your account"
    >
      <SignUpForm />
    </AuthCard>
  );
}
