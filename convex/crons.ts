import { cronJobs } from "convex/server";
import { api } from "./_generated/api";

const crons = cronJobs();

crons.daily(
  "check-low-balances-morning",
  { hourUTC: 6, minuteUTC: 0 }, // 8 AM SAST (UTC+2)
  api.alerts.checkLowBalances
);

crons.daily(
  "check-low-balances-evening",
  { hourUTC: 16, minuteUTC: 0 }, // 6 PM SAST (UTC+2)
  api.alerts.checkLowBalances
);

export default crons;
