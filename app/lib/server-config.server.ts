export const serverConfig = {
  emailFrom: process.env.RESEND_FROM_EMAIL || "hello@hopsell.shop",
  platformFeeBps: Number(process.env.PLATFORM_FEE_BPS ?? 500),
} as const;
