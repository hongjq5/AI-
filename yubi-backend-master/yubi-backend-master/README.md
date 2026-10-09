# AI 数据分析与可视化平台 · 后端

基于鱼皮智能 BI 教学项目与 Spring Boot 初始模板二次开发。作者与原始说明完整保留于 [后端原始说明](../../docs/upstream-backend-readme.md)，当前产品和运行入口见 [项目首页](../../README.md)。

后端负责用户会话、Excel 解析、用户限流、分析任务存储、RabbitMQ 消费与 AI 响应校验。技术栈为 Spring Boot 2.7、MyBatis-Plus、MySQL、Redis / Redisson、RabbitMQ 和 EasyExcel。

使用 JDK 17 + Maven。当前本机通过根目录的 `local-runtime/start-local.ps1` 启动，独立服务配置覆盖模板默认值；不要直接复制历史 README 中的数据库密码与端口。源码变动后先停止本项目应用，再运行 `start-local.ps1 -Build` 重新打包启动。

- [使用与实现说明](../../docs/project-guide.md)：状态、限流、消息处理、Prompt 与测试边界。
- [本地服务与启动命令](../../local-runtime/README.md)：MySQL 3307、Redis 6380、RabbitMQ 5673 及私有配置文件位置。
- [主流程稳定性记录](../../docs/主流程稳定性-改动与验证.md)：前期修复与回归。

AI 当前保持禁用，旧鱼聪明 API 的可用性尚未恢复；已完成真实基础服务连接与失败链路验证，不代表真实 AI 成功生成。Java 包名、API 和表结构保持兼容；原模板的帖子、微信等示例不属于当前 BI 产品功能声明。
