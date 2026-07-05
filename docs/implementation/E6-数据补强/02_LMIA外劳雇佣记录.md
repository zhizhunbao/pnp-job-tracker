# E6-02 · LMIA 外劳雇佣记录(雇主质量信号)

> Epic **E6 数据补强** · 负责人 Frank · 4 SP · 2026-07-05 立项(功能盘点 D-a 拍板)
> 通用约定与索引见 [实现文档 README](../README.md)。上位分析:[功能价值盘点与数据缺口](../../功能价值盘点与数据缺口.md) §3.5/§4-P0。
> **语义红线(2026-07-05 现状核查后定)**:本信号=「雇主**雇过**外国人的历史事实」(岗位价值模型·雇主质量轴),**不是**「能担保」的能力判定。2026 年 TFWP 大幅收紧(低薪股 30 大都市区冻结、EE offer 加分 2025-03 已取消),展示必须带股别与年份,措辞循「粗筛信号,非资格认定」。

---

## 1. 整体目标

把 ESDC「获批正面 LMIA 雇主清单」季度开放数据接入管线,按雇主聚合成外劳雇佣记录,与 companies 匹配后在列表/弹框/榜单三处露出,并进档案匹配加权。让「这家雇主雇过外国人吗」从社群传言变成带出处的事实。

## 2. 验收标准

- [x] ① `build_lmia.py` 拉近 8 季度(2024Q1-2025Q4)文件 → 按雇主 normName 聚合(季度分布/股别/获批 LMIA 数/获批职位数/涉及 NOC)→ 衍生表落盘;重跑幂等。(2026-07-05 ✅,见 §7)
- [x] ② 与 companies 的 normName 匹配率**先出统计报告**(命中数/命中率/抽样人检 20 条无误报)再灌库——法定名 vs 商用名的错配风险要量化后拍板阈值。(2026-07-05 ✅:**精确 normName 即可,不做模糊匹配**,见 §7)
- [x] ③ 命中雇主的岗:列表新「外劳记录」列(`✓ N 职位 · 季度`)+ 弹框 lmia 事实块(记录/股别分布/免责注)+ field_sources 数据集条目(31 行,verified)。(2026-07-05 ✅ 生产)
- [x] ④ sponsor-likely 榜单口径升级:LMIA **技能股**(High Wage/GTS/PR-only)职位数为第一排序键;三语口径说明+SEO meta 同步;D-c 因实证数据自然解决。(2026-07-05 ✅ 生产,榜首 AHS/庞巴迪/BRP/Sony)
- [x] ⑤ `lib/match.ts` 规则 6:有近两年记录 +5(带 ESDC 来源链),无记录 na 不扣分;服务端 matchOf + 弹框 MeansForMe 双端接线;advisor EN 事实行同步。(2026-07-05 ✅)
- [x] ⑥ 数据回归:seed 前后 jobs=12,509 不变 ✅;快照测试 11/11 过,白名单补 `match.r.lmia.has/na`。

## 3. 实现步骤

