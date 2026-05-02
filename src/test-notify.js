import "./config.js";
import { notify, postJson } from "./notifier.js";

const report = {
  markdown: [
    "# 每日信息流测试",
    "",
    "这是一条推送测试。如果你能看到这条消息，说明 `.env` 里的推送配置可用。",
    "",
    "- Webhook：检查 `WEBHOOK_URL` / `WEBHOOK_TYPE`",
    "- Telegram：检查 `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID`"
  ].join("\n")
};

async function main() {
  await notify(report);

  if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
    const apiBase = (process.env.TELEGRAM_API_BASE || "https://api.telegram.org").replace(/\/+$/, "");
    const payload = await postJson(
      `${apiBase}/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        chat_id: process.env.TELEGRAM_CHAT_ID,
        text: `Direct Telegram test ${new Date().toISOString()}`,
        disable_web_page_preview: true
      },
      "Telegram direct test"
    );

    const message = payload.result;
    console.log(`Telegram accepted message_id=${message?.message_id} chat_id=${message?.chat?.id}`);
  }

  console.log("Notification test sent. If no channel is configured, nothing was sent.");
}

main()
  .then(() => {
    process.exitCode = 0;
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
