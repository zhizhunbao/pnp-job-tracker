# STATUS / 交接文档（2026-06-29）

> 新 session 接手先读这份 + `CLAUDE.md`(设计宪法)+ `prd.md`(需求)。仓库:github.com/zhizhunbao/pnp-job-tracker
> ✅ 容器健康运行;**docker cms 现发布 :3001**(让出 :3000 给本地 host npm dev),本地 dev :3000。
>
> **本轮(2026-06-29 顾问弹框三层 + Part B 数据 + 表格固定列 + JD 格式)**:
> **① 弹框三层(事实/判断/对话)**:上半=可核验事实(绝不经 LLM)/ 中=只基于上半事实的 AI 判断 / 下=多轮 grounded 对话([route.ts](cms/src/app/api/advisor/route.ts) 加 `messages[]`,system 带整条岗位事实+铁律,问到没有的数据直说"未提供"不编)。各字段「事实块」`FieldFactsSection`(地点/薪资/分类/来源/经验/时间状态零成本;wiring:firstSeen 进 SQL、designated_employers 维度进前端=AIP 记录、职位 JD 摘录走 `/api/jobtext`、评分明细前端重建)。
> **② Part B 数据缺口(全开放数据 httpx,可进 docker 自动更新)**:**#0** ATS 公司简介进 mart;**#4** 工资 low/中/high+年份(`build_wages` 多抽 + `Jobs.ts` +5 字段);**#1** EE 抽选分数线(`build_ee_draws` 抓 IRCC `ee_rounds_123_en.json`,无 Akamai → ee_categories 加 drawCrs/Date/Size);**#2** NOC 官方名+职责(`build_noc_descriptions` 抓 StatCan NOC 2021 Elements CSV → 新 `noc-descriptions` 维度 397 行)。**#3 PNP 门槛 = 评估后决定留空**(门槛散在各省 checklist prose、工资多定性,解析易错;移民门槛宁可留空,弹框已带官方来源链接)。
> **③ 表格固定左列 + 横滚**:发布时间/大分类/公司/职位 **sticky 固定**(只冻最左连续段,先量列宽算累计 left),其余列给最小宽 → 列多时整表超容器**横向滚动**看隐藏列、列少 `width:100%` 拉满;默认 10 列;**bump 列偏好版本** COLS_COOKIE→`jobsCols2`/PREF_KEY→`v8`。
> **④ JD 正文保留格式**:[clean/05b_parse_details](etl/clean/05b_parse_details.py) `description()` 改抓**可见结构区** `.job-posting-detail-requirements`(h4+ul/li)做块感知提取(原是读 `[property=description]` 压平一坨);聚合帖 property 里的转义 HTML 再解析一次。`REPARSE=1` 重解析 6808 岗 → mart(4699 有正文)→ reseed。**原生 JB 岗格式漂亮;少数聚合纯文本帖源头无结构,天花板**。
> **本轮坑/教训**:① **seed 各维度是显式字段白名单**([seed/route.ts](cms/src/app/seed/route.ts) `dims[]`)—— 加维度字段必须同步加进 map,否则重灌不入库(EE drawCrs 踩过)。② 改 `Jobs.ts`/新 collection → **必须重启 host dev**(Payload 推 schema 加列/建表)再 reseed。③ **noc.esdc 证书链坏 + 不透明 objectid** → 弃用,改 StatCan 开放 CSV。④ canada.ca **category-based-selection 页现可 httpx 直取**(无 Akamai),EE 类别抓取可改 httpx 替掉有头浏览器(未做)。⑤ **EE「类别抽选」≠ 普通 EE**:类别列「—」只代表无定向快车道,不挡普通 EE/PNP/AIP(三条独立)。
> 代码在分支 `feat/lists-autoupdate-and-table-ux`(**未合并 main**,本轮 +20 余 commits)。
> **下一步(新 session)**:① **重建 docker cms :3001 到最新**(本轮改动后 :3001 又旧了:`cd docker && docker compose --profile unattended up -d --build cms`)② #5 公司官网抓取(仅 ~24% 有网址,脆)/ #6 RNIP ③ EE 类别抓取改 httpx(数据已准,只为进 docker 自更)④ 合并 main。详见 [docs/advisor-fields-plan.md](docs/advisor-fields-plan.md)。
>
> **上轮(2026-06-28)**:① **PNP/AIP/EE 三类清单全部 docker 自动更新** —— `pnp` 源(周更 httpx:AB/ON/SK/NS 实时抓 + `06_scrape_aip`)、`ee` 源(月更**无头 chromium**,canada.ca 实测无头+stealth 直接通,无需 xvfb;crawl 镜像保留有头能力给硬墙)。② **每省脚本全实时抓,md 只作参考**(`etl/pnp/build_<prov>.py`)。③ **08_score 把具名通道 stream 与资格 type 解耦** → exclusion 省(AB)也能挂 inclusion 通道;新增 **ON 科技(OINP Tech Draws 9)/ AB 科技(AAIP Accelerated Tech 44)**,全国具名命中 ~247。④ **BC tech 下架**(tech 抽选 2024-12 已关、welcomebc 无清单页;原 bc-tech 是手工从第三方补录的,违反"实时抓")→ BC 岗落绿「可提名」。⑤ **表格显示升级**:PNP 列 3 档强度(具名=琥珀 chip / 可提名 / 不符 + 魁省 N/A)+ 评分列 5 档色阶 + 更新时间时分秒 + 列宽拖拽/缩窄换行。⑥ **修**:09 空省份排序崩溃、04c 非城市占位词清洗。
> 代码在分支 `feat/lists-autoupdate-and-table-ux`(**10 commits,未合并 main**)。
> **下一步(已规划未做)**:见 [docs/advisor-fields-plan.md](docs/advisor-fields-plan.md) —— 每字段弹框「上原始数据块 + 下 AI」+ 补 6 个数据缺口(①EE 抽选分数线 ②NOC 职责 ③PNP 门槛 ④工资 low/high ⑤公司信息 ⑥RNIP)。
>
> **上轮(2026-06-26 移民信号 + 弹框)**:
> ① **PNP 列显示具名通道**:08_score `pnp_stream()` 算命中省清单的短标签(OINP 紧缺技能·科技 / AB 科技 / SK 医疗·科技·农业 / NS 紧缺空缺·毕业生;stream 与资格 type 解耦,exclusion 省也能挂),
> 列里不再只是泛「技能岗」。② **联邦 EE 类别——独立一列**:Express Entry 类别抽选 ≠ PNP(看 CRS、多不需 offer),
> 独立信号;`etl/crawl/_fetch_ee_categories.py` 用 browser_fetch 过 canada.ca 403、展开 DataTables 抓全 9 类 94 职业 → `raw/ee/`。
> ③ **省清单从已抓 policy md 解析,每省一个自包含脚本**(`build_<prov>.py`:`build_bc`/`build_sk`/`build_ns`)读 `raw/policy/<省>/md/*.md`
> (自动读 frontmatter 的 source/fetched)→ `raw/pnp/{bc-tech,sk-health,sk-tech,sk-agri,ns-critical,ns-grad}.json`,无需重抓。④ **清单维度表化**:mart 产 `pnp_occupations`(229)/`ee_categories`(94)
> → seed 入库 → 前端**读 DB props**(删 `/api/pnp-list`、`/api/ee-list` 文件读取;删空壳 `PnpStreams` collection,手动 drop 表+残留列)。
> ⑤ **点 PNP/EE 字段 → AI 顾问弹框**:上半「真实清单」(数据层维度表,**绝不经 LLM**,命中行高亮「← 本岗」),下半 LLM 建议。
> ⑥ **弹框升级**:默认 720×620、右上角全屏切换、标题栏拖动、右下角 resize(原生 pointer,尺寸记忆 localStorage)。
>
> **数据来源坑(见 memory)**:省政府站 + canada.ca 都对 httpx/WebFetch 返 403 → 用 `etl/crawl/browser_fetch.py`(headed Playwright);
> ⚠️ 必须**系统 python**跑(playwright 没装进 uv venv)。HTML 无损、md 便利有损 → 带分组的清单(OINP/AB)从 HTML 解析更可靠。
>
> **下一步(已确认)**:JD 正文灌库 —— 现在 jobtext/advisor **运行时现读 `data/*.md`**(部署需挂文件);拟 Jobs 加 `description`,
> mart 按 applyUrl 匹配 .md 写入,jobtext/advisor 改按 id 读 DB(列表 SQL 不 SELECT 它,避免页面撑爆)。公司简介无正文,需另抓。
>
> **AI 顾问真实性**:职位描述/评分/各字段/PNP·EE 清单——均有真实数据+精确数字作依据(prompt 强制不许编);
> **唯独公司分析靠模型自身知识**(没抓公司正文,冷门公司可能不准)。

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
- **DB 10 张数据表**:事实 `jobs`(~4834) `companies`(~3667);维度 `provinces`(10) `cities` `districts` `noc_categories`(101) `sources`(5) `experience_levels`(5) `designated_employers`(2917, AIP名单) `pnp_occupations`(216, 各省具名通道职业) `ee_categories`(94, 联邦EE类别职业)。
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

