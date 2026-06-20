# PRD — PNP Job Tracker（加拿大移民友好职位 · 每日评分追踪器）

> 版本 0.1 · 2026-06-20
> 一句话：每天自动抓取加拿大科技职位，识别**地域 / 职业(NOC) / 是否指定雇主 / 能走哪条移民通道 / 对应政策文件 / 官网 / 投递链接**，按"对移民的价值"打分排序，输出每日更新的可投递清单。

---

## 1. 背景与问题

**用户画像**：亚岗昆学院（渥太华）AI 证书 + Cloud 文凭（2026-09 入学）→ 叠成 3 年 PGWP；IT/科技背景（NOC 21231/21232/21211）；**Express Entry 裸分（CRS）不够**；已确定走**雇主 job offer 支持的省提名（PNP）**路线——优先**非 Express Entry 的 base 通道**（完全不看 CRS）。

**核心痛点**：
1. **通用招聘站不可靠**：Job Bank 只覆盖真实雇主的 ~5-10%，且头部"雇主"多是中介/派遣（不会担保）。
2. **聚合站无移民信号**：一个职位帖不告诉你雇主是否达 OINP 门槛、能否担保、走哪条通道。
3. **信息分散**：职位、公司官网、移民政策、指定雇主名单分散各处，无法以"对我移民的价值"统一排序。

**机会**：以**公司为中心**穷举某地域雇主 → 进各公司**官网第一方** careers 页抓真实在招 → 叠加移民规则与政策，打分排序。这是紧缩市场里最有效的打法（绕开挤破头的公开海投，直达能担保的雇主）。

---

## 2. 目标

- **主目标**：产出一份**每日更新、按移民价值评分**的职位清单，每个职位带完整决策信息，可直接投递。
- **非目标（暂）**：不做投递自动化；不做签证/移民申请代办；不替代持牌顾问意见。

---

## 3. 用户故事

- 作为求职移民者，我每天打开 `latest.md`，就看到"今天最值得投的 N 个岗"，每个都标了**走哪条移民通道、对应政策文件、雇主官网、投递链接、评分**。
- 我能按**地域**（渥太华/萨省/大西洋…）、**通道类型**（免 CRS 的 base / EE 对齐）、**应届友好度**筛选。
- 我能看到**今日新增**的职位（增量 diff），不必重看旧的。

---

## 4. 核心功能

### F1. 多源职位采集
- ✅ **Job Bank**（`jobbank_scraper.py`）：按 NOC 关键词 + 省份(`fprov`)抓，含中介标记。
- ✅ **公司官网 ATS 第一方**（`ats_jobs.py`）：Greenhouse/Lever/BambooHR/Recruitee/SmartRecruiters/Workable 的公开 JSON。
- ⏳ **LinkedIn / Indeed**（需用户账号登录，Playwright 持久 profile）：量最大，违反 ToS 风险自担。
- ⏳ **CareerBeacon**（大西洋）。

### F2. 公司目录穷举（雇主全集，按地域）
- ✅ Kanata North 科技园（`kanata_north_directory.py`，逆向 admin-ajax）：520 家，209 科技。
- ⏳ Invest Ottawa / 萨省 Co.Labs / 阿省 Platform Calgary / 大西洋 Volta·Genesis·Venn 等。

### F3. careers 页 + ATS 定位（`careers_finder.py`）
- 进每家公司官网，定位 careers 页、识别 ATS 类型。

### F4. 富化（每职位附加）
- **地域**：province / city。
- **职业 NOC**：标题 → NOC 分类（21231/21232/21211/…）。
- **是否指定雇主**：与 AIP 官方指定雇主名单（`aip_designated_employers.py`：NL/NB/NS）交叉匹配。
- **能走哪条移民通道**：规则引擎（省 + NOC + TEER + 是否指定雇主 → 适用通道）。
- **对应政策文件**：链到已爬政策原文（`data/crawl/<省>-immigration/...`）+ 官方 URL。
- **官网 URL + 投递 URL**。
- **是否中介/派遣**：垃圾过滤。

### F5. 评分（0-100，**移民可行性权重最高**）
见 §6 评分模型。

