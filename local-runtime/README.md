# 本地运行环境

此目录只提供启动脚本、建表结构和不含真实凭据的配置模板。仓库不包含数据库数据、登录账号、密码、AI 密钥、日志或构建产物。

## 准备

使用 Windows PowerShell 7，并安装 Docker Desktop / Compose、JDK 17、Maven 3.9 和 Node.js 18。`JAVA_HOME` 应指向 JDK 17，`mvn`、`node` 和 `docker` 应在 PATH 中。旧版 Umi 在新 Node 主版本上可能不兼容。

在本目录执行：

```powershell
Copy-Item .env.example .env
# 编辑 .env，为所有 CHANGE_ME 字段填写不同的随机密码
New-Item -ItemType Directory -Path private -Force
Copy-Item ai.env.example private/ai.env
```

`.env`、`private/`、日志和进程记录已被 Git 忽略。真实凭据只填入本机文件，不要写进 README、截图或提交历史。`MYSQL_USER` 和 RabbitMQ 用户名只是本地新建服务的业务账号名，不是 GitHub 账号。

当前本地脚本使用简单的 `KEY=value` 格式。请为各服务分别生成至少 32 位的随机字母数字密码，不加引号、空格或特殊符号，避免 `.env` 与 Redis 的解析差异。

前端依赖和构建产物需要在首次启动前准备。进入 `../yubi-frontend-master/yubi-frontend-master` 后，使用项目既有 pnpm 7 工具链执行：

```powershell
pnpm install --no-frozen-lockfile --config.auto-install-peers=true
pnpm build
```

回到本目录启动。后端 jar 不存在时会自动使用 Maven 打包：

```powershell
.\start-local.ps1

# 也可显式指定自己的工具位置
.\start-local.ps1 -JavaHome $env:JAVA_HOME -MavenCommand mvn -NodeCommand node
```

启动脚本不会安装软件。JDK Unix socket 临时目录通过进程参数单独指定，未修改全局 Java 设置。

## 默认地址与隔离

| 组件 | 本机地址 |
| --- | --- |
| 前端 | http://localhost:8000/user/login |
| 后端 API | http://localhost:8080/api |
| MySQL | `127.0.0.1:3307`，默认库 `yubi` |
| Redis | `127.0.0.1:6380`，业务 DB 1 |
| RabbitMQ AMQP | `127.0.0.1:5673`，默认 vhost `yubi` |
| RabbitMQ 管理 | http://127.0.0.1:15673 |

所有服务仅绑定本机回环地址。浏览器统一使用 `localhost`，避免 Cookie 地址不一致。应用使用 `YUBISESSION` Cookie，登录会话保存在应用内存中；Redis 用于限流。

Docker Compose 项目名为 `ai-bi-platform`，卷由该项目创建，不复用原工程的容器或卷。脚本还会核对已有同名 Compose 容器的工作目录。如果另一个项目占用了端口，启动会失败，不会结束其他进程。先选择空闲环境再运行；不要在端口冲突时手动删除不属于本项目的容器。`-SkipServices` 仅用于本副本的基础服务已经启动的情况。

## 验证与停止

```powershell
# MySQL 事务回滚、Redis 临时键、RabbitMQ 临时队列读写验证
.\verify-services.ps1

# 新建随机本地测试账号，验证注册、登录、会话及图表查询
.\verify-app.ps1

# 仅在 AI 明确禁用时验证失败处理；会留下两条失败的测试任务
.\verify-app.ps1 -VerifyDisabledAi

# 停止本副本的应用，保留容器和数据
.\stop-local.ps1

# 同时停止本副本的基础服务，仍保留数据卷
.\stop-local.ps1 -Services

# 后端代码变更后的重新构建
.\start-local.ps1 -Build
```

验证脚本生成的随机登录凭据保存到 `private/login-account.json`，不会打印在输出中；此文件不能提交。也可以在页面自行注册。`verify-app.ps1` 会先校验后端 PID、jar 路径和端口归属，避免向其他项目注册账号或提交任务。

## AI 配置

AI 默认禁用。`ai.env.example` 只提供配置字段，未包含密钥或模型 ID。若有可用供应商凭据，请在被忽略的 `private/ai.env` 中填写，再启用 `BI_AI_ENABLED`。

项目仍使用旧鱼聪明 SDK。2026-10-01 检查时，旧网站及 SDK 接口跳转到了导航网站；不能通过注册导航账号推断旧 API 已开通。在供应商确认接口可用或完成适配前，AI 生成能力仍待接通。模型应按本项目约定返回分隔符 `【【【【【`、严格 JSON 图表对象及分析结论。
