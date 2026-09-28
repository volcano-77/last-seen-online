# Last Seen Online

一个离线运行的互动网络考古原型。玩家在虚拟浏览器中搜索、阅读旧论坛、个人空间与博客，自己摘录文字、核对时间，并写下对事件的重建。v0.2 聚焦界面与玩法结构；内置的 v0.1 故事仍是**待替换占位案例**，不代表后续叙事方向。

## 本地运行

需要 Node.js 22 或更新版本。

```bash
npm install
npm run dev
```

构建与静态检查：

```bash
npm run build
npm run lint
```

## 玩法

1. 在虚拟浏览器的搜索页输入人物、网名、地点或文字片段；地址栏也接受完整的虚构 URL。
2. 阅读不同站点上的时间、作者和内容，沿着页面链接继续查找。
3. 在网页中拖选文字，使用右侧「摘录选中文字」将其放入编辑框；也可以自行输入片段或备注。点击「保存到摘录板」才会保存。
4. 「摘录板」保留来源页，方便返回核对。「重建事件」提供自由书写的结论区；原型不自动评分或揭示答案。
5. 「案件资料」可导入符合模板的 JSON Case。导入前如已有笔记，会先询问是否替换。

当前页面、浏览历史、摘录、临时笔记、结论和导入的 Case 保存在当前浏览器的 `localStorage`。v0.1 的页面位置、历史与笔记可迁移；旧版预设线索进度不再使用。清除站点数据会删除本地存档。

## 制作 Case

复制 [cases/template/case.json](cases/template/case.json)，并阅读 [字段说明](cases/template/README.md)。内容与界面分离：页面只需提供站点类型、正文和链接，不需要预设“正确线索”。导入文件仅在浏览器本地读取，文本以 React 纯文本方式呈现。

`public/cases/demo/case.json` 仍包含 v0.1 的摄影师、灯塔、旧港故事，已标为 `placeholder`。下一步会单独重写案件，方向包括网络身份异常、旧论坛痕迹、被删内容、时间错位与数字身份矛盾。本次更新没有写入新案件。

## 部署

生产构建使用 `/last-seen-online/` 作为 Vite base。推送 `main` 会触发 [Pages 工作流](.github/workflows/pages.yml)，运行 lint、build 并部署 `dist`。仓库的 Pages 来源需设置为 GitHub Actions。

站点：<https://volcano-77.github.io/last-seen-online/>

## 范围

这是纯前端单机原型。虚拟网站与角色均为虚构；搜索只检索当前 Case 的离线页面。没有账号、真实网页访问或跨设备同步。

参见 [贡献指南](CONTRIBUTING.md) 与 [MIT License](LICENSE)。