## data/ 结构(2026-06-25 扁平化:统一 `raw/<源>/[<日期>/]`,删了 reference/output 桶 + 方式层 + ats 地理深嵌套)
```
data/
  raw/                          # extract:每个子目录=一个源/维护表;抓取「方式」记在 sources.py,不进路径
    jobbank/<日期>/             #   JB 列表快照 <省全称>-pNN.html + <日期>/details/<id>.html(gitignore)
    oinp/<日期>/  aaip/<日期>/  #   各省 PNP 政策页原始 HTML(gitignore;维护表见 pnp/)
    ats/                        #   ATS 公司名录 roster(扁平,单区,.json 跟踪;.csv/.md gitignore)
    pnp/  oinp-in-demand.json · aaip-ineligible.json   # PNP 维护表(跟踪,08 读)
    aip/  aip-designated-employers.json                # AIP 名单(跟踪)
    wages/ wages.json + wage*.csv源   fsa/ fsa-districts.json + CA.txt源   policy/<省>-immigration/  # 维护表跟踪+源gitignore
  processed/                    # transform:累积去重的「当前态」(不按日期)
    jobbank/  postings.json + details/<slug>.md
    ats/<slug>/                 #   profile/jobs.json 跟踪;jobs/*.md gitignore
    all-scored.json             #   08→09 评分中间产物(gitignore;文件式更利于上云,不落 DB)
  mart/    8张表 .json(gitignore,09 产出,seed 灌库)
```

