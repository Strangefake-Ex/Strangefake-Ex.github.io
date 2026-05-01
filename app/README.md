# Round Table（圆桌学术讨论厅）MVP

基于 Vite + React + Tailwind 的前端 MVP，实现：
- 落地页（暗金圆桌风格）
- 讨论室大厅（创建/加入 + 最近房间）
- 讨论室（私密草稿、发布观点、点赞）
- 主持人面板（参与分布 + 摘要导出）

## 本地开发
```bash
npm install
npm run dev
```

## 测试与类型检查
```bash
npm test -- --run
npm run check
```

## 部署到 Vercel（GitHub 自动上线）
1. 将本仓库推送到 GitHub
2. 打开 Vercel → Add New → Project → 选择该 GitHub 仓库
3. Framework Preset 选择 Vite（通常会自动识别）
4. Build Command：`npm run build`
5. Output Directory：`dist`
6. Deploy

已内置 [vercel.json](file:///workspace/vercel.json) 做 SPA 路由重写，确保 `react-router-dom` 的多路由在刷新时不 404。

