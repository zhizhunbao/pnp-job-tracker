# G-AIP · 联邦大西洋移民计划(AIP)申请人门槛入库

> 批 B(子工 B)· 2026-08-09 立项即完工(P1)
> 上位设计:[一键三合一判定-20260809](../../design/一键三合一判定-20260809.md) §4「数据对账」——
> 「AIP 申请人侧 0 行」是 #287 完美案例(Grand View Manor CCA / NOC 33102)**最快那条路引擎判不了**的硬前置。
> 批次表 §7 P1「G-AIP 抓取批」。

## 0. 现状核实(2026-08-09 实测,与交接口径的出入)

- `data/crawl/fed-aip/manifest.json` 交接口径「17 页」在 **depth=2** 探索下,**申请人门槛细节页
  (work-experience.html / proof-funds.html / settlement-service-provider-organizations.html)
  实际比 `how-to-immigrate/eligibility.html`(depth 2)深一跳、是 **depth 3**,depth=2 探不到**——
  17 页里 eligibility.html 只是一张索引页(Who can apply 列了 6 个子话题,链到 6 个子页),
  真正的门槛原文在子页,子页当时不在缓存里。
- 处置:照 `fed-ee`(depth 4)同款先例,`etl/crawl/discover_sources.py` 的 `fed-aip` 种子深度
  **2→3**(`max_pages` 60→80 留余量),`python discover_sources.py fed-aip` 单独重跑该 slug
  (不动其余省份种子)。新增 6 页(work-experience / proof-funds / settlement-service-provider-organizations
  / hire-immigrant/employer-resources / hire-immigrant/requirements / post-secondary-institutions),
  manifest 变 23 页。**未现场 httpx 抓取**——链接全部来自已缓存的 eligibility.html 页面自身的
  `<a href>`,BFS 走正规爬虫扩一跳,不是凭印象猜 URL。

## 1. 整体目标

AIP 申请人门槛(工作经验/语言/学历/job offer 条款/安家资金)quote-anchored 入 `pnp_requirements`
mart 表(`province='FED' program='AIP'`),形状对齐 `pgwp_rules.json` / `fed-eligibility.json` 先例,
09 `IN_REQ_TABLES` 零新逻辑直接消费。**本批止于 raw→mart 数据链**;判定卡组装器(`tripleVerdict`)
与前端消费是设计文档 §7 P2/P3,不在本批范围。

## 2. 验收标准

- [x] ① `etl/build_aip_rules.py` 跑通:36 条规则全部 quote 引用核验通过(0 missing)→
      `data/raw/ircc/aip_rules.json`
- [x] ② `etl/09_build_mart.py` 的 `IN_REQ_TABLES` 加入 `aip_rules.json`(一行,带出处注释,
      照 pgwp/fees/fed-eligibility 先例口吻)
- [x] ③ 单独重算 `build_pnp_requirements()` 验证(不跑 09 全量 main):AIP 行数 36 > 0、
      每行都有 `valueText`(quote)与 `url`、`value` 全为 int 或 None(22P02 闸门)、
      既有(非 AIP)264 行不减(300−36=264,一致)、全部行 `province='FED'`
- [x] ④ `build_field_sources.py` / `field-sources.json` 核查:PGWP/EE 规则库均**未**登记
      （grep 零命中），照先例「pgwp 没登记就不动」——AIP 同款不登记
- [x] ⑤ 本实施文档

## 3. 实现步骤

- [x] **3.1** `etl/crawl/discover_sources.py`:`fed-aip` 种子 `depth: 2→3`(`max_pages` 60→80)+
      注释说明原因;`python discover_sources.py fed-aip` 单独重跑,manifest 17→23 页
      (`data/crawl/fed-aip/changes.json` 记录 +6/-0)。