## ETL 流水线(`etl/`)—— 抓取/解析已分离(raw 只存原始 HTML,解析在 clean/→processed)
| 脚本 | 作用 |
|---|---|
| 01-03 | ATS:Kanata 名录 → 公司文件夹 → 找 careers(写 raw/ats、processed/ats,扁平)|
| 04 scrape_ats_jobs | ATS 第一方岗(greenhouse/lever/workday…)→ processed/ats/<slug>/ |
| **05 scrape_jobbank** | **纯抓**:`--all-occupations --prov ALL --since-days N` → 每页原始 HTML 存 `raw/jobbank/<日期>/<省全称>-pNN.html` + manifest,不解析 |
| **clean/05_parse_jobbank** | 读最新日期快照 → parse_article 解析 → 增量去重合并 `processed/jobbank/postings.json`(temp+os.replace 原子写;去重键=url 派生 posting_id)|
| **05b scrape_jobbank_details** | **纯抓**:对未富集的帖抓详情 HTML → `raw/jobbank/<日期>/details/<id>.html`(增量靠 detail_fetched/文件存在)|
| **clean/05b_parse_details** | 解析详情 HTML → 富集 processed postings(address/website)+ 写 processed/jobbank/details/<slug>.md |
| **clean/**04b/04c/04d/05c | 抽薪资 / 地点(FSA查表洗区) / 薪资归一 / AIP标记。脚本顶部声明 `IN_*/OUT_*` 全路径 |
| 06 build_jobbank_companies | (遗留,无下游消费者)把 postings 物化成公司目录;不在容器管线里 |
| 08 score | NOC→TEER+评分+pnpEligible(按省:08 读 raw/pnp/*.json,inclusion/exclusion 两型)→ processed/all-scored.json |
| build_fsa_districts | GeoNames → fsa/fsa-districts.json(偶尔重建)|
| build_wages | ESDC开放数据 → wages/wages.json(年度更新)|
| etl/pnp/build_<prov> | 每省一个自包含脚本 → pnp/*.json。**AB/ON/SK/NS 全实时抓**(ON 双流含科技,AB 含科技 PDF;SK/NS 复用 HTML→md 转换器)。BC tech 抽选 2024-12 已关→**无具名通道、已下架**。**docker `pnp` 源(周更)**|
| 06_scrape_aip_employers | AIP 指定雇主 NL/NB/NS → aip/(PE 仍 TODO);随 `pnp` 源周更 |
| _fetch_ee_categories | 联邦 EE 9 类/94职业 → ee/。**已上 docker `ee` 源(月更,crawl 镜像无头 chromium,canada.ca/Akamai 无头直接通,无需 xvfb)**|
| 09 build_mart | 拼装 → data/mart/*.json(8张表 + 分类/来源/工资 join)|
| auto_update | 调度器:读 sources/<SOURCE>/META 跑 steps;**loguru 统一日志**,逐行截获子进程输出套「时间\|级别\|源\|消息」|

## 怎么跑(新机/新 session)
```bash
cd pnp-job-tracker/docker && docker compose up -d postgres   # 起库(全栈 compose,项目名 pnp,容器 pnp-*)
cd ../cms && npm run dev                                      # 开发 :3000(库走宿主 5432)
# 完整重跑 ETL(走 _paths):
#   05 --all-occupations --prov ALL --since-days 3  → 05b → clean/04c → clean/04d → clean/05c → 08 → 09_build_mart
#   (ATS 链 01-04+04b 另跑;build_fsa_districts/build_wages 偶尔重建)
# 重灌: curl "localhost:3000/seed?reset=1"   |  增量: curl "localhost:3000/seed"
#
# 自动日更 / 开机自启(docker/):
#   开发(cms 用 host npm run dev):  cd docker && docker compose up -d                        # 只起 etl 自动机
#   无人值守(cms 也容器化):         cd docker && docker compose --profile unattended up -d --build
#   日志 docker compose logs -f  |  停 docker compose --profile unattended down
#   ⚠️ 两模式都抢 :3000,别同时跑。开机自起再去 Docker Desktop 勾「登录时启动」。
```

## 待做(优先级)
- **Phase 3 — Docker 开机自抓服务 ✅ 已建并跑通验证(2026-06-24)**:单一 `docker/docker-compose.yml`(项目名 `pnp`,容器 `pnp-postgres/cms/jobbank/build`)+ `etl/auto_update.py`。`restart: unless-stopped` + Docker Desktop 登录自启 = 开机自更新。用法见上「怎么跑」(开发=`up -d postgres`+host npm;无人值守=`--profile unattended up -d`)。
  - **实测一轮端到端通**:jobbank 抓(05/05b,东部时间日志)→ build 清洗/评分/mart → curl cms → seed 200;今天(6-24)数据入库、全部有评分、区/官网富集、稳定 `jb:<id>`。
  - ⚠️ **运维注意①(富集时序)**:build 按自己的 2h 计时,首轮常在 jobbank 的 05b(详情/地址)跑完前就 seed → 该轮 districts/官网偏少。**下一轮(build 用上一轮已富集数据)自动恢复**;想立刻富集可 `docker compose restart build`。
  - ⚠️ **运维注意③(笔记本睡眠会暂停)**:`time.sleep` 走单调时钟,合盖/睡眠时 VM 暂停、计时冻结 → 整夜不出新周期(不是 bug,容器只有 1 个 python 在 sleep)。醒后需累计够「清醒时长」才触发。想立刻更新:`docker compose -f docker/docker-compose.yml restart build jobbank`(build 立即灌、jobbank 重抓)。要真·7×24 自动 → 部署到常开主机(Render,见框架文档)。
  - ⚠️ **运维注意②(过期累积)**:下架按「发布超 30 天」而非对账,所以近期但本轮没出现的岗会暂留 → DB open 数会比当前实际在挂的多(JB 重发换 posting_id 会放大此现象,30 天内自然清)。彻底干净基线可 `curl "localhost:3000/seed?reset=1"`。真要去重得按内容(公司+标题)而非 posting_id —— 记入 [docs/source-framework.md](docs/source-framework.md)。
  - 旧 `docker compose up -d --build` 命令已随合并失效,改见「怎么跑」。
  - **角色拆分**(关键):抓取按源拆,但清洗/评分/mart/seed 是全局的、只一份。`SOURCE=jobbank` 只抓(05/05b 刷 raw);`SOURCE=build` 跨源清洗(04c/04d/05c)→评分(08)→mart(09)→`GET /seed`,是**灌库唯一角色**。多源不抢 mart/seed。加源 = SOURCES 登记 + compose 复制 service 改 SOURCE。
  - 抓法统一 **httpx**(JB 服务端渲染,已证明稳);`crawl/` Playwright 是有头+人工验证,**不进容器**,只给手动抓 Cloudflare 政府站用。
  - 编排器在 `etl/`(业务),容器配置在 `docker/`(运维)。代码/data 靠 bind-mount,改脚本不用重建镜像。
  - **cms 已容器化 ✅(`unattended` profile)+ 单一 compose(项目 pnp,容器 pnp-*)**:整套(postgres + cms + jobbank + build)开机自起、每 2h 自更新。cms 用服务名 `postgres:5432` 连库、挂 `../data:/data` 供 seed 读 mart、发布 :3000;build 经 `host.docker.internal:3000` 灌库(host npm dev 或容器 cms 都通)。pgdata 卷 pin `cms_pgdata` 不丢库。改动:next.config `output:'standalone'`、Dockerfile node24+`npm install`+空 `public/`。
  - **下架已改按发布日期过期 ✅**:不再用 seenIds 对账(实测会误杀 805 仍在招的旧岗)。seed 改「本次未见 **且** datePosted 超 30 天」才 closed。**(旧 STATUS 说「增量 seed 安全」是错的——postings.json 基底不全时会误杀。)**
  - **职位 ID 已改稳定 `jb:<posting_id>` ✅**:见「已踩坑」段(它是 08↔09 join 键,两处一致)。
  - 剩余小坑:build 读 postings.json 与 jobbank 写它有微小竞态(读到半写→该轮失败重试,文件不损);需要可给 05 加 temp+rename 原子写。
- **统一源框架(目标架构已定:[docs/source-framework.md](docs/source-framework.md) v2,D1-D5 全部拍板)**:三种抓法分三目录(httpx/crawl/dataset),**铁律=抓取只存原始 raw、清洗在 processed**,raw 按 `方式/源/日期` 快照不可变,源注册表独立 `etl/sources.py`,`auto_update` 只是调度器。OINP/SINP/AAIP 各省 PNP 单独成源(crawl,周/月)。**按文档第 8 节分步实施,JB 最后拆**(fetch 留 httpx、解析下沉 clean;回归基线=2084 岗 mart 一致)。尚未动手。
- ✅ **/jobs 前端这轮已上线(容器,2026-06-24)**:中英韩 i18n([i18n.ts](cms/src/app/(frontend)/jobs/i18n.ts):字典+makeT,语言切换 localStorage);**AI 顾问全字段走 Ollama**(按所选语言生成、facts/评分明细喂 prompt 保数值准、简单字段一句话——见 [route.ts](cms/src/app/api/advisor/route.ts) 的 SIMPLE 集;前端 advHeader 只出标签+链接,无三语长文);sticky 顶栏 + 响应式 footer;滚动自动加载封顶 180 + 「显示更多」按钮;新增 中位时薪/中位年薪/**vs中位** 列;**全字段筛选**(分类下拉 PNP/AIP/状态/渠道 + 数值区间 评分/年薪K/vs中位%)。维度表(NOC 中/小分类名等)三语待数据层做(name_zh/en/ko)。
- **各省 PNP 职业清单(crawl 源)**:把 `pnpEligible` 从粗筛升级成**按省精准**。
  - ✅ **OINP 试点已跑通**:`etl/pnp/build_on.py`(httpx 抓 ontario.ca OINP In-Demand Skills 页,无 Cloudflare)→ bs4 解析 56 个 NOC(任意 9 / 限 GTA 外 47)→ 维护表 `reference/pnp/oinp-in-demand.json`(跟踪;原始 HTML 存 raw/crawl/,gitignore)。`08_score` 读该表当 TEER4-5 紧缺通道(原写死 6 → 真实 56)。**模式 = build_<prov>.py → reference/pnp/<prov>.json → 08 消费**。
  - ✅ **② `pnpEligible` 已改按省过滤(2026-06-25)**:`08_score` 现**目录驱动**——扫 `reference/pnp/*.json` 按各文件 `province` 字段建 `省→{NOC}` 表(`INDEMAND_LOW_BY_PROV`)。TEER0-3 全省粗筛通用;TEER4-5 仅当 NOC 在**该岗所在省**清单才 eligible。加新省=丢一个 json,08 不改代码。**魁省(QC)直接排除**(`NON_PNP_PROV`,走自己的甄选不属 PNP)。实测修正 264 个跨省误标(QC 69/SK 51/AB 34…),pnpEligible 1580→1461。去掉了原硬编码 6 个兜底 NOC(那是瞎猜)。
  - ✅ **AB(AAIP)已接入(2026-06-25)= 第二个省 + 两型框架**:`etl/pnp/build_ab.py`(httpx 抓 alberta.ca AOS 资格页,虽 Cloudflare 但 httpx 直抓 200)→ 解析「不符合资格职业」表(34 个 NOC)→ `reference/pnp/aaip-ineligible.json`。**关键:AAIP 与 OINP 语义相反** —— AOS 是 **exclusion/permissive**(TEER0-5 默认都可走,清单内不可),OINP 是 **inclusion**(TEER4-5 默认不可,清单内才可)。08_score 给省表加 `type`(indemand/ineligible)字段据此反向判定;`score` 的 +12 只对 inclusion 型加。实测 AB 新增 76 个 TEER4-5 岗正确标可走、修正掉 1 个(排除表里的 TEER0-3),pnpEligible 1461→1536。
  - **调研结论(各省 PNP 结构异构,OINP inclusion 非通用)**:**BC** 低 TEER 的 ELSS 流 2024-12-10 永久关闭(无表=逻辑已天然正确);**SK(SINP)** 用排除清单+行业配额模型(另一种形状);**MB(MPNP)** 有 in-demand 清单但 TablePress JS 动态加载(静态 HTML 只 2 行,需 AJAX 端点或 headless),未做;**AB(AAIP)** 是干净 httpx 静态表→已做。
  - 待办:① 其余省继续(SINP 排除+配额 / MB 需破 TablePress 端点 / 其余 inclusion 省)——加 inclusion/exclusion 表丢 json 即生效;③ OINP 其它 stream(Foreign Worker/International Student 是 TEER0-3 广覆盖,已被现逻辑包住);④ build_on 接入低频定时(像 build_wages,偶尔重抓);⑤ 真有 Cloudflare 的省 → 需 headless crawl 镜像(D3);⑥ OINP 的 `gtaRestricted`(限大多伦多区外)暂未按岗所在区过滤——08 只有省粒度,接入区粒度后再细化。
- ✅ **未分类大幅降(2026-06-26)**:改从 **Job Bank 详情页抽官方 NOC**(`<span class="noc-no">NOC <码></span>`,05b/parse_details 抽 → posting.noc),08 分类优先级 **源NOC > 标题猜**。未分类 31%→预计 ~5%(只剩 JB 自己没标的)。存量帖一次性重抓回填(05b 对缺 noc 的也重抓,自愈)。剩余少量可继续加 noc 规则或 AI 兜底。
- 扩源:其它商会名录、Indeed/LinkedIn(放最后,ToS 风险)。用 etl/crawl/ 抓政策页填 policy_docs/pnp_streams 空表。
- 部署运维:托管(Vercel+Neon/Railway)、每日 cron、AI 顾问线上去向、`.env.example`、关于/免责声明页。
- **前端/AI**:① AI 顾问**公司分析接真实数据**(现靠模型知识,冷门公司可能编)——轻量=把 JD+官网喂进 company prompt+强化「不确定就说」;重=06b 抓公司官网首页文本进管线。② NOC 中/小分类名三语(name_zh/en/ko,数据层做)。③ 统计模块(用户提过:任意维度×指标,单页还是分模块,jobs 模块命名)——未设计。④ 累积稀释:DB 旧岗保留旧 pnp/NOC/QC 标记,靠 30 天老化或 reset 收敛(用户不愿删岗,选自然收敛)。
- **本轮踩坑记**:① 服务端组件从 `'use client'` 模块导入普通常量会拿到 undefined(COLS_COOKIE 必须放共享非-client 模块)。② cookie 值 encodeURIComponent 编码,服务端读出要 decodeURIComponent 再 parse。③ SSR+localStorage 偏好天生闪烁(默认→切换),要么 cookie 让服务端直接渲对、要么 useLayoutEffect 绘制前切。④ cms 容器 data 挂在 `/data`(standalone cwd=/app,`../data`=/data);改 cms 源码要重建镜像(`up -d --build cms`),非 bind-mount。

## 关键决策记录
- **数据仓库分层**:raw→clean→mart→load;mart 是「列对齐DB的最终表」,seed 只灌不拼。维度表(省市区/NOC/来源/经验/AIP)各自维护。
- **区从 GeoNames 自维护表**洗,不用限速的 OSM 地理编码 API。中小城市 FSA=城市本身、无子区时留空(数据天花板)。
- **列表读用原始 SQL** 而非 payload.find(性能);Payload 仍管 schema/admin/写入。
- 来源真相:JB 聚合 indeed/Talent → 统一显示「Job Bank」,`source` 留原始板。中介已按公司名过滤。
- 地点:Ottawa 各社区是「区」,统一 市=Ottawa;Richmond Hill 等靠**邮编 FSA**判定(不子串撞社区名)。
