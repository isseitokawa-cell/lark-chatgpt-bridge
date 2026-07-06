# lark-chatgpt-bridge

Lark Bot の1対1メッセージを ChatGPT Agent API に渡して、その返答をLarkへ返信する最小ブリッジです。

## 構成

- `api/lark-webhook.js`: Larkイベント受信の入口
- `lib/chatgpt-agent.js`: ChatGPT Agent API 呼び出し
- `lib/lark.js`: Lark返信・添付リソース取得

## 前提

- Vercel にデプロイする
- Lark Bot は `im.message.receive_v1` を購読済み
- ChatGPT Agent API URL と Agent access token を取得済み

## 環境変数

`.env.example` をコピーして設定してください。

- `LARK_APP_ID`
- `LARK_APP_SECRET`
- `LARK_VERIFICATION_TOKEN`
- `LARK_ENCRYPT_KEY`
- `CHATGPT_AGENT_API_URL`
- `CHATGPT_AGENT_ACCESS_TOKEN`

## ローカル開発

```bash
npm install
cp .env.example .env
npm run dev
```
