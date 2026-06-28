# 计划:AI 顾问弹框「每字段:原始数据块 + AI 解释」+ 补齐数据缺口

> 本文是**待执行计划**(2026-06-28 拟)。新 session 按本文从上往下做,做一项勾一项。
> 现状/已完成看 [STATUS.md](../STATUS.md);理念看 [CLAUDE.md](../CLAUDE.md)。

## 目标(用户原话)

1. 点任意字段弹出的 AI 顾问框:**上半显示该字段的原始抓取数据,下半 AI 解释**(目前只有 PNP/EE 两个字段做了)。
2. 上半要展示的原始数据若**缺**,就去**抓/补**(见 Part B 六个缺口)。
3. 原则不变:实时抓 + docker 自动更新,md 只作参考;宁可留空也不瞎猜。

## 现状(关键代码位置)

- 弹框组件 `AdvisorModal` 在 `cms/src/app/(frontend)/jobs/JobsTable.tsx`(约 L798)。正文 L891-906:
  - `{field==='pnp'} → <PnpListSection>`、`{field==='ee'} → <EeCategorySection>` —— **只有这两个字段有"上半真实数据"**。
  - 其余字段:正文只有 `renderAI(text)`(AI 文本),原始"值"仅在标题栏。
- 后端 `cms/src/app/api/advisor/route.ts`:`SIMPLE` 集(短解释)、`H` 各字段 prompt、评分明细重建(与 08_score 一致)。
- 弹框打开:JobsTable 里 `open(k, 值)` → `setPopup({field,job,title})`;job 行数据已含大部分字段(见 `JobRow` 类型 / `Jobs.ts` 39 字段)。

---

## Part A — 弹框「原始数据块」:每字段展示什么

实现:在 `AdvisorModal` 正文 AI 文本**之前**,加一个按 `field` 分支的原始数据区(可做成 `<FieldRawSection field job dims/>`,内部 switch)。数据优先取已加载的 `job` 字段 + 维度表;需新数据的项依赖 Part B。

