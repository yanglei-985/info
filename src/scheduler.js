import cron from "node-cron";
import { runOnce } from "./index.js";

const schedule = process.env.CRON_SCHEDULE || "0 8 * * *";

console.log(`Daily intel scheduler started. Schedule: ${schedule}`);

async function runJob() {
  const started = new Date().toISOString();
  console.log(`[${started}] Running daily intel flow...`);
  try {
    await runOnce();
    console.log(`[${new Date().toISOString()}] Done.`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Failed:`, error);
  }
}

cron.schedule(schedule, runJob, {
  timezone: process.env.REPORT_TIMEZONE || "Asia/Bangkok"
});

if (process.argv.includes("--run-now")) {
  runJob();
}
