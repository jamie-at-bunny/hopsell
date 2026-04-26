import { useState } from "react";
import { Link, useFetcher } from "react-router";
import type { Route } from "./+types/login";
import { auth } from "~/lib/auth.server";
import { authClient } from "~/lib/auth-client";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { config } from "~/lib/config";

export function meta() {
  return [{ title: `Sign in to ${config.name}` }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (session) {
    return Response.redirect(new URL("/dashboard", request.url), 302);
  }
  return null;
}

export async function clientAction({ request }: Route.ClientActionArgs) {
  const formData = await request.formData();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  if (!email) return { error: "Email required" };

  const callbackURL = String(formData.get("callbackURL") || "/dashboard");

  const { error } = await authClient.signIn.magicLink({ email, callbackURL });
  if (error) {
    return { error: error.message || "Failed to send sign-in link" };
  }

  return { sent: true, email };
}

export default function LoginPage() {
  const fetcher = useFetcher<typeof clientAction>();
  const [email, setEmail] = useState("");

  if (fetcher.data && "sent" in fetcher.data && fetcher.data.sent) {
    return (
      <main className="container mx-auto flex min-h-[60vh] max-w-md flex-col justify-center px-4 py-16">
        <h1 className="text-2xl font-semibold">Check your email</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          We sent a sign-in link to{" "}
          <span className="text-foreground font-medium">
            {fetcher.data.email}
          </span>
          . Click it to finish signing in.
        </p>
      </main>
    );
  }

  const error =
    fetcher.data && "error" in fetcher.data ? fetcher.data.error : null;

  return (
    <main className="container mx-auto flex min-h-[60vh] max-w-md flex-col justify-center px-4 py-16">
      <h1 className="text-2xl font-semibold">Sign in to {config.name}</h1>
      <p className="text-muted-foreground mt-2 text-sm">
        Enter your email and we&apos;ll send you a sign-in link.
      </p>

      <fetcher.Form method="post" className="mt-6 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        {error && <p className="text-destructive text-sm">{error}</p>}
        <Button type="submit" disabled={fetcher.state !== "idle"}>
          {fetcher.state !== "idle" ? "Sending…" : "Send sign-in link"}
        </Button>
      </fetcher.Form>

      <p className="text-muted-foreground mt-6 text-center text-sm">
        New here?{" "}
        <Link to="/" className="text-foreground underline">
          Drop a file to start selling
        </Link>
      </p>
    </main>
  );
}
