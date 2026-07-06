# 实现文档 — 工作项索引与通用约定

> 配套 [整体开发计划](../整体开发计划.md)（what/when）；本目录 = how，**一个工作项一份文档**（格式参照 molit-ai-project/docs/implementation）。
> 批次执行顺序见 [_开发批次顺序.md](_开发批次顺序.md)。负责人均为 Frank。

---

## 工作项索引

| 编号 | 工作项 | SP | Sprint | 状态 |
|---|---|---|---|---|
| [E1-01](E1-收尾与合流/01_分支合main与容器同步.md) | 分支合 main 与容器同步 | 2 | 0 | [x] |
| [E1-02](E1-收尾与合流/02_EE抓取改httpx.md) | EE 类别抓取改 httpx | 1 | 0 | [x] |
| [E1-03](E1-收尾与合流/03_postings原子写.md) | postings 原子写竞态修复 | 1 | 0 | [x] |
| [E2-01](E2-云端部署/01_VPS与compose上云.md) | VPS 选型与 compose 整体上云（含域名 HTTPS） | 7 | 0 | [~] R3 修订=Render+Supabase 已上线；剩 Free→Starter+域名 |
| [E2-02](E2-云端部署/02_上线安全加固.md) | 上线安全加固（seed token / 限流 / 密钥） | 2 | 0 | [x] |
| [E2-03](E2-云端部署/03_AI顾问切云LLM.md) | AI 顾问切云 LLM（Haiku 4.5） | 3 | 0 | [x] |
| [E2-04](E2-云端部署/04_云端端到端验证M1.md) | 云端端到端验证（M1 收口） | 2 | 0 | [~] 三天日更观察中 |
| [E3-01](E3-账号与订阅/01_Users扩展与鉴权工具.md) | Users collection 扩展 + entitlement 工具 | 2 | 1 | [x] |
| [E3-02](E3-账号与订阅/02_注册登录前端.md) | 注册 / 登录前端 | 2 | 1 | [x] |
| [E3-03](E3-账号与订阅/03_Stripe_Checkout与Portal.md) | Stripe 时长包 Checkout（卡+Alipay+WeChat） | 3 | 1 | [x] 真实回归通过；生产 Render env 待填 |
| [E3-04](E3-账号与订阅/04_Stripe_webhook状态同步.md) | Stripe webhook → proUntil 拨动（单事件） | 2 | 1 | [x] 真实事件回归通过；生产 endpoint 已建 |
| [E3-05](E3-账号与订阅/05_付费墙分层gate.md) | 付费墙分层 gate | 4 | 1 | [x] |
| [E3-06](E3-账号与订阅/06_Stripe切live.md) | Stripe 切 live 真实收款（M3） | 1 | 2 | [x] 真实付款+退款演练通过=M3(品牌设置追办) |
| [E4-01](E4-合规与信任/01_免责声明v1.md) | 免责声明 v1（页脚 + 弹框） | 1 | 1 | [x] |
| [E4-02](E4-合规与信任/02_合规四件套页面.md) | 合规四件套页面（免责/隐私/条款/关于） | 3 | 2 | [x] |
| [E4-03](E4-合规与信任/03_republish自查与脱敏.md) | republish 自查与 PII 脱敏 | 2 | 2 | [x] |
| [E4-04](E4-合规与信任/04_字段级citation来源维度.md) | 字段级 citation + 来源解释（field_sources） | 3 | 2 | [x] |
| [E5-00](E5-商业化功能/00_用户档案与匹配层.md) | **用户档案与匹配层（付费墙头牌）** | 7 | 1-2 | [x] |
| [E5-01](E5-商业化功能/01_定价与落地页.md) | 定价页 + 落地横幅 | 4 | 2 | [x] |
| [E5-02](E5-商业化功能/02_榜单F8第一批.md) | 榜单 F8 第一批（rankings 维度 + 页面 + 抽选快报） | 4 | 2 | [x] 抽选快报并入 EE 维度已有 |
| [E5-03](E5-商业化功能/03_邮件职位提醒.md) | 邮件提醒（**匹配版**：命中我的路径才发信） | 5 | 3 | [x] dry-run 全通;剩 Resend key(域名前测试模式) |
| [E5-04](E5-商业化功能/04_地区统计与城市对比v1.md) | 地区统计与城市对比 v1（三问之「去哪」） | 6 | 2-3 | [x] 含 Pro 对比;市级后置 |
| [E6-01](E6-数据补强/01_PE_AIP_RNIP_去重.md) | 数据补强：PE AIP / RNIP / 内容级去重（**已让位**，入学后再排） | 4 | — | ☐ |
| [E7-01](E7-运维与增长/01_监控告警与备份.md) | 监控告警 + 库备份 | 4 | 3 | [~] 代码侧✅;剩托管服务账号+演练 |
| [E7-02](E7-运维与增长/02_Analytics埋点.md) | Analytics 与转化埋点 | 2 | 2 | [x] 代码侧;剩 umami cloud 账号+2 env |
| [E7-03](E7-运维与增长/03_SEO与冷启动获客.md) | SEO 基建 + 冷启动获客 | 3 | 3 | [~] sitemap/robots/meta✅;剩 GSC+发帖 |
| [E8-01](E8-UI体验统一/01_顶栏账户区归组.md) | 顶栏账户区归组(登录/注册/Pro 一处) | 1 | 4 | [~] 代码✅;登录态截图与窄屏联测挂 E8-03 |
| [E8-02](E8-UI体验统一/02_全站弹窗化导航.md) | 全站弹窗化导航(定价先行,去「返回」) | 3 | 4 | [~] 定价+榜单弹窗、去返回✅;剩统计弹窗化(层级导航 state 化) |
| [E8-03](E8-UI体验统一/03_移动自适应一揽子.md) | 移动自适应一揽子(375px 全站可用) | 4 | 4 | [~] 弹窗全屏+筛选抽屉+全页 375 走查 0 溢出✅;剩触控/登录态抽查 |

