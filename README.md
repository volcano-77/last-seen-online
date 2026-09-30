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

- 新存档直接恢复刘佳寻人帖。通过普通用户名、资料页、博客、新闻和站点自身链接探索；浏览器只保留后退、前进、刷新、主页、历史、地址栏与默认收起的记录夹。地址栏输入短词会转为搜索。
- 访问问题位于旧博客与相册本身。答案来自先前的普通发言或日记，允许随时返回查找。相册可查看原图、文件属性，并与已经打开的照片对照。
- 帖子时间、博客日期与公开日志行提供各自媒介的详情；有意义的发现才自动生成事实摘要。正文拖选 6～180 字可「记下这段」：匹配事实时保留摘要，其余为可选短摘句，最多 30 条，无需自行输入笔记或总结。
- 记录夹只显示已见事实、可选摘句与已确认关联。所有已知事实都可自由选取比对，不通过禁用候选或提前启用确认按钮泄露正确组合。也可按日期回看。
- v0.5 进度使用独立 `localStorage` 命名空间，旧 v0.4 数据原样保留，不迁入重设计后的路线。保存 Case/schema/phase ID、页面历史、事实和关联 ID、检查点、访问验证、已浏览图片 ID、学会的工具、排序状态、短搜索词及可选短摘句；不保存整份 Case 快照，正文与素材始终读取最新文件。损坏或不匹配的进度安全重置。
- 玩家界面不显示开发入口。维护人员可用 `?case=mock` 或 `?case=legacy` 读取独立的机制测试/旧 Demo；默认入口始终加载正式 phase-01，不受开发路由的存档影响。

## 内容与数据

第一段数据位于 [`public/cases/missing-person/phase-01.json`](public/cases/missing-person/phase-01.json)。当前年份、日期、城市和人物基础信息均在 Case 的 `variables` 中集中标记为开发暂定值；陈雨页面的具体年月日也由 `chenDate` 管理。18:31、19:42、19:47 的先后关系保留。剧情定稿应以 [story-bible](docs/cases/case-01-missing-person/story-bible.md) 的已确定设定为准。

Case 格式与替换方法见 [模板说明](cases/template/README.md)。`public/cases/developer/mock-case.json` 只用于验证机制，不属于正式剧情。旧摄影师 Demo 独立保留为待替换内容。

## 部署与范围

生产构建使用 `/last-seen-online/` 作为 Vite base。推送 `main` 会触发 [Pages 工作流](.github/workflows/pages.yml)。本原型纯前端、单机运行；站点与搜索均来自本地 Case 数据，不访问真实旧网页，也没有账号或跨设备同步。

参见 [贡献指南](CONTRIBUTING.md) 与 [MIT License](LICENSE)。
