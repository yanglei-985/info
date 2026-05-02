import fs from "node:fs/promises";
import { XMLParser } from "fast-xml-parser";
import { resolveFromRoot } from "./config.js";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: ""
});

function collectOutlines(node, feeds = []) {
  if (!node) return feeds;
  if (Array.isArray(node)) {
    node.forEach((child) => collectOutlines(child, feeds));
    return feeds;
  }

  if (node.xmlUrl) {
    feeds.push({
      title: node.title || node.text || node.xmlUrl,
      url: node.xmlUrl
    });
  }

  if (node.outline) collectOutlines(node.outline, feeds);
  return feeds;
}

export async function readOpmlFeeds(relativePath, limit = 50) {
  const raw = await fs.readFile(resolveFromRoot(relativePath), "utf8");
  const parsed = parser.parse(raw);
  const feeds = collectOutlines(parsed?.opml?.body?.outline);
  return feeds.slice(0, limit);
}
