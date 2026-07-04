# 计划:AI 顾问弹框「三层:事实 / 判断 / 对话」+ 补齐数据缺口

> 本文是**待执行计划**(2026-06-28 拟,设计总纲已与用户逐轮锁定)。新 session 按本文从上往下做,做一项勾一项。
> 现状/已完成看 [STATUS.md](../STATUS.md);理念看 [CLAUDE.md](../CLAUDE.md)。

## 目标(用户原话)

1. 点任意字段弹出的 AI 顾问框:**上半显示该字段的原始抓取数据,下半 AI 解释**(目前只有 PNP/EE 两个字段做了)。
2. 上半要展示的原始数据若**缺**,就去**抓/补**(见 Part B 数据缺口)。
3. **再加一层对话框**:用户可基于上半事实 + 中间判断,继续和 AI 追问。
4. 原则不变:实时抓 + docker 自动更新,md 只作参考;宁可留空也不瞎猜。

---

## 设计总纲(2026-06-28 锁定)—— 弹框三层结构与契约

弹框是**三层**,每层职责泾渭分明:

```
┌─ 上半:事实(证据)──────────── 值 + 出处 + 口径。可核验,绝不经 LLM。
├─ 中 :AI 判断 ──────────────── 只基于上半事实推出的「对你意味着什么 + 下一步」。一次性流式。
└─ 下 :对话框 ──────────────── 用户基于上半事实 + 中判断追问,多轮 grounded chat。
```

### 契约(三句话,统辖全部字段)

- **上半 = 可核验的事实** —— 带出处 + 口径,**绝不经 LLM**。用户用它「信任」。
- **中/下 = 只基于上半事实的判断** —— 「对你意味着什么 + 下一步」;**每句话都能指回上半某条料**;**永不复述上半**;**问到上半没有的数据,直说「没抓到/不掌握」,绝不编**。
- **数据缺口要不要补** = 看它**喂出来的判断值不值**(按「判断含金量 ÷ 抓取成本」排序,见 Part B)。

### 关键推论(为什么这套契约重要)

1. **这是反「编」机制**:上半有多少料,下半就能判多重。**上半空 → 下半只能说「证据不足,不下结论」**。公司冷启动(模型对冷门公司乱编)就此自然解决——没抓到公司简介,下半诚实说「无公司资料,无法评估」。
2. **下半判断质量 = 上半事实完整度** → 这给 Part B 抓数据一个硬依据:抓料不是「为了上半好看」,是**下半判断的燃料**。
3. **两半 + 对话构成可核验单元**:用户先核上半事实,再看下半/对话的推理能否指回那些事实 → 完整信任链。

### 字段判断的「厚薄」(不是「有无」)

既然**上半本来就全是事实**,就不存在「下半只摆事实」的字段——**每个字段下半都是判断**,只是厚薄不同:

- **厚(判断类)**:PNP / EE / 薪资 / 评分 / 公司 / NOC / 地点 —— 有取舍,值得 AI 深读。
- **薄(琐碎字段)**:状态 / 时间 / 来源 / 经验 / 分类 / vs中位 —— 一句话判断("closed → 别投了"、"低于中位 → 议价力弱"),但**仍是判断,不是把值再念一遍**。
  - ⟹ [route.ts](../cms/src/app/api/advisor/route.ts) 现有的 `SIMPLE` 集**保留**,但定位从「短事实」改成「**短判断**」。

### 对话层规格

- **上下文喂整条岗位的全部事实**(不止点进来的字段)——用户从 NOC 点进来也可能顺嘴问薪资/PNP,给全量料体验最顺。
- **全字段都给对话框**(零额外成本;琐碎字段用户大概率不聊,给了也不亏)。
- **多轮**:请求带 `messages:[...]`,后端拼 `[system(整条岗位事实 + 上述铁律), assistant(中间判断), user…]` → Ollama 原生多轮流式。复用现有流式管线 + 模态拖拽/缩放。
- **每轮 system 始终带事实 + 铁律** —— 防止多轮放开后退回「编」的老路。

---

## 现状(关键代码位置)

