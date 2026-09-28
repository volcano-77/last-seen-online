# Last Seen Online

离线运行的旧互联网数字调查原型。本阶段先搭建《寻人启事》所需的交互与数据骨架，**尚未制作正式案件内容**。首次打开的是明确标记的开发者测试档案；旧摄影师 Demo 仍作为独立占位文件保留，不代表新案件剧情。

## 本地运行

需要 Node.js 22 或更新版本。

```bash
npm install
npm run dev
```

检查：

```bash
npm run build
npm run lint
```

## 当前玩法骨架

1. 在旧式虚拟浏览器中打开页面、沿链接探索，或用短关键词搜索。
2. 点击网页中的时间戳、文件属性等对象以发现记录；摘要自动显示，可一键收藏并返回来源。
3. 在「记录对照」中选取已发现记录建立关联，按日期排列时间线，或输入短编号解锁页面。
4. 当前测试材料只验证机制，不含《寻人启事》的正式谜题或结局。没有长篇笔记与自由文本调查报告。

当前页面、浏览历史、已访问页面、发现与收藏、成立的关联、解锁的事实，以及短谜题与排序状态保存在本机 `localStorage` 的 v0.3 key。v0.1/v0.2 存档仍保留在原 key，但不会自动迁入，以免旧 Demo 混入新调查。切换 Case 前，如当前已有调查状态，会要求确认。

## 制作 Case

阅读 [Case 模板说明](cases/template/README.md)及 [《寻人启事》剧情事实档案](docs/cases/case-01-missing-person/story-bible.md)。新载体类型覆盖论坛主题与回复、旧网页、邮件与附件、表格、照片、文件属性、缓存、SD 卡列表、冲印记录与快照。数据格式支持证据 ID、来源、时间、元数据、关系和解锁条件。测试流程参见 `public/cases/developer/mock-case.json`，其中没有正式剧情事实。

## 部署

生产构建使用 `/last-seen-online/` 作为 Vite base。推送 `main` 会触发 [Pages 工作流](.github/workflows/pages.yml)。

## 范围

纯前端单机原型。虚拟站点均为本地数据，搜索只检索当前 Case；没有账号、真实网页访问或跨设备同步。

参见 [贡献指南](CONTRIBUTING.md) 与 [MIT License](LICENSE)。
