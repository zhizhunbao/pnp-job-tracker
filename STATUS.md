# STATUS / 交接文档（2026-06-23）

> 新 session 接手先读这份 + `CLAUDE.md`(设计宪法)+ `prd.md`(需求)。仓库:github.com/zhizhunbao/pnp-job-tracker
> ✅ **本 session 工作全部已提交,工作区干净**(`git log` 看本次 ~25 个 commit)。

## 这是什么
**PNP Job Tracker** —— 每日更新的**全加拿大全职业职位板**,带移民价值视角。能走「雇主 offer → 省提名(PNP)」的岗打 `pnpEligible` 标记(粗筛信号,非资格认定)。
Job Bank 覆盖全 10 省全职业(含 QC);ATS(Kanata 科技公司)仍 Ottawa。

## 架构:数据仓库式分层
```
etl/ raw(抓取) → clean/(清洗,按字段) → mart(集市层,列对齐DB) → cms/ seed(纯加载器) → Postgres → /jobs
```
- `etl/_paths.py` 是**唯一路径真相来源**。按来源分顶层:`raw/ats/` · `raw/jobbank/`;processed 同理 `processed/ats/`。
- **mart(`09_build_mart.py`)**:把各源拼成 `data/mart/*.json`,每文件=一张DB表。中介过滤/去重/评分关联/分类/来源标签 全在这层或更上游。
- **seed(`cms/src/app/seed/route.ts`)= 纯加载器**:只读 mart → 灌库(并发分批)。`?reset=1` 全清重建;不带 reset = 增量对账(没出现的岗→closed)。

## 现状:全国多省,端到端跑通,库里 ~2084 岗 / 1578 公司
- **DB 8 张数据表**:事实 `jobs`(2084) `companies`(1578);维度 `provinces`(10) `cities`(541) `districts`(398) `noc_categories`(57) `sources`(5) `experience_levels`(5) `designated_employers`(2917, AIP名单)。
- **分类全在数据层**:NOC 大/中/小分类+TEER 在 `etl/noc.py`(单一来源)→ 存 job 字段;来源显示标签(JB→Job Bank)在 mart 洗 → `sourceLabel`。前端**只读字段、不再算 NOC**。
- **区(district)= 自维护 FSA→区表**:`reference/fsa-districts.json`(从 GeoNames 加拿大邮编开放数据建,1651个FSA,零API)。04c 按邮编查表洗区,全国可用(Ottawa社区折叠成 city=Ottawa)。769/2084 岗有区。
- **中位工资**:`reference/wages.json`(`build_wages.py` 从 ESDC 开放数据建,NOC×省 中位)。mart 按 NOC+省 join → job 带 `wageMedHourly/wageMedAnnual`(1473 岗匹配)。薪资顾问直接显示「中位 + 本岗 vs 中位 %」。
- **筛选全读维度表**:国→省→市→区(provinces/cities/districts)、大/中/小分类+TEER(noc_categories)、来源(sources)、经验(experience_levels);全字段搜索、表头三态排序、字段自选(含「主要」一键核心列)、**AI 顾问弹框**。
- 列顺序:发布时间第一、评分最后。默认排序发布时间降序(同值评分兜底)。地点列点击跳 Google 地图(各列用自己那一级)。
- **AI 顾问**:职位/公司用本地 Ollama(`OLLAMA_URL=http://192.168.1.150:11434`)流式;其余字段模板。**⚠️ 线上访问不到家里 Ollama,部署前要决定去向。**