### F6. 每日更新 + 增量 diff
- 定时运行全流程 → `data/jobs/daily/<日期>.{md,json}` + `latest.md`；标注"今日新增"（对比上次快照）。
- 复用 `scripts/tracker/` 调度模式（来自原项目）。

### F7. 数据组织：一个公司 = 一个文件夹
```
data/companies/<region>/<company-slug>/
  profile.json   身份(名称/官网/邮箱/电话/行业/地址)
  careers.json   careers页 + ATS
  jobs.json      该公司在招岗(第一方)
  linkedin.json  LinkedIn 职位(需登录)
  indeed.json    Indeed 职位(需登录)
```

---

## 5. 数据模型（每个 job）

| 字段 | 说明 |
|---|---|
| company / slug | 公司名 / 唯一标识 |
| title | 职位名 |
| noc | 分类后的 NOC 代码 |
| region / city / province | 地域 |
| official_url | 公司官网 |
| apply_url | 投递链接（第一方/ATS） |
| salary / date_posted / source | 薪资 / 发布日 / 来源(ATS名) |
| is_designated_employer | 是否 AIP 指定雇主 |
| is_agency | 是否中介/派遣（True→不可担保） |
| pnp_streams[] | 可走的省提名通道 |
| policy_refs[] | 对应政策文件(本地路径 + 官方URL) |
| accessibility | 应届友好度(co-op/junior/senior) |
| score | 0-100 综合评分 |
| first_seen / last_seen | 增量追踪 |

---

## 6. 评分模型（满分 100）

> **优先级：移民可行性最重**（用户确认）。权重可在配置中调。

| 维度 | 权重 | 评分逻辑 |
|---|---:|---|
| **移民可行性** | **40** | 大西洋指定雇主(AIP,免CRS) 40；ON/SK 非EE雇主通道 34；AB(AAIP,EE对齐) 30；大西洋非指定 14；BC/MB 20 |
| NOC 匹配 | 25 | 核心(21231/21232/21211…) 25；相邻科技 15；非科技 0 |
| 直接雇主(非中介) | 15 | 中介/派遣 0；直接雇主 15 |
| 雇主像能担保 | 10 | 有官网+在目录+非staffing → 高（达 OINP 门槛概率）|
| 应届友好度 | 10 | co-op/junior/intermediate +；senior-only 低 |
| 新鲜度 | 加成 | 越新越靠前（同分时） |

---

## 7. 架构 —— 两段式（公开网站）

整个项目分两部分，通过数据库/API 解耦：

```
┌─ ② ETL（Python, etl/）──────────────┐         ┌─ ① CMS + 网站（Payload, cms/）────┐
│ 抓取(F1/F2/F3) → 清洗 → 富化(F4)     │  写入   │ Payload Collections (Postgres)    │
│ → 评分(F5)                          │ ──REST→ │ + Admin 后台(内容管理)            │
│ 产物: 归一化+评分的 jobs/companies   │         │ + Next.js 公开前端(人人可查/筛选) │
└─────────────────────────────────────┘         └───────────────────────────────────┘
        定时(每日 cron/GitHub Actions)                    部署(Vercel/Railway)
```

- **② ETL（Python）= 数据抓取、清洗、入库**：现有 `etl/jobs/` 脚本（`jobbank_scraper` · `kanata_north_directory` · `company_directory` · `careers_finder` · `ats_jobs` · `aip_designated_employers` · `build_company_folders`）+ 待建 `enrich.py`（NOC/指定雇主/通道/政策）· `score.py`（评分）· `load.py`（写入 Payload REST API）· `daily.py`（编排+增量diff+调度）。
- **① CMS（Payload）= 内容管理 + 网站**：定义 collections 作为数据模型与 API；Admin 后台供人工管理政策/通道/指定雇主等内容；Next.js 前端渲染可搜索/筛选的公开职位列表。
- 数据源总索引：`data/sources/valuable-urls.md`。

### Payload Collections（数据模型 = ETL 与网站的契约）

