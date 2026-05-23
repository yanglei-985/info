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

// Source-name → bucket. Most reliable signal.
const SOURCE_BUCKETS = {
  // 法语经济学
  "Le Monde - Économie": "fr",
  "Alternatives Économiques": "fr",

  // 工程与思维武器
  "Martin Fowler (架构思维)": "eng",
  "Julia Evans (概念图解)": "eng",
  "Coding Horror (编程哲学)": "eng",
  "The Pragmatic Engineer": "eng",
  "ByteByteGo (系统设计)": "eng",
  "GitHub Trending Daily": "eng",

  // 商业与产品
  "Paul Graham": "biz",
  "Patrick McKenzie - Bits about Money": "biz"

  // Everything else (HF, Karpathy, OpenAI, Anthropic, ...) defaults to "ai"
};

export function classify(item) {
  if (item.source && SOURCE_BUCKETS[item.source]) {
    return SOURCE_BUCKETS[item.source];
  }

  const text = `${item.title || ""} ${item.content || ""}`.toLowerCase();

  // French content fallback (accented chars + economy term)
  if (/[éèàçùâêîôûœ]/i.test(item.title || "") &&
      /(économ|france|français|marché|entreprise|banque)/i.test(text)) {
    return "fr";
  }

  // Engineering / CS thinking
  if (/(architect|refactor|design pattern|concurren|cache|distributed|database|kernel|protocol|algorithm|system design)/i.test(text)) {
    return "eng";
  }

  // Business
  if (/(startup|founder|funding|venture|business|product[ -]market|essay)/i.test(text)) {
    return "biz";
  }

  // Default = AI
  return "ai";
}
