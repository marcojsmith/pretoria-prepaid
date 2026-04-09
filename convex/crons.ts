import { cronJobs } from "convex/server";
import { api } from "./_generated/api";
import { internal } from "./_generated/api";
import { CRON_HOUR_MORNING, CRON_HOUR_EVENING } from "./constants";

const CRON_HOUR_PURGE_STALE_RATE_LIMITS = 3; // 3 AM UTC (5 AM SAST)

const crons = cronJobs();

crons.daily(
  "check-low-balances-morning",
  { hourUTC: CRON_HOUR_MORNING, minuteUTC: 0 }, // 8 AM SAST (UTC+2)
  api.alerts.checkLowBalances
);

crons.daily(
  "check-low-balances-evening",
  { hourUTC: CRON_HOUR_EVENING, minuteUTC: 0 }, // 6 PM SAST (UTC+2)
  api.alerts.checkLowBalances
);

crons.daily(
  "purge-stale-rate-limits",
  { hourUTC: CRON_HOUR_PURGE_STALE_RATE_LIMITS, minuteUTC: 0 }, // 3 AM UTC (5 AM SAST)
  internal.lib.rateLimiter.purgeStaleRateLimits
);

export default crons;
