import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Login: 5 attempts per 60s per identifier (email or IP) — stops brute force
// without locking out a genuine user who mistypes their password a couple times.
export const loginRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "60 s"),
  prefix: "ratelimit:login",
});

// Forgot password: 3 per hour per identifier — password reset emails are
// cheap to abuse for spam/harassment if unlimited.
export const forgotPasswordRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, "3600 s"),
  prefix: "ratelimit:forgot-password",
});

// Public order creation: 10 per 10 minutes per identifier (IP) — real
// customers place at most a couple orders in that window; this stops
// scripted spam order creation without blocking legitimate repeat customers.
export const publicOrderRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "600 s"),
  prefix: "ratelimit:public-order",
});

// Cron endpoint: 20 per minute — this is already protected by CRON_SECRET,
// this is just a backstop against a leaked/brute-forced secret being hammered.
export const cronRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, "60 s"),
  prefix: "ratelimit:cron",
});