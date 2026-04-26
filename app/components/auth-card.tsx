import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

interface AuthCardProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
}

export function AuthCard({ title, description, children }: AuthCardProps) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        {title && (
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{title}</CardTitle>
            {description && (
              <CardDescription>{description}</CardDescription>
            )}
          </CardHeader>
        )}
        <CardContent className={title ? undefined : "pt-6"}>
          {children}
        </CardContent>
      </Card>
    </div>
  );
}
