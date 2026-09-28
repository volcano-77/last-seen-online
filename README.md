# Last Seen Online

一个在浏览器里运行的互动调查原型。玩家使用虚拟浏览器查阅搜索结果、论坛、个人主页与博客，收集线索并拼合事件经过。Prototype v0.1 包含一则完整的虚构 Demo Case，也支持导入自定义 JSON Case。

## 本地运行

需要 Node.js 22 或更新版本。

```bash
npm install
npm run dev
```

打开终端显示的 Vite 地址。生产构建和静态检查：

```bash
npm run lint
npm run build
npm run preview
```

## 玩法

1. 从 Trace 搜索首页查找人物、地点或事件，也可以浏览全部结果。
2. 打开归档页面，跟随关联链接。地址栏支持输入完整的虚构 URL；其他文字会作为搜索词。
3. 在右侧「现场线索」点击「收集线索」。线索板显示已找到的证据，并提供本地调查笔记。
4. 「案件档案」包含简报、目标和 Case Loader。导入 JSON 会替换当前存档；「重置为 Demo Case」需要确认。

进度、浏览历史、当前页面、收集的线索、笔记和导入的 Case 存在浏览器的 `localStorage`，不会上传。清除站点数据会删除存档。导入的 JSON 必须来自可信来源；内容会作为纯文本呈现，不执行脚本。

## 制作 Case

从 [cases/template/case.json](cases/template/case.json) 复制起步，并阅读 [格式说明](cases/template/README.md)。`public/cases/demo/case.json` 是随应用发布的完整示例。页面和线索用唯一 ID 连接，导入时会验证引用关系。

## 部署

Vite 的生产 `base` 为 `/last-seen-online/`，对应 GitHub Pages 项目站点。推送 `main` 后，`.github/workflows/pages.yml` 会运行 lint、build 并部署 `dist`。在仓库 **Settings → Pages → Build and deployment** 中选择 **GitHub Actions** 作为来源。

项目站点地址：<https://volcano-77.github.io/last-seen-online/>

## 范围

Prototype v0.1 是纯前端单机体验。虚拟网站、人物和事件均为虚构；搜索只检索当前 Case 中的页面。没有账号、后端、真实网页访问或跨设备同步。

## 贡献与许可

参见 [CONTRIBUTING.md](CONTRIBUTING.md)。代码以 [MIT License](LICENSE) 发布。
