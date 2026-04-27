import { eq } from "drizzle-orm";
import { z } from "zod";
import { randomBytes, randomUUID } from "node:crypto";
import type { Route } from "./+types/_index";
import { auth } from "~/lib/auth.server";
import {
  getOrIssuePreAuth,
  preAuthSetCookie,
  readPreAuth,
  preAuthClearCookie,
} from "~/lib/pre-auth-cookie.server";
import {
  createSessionResponseForEmail,
  redirectWithSession,
} from "~/lib/auth-actions.server";
import { db } from "~/db/index.server";
import { user as userTable } from "~/db/auth-schema";
import { products, pendingListings } from "~/db/marketplace-schema";
import { generateSlug, uniqueSlug } from "~/lib/slug.server";
import { sendEmail } from "~/lib/email.server";
import { createOnboardingLink } from "~/lib/stripe-connect.server";
import { getDailyBackground } from "~/lib/unsplash.server";
import type { DailyBackground } from "~/lib/unsplash.server";
import { config } from "~/lib/config";
import React from "react";
import Welcome from "~/emails/welcome";
import VerifyListing from "~/emails/verify-listing";
import { SellFlow } from "~/components/sell-flow";

export function meta() {
  return [
    { title: `${config.name} · ${config.tagline}` },
    {
      name: "description",
      content:
        "Drop a file. Set a price. Get paid. 5% + Stripe fees. No subscription.",
    },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  const background = await getDailyBackground();

  if (session) return { isAuthenticated: true, background };

  const { value, isNew } = getOrIssuePreAuth(request);
  if (isNew) {
    return new Response(
      JSON.stringify({ isAuthenticated: false, background }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": preAuthSetCookie(value),
        },
      },
    );
  }
  return { isAuthenticated: false, background };
}

const ALLOWED_EXTENSIONS = new Set([
  "pdf",
  "epub",
  "mobi",
  "txt",
  "md",
  "docx",
  "xlsx",
  "csv",
  "pptx",
  "odt",
  "zip",
  "tar",
  "gz",
  "7z",
  "rar",
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "svg",
  "psd",
  "ai",
  "sketch",
  "fig",
  "mp3",
  "wav",
  "flac",
  "ogg",
  "mp4",
  "mov",
  "webm",
  "json",
  "xml",
  "html",
  "css",
  "js",
  "ts",
]);

const formSchema = z.object({
  title: z.string().min(1).max(120),
  price: z
    .string()
    .transform((v) => Number.parseFloat(v))
    .refine((n) => Number.isFinite(n) && n >= 0.5, {
      message: "Price must be at least £0.50",
    }),
  email: z
    .string()
    .email()
    .transform((v) => v.toLowerCase().trim()),
  description: z
    .string()
    .max(2000)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  storagePath: z.string().min(1),
  originalFilename: z.string().min(1),
  fileExtension: z
    .string()
    .min(1)
    .transform((v) => v.toLowerCase()),
  fileMimeType: z.string().default(""),
  fileSizeBytes: z
    .string()
    .transform((v) => Number.parseInt(v, 10))
    .refine((n) => Number.isFinite(n) && n >= 0, {
      message: "Invalid file size",
    }),
});

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const raw = Object.fromEntries(formData);
  const parsed = formSchema.safeParse(raw);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid form" },
      { status: 400 },
    );
  }

  const data = parsed.data;
  if (!ALLOWED_EXTENSIONS.has(data.fileExtension)) {
    return Response.json(
      { error: `File type .${data.fileExtension} not allowed` },
      { status: 400 },
    );
  }

  const priceCents = Math.round(data.price * 100);

  const preAuth = readPreAuth(request);
  const session = await auth.api.getSession({ headers: request.headers });
  const viewerId = session?.user.id;

  const existing = await db.query.user.findFirst({
    where: eq(userTable.email, data.email),
  });

  // If the email belongs to an existing seller and the visitor isn't already
  // signed in as them, require email confirmation before publishing the
  // product. Stops anyone from attaching listings to someone else's account.
  if (existing && existing.id !== viewerId) {
    const token = randomBytes(24).toString("base64url");
    const baseURL = process.env.BETTER_AUTH_URL || "http://localhost:5173";

    await db.insert(pendingListings).values({
      id: randomUUID(),
      token,
      email: data.email,
      title: data.title,
      description: data.description ?? null,
      priceCents,
      currency: "gbp",
      fileId: data.storagePath.split("/").pop()?.split(".")[0] ?? randomUUID(),
      fileSizeBytes: data.fileSizeBytes,
      fileMimeType: data.fileMimeType || "application/octet-stream",
      fileExtension: data.fileExtension,
      originalFilename: data.originalFilename,
      storagePath: data.storagePath,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
    });

    const verifyUrl = `${baseURL}/listings/verify?token=${encodeURIComponent(token)}`;
    void sendEmail({
      to: data.email,
      subject: `Confirm your new listing on ${config.name}`,
      react: React.createElement(VerifyListing, {
        productTitle: data.title,
        url: verifyUrl,
      }),
    });

    return Response.json({ verificationSent: true, email: data.email });
  }

  let sellerId: string;
  let sellerName: string;
  let sellerChargesEnabled = false;

  if (existing) {
    sellerId = existing.id;
    sellerName = existing.name;
    sellerChargesEnabled = !!existing.chargesEnabled;
  } else {
    sellerId = randomUUID();
    sellerName = data.email.split("@")[0] ?? "Seller";
    const storagePrefix = preAuth?.storagePrefix ?? randomUUID();
    await db.insert(userTable).values({
      id: sellerId,
      name: sellerName,
      email: data.email,
      emailVerified: true,
      storagePrefix,
      chargesEnabled: false,
      payoutsEnabled: false,
    });
  }

  const baseSlug = generateSlug(data.title);
  const slug = await uniqueSlug(baseSlug);

  const productId = randomUUID();
  await db.insert(products).values({
    id: productId,
    userId: sellerId,
    slug,
    title: data.title,
    description: data.description ?? null,
    priceCents,
    currency: "gbp",
    status: sellerChargesEnabled ? "live" : "pending_connect",
    fileId: data.storagePath.split("/").pop()?.split(".")[0] ?? randomUUID(),
    fileSizeBytes: data.fileSizeBytes,
    fileMimeType: data.fileMimeType || "application/octet-stream",
    fileExtension: data.fileExtension,
    originalFilename: data.originalFilename,
    storagePath: data.storagePath,
  });

  const baseURL = process.env.BETTER_AUTH_URL || "http://localhost:5173";

  let destination = `/p/${slug}`;
  if (!sellerChargesEnabled && process.env.STRIPE_SECRET_KEY) {
    try {
      destination = await createOnboardingLink({
        seller: {
          id: sellerId,
          email: data.email,
          stripeAccountId: existing?.stripeAccountId ?? null,
        },
        returnUrl: `/p/${slug}?stripe=return`,
        refreshUrl: `/p/${slug}?stripe=refresh`,
      });
    } catch (err) {
      console.error("[sell-flow] Stripe onboarding link failed:", err);
    }
  }

  if (!existing) {
    void sendEmail({
      to: data.email,
      subject: `Welcome to ${config.name}`,
      react: React.createElement(Welcome, {
        productTitle: data.title,
        productUrl: `${baseURL}/p/${slug}`,
        connectUrl: `${baseURL}/p/${slug}`,
      }),
    });
  }

  const sessionResponse = await createSessionResponseForEmail({
    email: data.email,
    name: sellerName,
    callbackURL: `/p/${slug}`,
  });

  const finalResponse = redirectWithSession(destination, sessionResponse);
  finalResponse.headers.append("Set-Cookie", preAuthClearCookie());
  return finalResponse;
}

