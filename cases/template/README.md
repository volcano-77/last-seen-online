# Case 数据格式（调查骨架）

复制 `case.json` 后在「案件资料」中导入。模板使用 `schemaVersion: 2`；当前《寻人启事》片段使用 `schemaVersion: 3`，加入内部 `phaseId`、`checkpoints` 与 `variables`。旧格式仍可读取。正式内容必须先遵守 [剧情事实档案](../../docs/cases/case-01-missing-person/story-bible.md)；不要从开发者 mock 复制剧情。

## 顶层

必填 `id`、`title`、`subtitle`、`briefing`、`objective`、`startPageId`、`pages`。新 Case 建议显式提供 `evidence`、`relations`、`facts`、`puzzles` 四个数组，即使暂为空。`status` 可为 `ready`、`placeholder`、`developer-mock`；后者只能用于非剧情测试资料。

## 数字载体

每个 `pages[]` 元素有唯一 `id`、`kind`、`title`、`url` 和段落数组 `body`。至少一页是 `search`，`startPageId` 必须存在。`kind` 支持：

`portal`、`search`、`forum`、`forum-thread`、`forum-reply`、`website`、`blog`、`profile`、`email`、`attachment`、`spreadsheet`、`image`、`file-metadata`、`cache`、`sd-card`、`print-log`、`snapshot`。

页面还可含 `siteName`、`author`、`date`、`subtitle`、`tags`、`links`、`details`、`metadata`、`unlockConditions` 和 `objects`。`media` 指向本地照片及文件名、尺寸、上传时间；`layout` 指定旧站样式；`searchable`、`searchTerms`、`directory`、`bookmark` 控制检索及入口。`objects` 表示帖、回复、时间戳、附件或日志等页面内容；每项可有 `author`、`floor`、`media`、`detailLabel`、`evidenceId`。有 `evidenceId` 的结构化详情在查看时自动记下。

## 证据与解锁

`evidence[]`：`id`、`type`、`sourcePageId`、`title`、`summary` 必填；可有 `sourceObjectId`、`timestamp`、`metadata`、`relatedEvidenceIds`、`unlockConditions`。`discovery: "detail"` 用于结构化详情；`discovery: "selection"` 与 `selectionTexts` 用于正文局部拖选。摘要由数据提供，玩家无需手写。正式片段中不会在页尾列出可发现事实。

`relations[]`：`id`、`title`、`summary` 与至少两个输入；输入可来自 `evidenceIds` 或已经确认的 `factIds`。`unlocks` 可解锁事实或页面；`checkpointId` 记录内部检查点。记录界面只允许选择与当前组合有已定义关系的已知项目。

`facts[]`：`id`、`title`、`summary`，仅在关联或谜题解锁后显示。

`puzzles[]`：`timeline` 使用 `evidenceIds` 与 `expectedOrder`；`short-input` 使用 `evidenceIds` 与短 `answer`。两者均可用 `unlocks` 指向事实、证据或页面。请勿把未确定剧情放进答案或解锁文案。

`unlockConditions` 可按已发现证据、已建立关联、已解锁事实或已完成谜题限制页面/证据。导入时会检查 ID 唯一性与引用有效性。完整的非剧情交互示例见 `public/cases/developer/mock-case.json`。

## 存档

v0.4 按 Case ID 隔离存档，只记录案件 ID、schema/phase 版本、页面访问、已发现和收藏的证据、关联、已确认事实、内部检查点及谜题状态。内置 Case 的正文每次从当前 Case 文件加载，不从进度存档恢复。导入的自定义 Case 单独保存来源文件；旧版 v0.4 完整快照只用于一次性提取有效进度 ID。schema/phase 不匹配时重置该 Case 进度。v0.3 与更早的存档保留在旧 localStorage key 中，不自动迁入，避免旧 Demo 内容混入正式调查。
