# 统一源框架 — 目标架构(v2,决策已定,待实施)

> 目的:把「抓数据」收敛成**一套套路**,任何源按同一契约接入(注册 → docker 定时 → raw → 清洗 → mart → seed)。
> **铁律:抓取只存原始(raw),清洗在 processed,两步绝不混。** 按「先文档后动手」推进,落地见第 9 节。
> 关联:[CLAUDE.md](../CLAUDE.md) · [STATUS.md](../STATUS.md)。

## ⚠️ 已诊断:增量 seed 误下架 + 不稳定 ID(2026-06-23 实测)
一次增量后 826 个旧岗被标 closed,量化成因:
- **~805/826(97%)**:旧岗不在当前 postings.json,被「本次没出现→closed」对账误杀。**对账模型本身脆**(原以为 postings.json 累积就安全,实测基底不全时即误杀)。
  → 修:**不要用 seenIds 对账**;改**按发布日期过期**(datePosted 早于 ~30 天且本次未见才下架),或仅在**全量抓取**后对账。
- **~21/826(3%)**:同 posting 换了 URL —— externalId=完整 URL,2707/2733 条带 `?source=searchresults` 查询串,带不带就成两个 ID。
  → 修(已做):externalId 改用 **`jb:<posting_id>`**(从 URL 取,去查询串噪声)。
- **~~待观察~~ 补充(2026-06-24 实测)**:`jb:<posting_id>` 对**单个帖子**稳定,但 JB **重发同一岗会给新 posting_id** → 同岗在库里多份;配合「30天过期」会让 open 数虚高(过期前累积重发副本)。**真正去重要按内容(公司+标题[+地点]),而非 posting_id**。优先级不高(30天内自清),量大再做。
> 两条都属 seed/identity 层,和下面的源框架并行;实施前先确认(见末尾)。

