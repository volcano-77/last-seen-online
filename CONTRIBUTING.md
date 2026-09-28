# Contributing

感谢帮助改进 Last Seen Online。

## 开发流程

1. 使用 Node.js 22 或更新版本，运行 `npm install`。
2. 从 `main` 创建主题分支。不要提交 `node_modules/`、`dist/`、环境变量或个人存档。
3. 修改代码或 Case 后运行 `npm run lint` 和 `npm run build`。
4. 提交聚焦的变更，并在 Pull Request 中说明玩家可见的行为、验证结果和截图（如涉及界面）。

## Case 内容

参考 [Case 模板](cases/template/README.md)。制作《寻人启事》时先完整阅读 [剧情事实档案](docs/cases/case-01-missing-person/story-bible.md)，不得自行补完未定剧情。请确保页面、证据、关联和谜题引用都能解析；不在 Case 中放入真实个人信息、密钥或联系方式。谜题答案应通过网页探索与短交互发现，不要求玩家写长篇报告。

## 问题反馈

提交 Issue 时说明复现步骤、预期行为、实际行为、浏览器版本，以及是否使用自定义 Case。请勿附上含私人笔记的完整本地存档。
