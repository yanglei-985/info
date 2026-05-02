import fs from "node:fs/promises";
import path from "node:path";
import { classify } from "./filter.js";
import { resolveFromRoot } from "./config.js";

function fmtDate(date) {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: process.env.REPORT_TIMEZONE || "Asia/Bangkok",
    dateStyle: "full",
    timeStyle: "short"
  }).format(date);
}

function localDateKey(date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: process.env.REPORT_TIMEZONE || "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function itemLine(item, index) {
  const link = item.link ? `[${item.title}](${item.link})` : item.title;
  const tags = [...item.matched, ...item.priority].slice(0, 5).map((tag) => `\`${tag}\``).join(" ");
  const detail = item.content ? `\n  ${item.content.slice(0, 220)}${item.content.length > 220 ? "..." : ""}` : "";
  return `${index + 1}. ${link}\n  来源：${item.source} | 分数：${item.score}${tags ? ` | ${tags}` : ""}${detail}`;
}

function buildMarkdown(config, items, aiSummary) {
  const now = new Date();
  const topItems = items.slice(0, 5);
  const grouped = {
    web3: [],
    ai: [],
    market: [],
    watch: []
  };

  for (const item of items.slice(5)) {
    grouped[classify(item)].push(item);
  }

  const lines = [
    `# ${config.title}`,
    "",
    `生成时间：${fmtDate(now)}`,
    "",
    `采集命中：${items.length} 条`,
    ""
  ];

  if (aiSummary) {
    lines.push("## AI 主编摘要", "", aiSummary.trim(), "");
  }

  lines.push("## 今日最重要", "");
  lines.push(...(topItems.length ? topItems.map(itemLine) : ["今天没有命中高优先级信息。"]));
  lines.push("");

  for (const section of config.sections.filter((section) => section.id !== "top")) {
    const sectionItems = grouped[section.id] || [];
    lines.push(`## ${section.title}`, "");
    lines.push(...(sectionItems.length ? sectionItems.slice(0, 12).map(itemLine) : ["暂无命中。"]));
    lines.push("");
  }

  return lines.join("\n");
}

function markdownToHtml(markdown) {
  const html = markdown
    .split("\n")
    .map((line) => {
      if (line.startsWith("# ")) return `<h1>${escapeHtml(line.slice(2))}</h1>`;
      if (line.startsWith("## ")) return `<h2>${escapeHtml(line.slice(3))}</h2>`;
      if (/^\d+\. /.test(line)) {
        const linked = line.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
        return `<p class="item">${linked}</p>`;
      }
      if (line.startsWith("  ")) return `<p class="meta">${escapeHtml(line.trim())}</p>`;
      if (!line.trim()) return "";
      return `<p>${escapeHtml(line)}</p>`;
    })
    .join("\n");

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>每日信息流</title>
  <style>
    :root { color-scheme: light; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { margin: 0; background: #f7f7f4; color: #1d1d1b; }
    main { max-width: 920px; margin: 0 auto; padding: 40px 20px 72px; }
    h1 { font-size: 36px; line-height: 1.15; margin: 0 0 16px; }
    h2 { font-size: 22px; line-height: 1.3; margin: 34px 0 14px; border-top: 1px solid #d8d8cf; padding-top: 20px; }
    p { font-size: 16px; line-height: 1.72; margin: 8px 0; }
    a { color: #146c6c; text-decoration-thickness: 1px; text-underline-offset: 3px; }
    .item { font-weight: 650; margin-top: 16px; }
    .meta { color: #5d625d; font-size: 14px; margin-left: 20px; }
    code { background: #ecebe3; padding: 2px 5px; border-radius: 4px; }
  </style>
</head>
<body>
  <main>
${html}
  </main>
</body>
</html>`;
}

export async function writeReport(config, items, aiSummary) {
  const markdown = buildMarkdown(config, items, aiSummary);
  const date = localDateKey(new Date());
  const reportDir = resolveFromRoot("reports");
  const publicDir = resolveFromRoot("public");

  await fs.mkdir(reportDir, { recursive: true });
  await fs.mkdir(publicDir, { recursive: true });

  const mdPath = path.join(reportDir, `${date}.md`);
  const latestPath = path.join(reportDir, "latest.md");
  const htmlPath = path.join(publicDir, "index.html");

  await fs.writeFile(mdPath, markdown, "utf8");
  await fs.writeFile(latestPath, markdown, "utf8");
  await fs.writeFile(htmlPath, markdownToHtml(markdown), "utf8");

  return { mdPath, latestPath, htmlPath, markdown };
}
