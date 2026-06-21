# STATUS / 交接文档（2026-06-21）

> 新 session 接手先读这份 + `prd.md`。仓库:github.com/zhizhunbao/pnp-job-tracker

## 这是什么
**PNP Job Tracker** —— 每日更新、按移民价值评分的加拿大科技/全职业职位站点,面向"雇主 offer 省提名"路线。公开网站,人人可查。

## 架构(两段式)
```
etl/ (Python 抓取/清洗/评分)  ──写文件 data/──>  cms/ (Payload CMS + Next.js)
                                                 └ Postgres(Docker)+ /jobs 公开页
```

## 现状:端到端跑通(渥太华)
- `/jobs` 页:**410 个职位**,可搜索/按 分类(TEER)·来源·省份 筛选,按移民评分排序。
- 表格列:`评分 · 分类(TEER) · 职位 · 公司 · NOC · 经验级别 · 地点 · 来源 · 发布时间 · 更新时间`
- 可点:职位名→投递页 · 公司名→官网 · 地点→Google地图(精确地址)

## 怎么跑起来(新机/新 session)
```bash
cd pnp-job-tracker/cms
docker compose up -d        # 起 Postgres(容器 cms-postgres-1, 端口5432)
npm run dev                 # → localhost:3000
# 浏览器: /admin 建管理员；/jobs 看表
# 重灌数据: curl "localhost:3000/seed?reset=1"
```
> ⚠️ 上个 session 的 dev server + Postgres 是后台进程,session 结束可能已停 → 新 session 要重新 `docker compose up -d` + `npm run dev`。

## ETL 流水线(`etl/`,编号顺序)
| 脚本 | 作用 | 产物 |
|---|---|---|
| `01_scrape_directory.py` | Kanata North 科技园目录(逆向 admin-ajax)| `data/raw/directories/kanata-north.json`(520家)|
| `02_build_company_folders.py` | 一公司一文件夹 | `data/companies/<region>/<slug>/` |
| `03_find_careers.py` | 找 careers 页 + 识别 ATS | `…/careers.json`(134家有页,44家有ATS)|
| `04_scrape_ats_jobs.py` | ATS 第一方岗 + **每岗详情.md** + 发布时间 + 地址 | `…/jobs.json` + `…/jobs/<id>.md` |
| `05_scrape_jobbank.py` | Job Bank 全职业岗(含非IT)| `data/raw/jobbank/jobbank-on.json` |
| `05b_scrape_jobbank_details.py` | Job Bank 帖子详情(精确地址+描述)| `data/raw/jobbank/details/<id>.md` |
| `06_scrape_aip_employers.py` | AIP 指定雇主名单 | `data/raw/designated-employers/` |
| `08_score.py` | **TEER 0-5 分类 + 每 TEER 独立评分** | `data/output/all-scored.json` |
| `_paths.py` | 数据路径单一来源(改目录只改这)| — |

## 数据存储
- 文件:`data/companies/<公司>/`(profile/careers/jobs.json + `jobs/*.md` 详情)、`data/raw/jobbank/`、`data/output/all-scored.json`、`data/policy/<省>-immigration/`
- 数据库:**Postgres**(Docker)。`/seed` 路由读文件+评分→写入 `jobs`/`companies` 表,网站读库。

## CMS(`cms/`,Payload 3.85.1 + SQLite→已换 Postgres)
- Collections:`companies` `jobs` `pnpStreams` `policyDocs` `designatedEmployers`
- `cms/src/app/seed/route.ts` = 临时加载器(读 data/ → 入库;`?reset=1` 重建;跳过中介/CMC;去重;盖 lastSeen)
- `cms/src/app/(frontend)/jobs/` = 公开表格页

## 评分逻辑(08_score)
- 分类 = 官方 **TEER**(NOC 第2位数);每个 TEER 一套评分基线 + 紧缺职业(医疗/技工/科技+OINP紧缺清单)加分 + 直接雇主(非中介)+12 + 经验级别 + 省份。
- TEER 0-3=技能岗(可走雇主Offer省提名)高分;TEER 4-5 低分,紧缺职业有专门通道加分。

## 进度:用户要求"依次做"(还在 #2)
- **#1 职位详情 .md** ✅ 完成:ATS(6种含 BambooHR/SmartRecruiters 逐岗详情)+ Job Bank(265帖详情, 257有精确地址)→ 都有 `.md`
- **#2 给公司补官网 + 精确地址** ⏳ 进行中:
  - 已发现 **Job Bank 帖子页里有雇主官网链接**(如 `champhealthcareottawa.com`)→ 可用来给 Job Bank 公司补 `website`(下一步:增强 `05b` 提取雇主官网 + 地址)
- **#3 待做**:每日定时更新(GitHub Actions cron, 早6点ET)/ 榜单页(F8)/ 移民通道列(`07_enrich`:省+NOC+指定雇主→通道+政策文件)

## 关键缺口 / 已知问题
- **ATS 覆盖有限**:JSON 接口只覆盖 44/198 家。**~26 家不支持的ATS(Workday 15最大)+ ~90 家自建招聘页 = 大部分公司岗没抓到**。
  - 闭合方案:① 加 Workday 适配器(有 cxs JSON 端点)② **装 Playwright + HTML 爬虫兜底**(渲染JS招聘页 / 自建页)。← 这是扩大覆盖的关键,新 session 重点。
- **未分类 222 个岗**:标题没匹配 NOC 规则(零散职位名),可继续加规则。
- **CMC Microsystems** token 抓错(huaweicanada/Markham),已在 seed 跳过。
- Job Bank 有中介噪音,seed 已按名称过滤。

## 数据源总索引
`data/registry/valuable-urls.md`

## 记忆(本 session 在 short-video-studio 项目下,新项目记忆需重建)
关键事实:用户=亚岗昆 AI+Cloud 渥太华 PGWP,低 EE 分→走雇主offer省提名(非EE);见 short-video-studio 的 memory: immigration-pnp-strategy / company-directory-scraping。
