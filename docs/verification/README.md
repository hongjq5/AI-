# 历史开发验证与复验方法

下表整理 2026-10-01 开发环境的历史验证结果。2026-10-04 发布清理后，脱敏后的后端 94 项隔离回归重新通过，详情见 [发布清理说明](../publish-sanitization.md)。前端、浏览器和真实服务联调未在清理期间重跑，不代表首次安装或真实 AI 成功生成已验证。

为避免泄露账号、任务标识、机器路径或服务信息，发布副本已移除原始日志、截图和构建产物，只保留测试数量摘要和复验命令。

| 检查 | 2026-10-01 历史记录 |
| --- | --- |
| 前端 Jest | 8 suites / 57 tests 通过 |
| TypeScript、ESLint、修改文件 Prettier 检查 | 通过，存在旧 Browserslist 数据提示 |
| 前端生产构建 | Node.js 18 环境成功 |
| 后端隔离回归 | 94 tests，零失败/错误；见 [历史摘要](backend-tests-summary.txt) |
| 后端 Maven package | JDK 17 环境成功 |
| MySQL / Redis / RabbitMQ | 独立端口认证与读写通过 |
| 应用联调 | 注册、登录、注销、查询、Excel、限流和异步失败状态通过 |
| 浏览器检查 | 注册登录、退出返回、任务搜索刷新、390px 移动布局通过 |
| 真实 AI 成功链路 | 未验证；当时 AI 禁用 |

## 重新验证

按 [运行说明](../../local-runtime/README.md) 配置自己的服务和账号。在前端模块目录、Node.js 18 环境执行：

```powershell
npm test -- --runInBand
npm run tsc
npm run lint:js
npm run build
```

后端隔离回归命令（在后端模块目录使用 JDK 17）：

```powershell
mvn test '-Dtest=ChartControllerTest,BiMessageConsumerTest,BiMessageProducerTest,BiMqConfigTest,RedissonConfigTest,AiManagerBoundaryTest,ChartFileUtilsTest,ExcelUtilsTest'
```

原始示例测试可能依赖外部资源，不包含在这 94 项中；不能把跳过测试的 package 成功作为回归通过证据。

在 `local-runtime` 中运行 `verify-services.ps1` 和 `verify-app.ps1`，检查自己的本地服务。仅在明确禁用 AI 时运行 `verify-app.ps1 -VerifyDisabledAi`，验证线程池与 MQ 任务的失败落库；该检查会创建本地测试数据。新产生的账号文件和日志应留在被 Git 忽略的位置。

图表成功/损坏配置的渲染由隔离回归覆盖。后续启用真实 AI 后，仍需补验完整成功链路，并在发布新截图前清除账号、用户标识和真实业务数据。

上游署名与说明继续保留。发布副本的清理范围和检查边界见 [发布清理说明](../publish-sanitization.md)。
