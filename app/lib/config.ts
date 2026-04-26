export const config = {
  name: "Hopsell",
  tagline: "The simplest way to sell a file.",
  domain: "hopsell.shop",

  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
    cookieCacheMaxAge: 60 * 5,
  },

  rateLimit: {
    window: 10,
    max: 100,
  },
} as const;