状态标记：`☐ 未开始` · `[~] 进行中/部分` · `[x] 收口`。

---

## 通用约定

### 收口定义（每个工作项）

- 文档 §2 验收标准全部勾选 + §3 步骤勾选；
- 对应验证清单（见下）通过；
- 提交并 push（commit 信息沿用仓库中文风格：`feat(web): …` / `fix(etl): …`）。

### 老坑清单（每项动手前过一遍，都是踩过的）

1. 改 `Jobs.ts` / 新 collection → **必须重启 dev server**（Payload 推 schema）再重灌。
2. **seed 各维度是显式字段白名单**（[seed/route.ts](../../cms/src/app/seed/route.ts) `dims[]`）——加维度字段必须同步加映射，否则重灌不入库。
3. `externalId`（`jb:<posting_id>`）是 **08_score ↔ 09_mart 的 join 键，两处必须一致**。
4. **重灌前跑完整链**：05→05b→04c→04d→05c→08→09→seed，别半条链 reset。
5. `/jobs` 列表走原始 SQL（耦合 snake_case 列名）——改 Jobs schema 要同步 [page.tsx](../../cms/src/app/(frontend)/jobs/page.tsx) 的 SELECT。
6. 服务端组件不能从 `'use client'` 模块导入常量（拿到 undefined）。
7. 衍生抓取数据必须 gitignore；只有维护表跟踪。

### 三张回归清单

- **数据回归**：mart 岗位数 / 有评分数 / 有区数与改动前同量级；抽查 5 岗字段无退化。
- **支付回归**（E3 建立，切 live 复跑）：注册→登录→Checkout(4242)→webhook 写状态→Pro 解锁→Portal 退订→`subscription.deleted` 降级→免费限额生效。
- **上线安全**（M1 验收）：seed 无 token 401；postgres/cms 端口不出公网；admin 仅 role=admin；advisor 超限 429/402；`.env` 不在 git；全站 HTTPS。

### 新增 env 清单（随工作项落地补进 `.env.example`）

```
SEED_TOKEN=              # E2-02:seed / alerts run 鉴权
LLM_PROVIDER=            # E2-03:ollama(本地) | anthropic(线上)
ANTHROPIC_API_KEY=       # E2-03
ADVISOR_DAILY_CAP=       # E2-02:advisor 全局日上限
STRIPE_SECRET_KEY=  STRIPE_WEBHOOK_SECRET=  STRIPE_PRICE_ID=   # E3-03/04
NEXT_PUBLIC_SITE_URL=  NEXT_PUBLIC_PRICE_DISPLAY=              # E3-03/E5-01
RESEND_API_KEY=          # E5-03
HEALTHCHECK_PING_*=      # E7-01:每源一个 ping URL
```

### 现状锚点（实现的起点，2026-07-03）

| 部件 | 现状 | 意义 |
|---|---|---|
| [docker-compose.yml](../../docker/docker-compose.yml) | 全栈 5 服务，bind-mount 源码 | 可整体搬 VPS，不重构 |
| [seed/route.ts](../../cms/src/app/seed/route.ts) | **无鉴权 GET**，`?reset=1` 可清库 | ⚠️ 上公网前必须加 token |
| [advisor/route.ts](../../cms/src/app/api/advisor/route.ts) | 唯一 LLM 出口（Ollama 格式），有内存缓存 | 换云 LLM 只动一文件+一 lib |
| [Users.ts](../../cms/src/collections/Users.ts) | 裸 `auth: true` | 注册/登录/会话 Payload 自带 |
| 前端 | 单页 `(frontend)/jobs` + advisor/jobtext API，无登录态 | 付费墙插入点集中 |
