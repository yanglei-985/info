import "./config.js";

const token = process.env.TELEGRAM_BOT_TOKEN;
const apiBase = (process.env.TELEGRAM_API_BASE || "https://api.telegram.org").replace(/\/+$/, "");

if (!token) {
  console.log("TELEGRAM_BOT_TOKEN is empty. Fill it in .env first.");
  process.exit(0);
}

let response;
let payload;

try {
  response = await fetch(`${apiBase}/bot${token}/getUpdates`);
  payload = await response.json().catch(() => null);
} catch (error) {
  console.log("Could not connect to Telegram API.");
  console.log(`API base: ${apiBase}`);
  console.log(`Error: ${error.cause?.code || error.message}`);
  console.log("");
  console.log("If your network cannot reach api.telegram.org, set TELEGRAM_API_BASE to a Telegram Bot API proxy.");
  console.log("Example:");
  console.log("TELEGRAM_API_BASE=https://your-telegram-api-proxy.example.com");
  process.exit(1);
}

if (!response.ok || !payload?.ok) {
  console.log("Telegram did not accept the request.");
  console.log(JSON.stringify(payload, null, 2));
  process.exit(1);
}

const messages = payload.result || [];

if (messages.length === 0) {
  console.log("No updates yet.");
  console.log("Open your bot in Telegram, send it any message such as 'hi', then run this command again:");
  console.log("npm run telegram:chatid");
  process.exit(0);
}

const chats = new Map();
for (const update of messages) {
  const chat =
    update.message?.chat ||
    update.edited_message?.chat ||
    update.channel_post?.chat ||
    update.my_chat_member?.chat;

  if (chat?.id) {
    chats.set(chat.id, chat);
  }
}

if (chats.size === 0) {
  console.log("Updates exist, but no chat object was found.");
  console.log(JSON.stringify(messages.at(-1), null, 2));
  process.exit(0);
}

console.log("Available Telegram chats:");
for (const chat of chats.values()) {
  const name = [chat.title, chat.first_name, chat.last_name, chat.username ? `@${chat.username}` : ""]
    .filter(Boolean)
    .join(" ");
  console.log(`TELEGRAM_CHAT_ID=${chat.id}${name ? `  (${name})` : ""}`);
}
