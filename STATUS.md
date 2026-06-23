# STATUS / 交接文档（2026-06-22）

> 新 session 接手先读这份 + `prd.md`。仓库:github.com/zhizhunbao/pnp-job-tracker
> ⚠️ **有大量未提交改动**(本 session 做了很多)。接手第一件事建议:`git status` 看一眼 → 整理提交。

## 这是什么
**PNP Job Tracker** —— 每日更新、按移民价值评分的加拿大职位站点,面向「雇主 offer → 省提名」路线。当前聚焦 **Ottawa**,设计上可扩到其它城市/省。

## 架构(两段式)
```
etl/ (Python 抓取→清洗→评分) ──写 data/──> cms/ (Payload + Next.js, Postgres) ──> /jobs 公开页
```

## 现状:全国多省 · 每日增量,端到端跑通
- **Job Bank 已扩到全 10 省全职业**(ON/QC/SK/AB/BC/MB/NB/NS/NL/PE)。抓「最新几天」增量:一天的增量就 +1200 岗左右。当前库 **~1370 岗**(全国 Job Bank 1513 帖 + 107 Ottawa ATS)。
- 定位放宽:**全加拿大全职业职位板**;能走省提名的岗打 `pnpEligible` 状态(TEER0-3 或紧缺低TEER),前端有「PNP」列 + 顾问解读。粗筛信号,非资格认定。
- 抓取模式:`05 --all-occupations --prov ALL --since-days N`,无关键词、按省 sort=D、按 posting_id 增量合并到**全国单文件** `raw/jobbank/postings.json`。
- ATS(Kanata 科技公司)仍只 Ottawa;Job Bank 各省 city 保留,只有大渥太华才折叠成 city=Ottawa+district=社区。
- ⚠️ 05b 帖子详情(精确地址/描述)目前还是 Ottawa 时代逻辑,**全国量太大没对每帖抓详情**;后续只对 direct 帖或按需抓。
- 功能:四级联动筛选(国家→省→市→区 / TEER→大→中→小分类 / 来源·经验)、全字段搜索、表头三态排序(降→升→取消)、滚动分页(首屏 60 下滑加载)、字段自选(全选/反选)、**AI 顾问弹框**(点单元格空白→解读;点链接→跳转)。
- AI 顾问:职位/公司用**本地 Ollama**(`OLLAMA_URL=http://192.168.1.150:11434`,qwen3.6)流式生成,职位基于抓取的真实 JD;其余字段模板即时解读。**⚠️ 线上访问不到家里 Ollama,部署前要决定:关掉/换云端/暴露。**

## data/ 结构(省/市/区分层,`etl/_paths.py` 是唯一路径来源)
```
data/
  raw/                       # extract 抓取
    jobbank/  postings.json(全国单文件,province 作字段)+ details/<雇主_职位>.md
    ontario/ottawa/
      kanata-north/companies/  kanata-north.json(会员名录,520家)+ careers
    reference/  policy/<省>-immigration/ · designated-employers/   # 跨省参考
  processed/ontario/ottawa/kanata-north/companies/<slug>/   # 每公司 profile/careers/jobs + 详情.md
  output/  all-scored.json(评分)             # gitignore
  registry/  valuable-urls.md
```
> gitignore 了衍生文件(output/、csv/md 视图、详情.md、log、html_cache);只跟踪源 JSON + policy 正文。