- [x] **3.2** 逐页人工抄官方原文成 `RULES` 结构化行(照 `build_pgwp.py`/`build_ee_rules.py` 惯例:
      一条规则一条 quote,`page` 字段指向源页,`op` 用 `>=`/`<=`/`in`/`rule`,数值型门槛用
      `value=int`,编码型门槛（如 `eca-required`/`non-seasonal`/`excluded`）`value=字符串`——
      09 的 `build_pnp_requirements` 会自动把字符串 value 折进 `basis`、`value` 置空（22P02 闸门,
      G9 EE 规则库踩过的坑）。安家资金表(7 档)用 `familySize` 列而不是塞进 `basis` 编码
      （schema 已有该列，ON 等省级门槛表同款用法）。
- [x] **3.3** `main()` 六页统一读 crawl 缓存(`cache.get`,零现场请求)→ 逐条验证 quote 逐字命中
      对应页面 → 缺一条就 `raise SystemExit(1)`、保留旧表（本轮 0 missing，一次过）。
- [x] **3.4** `09_build_mart.py::IN_REQ_TABLES` 加一行 `_paths.IRCC / "aip_rules.json"`。
- [x] **3.5** 一次性验证脚本(scratchpad,未入库)：`importlib` 装载 `09_build_mart.py`（不触发
      `main()`，模块顶层无副作用）→ 分别以「含/不含 aip_rules.json」两份 `IN_REQ_TABLES` 调
      `build_pnp_requirements()` 对比行数差 → 断言见 §2③。

## 4. 涉及文件

`etl/crawl/discover_sources.py`(fed-aip 深度 2→3)· `etl/build_aip_rules.py`(新)·
`etl/09_build_mart.py`(`IN_REQ_TABLES` 一行)· `data/raw/ircc/aip_rules.json`(新,36 行)·
`data/crawl/fed-aip/manifest.json` + `changes.json`(crawl 役产物，非代码)

**红线内未动**：`cms/`、DDL、seed、生产库、`tripleVerdict` 引擎接线——消费归批 C。

## 5. 现有代码(复用点)

- 抓取模板：`etl/build_pgwp.py`(quote-anchored 单页早期先例)、`etl/build_ee_rules.py`
  (多页+多 program 一文件、`value` 字符串编码惯例、`norm()` 弯引号归一)。
- crawl 缓存读取：`etl/crawl/cache.py::get()`(跨 slug 扫 manifest，按 URL 精确匹配，
  取 `crawled_at` 最新一份，只认 status 200）。
- mart 消费：`09_build_mart.py::build_pnp_requirements()`（可单独重算，不必跑 09 全量 main；
  `familySize`/`appliesTeer`/`appliesCondition` 等列既有 schema 直接复用，零新列）。

## 6. 完成定义(DoD)

- [x] §2 全勾 + 本实施文档 + 设计文档 §7 批次表 P1 行可勾掉。commit/push 留给批 A/B/C 收口时
      一并处理（本批红线内禁 commit/push，由上级统一提交）。

## 7. AIP 申请人门槛全量清单(36 行)

按官方页面分组；`quote` 为官方原文（quote-anchored，逐字核验通过）。

### 工作经验（work-experience.html）

| factor | op | value | unit | quote 摘要 |
|---|---|---|---|---|
| workHours | >= | 1560 | hours | "at least 1,560 hours of related work experience over the past 5 years" |
| workPeriodMin | >= | 1 | years | "worked these hours over a period of at least 1 year" |
| workTeerMatch | rule | same-or-higher | — | "be in the same TEER category as your job offer or higher" |
| workPaid | rule | paid-only | — | "have been for a paid job" |
| workSelfEmployed | rule | excluded | — | "not be from a self-employed job" |
| workExemptGrad | rule | exempt-if-atlantic-grad | — | "You do not need to meet the work experience requirements if you're an international graduate…" |
| workExemptGradCredentialYears | >= | 2 | years | "took at least 2 years" |
| workExemptGradRecency | <= | 2 | years | "you received less than 2 years before you applied for permanent residence" |
| workExemptGradResidencyMonths | >= | 16 | months | "lived in 1 of the 4 Atlantic provinces for at least 16 months during the last 2 years before you graduated" |

### Job offer 条款（how-to-immigrate/job-offer.html）

| factor | stream | op | value | unit | quote 摘要 |
|---|---|---|---|---|---|
| offerFullTime | — | >= | 30 | hoursPerWeek | "full-time (at least 30 hours a week)" |
| offerNonSeasonal | — | rule | non-seasonal | — | "non-seasonal (consistent and paid all year)" |
| offerDuration | teer-0-3 | >= | 1 | years | "at least 1 year from the time you become a permanent resident for TEER 0, 1, 2 or 3 job offers" |
| offerDuration | teer-4 | rule | indefinite | — | "permanent employment with no set end date for TEER 4 job offers" |
| offerSkillLevel | — | rule | same-or-higher | — | "at the same or higher skill level as your qualifying work experience" |
| offerDesignatedEmployer | — | rule | required | — | "Each province designates employers who can offer jobs under this program." |
| offerOwnershipExclusion | — | rule | excluded | — | "can't come from a company in which you, your spouse or common-law partner are a majority owner" |
| workHealthcareCrossQualify | — | rule | NOC31201/31301→NOC33102/44101 | — | "Work experience in NOC 31201 (licensed practical nurses) and NOC 31301 (registered nurses) can be used for a job offer in…"（直接命中 #287 案例锚 NOC 33102） |

### 语言（language-testing.html）

| factor | stream | op | value | unit | quote |
|---|---|---|---|---|---|
| language | teer-0-3 | >= | 5 | CLB | "CLB 5 for job offer in TEER 0, 1, 2 or 3" |
| language | teer-4 | >= | 4 | CLB | "CLB 4 for job offer in TEER 4" |
| languageTestRecency | — | <= | 2 | years | "results must be less than 2 years old when you apply" |

### 学历（education-assessment.html）

| factor | stream | op | value | quote 摘要 |
|---|---|---|---|---|
| education | teer-0-1 | rule | canadian-1yr-postsecondary | "a Canadian one-year post-secondary (or higher) educational credential" |
| education | teer-2-4 | rule | canadian-high-school | "a Canadian high school diploma (or higher)" |
| educationForeign | teer-0-1 | rule | foreign-equivalent-1yr-postsecondary | "the foreign equivalent of a Canadian one-year post-secondary…credential" |
| educationForeign | teer-2-4 | rule | foreign-equivalent-high-school | "the foreign equivalent of a Canadian high school diploma…" |
| educationEcaRequired | — | rule | eca-required | "must get an educational credential assessment (ECA) for immigration" |
| educationEcaValidity | — | <= 5 years | — | "ECAs are only valid for 5 years" |

### 安家资金（proof-funds.html）

| factor | op | value | unit | familySize | quote |
|---|---|---|---|---|---|
| fundsRequired | rule | required | — | — | "must prove…enough money to support yourself and your family after you get to Canada" |
| fundsWaivedIfWorking | rule | waived-if-authorized-worker | — | — | "do not need to show proof of funds if you're already working in Canada with a valid work permit" |
| fundsMinimum | >= | 3815 | CAD | 1 | "1 $3,815" |
| fundsMinimum | >= | 4750 | CAD | 2 | "2 $4,750" |
| fundsMinimum | >= | 5840 | CAD | 3 | "3 $5,840" |
| fundsMinimum | >= | 7090 | CAD | 4 | "4 $7,090" |
| fundsMinimum | >= | 8042 | CAD | 5 | "5 $8,042" |
| fundsMinimum | >= | 9070 | CAD | 6 | "6 $9,070" |
| fundsMinimum | >= | 10098 | CAD | 7 | "7 $10,098" |
| fundsPerAdditionalMember | rule | None(basis 编码 1028) | CAD | — | "for each additional family member, add $1,028" |

## 8. 待办（交给批 C / 后续）

- 组装器 `tripleVerdict` 消费本表时，AIP 行的「比路」判断需要拿职位/雇主的 TEER 去匹配
  `offerDuration`/`language`/`education` 三处 `stream` 字段（`teer-0-3`/`teer-4`、
  `teer-0-1`/`teer-2-4`），以及 `workTeerMatch`/`offerSkillLevel` 两条 `rule` 行的语义
  （工作经验 TEER 必须 ≥ job offer TEER）——这两条目前是纯文本 basis，未做成引擎可读的
  TEER 对照表（沿用 build_ee_rules.py 对同类「rule」行的处理惯例：机读编码留在 basis，
  展示层直接人话转述 quote 即可，不强行拆成更细的行）。
- `workHealthcareCrossQualify` 是 #287 完美案例（NOC 33102 continuing care assistant）
  能否走「AIP 是最快路」这一结论的关键行——批 C 组装器应特别验一遍这条的消费路径。