## ⚠️ 性能 / 已踩坑
- **`/jobs` 列表走原始 SQL**(`page.tsx` 用 pg pool `SELECT+join`),绕开 Payload 的 per-doc 读取管线(2000+行要16s→0.9s)。**代价:耦合 Payload 的 snake_case 列名,改 Jobs schema 要同步那段 SQL。**
- **衍生抓取数据必须 gitignore**:`postings.json`/`mart/`/`all-scored.json`/`geonames|wages 源`/jobbank公司目录 全已忽略。**教训:之前 postings.json 被 git 跟踪,反复被 restore 回旧版丢数据。** 维护的表(fsa-districts.json/wages.json/AIP)才跟踪。
- 改 Jobs collection 字段 → **必须重启 dev server**(Payload 同步 schema)再重灌。
- **职位 externalId = `jb:<posting_id>`(JB)/ 投递 URL(ATS)**:JB 从帖子 URL 的 `/jobposting/<id>` 取,**不用完整 URL**(2707/2733 带 `?source=` 查询串,带不带就成两个 ID)。⚠️ **它是 08_score↔09_mart 的 join 键,两处必须一致**——只改一边会让评分/NOC/pnp 全丢(踩过:只改 09 → 2203 岗只剩 59 有评分)。
- **下架按发布日期过期,不靠 seenIds 对账**:增量抓取只含最近几天,用「本次没出现→closed」会误杀仍在招的旧岗(实测一次误杀 805)。seed 改为「本次未见 **且** datePosted 超 30 天」才下架。
- **重灌前必须跑完整链**:别只跑半条链(如漏 05b 详情)就 reset 重灌——会灌进缺官网/地址/区、NOC 没匹配的退化数据。完整链:05→05b→04c→04d→05c→08→09→seed。

## data/ 结构
```
data/
  raw/
    ats/ontario/ottawa/kanata-north/companies/  # ATS 源(会员名录,跟踪)
    jobbank/  postings.json(全国,gitignore) + details/ + <省>/<市>/companies/(物化,gitignore)
    reference/  fsa-districts.json · wages.json · designated-employers/aip-*.json  # 维护的表(跟踪)
                geonames/ · wages/*.csv · policy/<省>-immigration/                  # 源(gitignore 或正文跟踪)
  processed/ats/ontario/ottawa/kanata-north/companies/<slug>/   # ATS 物化(跟踪)
  mart/   companies/jobs/provinces/cities/districts/noc_categories/sources/experience_levels/designated_employers .json (gitignore)
  output/ all-scored.json(gitignore)
```

