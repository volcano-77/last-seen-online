# v0.2 Case 格式

复制 `case.json`，修改内容后在「案件资料」中导入。Case 只定义可浏览的网页，不预设玩家必须找到的线索。玩家的摘录和结论独立保存在浏览器本地。

顶层必填：`id`、`title`、`subtitle`、`briefing`、`objective`、`startPageId`、`pages`。可选 `status` 为 `ready` 或 `placeholder`，默认 `ready`。待重写的内容可标为 `placeholder`。

每个页面必填唯一 `id`、`kind`、`title`、`url` 和正文段落数组 `body`。`kind` 可为 `search`、`forum`、`profile`、`blog`；一个 Case 至少需要一个搜索页。`startPageId` 必须指向现有页面。

可选页面字段：`author`、`date`、`subtitle`、`siteName`、`tags`、`links` 和 `details`。`links` 中的 `pageId` 必须指向现有页面。`details` 支持 `section`、`floor`、`registeredAt`、`lastOnline`、`signature`、`views`、`replies`，按页面需要填写即可。

虚构 URL 只用于内部导航，不会发起真实网页请求。导入时会校验页面 ID 与链接关系。旧 v0.1 Case 中的 `clues` 和 `clueIds` 会被忽略。