## ETL 流水线(`etl/`,编号顺序)
| 脚本 | 作用 |
|---|---|
| 01 scrape_directory | Kanata North 会员名录(逆向 admin-ajax)|
| 02 build_company_folders | 一公司一文件夹 |
| 03 find_careers | 找 careers 页 + 识别 ATS |
| 04 scrape_ats_jobs | ATS 第一方岗(greenhouse/lever/bamboohr/smartrecruiters/workable/recruitee + **Workday cxs 适配器**)+ 每岗 .md + 结构化薪资 |
| **clean/**04b extract_ats_salary | 从 .md 描述补薪资(ATS 没给结构化时;锚定关键词后 80 字符内取金额,含 "ranges from" 长前缀)|
| **clean/**04c clean_ats_locations | **地点清洗**:归一化 country/province/city/district/address,ATS 严格只留 Ottawa,Job Bank 也结构化;文本无社区名时用邮编 FSA 兜底 |
| **clean/**04d clean_salary | **薪资清洗**:原始 salary 串 → salaryAnnual(年薪折算)+ salaryText(规范文本),两源都跑(原前端 parseSalary 下沉至此)|
| **clean/**05c flag_aip | **单字段脚本**:雇主名匹配官方 AIP 指定雇主名单 → `aip`(bool);只限大西洋四省(NL/NB/NS/PE)|
| 05 scrape_jobbank | Job Bank 抓取。**新增 `--all-occupations` 全职业·按省·sort=D·增量**(最新 N 天,合并到全国 postings.json);旧的科技关键词+Ottawa 模式仍在 |
| 05b scrape_jobbank_details | 帖子详情:精确地址 + 描述 + **雇主官网(链接 or 邮箱域名)** |
| 08 score | NOC→TEER 分类 + 每 TEER 评分 → all-scored.json |
| 09 build_mart | **集市层**:拼装各源 → data/mart/ 最终表(列对齐 DB):companies/jobs(事实) + provinces/cities/districts/designated_employers(维度)。中介过滤/去重/评分关联都下沉到这 |

## 清洗约定(按「类」一个脚本,不是每字段一个;脚本都在 `etl/clean/`)
每个清洗步:**读原始抓取字段 → 写回干净结构化字段**;脚本顶部先声明显式 `IN_*/OUT_*` 全路径;seed 只入库不清洗;前端只显示不清洗。
- 地点 → 04c、薪资 → 04d(均已下沉到数据层)。前端只显示 salaryText/salaryAnnual,不再现算。

## CMS / 数据库(`cms/`,Payload + Postgres@Docker)
- `cms/src/app/seed/route.ts` = 加载器:读 data/ → 入库。`?reset=1` 全清重建;**不带 reset = 增量对账**(本次抓取没出现的岗 → status=closed + closedAt)。
- Jobs 字段(近期加):`country/province/city/district/address`(结构化地点)、`origin`(jobbank/ats/directory 渠道)、`source`(原始板 indeed/lever…)、`status/closedAt`(在招/已下架)、`score/noc/category/accessibility/salary`。
- 改了 Jobs collection 字段后**要重启 dev server**(Payload 同步 schema)再重灌。

## 怎么跑(新机/新 session)
```bash
cd pnp-job-tracker/cms
docker compose up -d        # Postgres
npm run dev                 # localhost:3000
# /admin 建管理员;/jobs 看表;重灌: curl "localhost:3000/seed?reset=1"
# 重抓后增量检测下架: curl "localhost:3000/seed"  (不带 reset)
# 完整重跑 ETL: 04 → clean/04b → clean/04c → clean/04d → 05 → clean/05c → 08(清洗脚本在 etl/clean/,走 _paths)
# 注:05c(AIP)要在 05/04c 之后跑(依赖 province);05b 帖子详情仅 Ottawa,全国未跑
```

## 部署上线就差「运维三件」(功能已 MVP)
1. **托管**:Railway/Render/Fly 或 Vercel + 托管 Postgres(Neon/Supabase)。
2. **每日 cron**:GitHub Actions 跑 ETL + seed(数据命门)。
3. ⚠️ **AI 顾问线上去向**:家里 Ollama 访问不到 → 关掉 / 换云端 / 暴露,三选一。
4. 部署前:提交代码 + `.env.example` + 一个「关于/数据来源/免责声明」页。

## 待做(优先级)
- **median wage**:下载 ESDC/Job Bank 工资开放数据(NOC×经济区中位)→ 加「vs 中位」列(对 LMIA/省提名有意义)。已确认走开放数据下载,不爬 JS 页。
- 扩城市/源(其它园区/商会名录;Toronto/Vancouver;Indeed/LinkedIn 放最后,有 ToS 风险)。
- 未分类岗(标题没匹配 NOC)可继续加规则或上 AI 兜底。

## 关键决策记录
- 来源真相:Job Bank 自己聚合 indeed/Talent 等,统一显示「Job Bank」;`source` 留原始板。「第一方/转贴」是**发布渠道**不是雇主真假;中介已按公司名过滤。
- 地点:Ottawa 各社区(Kanata/Nepean/Orléans…)是大渥太华市的「区」,统一 市=Ottawa;Orléans 合并(含 Orleans South)。
