# Last Seen Online

离线运行的旧互联网数字调查游戏。当前默认内容是《寻人启事》的**第一段**：从刘佳和赵妍的旧网页记录开始，确认提前出现的寻人启事，最终核对陈雨的寻人帖与同日晚间的校园 BBS 活动。第一段止于 C05；后续剧情尚未制作。

## 本地运行

需要 Node.js 22 或更新版本。

```bash
npm install
npm run dev
```

```bash
npm run build
npm run lint
```

## 游玩方式

- 在旧浏览器主页进入论坛、新闻站、校园 BBS，或用短词搜索本地网页档案。后退、前进、刷新、地址栏、历史与普通收藏夹可用。
- 打开帖子时间、网页缓存和博客发布详情，会自动把结构化时间记入「记录」。正文中的关键短句可拖选，选区附近出现「记下」。普通文字不会提示。
- 「记录」只显示已记下与已确认的短摘要。选择当前有合理关系的记录，确认后解锁新的事实或网页。玩家无需写笔记和调查报告。
- 浏览进度按 Case ID 保存在本机 `localStorage` 中，仅包含页面、证据、关联、检查点和谜题等状态；内置案件正文始终读取当前 Case 文件。旧 v0.4 快照会提取有效进度 ID 后改写为轻量存档，schema/phase 不匹配则重置。v0.3 和更早的 Demo 存档不自动迁入。开发者 mock 与旧 Demo 可以从「案件资料」单独载入。

## 内容与数据

第一段数据位于 [`public/cases/missing-person/phase-01.json`](public/cases/missing-person/phase-01.json)。当前年份、日期、城市和人物基础信息均在 Case 的 `variables` 中集中标记为开发暂定值；陈雨页面的具体年月日也由 `chenDate` 管理。18:31、19:42、19:47 的先后关系保留。剧情定稿应以 [story-bible](docs/cases/case-01-missing-person/story-bible.md) 的已确定设定为准。

Case 格式与替换方法见 [模板说明](cases/template/README.md)。`public/cases/developer/mock-case.json` 只用于验证机制，不属于正式剧情。旧摄影师 Demo 独立保留为待替换内容。

## 部署与范围

生产构建使用 `/last-seen-online/` 作为 Vite base。推送 `main` 会触发 [Pages 工作流](.github/workflows/pages.yml)。本原型纯前端、单机运行；站点与搜索均来自本地 Case 数据，不访问真实旧网页，也没有账号或跨设备同步。

参见 [贡献指南](CONTRIBUTING.md) 与 [MIT License](LICENSE)。
