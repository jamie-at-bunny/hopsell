import { randomBytes } from "node:crypto";
import { db } from "~/db/index.server";
import { verification } from "~/db/auth-schema";
import { auth } from "~/lib/auth.server";

const baseURL = () =>
  process.env.BETTER_AUTH_URL || "http://localhost:5173";

/**
 * Synthesise a signed Better Auth session for the given email by
 * pre-creating a magic-link verification row, then calling
 * `auth.handler` against the verify URL. The returned Response carries
 * the Set-Cookie session header. Copy it onto your final redirect.
 *
 * The user must already exist (or be creatable by Better Auth's
 * magic-link verify flow). For Hopsell we always pre-create the user
 * with the right `storagePrefix` before calling this.
 */
export async function createSessionResponseForEmail(opts: {
  email: string;
  name: string;
  callbackURL: string;
}): Promise<Response> {
  const token = randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 1000);

  await db.insert(verification).values({
    id: crypto.randomUUID(),
    identifier: token,
    value: JSON.stringify({
      email: opts.email,
      name: opts.name,
      attempt: 0,
    }),
    expiresAt,
  });

  const url = new URL("/api/auth/magic-link/verify", baseURL());
  url.searchParams.set("token", token);
  url.searchParams.set("callbackURL", opts.callbackURL);

  const verifyReq = new Request(url, {
    method: "GET",
    headers: {
      origin: baseURL(),
      "user-agent": "hopsell-internal",
    },
  });

  return auth.handler(verifyReq);
}

/**
 * Merge any Set-Cookie headers from `from` into a fresh redirect
 * response pointing at `to`. Used to pair a programmatic session-create
 * Response with a hand-rolled redirect target.
 */
export function redirectWithSession(
  to: string,
  from: Response,
): Response {
  const headers = new Headers({ Location: to });
  const setCookies = from.headers.getSetCookie?.() ?? [];
  if (setCookies.length === 0) {
    const single = from.headers.get("set-cookie");
    if (single) headers.append("Set-Cookie", single);
  } else {
    for (const c of setCookies) headers.append("Set-Cookie", c);
  }
  return new Response(null, { status: 303, headers });
}
