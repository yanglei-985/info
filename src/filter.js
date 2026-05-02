function includesAny(text, terms) {
  return terms.some((term) => termMatches(text, term));
}

function termMatches(text, term) {
  const normalized = term.toLowerCase();
  if (/^[a-z0-9]{2,4}$/.test(normalized)) {
    return new RegExp(`(^|[^a-z0-9])${normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`).test(text);
  }
  return text.includes(normalized);
}

function uniqueByLinkOrTitle(items) {
  const seen = new Set();
  const unique = [];

  for (const item of items) {
    const key = (item.link || item.title).toLowerCase().replace(/^https?:\/\/(www\.)?/, "");
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
  }

  return unique;
}

export function scoreAndFilter(items, keywords) {
  const must = keywords.mustIncludeAny || [];
  const high = keywords.highPriority || [];
  const exclude = keywords.exclude || [];

  return uniqueByLinkOrTitle(items)
    .map((item) => {
      const text = `${item.title} ${item.content}`.toLowerCase();
      const excluded = includesAny(text, exclude);
      const matched = must.filter((term) => termMatches(text, term));
      const priority = high.filter((term) => termMatches(text, term));
      const ageHours = Math.max(0, (Date.now() - new Date(item.date).getTime()) / 36e5);
      const recency = Math.max(0, 24 - ageHours) / 24;
      const score = matched.length * 2 + priority.length * 3 + recency;

      return {
        ...item,
        matched,
        priority,
        score: Number(score.toFixed(2)),
        excluded
      };
    })
    .filter((item) => !item.excluded && (item.matched.length > 0 || item.priority.length > 0))
    .sort((a, b) => b.score - a.score)
    .slice(0, 80);
}

export function classify(item) {
  const text = `${item.title} ${item.content}`.toLowerCase();

  if (/(bitcoin|btc|ethereum|eth|solana|base|eigenlayer|zk|rwa|depin|airdrop|etf|stablecoin|crypto|web3)/i.test(text)) {
    return "web3";
  }

  if (/(openai|anthropic|claude|gemini|ai agent|mcp|llm|cursor|sora|model|paper|github|open source)/i.test(text)) {
    return "ai";
  }

  if (/(sec|regulation|policy|market|funding|raises|acquisition|etf)/i.test(text)) {
    return "market";
  }

  return "watch";
}