| 点击字段 | 上半展示 | 数据来源 | 依赖 Part B? |
|---|---|---|---|
| 职位 title | 完整标题 · 匹配 NOC · JD 正文摘录 | job.title/noc/description | 否 |
| 公司 company | 公司名 · 官网 · 是否中介 · 是否 AIP 指定 · 该公司在招岗数 | job + designated_employers 维度 | 部分(#5 公司信息) |
| NOC noc | NOC 码 · 官方职业名 · TEER · 大中小分类 · **官方职责** | job + #2 | **#2** |
| 薪资 salary | 原始文本 · 折算年薪 · 当地中位 · vs中位% · **low/high 区间 + 年份** | job + #4 | **#4** |
| 中位时薪/年薪 | ESDC 中位 · NOC×省 · **区间 + 年份** | job.wageMed* + #4 | **#4** |
| vs 中位 | 年薪÷中位、% | job(派生) | 否 |
| PNP pnp | pnpEligible · 命中通道清单 · **门槛(语言/工资/CRS)** | PnpListSection 已有 + #3 | **#3** |
| EE ee | 所属类别 · 该类 NOC 清单 · **近期抽选分数线+日期** | EeCategorySection 已有 + #1 | **#1** |
| AIP aip | 是否指定 · 匹配的指定雇主记录(省/地点/tech) | designated_employers 维度 | 否 |
| 评分 score | 评分明细(各项加分,与 08 一致) | advisor 已重建 | 否 |
| 地点(country/province/city/district/address) | 全层级 · 地图 · **是否地区移民试点社区** | job + #6 | #6(边缘) |
| 时间(datePosted/lastSeen/closedAt)/状态 status | 各时间 + firstSeen + 增量对账说明 | job(seed 写) | 否 |
| 来源/渠道/发布(source/origin/direct) | 原始板 · Job Bank 聚合说明 · 第一方判定 | job | 否 |
| 经验级别/TEER/大中小分类 | 值 + 静态定义 | job | 否 |

**可先做(不依赖新数据)**:职位/AIP/评分/vs中位/地点/时间/状态/来源/经验/分类 —— 这些上半数据都已在 job/维度里,纯前端加区块即可。

---

## Part B — 六个数据缺口(按性价比排序)

### #4 工资 low/high 区间 + 年份 ★最划算,先做
- **为什么**:ESDC 同一份开放数据**本就含 low/median/high**,`build_wages.py` 现在只存了 median。
- **做**:① `etl/build_wages.py` 多抽 low/high + 数据年份;② mart 09 join 进 job;③ `Jobs.ts` 加字段 `wageLowHourly`/`wageHighHourly`/`wageLowAnnual`/`wageHighAnnual`/`wageYear`;④ 重启 dev sync schema + 重灌;⑤ 薪资/中位弹框上半展示「低 / 中位 / 高 (年份)」。
- **先核**:看 `etl/build_wages.py` 的 ESDC 源里 low/high 列在不在(大概率在)。

### #1 EE 各类别近期抽选分数线 + 日期 ★高价值
- **为什么**:现在 EE 弹框只说"属于哪个类别",缺"这个类别上次 CRS 多少分、哪天抽的"。
- **做**:① 新抓 canada.ca **Express Entry rounds of invitations**(category-based draws)→ `raw/ee/draws.json`(用现成的 `ee` crawl 镜像/无头);② 按 category 取最近 N 次抽选(date/CRS/invitations);③ mart 产 `ee_draws` 维度(或并进 `ee_categories`);④ EE 弹框上半:类别 NOC 清单 + 「近期抽选:CRS XXX · YYYY-MM-DD」。
- **源**:canada.ca/.../express-entry/submit-profile/rounds-invitations.html(DataTables,同 EE 类别页一套抓法)。

### #2 官方 NOC 职责描述 ★中
- **为什么**:NOC/职位弹框应能给"这个 NOC 官方干什么"。
- **做**:① 抓 noc.esdc.gc.ca 每个 NOC 页(只抓**数据集里出现过的 NOC**,不全量 500+);② `raw/noc/<noc>.json` 或 `noc_descriptions` 维度(noc→职责/主要职责);③ 弹框展示。
- **注意**:noc.esdc.gc.ca 可能反爬 → 先 httpx 试,403 再无头。量大,按出现过的 NOC 去重抓。

### #3 PNP 各通道门槛(语言/工资/CRS) ★中
- **为什么**:PNP 弹框有清单了,但缺"这个通道要 CLB 几、工资要求、CRS 线"。
- **做**:从各省 policy md(已抓,**只作参考**——但门槛是策略文本,可结构化解析)抽每通道的 language/wage/CRS/offer 要求 → 并进 `pnp_occupations` 维度或新 `pnp_streams` 维度的 meta。
- **风险**:各省措辞不一,解析脆;宁可留空也不瞎填。

### #5 公司层面信息(行业/规模/AIP 指定详情) ★高难度,后置
- 行业/规模需多源(官网/LinkedIn),杂且反爬;AIP 指定详情可先从 designated_employers 维度补展示。先只做"匹配到的指定雇主记录"展示,行业/规模延后。

### #6 地区移民试点社区(RNIP 等) ★边缘
- IRCC 的 RNIP/各社区试点清单 → 标注地点是否在试点社区。价值边缘,最后做。

---

## 执行顺序

1. **Part A 不依赖新数据的字段**(职位/AIP/评分/地点/时间/状态/来源/经验/分类)—— 纯前端,先把"原始数据块"框架搭好。
2. **#4 工资 low/high**(最划算)→ 接 Part A 薪资/中位弹框。
3. **#1 EE 抽选分数线**(高价值,镜像现成)→ 接 EE 弹框。
4. **#2 NOC 职责** → 接 NOC/职位弹框。
5. **#3 PNP 门槛** → 接 PNP 弹框。
6. **#5 公司 / #6 RNIP**(后置/边缘)。

每做一项:数据层(抓/解析)→ schema(若加字段,**改 Jobs.ts 必须重启 dev sync + 重灌**)→ 09 mart join → 前端弹框区块 → 实测 → 提交。**所有抓取走 docker 自动更新,md 只参考。**

## Schema 预计新增(`cms/src/collections/Jobs.ts`)

- #4:`wageLowHourly` `wageHighHourly` `wageLowAnnual` `wageHighAnnual` `wageYear`
- #1:大概率做成 `ee_draws` 维度(不挂 job 字段);若挂 job 则 `eeDrawCrs`/`eeDrawDate`
- #2:`noc_descriptions` 维度(noc→职责),不挂 job
- #3:并进 `pnp_occupations` 维度的 meta,不挂 job

## 当前代码状态(交接)

- 分支 `feat/lists-autoupdate-and-table-ux`,10 commits,**未合并 main**。
- 本计划相关改动**尚未开始**(只读调研到 `build_wages` 那步被叫停)。
