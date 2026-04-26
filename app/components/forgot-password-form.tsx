import { useState } from "react";
import { Link, useFetcher } from "react-router";
import { OTPVerify } from "~/components/otp-verify";
import { FormField } from "~/components/form-field";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

export function ForgotPasswordForm() {
  const fetcher = useFetcher<{ step?: "otp"; error?: string }>();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");

  const loading = fetcher.state !== "idle";
  const error = fetcher.data?.error ?? null;
  const step = otp
    ? "new-password"
    : fetcher.data?.step === "otp"
      ? "otp"
      : "email";

  if (step === "otp") {
    return (
      <OTPVerify
        email={email}
        onVerify={async (code) => {
          setOtp(code);
        }}
        onBack={() => {
          setOtp("");
        }}
        error={error}
      />
    );
  }

  if (step === "new-password") {
    return (
      <fetcher.Form method="post" className="flex flex-col gap-4">
        <input type="hidden" name="intent" value="reset-password" />
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="otp" value={otp} />
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Set new password</h1>
          <p className="text-muted-foreground text-sm">
            Enter your new password below
          </p>
        </div>
        <FormField label="New password" htmlFor="new-password">
          <Input
            id="new-password"
            name="password"
            type="password"
            required
          />
        </FormField>

        {error && <p className="text-destructive text-sm">{error}</p>}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Resetting..." : "Reset password"}
        </Button>
      </fetcher.Form>
    );
  }

  return (
    <fetcher.Form method="post" className="flex flex-col gap-4">
      <input type="hidden" name="intent" value="send-otp" />
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

      {error && <p className="text-destructive text-sm">{error}</p>}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Sending code..." : "Send reset code"}
      </Button>

      <p className="text-muted-foreground text-center text-sm">
        Remember your password?{" "}
        <Link
          to="/login"
          className="text-foreground underline underline-offset-4"
        >
          Login
        </Link>
      </p>
    </fetcher.Form>
  );
}
