import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

export interface ConfirmActionProps {
  /** Content shown on the initial trigger button (text or icon) */
  trigger: React.ReactNode;
  /** Button variant for the trigger */
  variant?: "default" | "destructive" | "outline" | "ghost" | "secondary";
  /** Button size */
  size?: "default" | "sm" | "xs" | "lg" | "icon-sm";
  /** If provided, user must type this string to confirm */
  confirmMatch?: string;
  /** Label shown above the confirmation input */
  confirmLabel?: React.ReactNode;
  /** Text on the final confirm button (defaults to "Confirm") */
  confirmText?: string;
  /** Called when the action is confirmed */
  onConfirm: () => void | Promise<void>;
}

export function ConfirmAction({
  trigger,
  variant = "destructive",
  size = "sm",
  confirmMatch,
  confirmLabel,
  confirmText,
  onConfirm,
}: ConfirmActionProps) {
  const [revealed, setRevealed] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
      setRevealed(false);
      setInputValue("");
    }
  };

  if (!revealed) {
    return (
      <Button
        variant={variant}
        size={size}
        onClick={() => setRevealed(true)}
      >
        {trigger}
      </Button>
    );
  }

  // Confirmed state always uses text-friendly "sm" size
  const confirmSize = "sm";

  // Simple click-to-confirm (no text match required)
  if (!confirmMatch) {
    return (
      <div className="flex items-center gap-2">
        <Button
          variant={variant}
          size={confirmSize}
          onClick={handleConfirm}
          disabled={loading}
        >
          {loading ? "..." : confirmText || "Confirm"}
        </Button>
        <Button
          variant="ghost"
          size={confirmSize}
          onClick={() => setRevealed(false)}
        >
          Cancel
        </Button>
      </div>
    );
  }

  // Text match confirmation
  return (
    <div className="flex flex-col gap-2">
      {confirmLabel && (
        <p className="text-muted-foreground text-sm">{confirmLabel}</p>
      )}
      <Input
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder={confirmMatch}
        autoFocus
      />
      <div className="flex items-center gap-2">
        <Button
          variant={variant}
          size={confirmSize}
          onClick={handleConfirm}
          disabled={loading || inputValue !== confirmMatch}
        >
          {loading ? "..." : confirmText || "Confirm"}
        </Button>
        <Button
          variant="ghost"
          size={confirmSize}
          onClick={() => {
            setRevealed(false);
            setInputValue("");
          }}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
