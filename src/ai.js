import { envFlag } from "./config.js";

function getChatCompletionsUrl() {
  const baseUrl = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");
  if (baseUrl.endsWith("/chat/completions")) return baseUrl;
  return `${baseUrl}/chat/completions`;
}

function extractChatText(payload) {
  return payload.choices?.[0]?.message?.content || "";
}

export async function maybeAiSummary(items) {
  if (!envFlag("ENABLE_AI_SUMMARY", false) || !process.env.OPENAI_API_KEY) {
    return null;
  }

  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
  const input = items
    .slice(0, 30)
    .map((item, index) => `${index + 1}. ${item.title}\nSource: ${item.source}\nURL: ${item.link}\nContent: ${item.content}`)
    .join("\n\n");

  const response = await fetch(getChatCompletionsUrl(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content:
            "你是一个 Web3 + AI 情报分析员。请合并重复信息，按重要性输出中文摘要，避免投资建议。"
        },
        {
          role: "user",
          content:
            "请基于以下信息输出：1. 今日最重要5条；2. 每条为什么重要；3. 继续跟踪的3个信号。\n\n" + input
        }
      ],
      temperature: 0.2
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI API failed: HTTP ${response.status} ${await response.text()}`);
  }

  const payload = await response.json();
  return extractChatText(payload);
}
