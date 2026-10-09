# AI 数据分析与可视化平台


面向个人表格分析的工作台：上传 Excel，描述分析需求，提交任务，再查看图表、分析结论和处理状态。前端采用 React + Umi + Ant Design，后端采用 Spring Boot + MyBatis-Plus；通过 RabbitMQ 执行异步分析，使用 Redis / Redisson 控制用户提交频率。

[使用与实现说明](docs/project-guide.md) · [本地运行环境](local-runtime/README.md) · [界面设计](DESIGN.md) · [发布清理说明](docs/publish-sanitization.md)

> 此源码副本不附带运行账号、数据库数据、密码或 AI 密钥。AI 默认禁用；启用前需要自行配置可用的供应商凭据与模型，并验证接口兼容性。此前鱼聪明 SDK 的接口出现重定向，尚未完成真实 AI 成功生成的验证。

## 核心功能

- **账号与会话**：注册、登录、服务端退出登录；未登录访问工作台时跳转登录页。
- **新建分析**：填写需求和图表类型，上传 `.xls` / `.xlsx` 文件，默认通过消息队列提交异步任务。
- **即时分析**：保留同步入口，提交后等待接口返回图表和结论。
- **我的分析**：按名称搜索、分页浏览和主动刷新，显示等待、执行中、成功或失败；成功任务展示图表与结论，异常图表数据有独立提示。
- **文件与结果校验**：前后端统一限制非空 Excel、最大 1 MB；后端真实解析工作簿，校验 AI 返回的 JSON 对象与分析结论。
- **统一工作台**：蓝绿色浅色界面、本地标识、登录与注册页面、分析页面及使用说明。

## 技术栈与处理过程

| 层次 | 技术 | 当前用途 |
| --- | --- | --- |
| 前端 | React 18、Umi 4、Ant Design 5、ECharts | 表单、任务列表、状态反馈和图表渲染 |
| 后端 | Spring Boot 2.7、MyBatis-Plus、MySQL 8 | 用户、分析任务与结果存储 |
| 文件处理 | EasyExcel | 读取 XLS / XLSX，转为保留列位置并正确转义的 CSV |
| 异步执行 | RabbitMQ Direct exchange | 按路由键分发任务 ID，消费者读取任务并处理 |
| 限流 | Redis 7、Redisson | 按用户 ID 分组，每秒最多获取 2 个提交许可 |
| AI 接入 | 鱼聪明 SDK、共享 Prompt 模板 | 组合分析目标、图表类型及 CSV，解析图表 JSON 和结论 |

默认分析链路为：校验登录与文件 → 用户限流 → Excel 转 CSV → 保存等待任务 → 发布任务 ID → 消费者更新为执行中 → 调用 AI → 校验结果 → 保存成功结果或失败原因。同步与线程池异步 API 继续保留，默认界面使用 MQ API。

队列持久化、消息明确设置为 `PERSISTENT`，消费者采用手动确认。当前尚无发布确认、事务发件箱、消费幂等和重试补偿机制，不能据此承诺消息绝不丢失或任务恰好执行一次。实现与取舍见 [项目说明](docs/project-guide.md)。

## 本地配置与启动

准备 PowerShell 7、Docker、JDK 17、Maven 3.9、Node.js 18 和 pnpm 7，并将工具加入 PATH（Java 也可通过 `JAVA_HOME` 指定）。本项目保留旧工具链，前端依赖安装的已知限制见 [稳定性记录](docs/主流程稳定性-改动与验证.md)。

在项目根目录复制配置模板：

```powershell
Copy-Item ./local-runtime/.env.example ./local-runtime/.env
New-Item -ItemType Directory -Force ./local-runtime/private
Copy-Item ./local-runtime/ai.env.example ./local-runtime/private/ai.env
```

编辑 `.env`，将占位值替换为自行生成的数据库、Redis 和 RabbitMQ 凭据。AI 保持禁用即可检查账号、文件与异步失败流程；启用时在 `private/ai.env` 填入自己的 AI 配置。真实配置由 Git 忽略，不要将它们复制到源码、文档或截图中。

先安装并构建前端（在前端模块目录执行）：

```powershell
pnpm install --no-frozen-lockfile --config.auto-install-peers=true
pnpm build
```

再从项目根目录启动和检查服务：

```powershell
Set-Location ./local-runtime
./start-local.ps1
./verify-services.ps1
./verify-app.ps1
```

首次启动缺少后端 jar 时脚本会构建后端；修改后端后可使用 `-Build`。前端修改后重新执行 `pnpm build`。具体参数与故障排查见 [运行说明](local-runtime/README.md)。

打开 [本地工作台](http://localhost:8000)，通过注册页面创建自己的账号。项目没有预置登录账号或密码。请统一使用 `localhost` 访问前端，保持会话 Cookie 一致。

| 服务 | 默认地址 |
| --- | --- |
| 前端 | `localhost:8000` |
| 后端 | `localhost:8080/api` |
| MySQL | `127.0.0.1:3307` |
| Redis | `127.0.0.1:6380` |
| RabbitMQ | `127.0.0.1:5673` |
| RabbitMQ 管理页 | `127.0.0.1:15673` |

运行配置使用独立 Compose 项目及其数据卷；端口被其他项目占用时需先调整本项目配置，不能直接复用其他项目的服务或数据。`./stop-local.ps1` 停止本项目应用，`-Services` 同时停止本项目容器并保留数据卷。

## 目录与维护范围

- `yubi-frontend-master/yubi-frontend-master/`：当前前端。
- `yubi-backend-master/yubi-backend-master/`：当前后端。
- `local-runtime/`：配置模板、独立服务、启动脚本和验证工具。
- `docs/`：使用说明、历史设计实施记录和上游说明。
- 历史模板目录和分期源码压缩包不包含在发布副本中；当前发布内容仅保留运行所需的前后端、运行脚本、文档与配置示例。

整理内容覆盖产品名称与界面、公开注册入口、服务端退出、默认 MQ 分析入口、结果展示、共享 Prompt 和消息持久化设置。此前已修复重复提交、文件格式不一致、异步状态和失败处理。技术包名、表结构及已有 API 保持兼容。

当前是本地开发版本：AI 成功链路尚待可用供应商接口验证，登录会话仍存于应用内存，重启后需重新登录。

## 历史验证记录

2026-10-01 的开发环境曾完成前端 57 项、后端 94 项隔离回归，以及静态检查、构建和本地服务联调。2026-10-04 发布清理后，脱敏后的后端 94 项隔离回归重新通过；前端构建、浏览器及真实服务联调仍为历史结果，不表示新机器安装已验证。原始日志与含账号信息的截图已移除，保留 [验证摘要和复验命令](docs/verification/README.md)。

发布清理范围、配置要求及检查边界见 [发布清理说明](docs/publish-sanitization.md)。
