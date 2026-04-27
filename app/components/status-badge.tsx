import { cn } from "~/lib/utils";

const variantStyles = {
  default: "bg-muted text-muted-foreground",
  primary: "bg-primary/10 text-primary",
  success: "bg-foreground/10 text-foreground",
};

interface StatusBadgeProps {
  variant?: keyof typeof variantStyles;
  children: React.ReactNode;
  className?: string;
}

export function StatusBadge({
  variant = "default",
  children,
  className,
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium",
        variantStyles[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
