import Parser from "rss-parser";
import { readOpmlFeeds } from "./opml.js";

const rssParser = new Parser({
  timeout: 8000,
  headers: {
    "User-Agent": "daily-intel-flow/1.0"
  }
});

function normalizeItem(item, sourceName) {
  const title = String(item.title || item.name || "Untitled").trim();
  const link = item.link || item.url || item.guid || "";
  const content = item.contentSnippet || item.content || item.description || item.summary || "";
  const date = item.isoDate || item.pubDate || item.date || new Date().toISOString();

  return {
    id: `${sourceName}:${link || title}`,
    source: sourceName,
    title,
    link,
    content: String(content).replace(/\s+/g, " ").trim(),
    date: new Date(date).toISOString()
  };
}

async function collectRssUrl(source) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), source.timeoutMs || 9000);

  try {
    const response = await fetch(source.url, {
      signal: controller.signal,
      headers: {
        Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
        "User-Agent": "daily-intel-flow/1.0"
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const xml = await response.text();
    const feed = await rssParser.parseString(xml);
    return (feed.items || [])
      .slice(0, source.limit || 20)
      .map((item) => normalizeItem(item, source.name || feed.title || source.url));
  } catch (error) {
    console.warn(`[rss] ${source.name || source.url}: ${error.message}`);
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

async function collectOpml(source) {
  const feeds = await readOpmlFeeds(source.path, source.limit || 40);
  const jobs = feeds.map((feed) =>
    collectRssUrl({
      name: feed.title,
      url: feed.url,
      limit: 5
    })
  );

  return (await Promise.all(jobs)).flat();
}

function flattenApiPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.news)) return payload.news;
  if (Array.isArray(payload?.articles)) return payload.articles;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

async function collectApi(source) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), source.timeoutMs || 10000);

  try {
    const response = await fetch(source.url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "daily-intel-flow/1.0"
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const payload = await response.json();
    return flattenApiPayload(payload)
      .slice(0, source.limit || 20)
      .map((item) =>
        normalizeItem(
          {
            title: item.title || item.name || item.headline,
            link: item.url || item.link,
            content: item.summary || item.description || item.content || item.text,
            date: item.published_at || item.publishedAt || item.date || item.created_at
          },
          source.name
        )
      );
  } catch (error) {
    console.warn(`[api] ${source.name || source.url}: ${error.message}`);
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

export async function collectAll(sources) {
  const rssJobs = (sources.rss || []).map((source) => (source.type === "opml" ? collectOpml(source) : collectRssUrl(source)));
  const apiJobs = (sources.api || []).map((source) => collectApi(source));
  const batches = await Promise.all([...rssJobs, ...apiJobs]);

  return batches.flat();
}
