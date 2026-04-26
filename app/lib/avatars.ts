async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Get a Gravatar URL for an email address.
 * Uses SHA256 hash. `?d=mp` returns a generic silhouette fallback.
 */
export async function getGravatarUrl(
  email: string,
  size = 200,
): Promise<string> {
  const hash = await sha256(email.trim().toLowerCase());
  return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=mp`;
}

/**
 * Check if a Gravatar exists for an email (returns true if not a default).
 */
export async function hasGravatar(email: string): Promise<boolean> {
  const hash = await sha256(email.trim().toLowerCase());
  const url = `https://www.gravatar.com/avatar/${hash}?d=404`;
  try {
    const res = await fetch(url, { method: "HEAD" });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Get a favicon URL for a domain via Google's favicon service.
 */
export function getFaviconUrl(domain: string, size = 64): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=${size}`;
}

/**
 * Extract the domain from an email address.
 */
export function getDomainFromEmail(email: string): string {
  return email.split("@")[1] || "";
}