- 弹框组件 `AdvisorModal` 在 [JobsTable.tsx](../cms/src/app/(frontend)/jobs/JobsTable.tsx)(约 L798)。正文 L891-906:
  - `{field==='pnp'} → <PnpListSection>`、`{field==='ee'} → <EeCategorySection>` —— **只有这两个字段有「上半真实数据」**。
  - 其余字段:正文只有 `renderAI(text)`(AI 文本),原始「值」仅在标题栏。**对话框尚未做(现在是一次性流式)。**
- 后端 [route.ts](../cms/src/app/api/advisor/route.ts):`SIMPLE` 集(短解释)、`H` 各字段 prompt、评分明细重建(与 08_score 一致)。**当前是一次性,无 `messages[]` 多轮。**
- 另有操作列弹框 `ActModal`(L919):`kind='company'` 已展示公司名/官网/地址/来源/**在招岗数**;`kind='desc'` 走 `/api/jobtext` 读 JD 正文 .md。
- 列表 SQL 在 [page.tsx:16-21](../cms/src/app/(frontend)/jobs/page.tsx#L16) —— 决定 `JobRow` 有哪些字段(下方 Part A「数据来源核对」据此)。

---

## Part A — 弹框三层:每字段展示/判断什么

实现顺序:先搭**三层骨架**(对话层 + 多轮 endpoint),再按字段填上半事实块。中间判断/对话由 AI 按契约生成。

### A0 三层骨架(先做,所有字段共用)

1. `AdvisorModal` 正文改为三段:`<FieldFactsSection field job dims/>`(上半,内部按 field switch)→ 中间 AI 判断 → `<AdvisorChat job lang/>`(下半对话框)。
2. [route.ts](../cms/src/app/api/advisor/route.ts) 加 `messages?:[]`:有则走多轮(system 带整条岗位事实 + 铁律);无则维持一次性(初判)。
3. 对话框 UI:消息线程 + 输入框 + 发送,复用现有流式读取。

### A1 字段事实块(上半)+ 判断要点(中/下)

| 字段 | 上半:事实(证据) | 下半:判断(基于上半) | 数据来源 / wiring |
|---|---|---|---|
| 职位 title | 完整标题 · 匹配 NOC(码+官方名) · **JD 职责/要求摘录** | 把 JD 翻成人话:实际干嘛、合不合你路线、投前注意 | title 现成;**官方名依赖 #2**;**JD 摘录不在列表 SQL → 走 `/api/jobtext` 取**(同 ActModal desc) |
| 公司 company | **公司简介**(抓的官网正文) · 行业 · 在招岗数 · 官网 | 来头、规模/稳不稳、值不值得投(无料→明说不足) | **简介依赖 #0/#5**;在招岗数/官网现成(ActModal 已有,复用) |
| NOC noc | NOC 码 · **官方职业名** · **官方职责** · TEER · 大中小类 | 就业/移民友好度(TEER 决定能否走多数 PNP)、匹配度 | TEER/大中小类现成;**官方名+职责都依赖 #2** |
| 薪资 salary | 原始薪资文本 · 折算年薪 · 本省同 NOC **low/中位/high(年份)** · vs中位% | 当地高低、够不够生活、**够不够 PNP/工签工资门槛**、谈薪空间 | 原始/折算/vs中位现成;**区间+年份依赖 #4** |
| 中位时/年薪 | ESDC 中位 · NOC×省 · **区间 + 年份** | 为什么中位是基准、本岗偏离说明啥 | 中位现成;**区间+年份依赖 #4** |
| vs 中位 | 年薪÷当地中位 = %（派生 + 口径) | 高于/低于中位 → 议价力/雇主诚意/生活水平 | ✅ 现成(salaryAnnual/wageMedAnnual) |
| PNP pnp | pnpEligible · 命中具名通道(清单+本岗高亮) · **门槛(语言/工资/CRS)** | 这条 PNP 怎么走、还差啥、坑(粗筛≠资格)、下一步 | 清单已有(PnpListSection);**门槛依赖 #3** |
| EE ee | 所属类别 · 该类 NOC 清单 · **近期抽选 CRS+日期** | CRS 够不够、EE vs PNP、要不要建档 | 清单已有(EeCategorySection);**抽选线依赖 #1** |
| AIP aip | 是否指定 · **匹配的指定雇主记录(省/地点/tech)** | AIP 适合谁、这岗能不能用、和 PNP 取舍 | `job.aip` 布尔现成;**「匹配记录」要把 `designated_employers` 维度 wire 进 [page.tsx](../cms/src/app/(frontend)/jobs/page.tsx) 的 `dims`(现在没传)** |
| 评分 score | 评分明细(各项加分,与 08 一致) | 移民价值高在哪/低在哪、该不该优先投 | `score` 现成;**明细只在后端 route.ts → 前端要重算或开接口** |
| 地点 | 国/省/市/区 · 地图 · **是否地区试点社区** | 各省 PNP 差异、生活成本/华人社区、定居考量 | 层级/地图现成;**试点社区依赖 #6(边缘)** |
| 时间/状态 | datePosted/lastSeen/**firstSeen**/closedAt + 增量对账口径 | 还新不新、可能招满没、要不要赶紧投 | 多数现成;**`first_seen` 在 DB(Jobs.ts:51)但 SQL 没 SELECT → 要加进 SELECT+JobRow** |
| 来源/渠道 | sourceLabel · source · origin · 第一方判定 · 「JB 聚合 indeed/Talent」 | 来源可信度、是否第一方直投(绕中介)、投递建议 | ✅ 现成 |
| 经验/TEER/分类 | 值 + 静态定义 | 门槛够不够、TEER 对移民的影响 | ✅ 现成 |

