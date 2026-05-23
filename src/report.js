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

  // Build buckets dynamically from config so we never hardcode bucket names
  const grouped = {};
  for (const section of config.sections) {
    if (section.id !== "top") grouped[section.id] = [];
  }
  const fallback = grouped.watch ? "watch" : Object.keys(grouped)[0];

  for (const item of items.slice(5)) {
    const bucket = classify(item);
    (grouped[bucket] || grouped[fallback]).push(item);
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

function inlineMarkdown(text) {
  let s = escapeHtml(text);
  s = s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/\*(.+?)\*/g, "<em>$1</em>");
  s = s.replace(/`(.+?)`/g, "<code>$1</code>");
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
  return s;
}

function markdownToHtml(markdown) {
  const lines = markdown.split("\n");
  const output = [];
  let inList = false;

  for (const line of lines) {
    if (!line.trim()) {
      if (inList) { output.push("</ul>"); inList = false; }
      continue;
    }
    if (/^---+$/.test(line.trim())) {
      if (inList) { output.push("</ul>"); inList = false; }
      output.push("<hr />");
      continue;
    }
    if (line.startsWith("# ")) {
      if (inList) { output.push("</ul>"); inList = false; }
      output.push(`<h1>${inlineMarkdown(line.slice(2))}</h1>`);
      continue;
    }
    if (line.startsWith("## ")) {
      if (inList) { output.push("</ul>"); inList = false; }
      output.push(`<h2>${inlineMarkdown(line.slice(3))}</h2>`);
      continue;
    }
    if (line.startsWith("### ")) {
      if (inList) { output.push("</ul>"); inList = false; }
      output.push(`<h3>${inlineMarkdown(line.slice(4))}</h3>`);
      continue;
    }
    if (line.startsWith("#### ")) {
      if (inList) { output.push("</ul>"); inList = false; }
      output.push(`<h4>${inlineMarkdown(line.slice(5))}</h4>`);
      continue;
    }
    if (/^\d+\. /.test(line)) {
      if (inList) { output.push("</ul>"); inList = false; }
      const content = line.replace(/^\d+\.\s*/, "");
      output.push(`<p class="item">${inlineMarkdown(content)}</p>`);
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      if (!inList) { output.push("<ul>"); inList = true; }
      const content = line.replace(/^[-*]\s+/, "");
      output.push(`<li>${inlineMarkdown(content)}</li>`);
      continue;
    }
    if (line.startsWith("  ")) {
      output.push(`<p class="meta">${inlineMarkdown(line.trim())}</p>`);
      continue;
    }
    if (line.startsWith("> ")) {
      if (inList) { output.push("</ul>"); inList = false; }
      output.push(`<blockquote><p>${inlineMarkdown(line.slice(2))}</p></blockquote>`);
      continue;
    }
    if (inList) { output.push("</ul>"); inList = false; }
    output.push(`<p>${inlineMarkdown(line)}</p>`);
  }
  if (inList) output.push("</ul>");

  const html = output.join("\n");

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>每日信息流</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #faf9f5;
      --ink: #1a1a1a;
      --muted: #6b6b6b;
      --accent: #b8472b;
      --rule: #e8e6df;
      --code-bg: #f1efe8;
      --serif: ui-serif, "Charter", "Iowan Old Style", "Source Serif Pro", Georgia, Cambria, serif;
      --sans: ui-sans-serif, system-ui, -apple-system, "Inter", "PingFang SC", "Hiragino Sans GB", "Microsoft Yahei", sans-serif;
      --mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--ink);
      font-family: var(--sans);
      font-size: 16px;
      line-height: 1.65;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    main {
      max-width: 760px;
      margin: 0 auto;
      padding: 56px 24px 96px;
    }

    h1 {
      font-family: var(--sans);
      font-size: 40px;
      font-weight: 800;
      letter-spacing: -0.02em;
      line-height: 1.1;
      margin: 0 0 8px;
    }
    h2 {
      font-family: var(--sans);
      font-size: 24px;
      font-weight: 700;
      letter-spacing: -0.01em;
      margin: 56px 0 20px;
      padding-top: 24px;
      border-top: 2px solid var(--ink);
    }
    h3 {
      font-family: var(--sans);
      font-size: 18px;
      font-weight: 700;
      margin: 28px 0 10px;
    }
    h4 {
      font-family: var(--sans);
      font-size: 13px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--muted);
      margin: 20px 0 6px;
    }

    p {
      font-family: var(--serif);
      font-size: 17px;
      line-height: 1.72;
      margin: 12px 0;
    }
    h1 + p {
      font-family: var(--sans);
      font-size: 13px;
      color: var(--muted);
      margin-top: 0;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    a {
      color: var(--ink);
      text-decoration: underline;
      text-decoration-color: var(--accent);
      text-decoration-thickness: 1.5px;
      text-underline-offset: 4px;
      transition: color 0.15s ease;
    }
    a:hover { color: var(--accent); }

    .item {
      font-family: var(--sans);
      font-size: 17px;
      font-weight: 600;
      line-height: 1.4;
      margin: 28px 0 4px;
    }
    .item a {
      text-decoration: none;
      border-bottom: 1.5px solid var(--accent);
      padding-bottom: 1px;
    }
    .item a:hover {
      background: rgba(184, 71, 43, 0.08);
    }

    .meta {
      font-family: var(--sans);
      color: var(--muted);
      font-size: 13px;
      line-height: 1.5;
      margin: 4px 0;
    }

    ul {
      padding-left: 22px;
      margin: 12px 0;
    }
    li {
      font-family: var(--serif);
      font-size: 17px;
      line-height: 1.7;
      margin: 6px 0;
    }
    li strong { color: var(--ink); }

    code {
      font-family: var(--mono);
      background: var(--code-bg);
      padding: 1px 6px;
      border-radius: 3px;
      font-size: 0.88em;
    }
    hr {
      border: none;
      border-top: 1px solid var(--rule);
      margin: 32px 0;
    }
    blockquote {
      border-left: 3px solid var(--accent);
      margin: 18px 0;
      padding: 4px 0 4px 18px;
      color: var(--muted);
      font-style: italic;
    }
    strong { font-weight: 700; color: var(--ink); }

    @media (max-width: 600px) {
      main { padding: 32px 18px 64px; }
      h1 { font-size: 30px; }
      h2 { font-size: 20px; margin-top: 40px; }
      p, li { font-size: 16px; }
      .item { font-size: 16px; }
    }

    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #1a1a1a;
        --ink: #ebe9e2;
        --muted: #9c9a91;
        --accent: #e07b5c;
        --rule: #2c2c2c;
        --code-bg: #2a2a2a;
        color-scheme: dark;
      }
    }
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
