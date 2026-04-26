import { cn } from "~/lib/utils";

const headingStyles: Record<string, string> = {
  h1: "text-2xl",
  h2: "text-xl",
  h3: "text-base",
  h4: "text-sm",
  h5: "text-xs",
  h6: "text-xs",
};

const descriptionStyles: Record<string, string> = {
  h1: "mt-2 text-base",
  h2: "mt-1.5 text-sm",
  h3: "mt-1 text-sm",
  h4: "text-xs",
  h5: "text-xs",
  h6: "text-xs",
};

interface HeadingProps {
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  title: string;
  description?: string;
  className?: string;
}

export function Heading({
  as: Tag = "h3",
  title,
  description,
  className,
}: HeadingProps) {
  return (
    <div className={className}>
      <Tag className={cn("font-medium", headingStyles[Tag])}>{title}</Tag>
      {description && (
        <p className={cn("text-muted-foreground", descriptionStyles[Tag])}>
          {description}
        </p>
      )}
    </div>
  );
}
