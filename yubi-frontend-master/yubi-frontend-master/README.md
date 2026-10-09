# AI 数据分析与可视化平台 · 前端

基于鱼皮智能 BI 前端工程二次开发，沿用 React 18、Umi 4、Ant Design 5 与 ECharts。产品使用蓝绿色浅色工作台，包含注册登录、新建分析、即时分析、我的分析与使用说明。

[项目首页](../../README.md) · [使用与实现说明](../../docs/project-guide.md) · [界面设计](../../DESIGN.md) · [前端原始说明](../../docs/upstream-frontend-readme.md)

使用 Node.js 18。本机依赖已安装；旧版 Umi 在较新的 Node.js 运行时存在兼容问题，请使用已验证版本。开发与验证命令：

```powershell
npm run start:dev
npm test -- --runInBand
npm run tsc
npm run lint:js
npm run build
```

默认调用 `http://localhost:8080/api`。本机 `local-runtime` 静态服务在 8000 端口提供 `dist`；更新源码后重新构建即可更新页面，不要再启动第二个占用 8000 端口的开发服务。需要开发模式时先按 [运行说明](../../local-runtime/README.md) 停止当前应用，再选择启动方式。

默认“新建分析”通过 MQ 异步接口提交任务；“即时分析”保留同步入口。“我的分析”支持主动刷新、状态反馈、图表及分析结论，并对损坏的历史图表数据提供提示。前后端统一要求非空、最大 1 MB 的 XLS / XLSX 文件。

当前 AI 禁用，本地可验证账号、提交校验、真实队列及失败状态，不提供伪造的分析结果。凭据仅在 `local-runtime` 私有文件中管理，不应写入前端源码。
