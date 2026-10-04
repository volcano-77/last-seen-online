# Last Seen Online

使用 React、TypeScript 和 Vite 制作的浏览器式互联网考古与数字调查叙事游戏。玩家在模拟的旧网页之间寻找线索，通过搜索、网页存档、邮件、论坛、图片和资料推进调查。无需长篇自由文本输入。当前包含可完整游玩的《寻人启事》（Case 01）。

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

- 新存档从第一篇寻人帖开始。沿人物资料、站内链接、搜索结果及网页存档探索；浏览器提供后退、前进、刷新、主页、历史、标签和地址栏。地址栏输入短词会转为搜索。
- 旧博客和相册的访问问题可从已有页面寻找答案。相册原图、文件属性、附件、邮件和快照都可能提供记录；不需要访问现实网站。
- 展开有意义的时间、记录或图片会取得事实。正文拖选 6～180 字可「记下这段」；未匹配事实的文字作为可选摘句保留。记录夹用于对照事实、建立阶段结论及回看来源。
- 调查后期可在记录夹进入案件复核板，对陈述分级并引用已取得的材料；整组复核后才反馈。完成后可整理并递交材料包。案件结束后，已有记录仍可回看。

## 存档与内容

当前进度保存在浏览器的 `last-seen-online:v0.5` 本地命名空间，存档格式为 v6。保存页面历史、标签、事实与结论、谜题、复核板、递交记录及后记进度；不保存整份 Case 内容。刷新会恢复进度。设置菜单中的「重新开始本案」会清除当前案件进度。旧 v0.4 数据原样保留，不迁入当前路线。

正式 Case 数据位于 [`public/cases/missing-person/phase-01.json`](public/cases/missing-person/phase-01.json)，文件名沿用最初阶段，现已承载完整 Case 01。剧情事实与证明边界以 [story-bible](docs/cases/case-01-missing-person/story-bible.md) 和 [最终证据与结局设计](docs/cases/case-01-missing-person/final-evidence-and-ending.md) 的 DESIGN FREEZE 为准。Case 中 `provisional` 仅标记允许后定的日期、地名、具体编号、地址等表达值，不表示主线剧情或结局尚未实现。Case 格式见 [模板说明](cases/template/README.md)。

默认入口始终加载正式案件。维护人员可用 `?case=mock` 或 `?case=legacy` 读取独立的机制测试 Case 或旧摄影师 Demo；这些开发路由不属于正式剧情，也不影响正式存档。`public/cases/missing-person/images/xu-ning-placeholder.svg` 在旧资料页表示原照片未保留，是有意的档案占位图。

## 部署与范围

生产构建使用 `/last-seen-online/` 作为 Vite base。推送 `main` 会触发 [Pages 工作流](.github/workflows/pages.yml)。游戏纯前端、单机运行；网页、搜索和材料递交均为本地模拟，不连接真实邮箱，也没有账号或跨设备同步。

参见 [贡献指南](CONTRIBUTING.md) 与 [MIT License](LICENSE)。
