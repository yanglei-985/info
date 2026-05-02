# Daily Intel Flow

一个本地可跑的 Web3 + AI 每日信息流项目：采集 RSS/API，按关键词过滤和打分，生成 Markdown + HTML 日报，并支持 Telegram / Webhook 推送。

## 快速开始

```powershell
npm install
Copy-Item .env.example .env
npm run once
npm run serve
```

打开：

```text
http://localhost:4173
```

输出文件：

- `reports/latest.md`
- `public/index.html`

## 配置文件

- 信息源：`config/sources.json`
- 关键词：`config/keywords.json`
- 报告结构：`config/report.json`
- 环境变量：`.env`

`.env` 不要上传 GitHub。请在本地或 GitHub Secrets 中配置真实密钥。

## 环境变量

```env
OPENAI_API_KEY=
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4.1-mini

WEBHOOK_URL=
WEBHOOK_TYPE=generic

TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
TELEGRAM_API_BASE=https://api.telegram.org

ENABLE_AI_SUMMARY=false
MAX_ITEMS_PER_SOURCE=20
REPORT_TIMEZONE=Asia/Shanghai
```

## 手动运行

```powershell
npm run once
```

## 本地定时运行

```powershell
npm run schedule
```

默认每天 `08:00` 运行。可以设置：

```env
CRON_SCHEDULE=0 8 * * *
REPORT_TIMEZONE=Asia/Shanghai
```

注意：本地定时依赖电脑开机、联网，并且进程正在运行。

## Telegram

获取 `chat_id`：

```powershell
npm run telegram:chatid
```

测试推送：

```powershell
npm run test:notify
```

## GitHub 上传建议

上传这些内容：

- `config/`
- `src/`
- `upstream-chainfeeds/RAW.opml`
- `.env.example`
- `.gitignore`
- `package.json`
- `package-lock.json`
- `README.md`

不要上传：

- `.env`
- `node_modules/`
- `reports/`
- 任何真实 API Key / Token
