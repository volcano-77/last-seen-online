# Case 格式

复制 `case.json`，改写内容后在应用的「案件档案」中导入。文件仅在浏览器本地读取，当前存档会被新 Case 替换。建议为不同案件使用不同的 `id`。

必填顶层字段：`id`、`title`、`subtitle`、`briefing`、`objective`、`startPageId`、`pages`、`clues`。

每个页面需要唯一的 `id`、`kind`（`search`、`forum`、`profile`、`blog`）、`title`、`url` 和非空字符串数组 `body`。可选字段包括 `author`、`date`、`subtitle`、`tags`、`links`、`clueIds`。一个 Case 应包含一个搜索页面；`startPageId` 通常指向它。

`links` 中的 `pageId` 必须指向现有页面。每条线索需要唯一的 `id`、`title`、`description`、`sourcePageId` 和 `category`；类别可选 `identity`、`timeline`、`location`、`connection`。线索来源页面的 `clueIds` 必须包含该线索 ID。

页面 URL 是虚构地址，仅用于虚拟浏览器内部导航，不会发出网络请求。导入 JSON 时会校验 ID 唯一性与引用关系。