export default function Index({ loaderData }: Route.ComponentProps) {
  const { background } = loaderData;
  return (
    <main className="text-hop-text">
      <section className="relative isolate flex min-h-screen items-center overflow-hidden">
        {background ? (
          <HeroBackdrop background={background} />
        ) : (
          <HeroFallback />
        )}
        <div className="relative mx-auto w-full max-w-[640px] px-6 py-16">
          <div className="mb-10 text-center">
            <h1 className="mx-auto mb-4 max-w-[20ch] text-[clamp(2.4rem,5.5vw,3.8rem)] font-semibold tracking-tight text-balance">
              Sell any file.
            </h1>
            <p className="text-hop-muted mx-auto max-w-[460px] text-[0.9375rem] text-pretty">
              Drop a file. Set a price. Get paid.
            </p>
          </div>

          <SellFlow />

          <p className="text-hop-muted mt-6 text-center text-[0.75rem]">
            Stripe processing fee + 5%
          </p>

        </div>
      </section>
    </main>
  );
}

function HeroBackdrop({ background }: { background: DailyBackground }) {
  return (
    <>
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <img
          src={background.imageUrl}
          alt=""
          className="size-full object-cover"
          loading="eager"
          fetchPriority="high"
        />
        {/* Soften the photo behind the form and dissolve into the white below. */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/30 via-white/40 to-white" />
      </div>
      <p className="text-hop-muted absolute right-4 bottom-3 z-10 text-[0.625rem] tracking-tight">
        Photo by{" "}
        <a
          href={background.photographerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-hop-text underline underline-offset-2 transition-colors"
        >
          {background.photographerName}
        </a>{" "}
        on{" "}
        <a
          href={background.photoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-hop-text underline underline-offset-2 transition-colors"
        >
          Unsplash
        </a>
      </p>
    </>
  );
}

function HeroFallback() {
  // No UNSPLASH_ACCESS_KEY set: use a daily-seeded Picsum placeholder so the
  // page never looks empty. Add the env var to switch to real Unsplash photos.
  const today = new Date().toISOString().slice(0, 10);
  const placeholderUrl = `https://picsum.photos/seed/hopsell-${today}/1920/1080`;
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <img
        src={placeholderUrl}
        alt=""
        className="size-full object-cover"
        loading="eager"
        fetchPriority="high"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-white/30 via-white/40 to-white" />
    </div>
  );
}