- [ ] **3.1 抓取**:`etl/build_lmia.py`(dataset 方式,循 build_wages 模式)——CKAN API 列资源 → 过滤 `_pos_en.xlsx` → 下载缺失季度到 `data/raw/lmia/`(gitignore)→ openpyxl 解析(**镜像需 +openpyxl,compose build 重建**)→ 聚合写 `data/raw/lmia/lmia-employers.json`(跟踪;若 >5MB 改 gitignore+上传 Storage 议)。列实查:Province/Stream/Employer/Address/Occupation/Incorporate Status/Approved LMIAs/Approved Positions(2025Q4 = 9,745 行)。
- [ ] **3.2 匹配统计**:一次性脚本跑 normName(复用 05c 规范化)× companies 命中率,结果记 §7,拍匹配策略(精确 normName 起步,模糊匹配 YAGNI)。
- [x] **3.3 mart** ✅:companies 四字段(lmiaPositions/lmiaLmias/lmiaLastQuarter/lmiaStreams)+ mart-only `lmiaPositionsSkilled`(榜单口径,不进 DB);**jobs 零改动**——列表 SQL 本就 join companies,SELECT 加 c.lmia_* 即可(实施时核实,省一张表的 schema 变更)。
- [x] **3.4 schema 先行** ✅:DDL(4 列 ADD COLUMN IF NOT EXISTS)在本地 dev/推代码**之前**打进生产(本地 dev 直连生产库,顺序必须如此);seed 白名单同步;本地 build 过后推。
- [x] **3.5 前端** ✅:列默认关;事实块带股别/季度语境+2026 收紧免责;i18n 三语(cell/col/fact/match 全套)。
- [x] **3.6 榜单+匹配** ✅:榜单口径中途迭代两轮(剔农业股→只认 High Wage/GTS/PR-only,鱼厂/快餐百人低薪股会淹没技能榜——记档为口径决策);match 规则 6 轻加权。
- [x] **3.7 调度** ✅:build_lmia 挂 ee 月更源;镜像 +openpyxl(Dockerfile 已改,**下次 compose build 生效**——当前靠本地跑过的缓存文件,风险低)。

## 4. 涉及目录 / 文件

| 路径 | 角色 |
|---|---|
| `etl/build_lmia.py`(新)· `data/raw/lmia/` | 抓取+聚合 |
| `etl/09_build_mart.py` · `etl/10_build_rankings.py` | join+榜单 |
| `cms/src/collections/{Companies,Jobs}.ts` · `seed/route.ts` 白名单 | schema+灌库 |
| 列表列/公司弹框/`lib/match.ts`/i18n | 露出+匹配 |
| `docker/etl/httpx/Dockerfile`(+openpyxl) | 镜像 |

## 5. 现有代码

- build_wages.py = dataset 方式模板(下载→解析→衍生表);05c normName 规范化器;E4-04 SourceLine/field_sources 机制;AIP 的「指定雇主匹配」是同构先例(designated_employers)。
- ⚠️ 老坑:改 collection 必须重启 dev+本地 build;seed 白名单;生产 DDL 先行;中文测试体 UTF-8 文件。

## 6. 完成定义(DoD)

- [ ] §2 全勾 + 生产页面终验(列表列/弹框/榜单三处带来源)+ push;STATUS 记档。

---

## 7. 实施记录

- 2026-07-05 立项。数据集实查:open.canada.ca `90fed587-1364-4f33-a9ee-208181dc0b97`,76 资源(2015Q3 起,季度×英法),XLSX 单 sheet 表头在第 2 行;2025Q4=9,745 行/584KB。
- **3.1 抓取 ✅(2026-07-05)**:`build_lmia.py` 一把跑通——8 季度 141,504 行 → **75,426 独立雇主**,`lmia-employers.json` 16.6MB(超 5MB → 整目录 gitignore,可由缓存 xlsx 重建;xlsx 缓存增量不重下)。聚合结构:name/provinces/streams(职位数)/quarters([lmias,positions])/lmias/positions/nocs(职位数)/lastQuarter。**佐证收紧**:季度行数 2024Q1=25,579 → 2025Q4=9,737,一路走低。
- **3.2 匹配统计 ✅(2026-07-05,拍板:精确 normName,模糊匹配 YAGNI)**:公司命中 **1,657/9,126=18.2%**;岗位命中(companySlug join)**2,477/12,509=19.8%**;抽样 20 条**零误报**(法定名≈帖面名,normName 足够)。命中岗雇主主股别:High Wage 1,125 / Low Wage 1,056 / Agriculture 168 / GTS 93 / PR-only 35;**2025Q3+ 仍有获批的 997 岗**(收紧后仍活跃=最强信号,展示可分级)。
- 待办移交下步:3.3 mart join → 3.4 schema(生产 DDL 先行!)→ 3.5 前端三处露出 → 3.6 榜单+匹配 → 3.7 调度(镜像 openpyxl 已随本笔加入 Dockerfile,**下次 compose build 生效**)。
