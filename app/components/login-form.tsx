import { useState } from "react";
import { Link, useNavigate, useSearchParams, useFetcher } from "react-router";
import { toast } from "sonner";
import { authClient } from "~/lib/auth-client";
import { OTPVerify } from "~/components/otp-verify";
import { FormField } from "~/components/form-field";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

export function LoginForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";
  const lastMethod = authClient.getLastUsedLoginMethod();
  const fetcher = useFetcher<{ step?: "otp" | "sso-redirect"; error?: string }>();
  const ssoFetcher = useFetcher<{ step?: "sso-redirect"; error?: string }>();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState(searchParams.get("email") || "");

  const loading = fetcher.state !== "idle";
  const error = fetcher.data?.error ?? null;
  const showOtp = fetcher.data?.step === "otp";

  if (showOtp) {
    return (
      <OTPVerify
        email={email}
        onVerify={async (otp) => {
          const res = await fetcher.submit(
            { intent: "verify-otp", email, otp, redirectTo },
            { method: "post" },
          );
        }}
        onBack={() => {
          // Reset fetcher data by re-rendering without OTP step
          fetcher.submit(
            { intent: "send-otp", email },
            { method: "post" },
          );
        }}
        error={error}
      />
    );
  }

  return (
    <fetcher.Form method="post" className="flex flex-col gap-4">
      <input type="hidden" name="intent" value={showPassword ? "password" : "send-otp"} />
      <input type="hidden" name="redirectTo" value={redirectTo} />

      <FormField label="Email" htmlFor="email">
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="you@example.com"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </FormField>

      {showPassword && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              to="/forgot-password"
              className="text-muted-foreground text-sm underline-offset-4 hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            required
            autoFocus
          />
        </div>
      )}

      {error && <p className="text-destructive text-sm">{error}</p>}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading
          ? showPassword
            ? "Signing in..."
            : "Sending code..."
          : showPassword
            ? "Login with password"
            : "Continue with email"}
        {lastMethod === "email" && !showPassword && (
          <span className="bg-primary-foreground/20 ml-auto rounded px-1.5 py-0.5 text-[10px] font-medium">
            Last used
          </span>
        )}
      </Button>

      <button
        type="button"
        onClick={() => {
          setShowPassword((prev) => !prev);
        }}
        className="text-muted-foreground hover:text-foreground text-sm underline-offset-4 hover:underline"
      >
        {showPassword ? "Use magic link" : "Use password instead"}
      </button>

      <div className="relative text-center text-sm">
        <span className="bg-background text-muted-foreground relative z-10 px-2">
          or
        </span>
        <div className="absolute inset-0 flex items-center">
          <div className="border-border w-full border-t" />
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={async () => {
          const result = await authClient.signIn.passkey();
          if (result.error) {
            toast.error("Passkey sign-in failed", {
              description: String(result.error.message || "Something went wrong"),
              duration: Infinity,
            });
            return;
          }
          navigate(redirectTo);
        }}
      >
        Sign in with passkey
        {lastMethod === "passkey" && (
          <span className="bg-primary/10 text-primary ml-auto rounded px-1.5 py-0.5 text-[10px] font-medium">
            Last used
          </span>
        )}
      </Button>

      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={ssoFetcher.state !== "idle" || !email}
        onClick={() => {
          ssoFetcher.submit(
            { intent: "sso", email, redirectTo },
            { method: "post" },
          );
        }}
      >
        {ssoFetcher.state !== "idle" ? "Redirecting..." : "Sign in with SSO"}
      </Button>
      {ssoFetcher.data?.error && (
        <p className="text-destructive text-sm">{ssoFetcher.data.error}</p>
      )}

      <p className="text-muted-foreground text-center text-sm">
        Don&apos;t have an account?{" "}
        <Link
          to={`/signup${redirectTo !== "/" ? `?redirect=${encodeURIComponent(redirectTo)}` : ""}`}
          className="text-foreground underline underline-offset-4"
        >
          Sign up
        </Link>
      </p>
    </fetcher.Form>
  );
}
