# Design

## Source of truth

- Status: Active
- Last refreshed: 2026-10-01
- Primary product surfaces: AI 数据分析与可视化平台的登录、注册、新建分析、即时分析、我的分析、使用说明。
- Evidence reviewed: 参考项目的 README/DESIGN.md 和登录页；BI 的 React 页面、API、测试与本地运行约定。

## Brand

- Personality: 清晰、克制的浅色数据工作台；与图片管理与协作平台使用一致的蓝绿视觉语言。
- Trust signals: 真实任务状态、可理解的失败原因、来源与验证记录。
- Avoid: 教程推广、模板链接、虚构成功图表和业绩数字。上游来源保留在文档与现有源码署名中。

## Product goals

- Goals: 用户上传 Excel、提出问题、提交分析并查看图表与结论；使个人项目展示与实现一致。
- Non-goals: 本次不迁移框架、重命名 Java 包、不改图库工程，不更换 AI 供应商。
- Success signals: 导航无死链；注册登录退出可用；异步走 MQ；异常记录不导致页面崩溃；构建与回归通过。

## Personas and jobs

- Primary personas: 需要分析表格的个人使用者、查看作品的技术评审者。
- User jobs: 新建分析、查询处理状态、阅读结果、理解项目机制。
- Key contexts of use: 本地开发与项目演示，优先桌面兼容手机。

## Information architecture

- Primary navigation: 新建分析（异步默认入口）、即时分析、我的分析、使用说明。
- Core routes/screens: /add_chart_async、/add_chart、/my_chart、/guide；/user/login、/user/register 为公开页面。
- Content hierarchy: 页面标题与一句说明 → 操作/表单 → 任务状态 → 图表与结论。

## Design principles

- 使用已安装的 Ant Design 与 ProComponents，保持提交锁、文件校验、错误处理。
- 用户界面解释操作与结果，源码及部署细节放在文档。
- Tradeoffs: 人工刷新任务状态便于控制请求量；无真实 AI 结果时呈现空态/失败态。

## Visual language

- Color: primary #0f766e; secondary #0e7490; background #f3f7f6; text #18323a; highlight #d7ebe8。
- Typography: 系统中文无衬线；页面标题 26–30px；正文 14–16px，避免过密。
- Spacing/layout rhythm: 内容最大 1440px，页面留白 24px，卡片间距 16–24px。
- Shape/radius/elevation: 卡片 12px，表单控件 8px；轻边框与低阴影。
- Motion: 沿用组件反馈，不加装饰动画。
- Imagery/iconography: 本地 SVG 柱形图/趋势标识与已有图标，不使用外链模板背景。

## Components

- Existing components to reuse: Ant Design 表单、Upload、Card、Alert、Empty、Tag、Button、List；ECharts 渲染。
- New/changed components: 登录/注册卡片、分析工作区、任务卡片、帮助页、本地 logo。
- Variants and states: 处理中、等待、失败、成功、无结果、无效图表。
- Token/component ownership: config/defaultSettings.ts 与 src/global.less；页面特定规则就近维护。

## Accessibility

- Target standard: 尽量达到 WCAG AA 的对比、标注和键盘使用要求，不声明完成完整认证。
- Keyboard/focus behavior: 保留组件焦点样式，按钮/链接采用原生语义。
- Contrast/readability: 正文深色，辅助文案可读；不只靠颜色传达状态。
- Screen-reader semantics: 输入带 label，logo 有替代文本，错误消息明确。
- Reduced motion and sensory considerations: 无自动循环动画。

## Responsive behavior

- Supported breakpoints/devices: 桌面 1280px+ 与移动 390px。
- Layout adaptations: 分析双栏在小屏改单栏；注册/登录卡片在小屏留 16px 边距；长标题/内容自动换行。
- Touch/hover differences: 关键操作无需 hover 才能出现。

## Interaction states

- Loading: 按钮显示提交状态、防止重复；列表加载保留上下文。
- Empty: 明确引导新建分析，不展示编造数据。
- Error: 保留表单供重试；展示任务失败原因；损坏历史图表有独立兜底。
- Success: 展示真实图表与结论；异步提交提示去“我的分析”查看。
- Disabled: 禁用 AI 的环境通过真实 API 错误解释，不伪造生成。
- Offline/slow network: 请求失败反馈并允许重试；用户主动刷新任务。

## Content voice

- Tone: 简短、直接、中文。
- Terminology: 统一“分析需求”“新建分析”“我的分析”“分析结论”。
- Microcopy rules: 不在产品流程内展示技术实现术语；指南可解释使用方法。

## Implementation constraints

- Framework/styling system: React + Umi + Ant Design + LESS；不迁移到参考项目的 Vue。
- Design-token constraints: 蓝绿主色、本地资产。
- Performance constraints: 不增加运行依赖；异步提交不等待 AI 完成。
- Compatibility constraints: 保留 API、表结构、Java 包和隔离服务端口；保留上游署名。
- Test/screenshot expectations: 针对新行为回归；typecheck/lint/build；桌面/移动真实页面截图。

## Open questions

- AI 供应商旧接口当前不可用；本次保持禁用，真实生成待部署者配置可用凭据并确认接口兼容性。
- 未提供个人姓名与部署域名；使用产品名称，不虚构个人身份或线上部署。
