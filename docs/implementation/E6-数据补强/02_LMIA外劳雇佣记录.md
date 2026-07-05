# E6-02 · LMIA 外劳雇佣记录(雇主质量信号)

> Epic **E6 数据补强** · 负责人 Frank · 4 SP · 2026-07-05 立项(功能盘点 D-a 拍板)
> 通用约定与索引见 [实现文档 README](../README.md)。上位分析:[功能价值盘点与数据缺口](../../功能价值盘点与数据缺口.md) §3.5/§4-P0。
> **语义红线(2026-07-05 现状核查后定)**:本信号=「雇主**雇过**外国人的历史事实」(岗位价值模型·雇主质量轴),**不是**「能担保」的能力判定。2026 年 TFWP 大幅收紧(低薪股 30 大都市区冻结、EE offer 加分 2025-03 已取消),展示必须带股别与年份,措辞循「粗筛信号,非资格认定」。

---

## 1. 整体目标

把 ESDC「获批正面 LMIA 雇主清单」季度开放数据接入管线,按雇主聚合成外劳雇佣记录,与 companies 匹配后在列表/弹框/榜单三处露出,并进档案匹配加权。让「这家雇主雇过外国人吗」从社群传言变成带出处的事实。

## 2. 验收标准

- [ ] ① `build_lmia.py` 拉近 8 季度(2024Q1-2025Q4)文件 → 按雇主 normName 聚合(季度分布/股别/获批 LMIA 数/获批职位数/涉及 NOC)→ 衍生表落盘;重跑幂等。
- [ ] ② 与 companies 的 normName 匹配率**先出统计报告**(命中数/命中率/抽样人检 20 条无误报)再灌库——法定名 vs 商用名的错配风险要量化后拍板阈值。
- [ ] ③ 命中雇主的岗:列表新「外劳记录」列(✓+悬浮摘要)+ 公司弹框事实块(「2024-2025 获批 X 份 LMIA(高薪股为主),Y 个职位」+ 来源行)+ field_sources 新增数据集条目(E4-04 机制)。
- [ ] ④ sponsor-likely 榜单口径升级:LMIA 记录作为第一排序证据,页面措辞同步改为可辩护表述(盘点 D-c)。
- [ ] ⑤ `lib/match.ts` 加一条规则:雇主有近两年 LMIA 记录 → 小幅加权 + reason 依据链(措辞:「该雇主 2024-2025 有获批 LMIA 记录(公开清单)」)。
- [ ] ⑥ 数据回归:重灌前后岗位数不变(本项只加字段不动行);快照测试补措辞键。

## 3. 实现步骤

- [ ] **3.1 抓取**:`etl/build_lmia.py`(dataset 方式,循 build_wages 模式)——CKAN API 列资源 → 过滤 `_pos_en.xlsx` → 下载缺失季度到 `data/raw/lmia/`(gitignore)→ openpyxl 解析(**镜像需 +openpyxl,compose build 重建**)→ 聚合写 `data/raw/lmia/lmia-employers.json`(跟踪;若 >5MB 改 gitignore+上传 Storage 议)。列实查:Province/Stream/Employer/Address/Occupation/Incorporate Status/Approved LMIAs/Approved Positions(2025Q4 = 9,745 行)。
- [ ] **3.2 匹配统计**:一次性脚本跑 normName(复用 05c 规范化)× companies 命中率,结果记 §7,拍匹配策略(精确 normName 起步,模糊匹配 YAGNI)。
- [ ] **3.3 mart**:09 给 companies.json 加 `lmiaApproved/lmiaPositions/lmiaLastQuarter/lmiaStreams`,jobs 透传 `lmiaHistory` 布尔(列表列/筛选用;若列表 SQL 已 join companies 则考虑只动 companies——实施时核 page.tsx)。
- [ ] **3.4 schema 先行**:Companies/Jobs collection 加字段 → 本地 `npm run build` → **生产 DDL 先补列再推代码**(B4 教训);seed 列白名单同步(老坑 5)。
- [ ] **3.5 前端**:列(默认关,字段选择器可开)+ 公司弹框事实块 + field_sources 条目;i18n 三语。
- [ ] **3.6 榜单+匹配**:10_build_rankings 口径升级 + 措辞改;match.ts 规则+快照测试。
- [ ] **3.7 调度**:挂 `ee` 月更源 steps(季度数据月检查,无新文件跳过)。

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