## ETL 流水线(`etl/`)
| 脚本 | 作用 |
|---|---|
| 01-03 | ATS:Kanata 名录 → 公司文件夹 → 找 careers |
| 04 scrape_ats_jobs | ATS 第一方岗(greenhouse/lever/workday…)|
| 05 scrape_jobbank | Job Bank。`--all-occupations --prov ALL --since-days N`:无关键词·按省·sort=D·增量合并到全国 postings.json |
| 05b scrape_jobbank_details | 帖子详情:地址/邮编/描述/雇主官网(增量,detail_fetched 标记;已全国跑过,~1465 地址)|
| **clean/**04b/04c/04d/05c | 抽薪资 / 地点(FSA查表洗区) / 薪资归一 / AIP标记。脚本顶部声明 `IN_*/OUT_*` 全路径 |
| 06 build_jobbank_companies | 把 postings 物化成 `raw/jobbank/<省>/<市>/companies/<slug>/`(分地域分公司,和ATS对齐)|
| 08 score | NOC→TEER+评分+pnpEligible → all-scored.json |
| build_fsa_districts | GeoNames → reference/fsa-districts.json(偶尔重建)|
| build_wages | ESDC开放数据 → reference/wages.json(年度更新)|
| 09 build_mart | 拼装 → data/mart/*.json(8张表 + 分类/来源/工资 join)|
| crawl/ | 网站→Markdown 的 BFS 爬虫(带 Playwright 过 Cloudflare),给以后抓政府站/政策页用 |

## 怎么跑(新机/新 session)
```bash
cd pnp-job-tracker/cms && docker compose up -d && npm run dev   # Postgres + :3000
# 完整重跑 ETL(走 _paths):
#   05 --all-occupations --prov ALL --since-days 3  → 05b → clean/04c → clean/04d → clean/05c → 08 → 09_build_mart
#   (ATS 链 01-04+04b 另跑;build_fsa_districts/build_wages 偶尔重建)
# 重灌: curl "localhost:3000/seed?reset=1"   |  增量: curl "localhost:3000/seed"
#
# 自动日更(后台,每2h跑全链):cd docker && docker compose up -d --build  |  日志: docker compose logs -f etl
```

## 待做(优先级)
- **Phase 3 — Docker 开机自抓服务 ✅ 已建(多源)**:`docker/`(按组件分子目录:`etl/Dockerfile` 等 + 根 `docker-compose.yml`)+ `etl/auto_update.py`。子目录=一个镜像,多源共用 etl 镜像靠 env 区分。`restart: unless-stopped` + Docker Desktop 登录自启 = 开机自跑。`cd docker && docker compose up -d --build`。
  - **角色拆分**(关键):抓取按源拆,但清洗/评分/mart/seed 是全局的、只一份。`SOURCE=jobbank` 只抓(05/05b 刷 raw);`SOURCE=build` 跨源清洗(04c/04d/05c)→评分(08)→mart(09)→`GET /seed`,是**灌库唯一角色**。多源不抢 mart/seed。加源 = SOURCES 登记 + compose 复制 service 改 SOURCE。
  - 抓法统一 **httpx**(JB 服务端渲染,已证明稳);`crawl/` Playwright 是有头+人工验证,**不进容器**,只给手动抓 Cloudflare 政府站用。
  - 编排器在 `etl/`(业务),容器配置在 `docker/`(运维)。代码/data 靠 bind-mount,改脚本不用重建镜像。
  - ⚠️ **增量 seed 安全,不会误关旧岗**:postings.json 只增不删(`load_national` 读全量当基底),mart 全量累积,`seenIds` 含全部岗 → `stale` 为空。(旧 STATUS 说「增量只含最新一天会误标旧岗 closed」是**错的**,已更正。)
  - 真正待办:① JB 过期岗(postings.json 不删)会一直挂 open → 以后按发布日期过期(JB帖约30天);② build 读 postings.json 与 jobbank 写它有微小竞态(读到半写→该轮 build 失败重试,文件不损),需要再说可给 05 加 temp+rename 原子写。
  - ⚠️ build 靠 `host.docker.internal:3000/seed` 灌库,所以 **cms 必须在跑**(host `npm run dev`);cms 没起时 seed 跳过、mart 已落盘,下轮补。要完全无人值守,得把 cms 也容器化(Dockerfile 已有)。
- **统一源框架(目标架构已定:[docs/source-framework.md](docs/source-framework.md) v2,D1-D5 全部拍板)**:三种抓法分三目录(httpx/crawl/dataset),**铁律=抓取只存原始 raw、清洗在 processed**,raw 按 `方式/源/日期` 快照不可变,源注册表独立 `etl/sources.py`,`auto_update` 只是调度器。OINP/SINP/AAIP 各省 PNP 单独成源(crawl,周/月)。**按文档第 8 节分步实施,JB 最后拆**(fetch 留 httpx、解析下沉 clean;回归基线=2084 岗 mart 一致)。尚未动手。
- 薪资加「vs 中位」可视化列(数据已有 wageMedAnnual)。
- 未分类岗(~26%,标题没匹配 NOC)继续加 noc 规则或 AI 兜底。
- 扩源:其它商会名录、Indeed/LinkedIn(放最后,ToS 风险)。用 etl/crawl/ 抓政策页填 policy_docs/pnp_streams 空表。
- 部署运维:托管(Vercel+Neon/Railway)、每日 cron、AI 顾问线上去向、`.env.example`、关于/免责声明页。

## 关键决策记录
- **数据仓库分层**:raw→clean→mart→load;mart 是「列对齐DB的最终表」,seed 只灌不拼。维度表(省市区/NOC/来源/经验/AIP)各自维护。
- **区从 GeoNames 自维护表**洗,不用限速的 OSM 地理编码 API。中小城市 FSA=城市本身、无子区时留空(数据天花板)。
- **列表读用原始 SQL** 而非 payload.find(性能);Payload 仍管 schema/admin/写入。
- 来源真相:JB 聚合 indeed/Talent → 统一显示「Job Bank」,`source` 留原始板。中介已按公司名过滤。
- 地点:Ottawa 各社区是「区」,统一 市=Ottawa;Richmond Hill 等靠**邮编 FSA**判定(不子串撞社区名)。
