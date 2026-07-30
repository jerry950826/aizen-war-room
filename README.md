# Aizen 戰情室

Aizen 內部行政業務入口，整合請假、請款、講師看板、帳號設定、頁面權限與人員存取管理。

## 功能

- 公司信箱登入
- 請假、請款與講師看板正式入口
- Maggie、Rita、Jerry 管理頁面權限
- 多人共用的人員允許名單與啟用狀態
- Cloudflare D1 持久化共享資料
- 響應式桌面與行動版介面

## 本機執行

需要 Node.js `>=22.13.0`。

```bash
npm install
npm run dev
```

驗證正式建置：

```bash
npm run build
```

## 初始測試帳號

使用 `maggiefang@ai-zens.com`、`ritahsieh@ai-zens.com` 或
`jerrychang@ai-zens.com`，初始密碼為 `Ab123456`。

> 正式站台的環境資源與存取設定由 Sites 管理；請勿將任何密鑰提交到 GitHub。