**真·零成本(纯前端加块即可)**:vs中位 / 地点 / 来源·渠道 / 经验 / 分类 / 状态时间(除 firstSeen) / 薪资原始文本。
**需小 wiring(非新抓取)**:① firstSeen 进 SQL；② `designated_employers` 维度进前端(AIP 匹配记录)；③ JD 摘录走 `/api/jobtext`；④ 评分明细前端化。
**需 Part B 抓取**:职位官方名+NOC(#2)、公司简介(#0/#5)、薪资区间(#4)、PNP 门槛(#3)、EE 抽选线(#1)、试点社区(#6)。

---

## Part B — 数据缺口(按「判断含金量 ÷ 抓取成本」排序)

### #0 mart 补带 ATS 公司 `description`/`sectors` ★零抓取快赢,先做
- **为什么**:ATS 公司(Kanata 名录)`processed/ats/<slug>/profile.json` **已经有** `description` + `sectors`,但 09 没 join 进 `companies.json`(实测 `withDescription=0`)。
- **做**:`09_build_mart.py` 的 ATS 公司行带上 `description`/`sectors` → seed → 公司弹框上半显示。零新抓取。覆盖面小(仅 ATS),但纯真数据。

### #4 工资 low/high 区间 + 年份 ★最划算
- **为什么**:ESDC 同一份开放数据**本就含 low/median/high**(已核实 CSV 有 `Low_Wage_Salaire_Minium`/`High_Wage_Salaire_Maximal`/`Reference_Period`),`build_wages.py` 现在只存了 median。
- **做**:① [build_wages.py](../etl/build_wages.py) 多抽 low/high + 年份(`Reference_Period`,注意 low/high 可能为空);② mart 09 join 进 job;③ `Jobs.ts` 加 `wageLowHourly`/`wageHighHourly`/`wageLowAnnual`/`wageHighAnnual`/`wageYear`;④ 重启 dev sync schema + 重灌;⑤ 薪资/中位弹框上半显示「低 / 中位 / 高 (年份)」。

### #1 EE 各类别近期抽选分数线 + 日期 ★高价值,镜像现成
- **为什么**:现在 EE 弹框只说「属于哪个类别」,缺「上次 CRS 多少分、哪天抽的」。
- **做**:① 新抓 canada.ca **Express Entry rounds of invitations**(category-based draws)→ `raw/ee/draws.json`(复用现成 `ee` crawl 无头镜像);② 按 category 取最近 N 次(date/CRS/invitations);③ mart 产 `ee_draws` 维度(或并进 `ee_categories`);④ EE 弹框上半:类别清单 + 「近期抽选:CRS XXX · YYYY-MM-DD」。
- **源**:canada.ca/.../express-entry/submit-profile/rounds-invitations.html(DataTables,同 EE 类别页一套抓法)。

### #2 官方 NOC 职业名 + 职责描述 ★中(职位 & NOC 两个字段都依赖)
- **为什么**:NOC/职位弹框应能给「这个 NOC 官方叫什么、干什么」。现在 `job` 只有大中小分类名,**没有官方职业名,也没职责**。
- **做**:① 抓 noc.esdc.gc.ca 每个 NOC 页(只抓**数据集里出现过的 NOC**,去重,不全量 500+);② `noc_descriptions` 维度(noc→官方名/主要职责);③ 弹框展示。
- **注意**:noc.esdc.gc.ca 可能反爬 → 先 httpx 试,403 再无头。

### #3 PNP 各通道门槛(语言/工资/CRS) ★中
- **为什么**:PNP 弹框有清单了,但缺「这个通道要 CLB 几、工资要求、CRS 线」。
- **做**:从各省 policy md(已抓,只作参考——但门槛是策略文本,可结构化解析)抽每通道的 language/wage/CRS/offer 要求 → 并进 `pnp_occupations` 或新 `pnp_streams` 维度的 meta。
- **风险**:各省措辞不一,解析脆;**宁可留空也不瞎填**(无门槛数据 → 上半不显示该行 → 下半判断说「门槛数据未收录」)。

### #5 公司官网正文(基本介绍) ★高判断价值但覆盖低,单独评估
- **为什么**:公司字段上半要的「公司基本介绍」的完整解(#0 只覆盖 ATS)。
- **数据天花板**:4144 家公司**仅 ~997 有官网 URL**(~24%),其余永远空。
- **做**:对有官网的公司加 `etl/06b` httpx 抓首页/about 正文 → readability 抽净 → 存 companies 维度 → 上半显示;无网址留空 → 下半判断说「无公司资料」。
- **取舍**:每家网站结构不同、~1/4 撞 Cloudflare、仅覆盖 1/4。**ROI 一般,按 Ponytail 先做 #0,#5 抓取实施前再确认值不值。**

### #6 地区移民试点社区(RNIP 等) ★边缘,最后
- IRCC 的 RNIP/各社区试点清单 → 标注地点是否在试点社区。价值边缘,最后做。

---

## Part C — 字段级来源:每个字段带 citation + 来源解释(2026-07-03 用户新要求)

> **用户原话:所有字段都要从网上抓 citation 和来源解释。**
> 即:每个字段的上半事实块,统一带「这条数据从哪来」——官方来源链接(citation)+ 来源解释(这是什么数据集/什么口径),且来源信息本身也由 ETL 从网上抓取验证,不在前端硬编码。

### 契约延伸(与三层契约一致)

- 来源行属于**上半事实层** → **绝不经 LLM**:来源解释用抓取的页面元信息(`<title>`/meta description)原文展示,不翻译不改写;UI 标签走 i18n 字典,解释正文保持原文。
- **宁可留空**:来源页抓取失败 → 标记 unverified,只显示链接不显示解释;派生字段(评分/vs中位)没有外部 citation → citation = 底层数据来源链 + 本站口径说明,明说「本站派生」。
- **单一来源真相**:各维护表**已有**的 `url`/`fetched`(pnp/*.json、build 脚本的 SOURCE_URL 常量)不重复维护——聚合它们,只给没有记录来源的字段补注册项。

### 字段 → 来源映射(citation 分两级:静态数据集级 + 逐条记录级)

| 字段 | 数据集级 citation(field_sources 维度) | 记录级 citation(已有/优先显示) |
|---|---|---|
| title / company / salary / datePosted / JD / status | Job Bank 网站(数据集说明) | ✅ `job.applyUrl` 官方原帖(每岗) |
| noc / teer / 大中小类 / 官方名+职责 | StatCan NOC 2021 Elements(build_noc_descriptions 的源 URL) | — |
| wageMed / low / high / year | ESDC 工资开放数据(build_wages 的源 URL)+ `Reference_Period` | wageYear 每记录 |
| pnp(具名通道) | 各省提名官网 | ✅ pnp/*.json 每通道 `url`+`fetched`(已有,**要 surface 到弹框**) |
| ee(类别/抽选) | IRCC 类别页 + `ee_rounds_123_en.json` | 每类别/每次抽选日期已有 |
| aip | IRCC AIP + 各省指定雇主名单页 | 按省名单 URL |
| district(区) | GeoNames 加拿大邮编开放数据 | — |
| score / vsMedian / salaryAnnual / accessibility / firstSeen·lastSeen / origin | **本站派生** —— citation = 底层来源链(NOC+工资+省清单)+ 口径一句(如「评分 = 08_score 规则,权重见明细」「下架 = 未见且发布超30天」) | 评分明细已前端重建 |

### 实现(照旧四步:数据层 → mart → seed → 前端)

1. **`etl/build_field_sources.py`**(新,挂 `pnp` 源周更):
   - 注册表 = fieldKey → { publisher, url(来自各 build 脚本常量/维护表聚合), kind: dataset|derived }。
   - 对每个唯一 URL httpx 抓取 → 验证 200 + 抽 `<title>`/meta description 作「来源解释」原文 + 记 fetchedAt/status → `raw/sources/field-sources.json`(跟踪)。
   - 派生字段不抓网,写口径说明(静态文案放这里,同样进维度,单一来源)。
2. **09 mart** 产 `field_sources.json` 维度(每行=字段×来源)→ **seed 新 collection `field-sources`(dims 白名单记得加映射——踩过的坑)**。
3. **前端 `FieldFactsSection`** 底部统一加 `<SourceLine>` 组件:「来源:{publisher}(链接)· 抓取于 {fetched}」+ 解释摘录;**记录级 URL 优先**(pnp 通道 url / applyUrl / 省 AIP 名单),数据集级兜底;unverified 只出链接。
4. **advisor prompt**:`jobFacts()` 每行事实追加其来源短标注,让中层判断/对话引用时能指回来源(强化反编机制)。

### 执行位置

排进上线主计划 Sprint 2(合规与信任,配合免责声明/republish 自查)——实现工作项见 [implementation/E4-合规与信任/04_字段级citation来源维度.md](implementation/E4-合规与信任/04_字段级citation来源维度.md);字段弹框侧的显示改动依赖本文件 Part A 已完成的 FieldFactsSection 框架,增量小。

---

## 执行顺序

1. **A0 三层骨架**:对话框 UI + route.ts 多轮 `messages[]` + 上半 `FieldFactsSection` 框架。
2. **A1 零成本字段上半事实块**(vs中位/地点/来源/经验/分类/状态时间/薪资原始)。
3. **小 wiring 4 项**:firstSeen 进 SQL · designated_employers 维度进前端 · JD 摘录走 jobtext · 评分明细前端化。
4. **#0** ATS 简介进 mart(公司上半快赢)。
5. **#4** 工资 low/high → 接薪资/中位弹框。
6. **#1** EE 抽选线 → 接 EE 弹框。
7. **#2** NOC 官方名+职责 → 接 NOC/职位弹框。
8. **#3** PNP 门槛 → 接 PNP 弹框。
9. **#5** 公司官网抓取(评估后定)。
10. **#6** RNIP(边缘)。

每做一项:数据层(抓/解析)→ schema(若加字段,**改 Jobs.ts 必须重启 dev sync + 重灌**)→ 09 mart join → 前端弹框块 → 实测 → 提交 + push。**所有抓取走 docker 自动更新,md 只参考。**

## Schema 预计新增(`cms/src/collections/Jobs.ts` / 维度)

- #4:`wageLowHourly` `wageHighHourly` `wageLowAnnual` `wageHighAnnual` `wageYear`(挂 job)
- SQL 补:`first_seen` 进 [page.tsx](../cms/src/app/(frontend)/jobs/page.tsx) SELECT + JobRow
- #1:`ee_draws` 维度(不挂 job)
- #2:`noc_descriptions` 维度(noc→官方名/职责,不挂 job)
- #3:并进 `pnp_occupations`/`pnp_streams` 维度 meta(不挂 job)
- #0/#5:`companies` 表带 `description`/`sectors`;前端把 `designated_employers` 维度也 wire 进 `dims`

## 当前代码状态(交接)

- 分支 `feat/lists-autoupdate-and-table-ux`,持续 push 远端(`origin/` 同名)。
- **已完成并实测(纯前端 / 不需重灌的部分全做完了)**:
  - ✅ **A0 三层骨架**:② route.ts 多轮 `messages[]` grounded chat · ③ `AdvisorChat` 对话框 · ① `FieldFactsSection` 上半框架。
  - ✅ **A1 零成本字段事实块**:地点 / 薪资 / 分类 / 来源 / 经验 / 时间状态(读 job 已有字段)。
  - ✅ **小 wiring 4 项**:firstSeen 进 SQL/JobRow(时间块) · designated_employers 维度进前端(AIP 记录块,normName 镜像 05c) · 职位 JD 摘录走 `/api/jobtext` · 评分明细前端重建。
  - ✅ **附带修 bug**:评分明细 +12 应按「省具名通道命中」(pnpOccupations 维度),旧 route.ts 写死低TEER 6码集合会对不上库分;前端 + route.ts 都已修(实测合计=库分)。
- ✅ **#4 工资 low/high(全链路打通,已实测)**:build_wages 抽 Low/High/年份 → 09 join wageLow/High + wageYear → Jobs.ts +5 字段 → Payload 推列 → host dev 重灌(DB 5499 带 low/5503 带 year)→ 薪资块显示「当地时薪/年薪(低–中–高)+ 年份」。**验证了「改 schema→重启 dev sync→重灌」全链路。**
- ✅ **#0 ATS 公司简介进 mart(零抓取快赢,已实测)**:09 ATS add_company 补 description → companies.json(14 家)→ page.tsx join c.description/sectors → 公司事实块显示真实简介(无则诚实留空)。Companies 已有字段,无需改 schema。
- ✅ **附带修表格末列右侧缝隙**(用户反馈):末列 `<col>` 宽设 auto 吸收剩余空间,右缘贴齐容器。
- ✅ **#1 EE 抽选分数线(已实测)**:IRCC 开放 JSON(`ee_rounds_123_en.json`,httpx 直取无 Akamai)→ `build_ee_draws.py` 每类别最近抽选 → 09 join ee_categories(89/94)→ EE 弹框「近期抽选:CRS·日期·邀请数」。**坑:seed 维度是字段白名单,加字段要同步 seed map**。
- ✅ **#2 NOC 官方名+职责(已实测)**:StatCan NOC 2021 Elements 开放 CSV(httpx,valid cert)→ `build_noc_descriptions.py`(516 NOC 的 title/duties/requirements)→ 09 产 noc_descriptions 维度(397,只收数据集 NOC)→ 新 collection + 职位/NOC 弹框显示官方名 + 职责 bullet。**坑:noc.esdc 证书链坏 + 不透明 objectid → 弃用,改 StatCan 开放数据**。
- ⏭️ **#3 PNP 门槛(评估后决定不做 = 留空)**:门槛只散落在各省 checklist 长 md(结构各异),且**工资要求多为定性**(「该地区中位工资」非单一数字);把 prose 解析成结构化门槛**易错,而错误的移民门槛比留空更糟**。按 CLAUDE.md「信任边界/数据完整性永不上砧板·宁可留空也不瞎猜」+ 计划「脆,宜留空」→ **不建脆弱解析器**。PNP 弹框每个通道已带官方来源链接,精确门槛点过去看。
- **剩余 Part B(后置/待定)**:
  - #5 公司官网(仅 24% 有网址,脆)/ #6 RNIP → 抓取,后置。
  - **JD 正文格式**(用户提)→ 改 05b 解析可见结构区,待用户确认是否插队。
  - **可选改进**:EE 类别抓取现可 httpx 直取(canada.ca 该页无 Akamai)→ 替掉有头浏览器、可进 docker。
  - **JD 正文格式(用户提)**:Job Bank `property="description"` 是压平字符串;格式在可见区 `.job-posting-details-body`(p/li)。改 05b 解析可见区 + 块感知 + 强制重解析 6800 → 重 mart → reseed。**未做,待用户确认是否插队**。
- ⚠️ **部署注意**:以上前端/schema 改动在 **host dev(npm run dev)** 上验证;**docker pnp-cms-1(production build)仍是旧码**,要让线上(:3000)也生效需 `docker compose up -d --build cms`。DB schema 已加列(host dev 推的),docker cms 读到多余列无害。
