import { useState } from "react";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from "~/components/ui/input-otp";
import { Button } from "~/components/ui/button";

interface OTPVerifyProps {
  email: string;
  onVerify: (otp: string) => Promise<void>;
  onBack: () => void;
  error?: string | null;
}

export function OTPVerify({ email, onVerify, onBack, error }: OTPVerifyProps) {
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (otp.length !== 6) return;
    setLoading(true);
    try {
      await onVerify(otp);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-2xl font-bold">Check your email</h1>
        <p className="text-muted-foreground text-sm text-balance">
          We sent a 6-digit code to{" "}
          <span className="text-foreground font-medium">{email}</span>
        </p>
      </div>
      <div className="flex flex-col items-center gap-4">
        <InputOTP
          maxLength={6}
          pattern={REGEXP_ONLY_DIGITS}
          value={otp}
          onChange={setOtp}
          onComplete={handleSubmit}
          autoFocus
        >
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
          </InputOTPGroup>
          <InputOTPSeparator />
          <InputOTPGroup>
            <InputOTPSlot index={3} />
            <InputOTPSlot index={4} />
            <InputOTPSlot index={5} />
          </InputOTPGroup>
        </InputOTP>
        {error && <p className="text-destructive text-sm">{error}</p>}
        <Button
          onClick={handleSubmit}
          disabled={otp.length !== 6 || loading}
          className="w-full"
        >
          {loading ? "Verifying..." : "Verify code"}
        </Button>
        <button
          type="button"
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground text-sm underline-offset-4 hover:underline"
        >
          Back
        </button>
      </div>
    </div>
  );
}
