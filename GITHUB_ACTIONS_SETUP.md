# GitHub Actions 云端自动推送教程

目标：把项目上传到 GitHub private repo 后，即使电脑关机，也能每天自动生成日报并推送到 Telegram。

## 1. 本地确认项目可运行

在项目目录运行：

```powershell
npm install
npm run once
npm run test:notify
```

确认 Telegram 能收到测试消息。

## 2. 新建 GitHub Private Repository

1. 打开 GitHub。
2. 点击右上角 `+`。
3. 选择 `New repository`。
4. Repository name 填，例如：`daily-intel-flow`。
5. 选择 `Private`。
6. 不要勾选初始化 README、`.gitignore`、license。
7. 点击 `Create repository`。

## 3. 上传项目代码

在项目目录执行：

```powershell
git init
git add .
git commit -m "Initial daily intel flow"
git branch -M main
git remote add origin 你的private仓库地址
git push -u origin main
```

注意：`.env`、`node_modules/`、`reports/` 已经在 `.gitignore` 中，不会上传。

## 4. 设置 GitHub Secrets

进入你的 GitHub 仓库：

```text
Settings -> Secrets and variables -> Actions -> New repository secret
```

逐个添加下面这些 Secret。

必填：

```text
OPENAI_API_KEY
OPENAI_BASE_URL
OPENAI_MODEL
TELEGRAM_BOT_TOKEN
TELEGRAM_CHAT_ID
TELEGRAM_API_BASE
ENABLE_AI_SUMMARY
MAX_ITEMS_PER_SOURCE
REPORT_TIMEZONE
```

如果不用 Webhook，可以不填：

```text
WEBHOOK_URL
WEBHOOK_TYPE
```

推荐值：

```text
OPENAI_BASE_URL=https://你的中转地址/v1
OPENAI_MODEL=你的模型名
TELEGRAM_API_BASE=https://api.telegram.org
ENABLE_AI_SUMMARY=true
MAX_ITEMS_PER_SOURCE=20
REPORT_TIMEZONE=Asia/Shanghai
```

## 5. 确认 Actions 文件

项目里已经有这个文件：

```text
.github/workflows/daily-intel-flow.yml
```

它会在北京时间每天早上 `08:00` 自动运行。

也可以手动运行：

```text
GitHub 仓库 -> Actions -> Daily Intel Flow -> Run workflow
```

## 6. 第一次手动测试

1. 打开 GitHub 仓库的 `Actions` 页面。
2. 选择 `Daily Intel Flow`。
3. 点击 `Run workflow`。
4. 等待运行完成。
5. 查看 Telegram 是否收到日报。

## 7. 常见问题

如果 Actions 失败，先点进失败日志看哪一步红了。

常见原因：

- `OPENAI_BASE_URL` 没有 `/v1`
- `OPENAI_MODEL` 不是中转支持的模型名
- `TELEGRAM_CHAT_ID` 填错
- `TELEGRAM_BOT_TOKEN` 填错
- Telegram bot 没有和你的账号发起过聊天

如果只想测试 Telegram，不生成完整日报，可以在本地运行：

```powershell
npm run test:notify
```
