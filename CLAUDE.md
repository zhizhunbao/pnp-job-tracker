# CLAUDE.md — pnp-job-tracker 核心理念

> 这是项目的「设计宪法」，每个 session 自动加载。**当前状态/进度看 [STATUS.md](STATUS.md)，产品需求看 [prd.md](prd.md)。**
> 本文件只放长期不变的理念与约定;具体进度、数字、待办不要写这里(会过时)。

## 工程理念:Ponytail(有纪律的极简主义)
> 参考 https://github.com/DietrichGebert/ponytail —— **「最好的代码是你从没写过的代码」**。
> 动手写任何代码前,先过这道**决策阶梯**:
> 1. 这功能**需要存在**吗?(YAGNI,不臆测需求)
> 2. **标准库**能搞定吗?
> 3. 有**原生/平台特性**吗?
> 4. **已装的依赖**里有现成的吗?
> 5. 能**一行**解决吗?
> 6. 以上都不行,才写**最小必要**实现。
>
> **但这几样永不上砧板:信任边界校验、数据丢失处理、安全、可访问性、数据完整性。**
> 在本项目的体现:① 清洗宁可留空也不瞎猜(如邮编 FSA 只映射高置信社区);② 不为「可能用得上」加字段/脚本/依赖;③ 改动越小越好,先复用 04c/_paths 等既有结构再考虑新建。

## 这是什么
**PNP Job Tracker** —— 每日更新的**全加拿大全职业职位板**,带移民价值视角:能走「雇主 offer → 省提名(PNP)」的岗打 `pnpEligible` 状态标记(不再只 focus PNP,PNP 只是其中一个信号)。
**Job Bank 已覆盖全 10 省全职业**(含 QC;每日抓最新增量);ATS(Kanata 科技公司)仍 Ottawa。数据按 国→省→市→区 分层,不写死地域。
全国单文件:`raw/jobbank/postings.json`(province 作字段,posting_id 增量去重)。

## 架构:两段式,数据层和展示层严格分离
```
etl/ (Python: 抓取 → 清洗 → 评分, 写 data/) ──> cms/ (Payload + Next.js + Postgres) ──> /jobs 公开页
```
- `etl/` 编号顺序执行,`etl/_paths.py` 是**唯一的路径真相来源**(任何脚本不写死路径)。
- **分层(数据仓库式)**:raw(抽取) → clean/(清洗,按字段) → **mart(集市层,`09_build_mart.py` 产出 data/mart/ 最终表,列对齐 DB)** → load(seed)。
- `cms/src/app/seed/route.ts` 是**纯加载器**:只读 `data/mart/*.json`(每文件=一张表)→ 灌库,不做拼装/清洗。不带 `?reset=1` = 增量对账(本次没出现的岗 → status=closed)。
- **DB 表**:事实表 jobs/companies;维度表 provinces/cities/districts/noc_categories/sources/experience_levels/designated_employers(AIP)。Payload 仍管 schema/admin。
- **分类/标签也在数据层算**:NOC 大/中/小分类+TEER 在 `etl/noc.py`(单一来源)→ 存 job 字段 + noc_categories 维度;来源显示标签(JB→Job Bank)在 mart 洗 → job.sourceLabel + sources 维度。前端只读字段、筛选选项读维度表(颜色等纯显示留前端)。

## 核心理念:清洗下沉到数据层(最重要的一条)
**"脏活在脚本里干完,seed 只入库,前端只显示。"**

1. **所有清洗脚本统一放 `etl/clean/`**(04b 抽薪资 / 04c 地点 / 04d 薪资归一)。其余 scrape/build/score 留在 `etl/`。
2. **每个清洗脚本顶部先声明显式的输入/输出全路径常量**(`IN_*` / `OUT_*`,经 `_paths` 解析为绝对路径,运行时打印),再写逻辑——一眼看清这步读什么、写哪。原地清洗时 IN 与 OUT 同址。
3. **一个「清洗关注点」一个脚本,不是每字段一个,也不是每来源一个。**
   - 一个关注点(地点 / 薪资 / 分类)往往同时产出**多个互相依赖的字段**,要在同一个脚本里一次算清。
     例:`04c` 一次性规范化 `country/province/city/district/address`,因为它们同源、共用社区映射表。
   - 拆成「每字段一个脚本」= 重复解析同一原料 + 拆散互相依赖的逻辑 + 复制共享表,是反模式。
4. 每个清洗步只做一件事:**读原始抓取字段 → 写回干净的结构化字段**。同一脚本对所有来源生效(ATS 和 Job Bank 都过同一套地点清洗)。
5. **seed 只入库不清洗;前端只显示不清洗。** 发现前端在做清洗/换算(如已下沉的 `parseSalary` 年薪折算),那是技术债 —— 应下沉成清洗脚本。

## 数据约定
- **地点**:大渥太华的各社区(Kanata/Nepean/Orléans…)是「区」,统一 `city=Ottawa`;Orléans 合并(含 Orleans South)。精确地址需含街号,否则 `address` 留空。社区判定:文本社区名优先,文本没写但地址带邮编时用**高置信郊区 FSA 兜底**(central Ottawa 不猜,留空)。
- **来源真相**:Job Bank 自己聚合 indeed/Talent 等 → 统一显示「Job Bank」;`source` 字段保留原始板。
  `origin`(jobbank/ats/directory)是**发布渠道**,不代表雇主真假;中介已按公司名过滤。
- **评分 / PNP**:NOC → TEER 分类 → 每 TEER 评分(08_score)。`pnpEligible` = TEER 0-3 或在紧缺低TEER通道清单 —— **粗筛信号,非资格认定**(各省有自己的职业清单/语言/工资要求;QC 走自己的体系不属 PNP)。未匹配 NOC 的岗标「未分类」,不硬塞。

## 展示约定
- 站点定位是**日更职位板**:默认排序「发布时间最新在前」;主键相等时按评分降序兜底。列顺序**发布时间第一、评分最后**。
- 评分、`vs 工资中位` 等移民价值维度是这个站和普通招聘站的差异点,优先保护。

## 跑起来
```bash
# ⚠️ 2026-07-04 起:本地 dev **直连 Supabase 正式库**(cms/.env 已配;本地 postgres 已过时,仅紧急回退)
cd cms && npm run dev                            # 开发:localhost:3000(读写的就是生产!测试号用 @test.local)
# 改 collection 字段:dev 默认不推 schema(护栏)→ 显式 `DB_PUSH=1 npm run dev` 单次推,删列/改类型手写 SQL
# 无人值守全栈(含容器化 cms,开机自更新):cd docker && docker compose --profile unattended up -d --build
# seed 必须带 token(直连生产!): curl -H "x-seed-token: $SEED_TOKEN" localhost:3000/seed  (reset=1 会清生产,慎)
# 改了 Jobs collection 字段 → 必须重启 dev server(Payload 同步 schema)再重灌
# 完整重跑 ETL: 04 → clean/04b → clean/04c → clean/04d → 05 → 05b → 08 (走 _paths,顺序见 STATUS.md)
```
