# Case 数据格式（调查骨架）

复制 `case.json` 后在「案件资料」中导入。新格式使用 `schemaVersion: 2`。旧 v0.2 网页 Case 可以继续读取，但没有证据交互。正式《寻人启事》内容必须先遵守 [剧情事实档案](../../docs/cases/case-01-missing-person/story-bible.md)；不要从开发者 mock 复制剧情。

## 顶层

必填 `id`、`title`、`subtitle`、`briefing`、`objective`、`startPageId`、`pages`。新 Case 建议显式提供 `evidence`、`relations`、`facts`、`puzzles` 四个数组，即使暂为空。`status` 可为 `ready`、`placeholder`、`developer-mock`；后者只能用于非剧情测试资料。

## 数字载体

每个 `pages[]` 元素有唯一 `id`、`kind`、`title`、`url` 和段落数组 `body`。至少一页是 `search`，`startPageId` 必须存在。`kind` 支持：

`search`、`forum`、`forum-thread`、`forum-reply`、`website`、`blog`、`profile`、`email`、`attachment`、`spreadsheet`、`image`、`file-metadata`、`cache`、`sd-card`、`print-log`、`snapshot`。

页面还可含 `siteName`、`author`、`date`、`subtitle`、`tags`、`links`、`details`、`metadata`、`unlockConditions` 和 `objects`。`objects` 是页面中的可点击内容项，可表示帖、回复、时间戳、邮件、附件、表格行、照片、文件、属性、缓存项、日志项或普通文字。每项有 `id`、`type`、`title`，可有 `body`、`timestamp`、`metadata`、`links`、`evidenceId`。`evidenceId` 指向证据定义；玩家点击时才发现它。虚构 URL 只用于站内导航。

## 证据与解锁

`evidence[]`：`id`、`type`、`sourcePageId`、`title`、`summary` 必填；可有 `sourceObjectId`、`timestamp`、`metadata`、`relatedEvidenceIds`、`unlockConditions`。摘要由数据提供，玩家无需手写。来源对象应与页面中的 `evidenceId` 对应；无来源对象时可在页面底部点击发现。

`relations[]`：`id`、至少两个 `evidenceIds`、`title`、`summary`，可用 `unlocks` 解锁事实、证据或页面。玩家必须先发现这些证据，选择正确组合才会建立关联。

`facts[]`：`id`、`title`、`summary`，仅在关联或谜题解锁后显示。

`puzzles[]`：`timeline` 使用 `evidenceIds` 与 `expectedOrder`；`short-input` 使用 `evidenceIds` 与短 `answer`。两者均可用 `unlocks` 指向事实、证据或页面。请勿把未确定剧情放进答案或解锁文案。

`unlockConditions` 可按已发现证据、已建立关联、已解锁事实或已完成谜题限制页面/证据。导入时会检查 ID 唯一性与引用有效性。完整的非剧情交互示例见 `public/cases/developer/mock-case.json`。

## 存档

v0.3 存档记录页面访问、证据发现与收藏、关联、事实、谜题完成及时间线顺序。v0.1/v0.2 存档保留在旧 localStorage key 中，不自动迁入，避免旧 Demo 内容混入新调查。
