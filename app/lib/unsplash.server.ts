interface UnsplashRandomPhoto {
  urls: { raw: string };
  user: { name: string; links: { html: string } };
  links: { html: string; download_location: string };
}

export interface DailyBackground {
  imageUrl: string;
  photoUrl: string;
  photographerName: string;
  photographerUrl: string;
}

const UTM = "utm_source=hopsell&utm_medium=referral";

let cache: { dateKey: string; data: DailyBackground | null } | null = null;

function todayKey(): string {
  // UTC date: same image worldwide for the day, predictable cache invalidation.
  return new Date().toISOString().slice(0, 10);
}

let warnedMissingKey = false;

export async function getDailyBackground(): Promise<DailyBackground | null> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) {
    if (!warnedMissingKey) {
      warnedMissingKey = true;
      console.warn(
        "[unsplash] UNSPLASH_ACCESS_KEY not set — homepage hero is using the no-key fallback. Get a free Demo key at https://unsplash.com/developers and add it to .env.",
      );
    }
    return null;
  }

  const dateKey = todayKey();
  if (cache && cache.dateKey === dateKey) return cache.data;

  try {
    const res = await fetch(
      "https://api.unsplash.com/photos/random?orientation=landscape&content_filter=high&query=minimal",
      {
        headers: {
          Authorization: `Client-ID ${key}`,
          "Accept-Version": "v1",
        },
      },
    );
    if (!res.ok) {
      console.warn(`[unsplash] random fetch ${res.status}`);
      cache = { dateKey, data: null };
      return null;
    }
    const photo = (await res.json()) as UnsplashRandomPhoto;

    // Unsplash attribution guideline: ping download_location when the photo
    // is "used" (rendered to a user). Fire-and-forget.
    void fetch(photo.links.download_location, {
      headers: { Authorization: `Client-ID ${key}` },
    }).catch(() => {});

    const data: DailyBackground = {
      imageUrl: `${photo.urls.raw}&w=1920&q=80&fm=webp&fit=max`,
      photoUrl: `${photo.links.html}?${UTM}`,
      photographerName: photo.user.name,
      photographerUrl: `${photo.user.links.html}?${UTM}`,
    };
    cache = { dateKey, data };
    return data;
  } catch (err) {
    console.warn("[unsplash] fetch failed:", err);
    cache = { dateKey, data: null };
    return null;
  }
}
