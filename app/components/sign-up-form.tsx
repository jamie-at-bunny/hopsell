import { Form, Link, useNavigation, useSearchParams, useActionData } from "react-router";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { FormField } from "~/components/form-field";

export function SignUpForm() {
  const navigation = useNavigation();
  const actionData = useActionData<{ error?: string }>();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";
  const loading = navigation.state === "submitting";

  return (
    <Form method="post" className="flex flex-col gap-4">
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <FormField label="Name" htmlFor="name">
        <Input
          id="name"
          name="name"
          type="text"
          placeholder="Your name"
          required
        />
      </FormField>
      <FormField label="Email" htmlFor="email">
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="you@example.com"
          required
          defaultValue={searchParams.get("email") || ""}
        />
      </FormField>
      <FormField label="Password" htmlFor="password">
        <Input
          id="password"
          name="password"
          type="password"
          required
        />
      </FormField>

      {actionData?.error && (
        <p className="text-destructive text-sm">{actionData.error}</p>
      )}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Creating account..." : "Sign up"}
      </Button>

      <p className="text-muted-foreground text-center text-sm">
        Already have an account?{" "}
        <Link
          to={`/login${redirectTo !== "/" ? `?redirect=${encodeURIComponent(redirectTo)}` : ""}`}
          className="text-foreground underline underline-offset-4"
        >
          Login
        </Link>
      </p>
    </Form>
  );
}