| Collection | 关键字段 | 维护方 |
|---|---|---|
| **companies** | name, slug, website, email, phone, region, sectors, address, isDesignatedEmployer, source | ETL 写入 |
| **jobs** | title, company(rel), noc, province/city/region, applyUrl, salary, datePosted, source, isAgency, pnpStreams(rel), policyRefs(rel), accessibility, **score**, firstSeen, lastSeen, status | ETL 写入 |
| **pnpStreams** | key, name, province, isExpressEntry, requiresJobOffer, ignoresCRS, officialUrl, notes | 人工(CMS) |
| **policyDocs** | title, stream(rel), province, sourceUrl, localPath, body | 人工(CMS)/ETL 关联 |
| **designatedEmployers** | name, province, location, source(AIP) | ETL 写入(NL/NB/NS) |

### ETL → CMS 契约
- ETL 的最后一步 `load.py` 把归一化+评分后的 records 通过 **Payload REST API**（`POST /api/jobs`、`/api/companies`，API-key 鉴权）upsert 入库（按 slug/posting_id 去重）。
- `pnpStreams` / `policyDocs` 为参考数据，在 Payload Admin 维护（= 内容管理）；ETL 富化时按 (省+NOC+指定雇主) 关联到对应 stream/policy。
- `firstSeen/lastSeen/status` 支撑"今日新增"与下架检测。

### 仓库结构
```
pnp-job-tracker/
  etl/        Python 抓取·清洗·评分·入库（②）
  cms/        Payload CMS + Next.js 公开网站（①）
  data/       ETL 中间产物 + 政策原文(data/crawl/*-immigration)
  prd.md
```

---

## 8. 移民通道 → 政策文件映射（规则引擎核心）

| 条件 | 通道 | 政策文件（本地 + 官方） |
|---|---|---|
| 省=ON + TEER0-3 科技 | OINP 雇主Offer(合并新通道,待公布) | `data/crawl/on-immigration/.../oinp-employer-job-offer-international-student-stream.md` · ontario.ca |
| 省=SK + 科技NOC | SINP 创新与科技人才(非EE) | `data/crawl/sk-immigration/.../sinp-innovation-tech-talent-pathway.md` · saskatchewan.ca |
| 省=AB + AB科技雇主 | AAIP Accelerated Tech | `data/crawl/ab-immigration/md/aaip-accelerated-tech-pathway-nocs.md` · alberta.ca |
| 省∈大西洋 + 指定雇主 | AIP(免CRS) | canada.ca/aip · 各省AIP页 |
| 省=NL + ICT offer | NLPNP Priority Skills | gov.nl.ca/immigration |

---

## 9. 技术栈

- **② ETL**：Python 3.11；httpx（抓取）、beautifulsoup4（解析）、PyMuPDF（PDF名单）；输出 JSON 中间产物 → 经 Payload REST API 入库。调度：cron / GitHub Actions（每日）。
- **① CMS + 网站**：**Payload CMS**（Node 24 已就绪）+ Next.js 前端；数据库 **Postgres**（关系型,适合 job↔company↔stream 关联）。部署 Vercel/Railway。
- 反爬：JS 目录站逆向其数据接口；登录站（LinkedIn/Indeed）用 Playwright 持久 profile。

> 公开网站注意：republish 抓取数据涉及来源 ToS / 版权 / 个人信息（已抓的雇主邮箱电话）。公开前需评估：仅展示职位+官方投递链接、不转载受版权内容、对个人联系方式做脱敏或仅 Admin 可见。

---

## 10. 现状与路线图

**已完成**（端到端跑通 1 个地域）：
- Stage 1 目录：Kanata North 520 家
- Stage 2 careers：134 家有招聘页，44 家标准 ATS
- Stage 3 真实岗：18 家 ATS，250 科技岗 → 各公司 `jobs.json`
- AIP 指定雇主名单：NL/NB/NS（科技仅 ~4%）
- 数据源登记表 + 一公司一文件夹结构

**下一步（按价值）**：
1. `enrich.py` + `score.py`：富化（NOC/指定雇主/通道/**政策关联**）+ 评分 → 产出首版评分清单
2. `daily.py`：每日编排 + 增量 diff + 调度
3. 修 token 误判（如 CMC→huaweicanada）+ 攻 Workday（15 家）
4. 扩地域：萨省/阿省目录
5. LinkedIn/Indeed 登录采集（装 Playwright）

**已知风险**：OINP 通道 2026-05-30 改制（合并版细则未出）；AIP 名单科技稀；登录采集违反 ToS。
