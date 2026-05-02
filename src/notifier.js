function shorten(text, maxLength) {
  return text.length > maxLength ? `${text.slice(0, maxLength - 20)}\n\n...truncated` : text;
}

function guessWebhookType(url) {
  const explicit = (process.env.WEBHOOK_TYPE || "").toLowerCase().trim();
  if (explicit && explicit !== "auto") return explicit;

  if (url.includes("open.feishu.cn") || url.includes("open.larksuite.com")) return "feishu";
  if (url.includes("qyapi.weixin.qq.com")) return "wecom";
  if (url.includes("dingtalk.com")) return "dingtalk";
  return "generic";
}

function webhookPayload(type, markdown) {
  const text = shorten(markdown, 3500);

  switch (type) {
    case "feishu":
    case "lark":
      return {
        msg_type: "text",
        content: { text }
      };
    case "wecom":
    case "wechat-work":
    case "work-weixin":
      return {
        msgtype: "markdown",
        markdown: { content: text }
      };
    case "dingtalk":
      return {
        msgtype: "markdown",
        markdown: {
          title: "Daily Intel Flow",
          text: `# Daily Intel Flow\n\n${text}`
        }
      };
    default:
      return { text };
  }
}

export async function postJson(url, payload, label) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const text = await response.text();
  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!response.ok || data?.ok === false) {
    const description = data?.description || data?.raw || `HTTP ${response.status}`;
    throw new Error(`${label} failed: ${description}`);
  }

  return data;
}

export async function notify(report) {
  const webhookUrl = process.env.WEBHOOK_URL;
  if (webhookUrl) {
    const type = guessWebhookType(webhookUrl);
    await postJson(webhookUrl, webhookPayload(type, report.markdown), "Webhook notification");
  }

  if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
    const apiBase = (process.env.TELEGRAM_API_BASE || "https://api.telegram.org").replace(/\/+$/, "");
    const url = `${apiBase}/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;
    await postJson(
      url,
      {
        chat_id: process.env.TELEGRAM_CHAT_ID,
        text: shorten(report.markdown, 3900),
        disable_web_page_preview: true
      },
      "Telegram notification"
    );
  }
}