## 0. 铁律:抓取 ≠ 清洗(最重要)
- **raw/** = 原样存下抓到的东西(HTML / Markdown / CSV 原文件),**不解析、不清洗、不去重**,按**日期快照不可变**。
- **processed/** = 清洗后的结构化数据(解析成字段、合并、去重、累积)。
- `etl/clean/` 脚本读 raw → 写 processed;`09_build_mart` 读 processed → mart;seed 读 mart。
- ⚠️ 现状 `05` 是「边抓边解析」写进 `postings.json`(raw 里却是清洗过的)——**违背铁律,属待拆技术债**(见第 9 节 JB)。

## 1. 三种抓取方式 = 三个目录(`etl/scrape/<method>/`)
| 方式 | 抓什么 | 工具 | raw 产出 | 例子 |
|---|---|---|---|---|
| **httpx** | 有固定 DOM 的列表/详情页 | httpx + BS4 | 原始 `.html` | Job Bank、ATS careers |
| **crawl** | 自由文本/政府站(可能有风控) | BFS + httpx→浏览器兜底 | `.html` **和** `.md`(D1) | PNP 省级页、政策原文 |
| **dataset** | 开放数据文件 | httpx 下载 | 原文件 `.csv/.zip` | ESDC 工资、GeoNames、AIP |

> 三种方式天生不同(抓页面 vs 下文件),不强行统一成一种;统一的是**契约 + 目录 + raw/processed 分层**。

## 2. raw/ 目录约定:`raw/<源>/[<日期>/]`(✅ 已实施,2026-06-25)
> **实施时修订**:原设计是 `方式/源/日期`,但「方式」(httpx/crawl/dataset)已记在 `sources.py` 的 `method=`,
> 进路径属重复 → **去掉方式层**。无日期维度的源(ats/维护表)不深嵌套。统一成 **`raw/<源>/[<日期>/]内容`**。
```
data/raw/
  jobbank/<YYYY-MM-DD>/<省全称>-pNN.html    # 列表快照(每日) + manifest.json
                       details/<id>.html    #   详情快照(抓取那天的日期目录下)
  oinp/<YYYY-MM-DD>/ · aaip/<YYYY-MM-DD>/    # 各省 PNP 政策页原始 HTML
  ats/<slug>/                               # ATS 公司名录(无日期,扁平;roster json 跟踪)
  pnp/  oinp-in-demand.json · aaip-ineligible.json   # 维护表(跟踪,build_oinp/aaip 产出,08 读)
  aip/  aip-designated-employers.json       # 维护表(跟踪)
  wages/ wages.json + wage*.csv源    fsa/ fsa-districts.json + CA.txt源    policy/<省>-immigration/
```
- **日期目录**:抓取源每轮一份**快照**,raw 不可变可回溯;**累积/去重/合并放 processed**(processed/jobbank/postings.json)。
- **维护表(pnp/aip/wages/fsa)**:跟踪的「真相表」,和它的源文件同处一个源目录;**不删 reference 桶之外另设**——reference/ 这层已删,各表直接成顶层源。

## 3. 源注册表 = `etl/sources/<源>/` 包(D4 + 「按内容分目录」,✅ 已实现)
**每个抓取内容/角色一个目录**,目录里声明「跑哪些步 + method + 频率 + 是否灌库」;
`etl/sources/__init__.py` 自动发现所有子目录。`auto_update.py` 已拆成**纯调度器**,零源特定逻辑。
```
etl/sources/
  __init__.py        # 自动发现:NAMES = 所有子目录
  jobbank/__init__.py  # META = {method:'httpx', interval:7200, seed:False, steps:[05, 05b]}
  ats/__init__.py      # META = {... steps:[04, 04b]}
  build/__init__.py    # META = {seed:True, steps:[04c,04d,05c,08,09]}  ← 灌库唯一角色
  # 后续逐源迁移时,目录里再加 scrape.py / clean.py(把 05 等的逻辑搬进来),engines/ 放可复用引擎
```
**为什么这样**(而不是塞进 `auto_update`):加源只改 `sources/` 下新目录;`auto_update`(调度)、
docker(按 method 选镜像)、清洗都读同一份;「源有哪些」与「怎么调度」解耦。
> 现状:`jobbank/ats/build` 三个 META 已落地(steps 引用现有 05/04c 等脚本,**未动它们**);
> `scrape.py/clean.py/engines/` 等逐源迁移时再填(JB 最后,见第 8 节)。

## 4. `auto_update.py` = 调度器,不是抓取器(✅ 已拆薄)
它**不自己抓数据**,是个循环:读 `SOURCE` → 加载 `etl/sources/<SOURCE>/META` → 跑它的 `steps` → 按
`interval`(SCRAPE_INTERVAL 可覆盖)定时 → `META["seed"]` 为真才灌库。**不含任何源特定逻辑**。
真正抓数据的步骤/脚本在各源目录里声明。可理解为「编排/定时层」。

## 5. 反爬(D3)
crawl 方式:httpx 优先,命中 403/挑战 → headless 浏览器兜底。**过不了的验证码 → 记日志、跳过该页**,后期再人工处理(现 `browser_fetch` 的有头+人工那套留作手动重抓,不进容器)。

## 6. docker 映射(镜像按方式分,目录名一眼看清)
```
docker/etl/
  httpx/Dockerfile      # httpx 抓结构化页(Job Bank/ATS)+ build/clean 复用
  crawl/Dockerfile      # headless 浏览器爬自由文本/政府页(PNP 省级/政策)
  dataset/Dockerfile    # 下载开放数据文件(工资/邮编/AIP)
```
- 目录名 = `method` 值,和 `etl/scrape/<method>/`、`sources.py` 的 `method=` 三处同一套词,连得起来。
- compose:**一个源一个 service**,`env=SOURCE`,`interval` 按真实频率;service 名表明「哪个源/哪部分数据」。
- `build` service(清洗+评分+mart+seed)单例,**已实现**,复用 httpx 镜像。
- dataset/PNP 省级源:**低频**(月级/周级),别套 2h。

## 7. 初始源清单(进 sources.py)
| 源 | 方式 | 频率 | 说明 |
|---|---|---|---|
| jobbank | httpx | 2h | 全国全职业(现有,待拆 raw/clean)|
| ats | httpx | 日/周 | Kanata 公司第一方 |
| **oinp / sinp / aaip / bcpnp / …** | crawl | 周/月 | **各省 PNP 单独抓、单独更新**;填 `pnp_streams`/`policy_docs` 空表 |
| wages | dataset | 年 | ESDC 工资 |
| fsa | dataset | 极少 | GeoNames |
| aip | dataset | 偶尔 | AIP 指定雇主 |

## 8. 待实施(分步,JB 最后,每步可回滚)
1. ✅ 建 `etl/sources/<源>/` 注册表 + 拆薄 `auto_update`(已完成,现有抓取未动)。待补:`raw/<method>/<source>/<date>/` 约定。
2. `etl/scrape/{httpx,crawl,dataset}/` 三目录;crawl 输出迁 `raw/crawl/`,出 `.html`+`.md`;建 `docker/crawl/Dockerfile`(headless)。
3. **新源验证**:拿一个省 PNP 页(如 oinp)走全框架跑通 → 证明契约。不碰 JB。
4. dataset 源(wages/fsa/aip)做成低频 service。
5. ✅ **拆 JB 已完成(2026-06-25)**:`05` 拆成「抓→`raw/jobbank/<date>/*.html` + manifest」+「`clean/05_parse_jobbank.py` 解析→`processed/jobbank/postings.json`」;`05b` 同样拆成抓详情 HTML(`<date>/details/<id>.html`)+ `clean/05b_parse_details.py` 解析富集。fetch 仍 httpx(D5),解析下沉、raw 只存原始。回归基线逐字段一致(mart jobs.json 0 差异)。顺带修了潜伏丢数据 bug(去重键改用 url 派生 posting_id)。
   - 同期还做了 raw 全面扁平化(去方式层 + 删 reference 桶 + ats 地理压平 + all-scored 移 processed + 删 output)、列表文件名用省全称、auto_update 改 loguru 统一日志(逐行截获子进程)。

## 9. 已定决策
- **D1** page 源 raw 同时存 `.html` 和 `.md`。
- **D2** crawl 输出迁到 `raw/crawl/<source>/<date>/`。
- **D3** 验证码过不了 → 记日志跳过,后期人工。
- **D4** 源注册表独立成 `etl/sources.py`,auto_update / docker / 清洗都读它。
- **D5**(已确认)JB 无风控,fetch **继续用 httpx 老方法**(不上浏览器);**解析从抓取里拆到 clean→processed**,raw 只存原始 HTML。即第 8 节第 5 步那样拆 `05`。

## 10. 不做(YAGNI)
- 不把开放数据 CSV 塞进 crawl/`.md`。
- 不给无风控的 JB 上浏览器。
- 维度表/PNP 省级源不上日更/2h。
