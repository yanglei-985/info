import { collectAll } from "./collectors.js";
import { scoreAndFilter } from "./filter.js";
import { maybeAiSummary } from "./ai.js";
import { notify } from "./notifier.js";
import { readJson, envInt } from "./config.js";
import { writeReport } from "./report.js";
import { pathToFileURL } from "node:url";

export async function runOnce() {
  const [sources, keywords, reportConfig] = await Promise.all([
    readJson("config/sources.json"),
    readJson("config/keywords.json"),
    readJson("config/report.json")
  ]);

  const rawItems = await collectAll(sources);
  const maxItems = envInt("MAX_ITEMS_PER_SOURCE", 80);
  const items = scoreAndFilter(rawItems, keywords).slice(0, maxItems);
  const aiSummary = await maybeAiSummary(items);
  const report = await writeReport(reportConfig, items, aiSummary);
  await notify(report);

  console.log(`Collected ${rawItems.length} items, matched ${items.length}.`);
  console.log(`Markdown: ${report.latestPath}`);
  console.log(`HTML: ${report.htmlPath}`);
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runOnce().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
