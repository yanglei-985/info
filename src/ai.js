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
            "你是一名 Web3 + AI 情报分析员。要求：\n" +
            "- 中文输出，语气克制、客观，避免投资建议。\n" +
            "- 合并重复/相似信息，优先保留信号强度高的。\n" +
            "- 极度精炼：能用短句就不用长句，不堆砌修辞，不复述原文。\n" +
            "- 不要使用 emoji、装饰性标题、表情符号。"
        },
        {
          role: "user",
          content:
            "请基于以下信息生成一份**精简**日报摘要，严格按照下面结构和字数限制输出（总长度不超过 500 字）：\n\n" +
            "## 今日要点（TOP 3）\n" +
            "- 用一句话（不超过 40 字）写明事件和核心意义。共 3 条。\n\n" +
            "## 为什么重要\n" +
            "- 每条对应上面一条，用 1-2 句话（不超过 60 字）说明影响。共 3 条。\n\n" +
            "## 继续跟踪\n" +
            "- 用一句话（不超过 30 字）列出 2 个需要持续观察的信号。共 2 条。\n\n" +
            "信息源：\n" + input
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
