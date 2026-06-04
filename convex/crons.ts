import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

/**
 * Daily AI financial report.
 * 19:00 Yerevan time (Armenia is UTC+4 year-round, no DST) = 15:00 UTC.
 */
crons.daily(
  "daily-ai-report",
  { hourUTC: 15, minuteUTC: 0 },
  internal.notifications.runDailyAiReports,
);

/**
 * Materialise due recurring payments into real transactions.
 * Runs every day at 00:10 Yerevan time (UTC+4) = 20:10 UTC.
 */
crons.daily(
  "materialize-recurring",
  { hourUTC: 20, minuteUTC: 10 },
  internal.recurring.materializeDue,
);

export default crons;
