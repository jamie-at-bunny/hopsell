import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "hopsell_pre_auth";
const MAX_AGE = 60 * 60 * 24 * 7;

export interface PreAuthValue {
  storagePrefix: string;
}

function secret() {
  const s = process.env.BETTER_AUTH_SECRET;
  if (!s) throw new Error("BETTER_AUTH_SECRET is required");
  return s;
}

function sign(value: string) {
  const mac = createHmac("sha256", secret()).update(value).digest("base64url");
  return `${value}.${mac}`;
}

function unsign(signed: string): string | null {
  const idx = signed.lastIndexOf(".");
  if (idx === -1) return null;
  const value = signed.slice(0, idx);
  const mac = signed.slice(idx + 1);
  const expected = createHmac("sha256", secret())
    .update(value)
    .digest("base64url");
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return value;
}

function parseCookies(header: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of header.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (!name || rest.length === 0) continue;
    out[name] = decodeURIComponent(rest.join("="));
  }
  return out;
}

export function readPreAuth(request: Request): PreAuthValue | null {
  const header = request.headers.get("cookie");
  if (!header) return null;
  const cookies = parseCookies(header);
  const signed = cookies[COOKIE_NAME];
  if (!signed) return null;
  const raw = unsign(signed);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PreAuthValue;
  } catch {
    return null;
  }
}

export function getOrIssuePreAuth(request: Request): {
  value: PreAuthValue;
  isNew: boolean;
} {
  const existing = readPreAuth(request);
  if (existing) return { value: existing, isNew: false };
  return { value: { storagePrefix: randomUUID() }, isNew: true };
}

export function preAuthSetCookie(value: PreAuthValue): string {
  const signed = sign(JSON.stringify(value));
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${COOKIE_NAME}=${encodeURIComponent(signed)}; Path=/; Max-Age=${MAX_AGE}; HttpOnly; SameSite=Lax${secure}`;
}

export function preAuthClearCookie(): string {
  return `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`;
}
