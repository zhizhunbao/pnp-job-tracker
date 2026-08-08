# E14-01 · StatCan JVWS 官方接入(全市场分母)

> Epic **E14 全市场数据三角**(StatCan JVWS + Indeed MVP + LinkedIn 探针 + 担保率)· 3 SP · 2026-08-08 立项
> 通用约定与索引见 [实现文档 README](../README.md)。
> **目的**:给独家指标「担保率 = 担保侧(LMIA/AIP 等雇过外国人的事实)÷ 全市场(本项数据)」当分母 ——
> 之前只有担保侧数据,没有分母,「软件业 1.7% 岗位靠担保」这类话说不出口;本项之后才能说。

---

## 1. 整体目标

把 StatCan JVWS(Job Vacancy and Wage Survey,空缺岗位与薪资调查)接入数据层,产出「NOC(2021 五位)×
省 × 季度」的官方空缺岗位数维护表,作为全市场分母的第一块拼图(Indeed MVP、LinkedIn 探针留 E14 后续批次)。

## 2. 验收标准

- [x] ① 表选型:WDS API 实查确认表号(**禁凭印象猜**),记录元数据(维度/粒度/更新频率/最新期)。(2026-08-08 ✅,见 §7)
- [x] ② `etl/build_jvws.py`:WDS getCubeMetadata 验表 CURRENT → 下载全表 CSV zip(缓存)→ 流式过滤
      (省级地理 × NOC 五位叶节点 × Job vacancies 统计量)→ 截取最近 KEEP_QUARTERS 季度 → 写维护表;
      重跑幂等(zip 已缓存则跳过下载)。(2026-08-08 ✅)
- [x] ③ `etl/build_jvws_mart.py`:独立小构建器,不进 `09_build_mart.py` 主链,产出列对齐草案 DB 表的
      `data/mart/jvws_vacancies.json`。(2026-08-08 ✅)
- [x] ④ DDL 草稿 `docs/sql/e14-01-jvws-vacancies.sql`(幂等,未执行)。(2026-08-08 ✅)
- [ ] ⑤ seed 接线(collection + `dims[]` 白名单)—— **本轮不做**,待担保率消费端(E14 后续批次)定稿口径后
      一起接,见 §7 待办。
- [x] ⑥ 验算:用已有 LMIA 原始数据(担保侧代理指标)与本表(全市场分母)对几个代表性 NOC 的比值,
      量级基本合理,证明分母可用。(2026-08-08 ✅,见 §7)

## 3. 实现步骤

- [x] **3.1 选表**:WDS `getAllCubesListLite` 拉全量 8,221 个 cube,过滤标题含 "vacan" 的 34 个,
      逐个 `getCubeMetadata` 核对维度 → 锁定 **14-10-0444-01**(唯一同时具备 NOC 五位叶节点 + 省级地理
      + CURRENT 状态的表)。
- [x] **3.2 抓取**:`getFullTableDownloadCSV` 拿真实下载链接(不可拼 URL 猜,productId 与表号编码规则
      易错)→ 97MB zip(解压后 1.18GB CSV,44 季度全历史 588 万数据点)→ 用 `COORDINATE` 字段
      (`geoId.nocId.statId`)配合元数据的 memberId 过滤,而不是按 GEO/NOC 文本名匹配(**PEI 省级与其
      唯一经济区文本名完全相同**,踩过一次,靠 memberId 才躲开歧义)。
- [x] **3.3 构建**:`extract_rows()` 流式扫一遍(~30s)选出 31 万行候选,再截最近 4 季度写维护表
      (28,896 行,3.0MB)。`build_jvws_mart.py` 转成 mart 列(派生 `available` 字段)。
- [x] **3.4 DDL 草稿**:`jvws_vacancies` 表 + `payload_locked_documents_rels` 补列样板(照 New ETL dim
      table checklist,虽然本轮不接 seed,先把 DDL 写全,省得下一批次忘记这一步再撞 500)。
- [ ] **3.5 seed 接线**:留待担保率消费端定稿(需要先拍板 sponsor_side 的确切口径——LMIA 全量 positions
      / 技能股 positionsSkilled / AIP+LMIA 并集 —— 见 §7 验算的口径分歧)。
- [x] **3.6 验算**:LMIA 2026Q1 单季度 approved positions ÷ JVWS 同季度全国空缺数,5 个代表 NOC 见 §7。

## 4. 涉及目录 / 文件

| 路径 | 角色 |
|---|---|
| `etl/build_jvws.py`(新) | WDS API 验表 + 下载 + 流式过滤 → 维护表 |
| `etl/build_jvws_mart.py`(新) | 维护表 → mart(独立构建器,不进 09 主链) |
| `etl/_paths.py` | 新增 `JVWS = RAW / "jvws"` |
| `data/raw/jvws/`(新) | `14100444-eng.zip`(gitignore,~97MB,可重下)+ `jvws-vacancies.json`(跟踪,3.0MB) |
| `data/mart/jvws_vacancies.json`(新,mart 全目录本就 gitignore,本地生成) | 列对齐草案 DB 表 |
| `docs/sql/e14-01-jvws-vacancies.sql`(新) | DDL 草稿(未执行) |
| `.gitignore` | 新增 `/data/raw/jvws/*.zip` |

## 5. 现有代码

- `etl/build_wages.py`(dataset 直下 CSV → 维度表)、`etl/build_lmia.py`(CKAN 季度 xlsx → 聚合表)是同构
  先例——本项目「全表下载 → 流式过滤 → 小维护表」的既有模式。
- `etl/09_build_mart.py` 顶部注释是 mart 层文件命名/职责的单一说明来源。
- `docs/sql/g5-pnp-ops-stats.sql` 是「官方抑制值必须 NULL、不许折 0」这条红线的既有 DDL 范例,本项目照抄同款约束。

## 6. 完成定义(DoD)

- [ ] §2 全勾(⑤ seed 接线留到下一批次,本轮 DoD 是「分母数据可用 + 证据链闭环」,不含灌库)。
- [x] 表号 + 元数据证据、NOC/地理粒度结论、验算示例已记录在 §7,可供下一批次(担保率消费端)直接读。

---

## 7. 实施记录

### 7.1 表号与元数据证据(WDS API 实查,2026-08-08)

- **表号 14-10-0444-01**「Job vacancies and average offered hourly wage by occupation (unit group),
  quarterly, unadjusted for seasonality」——`getCubeMetadata` 实查:`archiveStatusEn: "CURRENT..."`,
  `cubeStartDate: 2015-01-01`,`cubeEndDate: 2026-01-01`,`releaseTime: 2026-06-16T08:30`,
  `nbSeriesCube: 136784`,`nbDatapointsCube: 5881712`。官方页
  <https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1410044401>。
- 维度:**Geography**(83 member:Canada + 10 省 + 3 准州 + 69 个经济区)· **National Occupational
  Classification**(824 member,含 NOC 2021 五位叶节点 516 个)· **Statistics**(Job vacancies /
  Average offered hourly wage)。
- **quote-anchored 证据**(`getCubeMetadata` 返回的 footnote,原句):
  - 空缺定义(footnoteId 4):*"A job is vacant if it meets the following conditions: it is vacant on
    the reference date (first day of the month) or will become vacant during the month; there are
    tasks to be carried out during the month for the job in question; and the employer is actively
    seeking a worker outside the organization to fill the job."*
  - NOC 版本对齐(footnoteId 9):*"The occupational data are presented in this table according to the
    National Occupational Classification (NOC) 2021 version 1.0."* —— 与本项目 `etl/noc.py` 同版本,
    **无需映射**,`noc` 可直接当 join key。
  - 数据质量码(footnoteId 1):A-E 已发布(E 需谨慎)/ F 太不可靠不发布,量表原句已入
    `etl/build_jvws.py` 头注与 `docs/sql/e14-01-jvws-vacancies.sql` 列注释。
- **选表排除记录**(避免下次重踩):14-10-0325/0326/0328/0356 四张同主题老表**已 ARCHIVED**(2023-07 停更,
  被 14-10-0371/0372/0398/0399/0400/0406/0432/0441/0442/0443/**0444** 这批 CURRENT 表接替);
  14-10-0399(broad occupational category)只有 10 个大类,不够细;14-10-0443(occupation and selected
  characteristics)按职业但混了 selected characteristics 维度,粒度不如 0444 干净。

### 7.2 NOC / 地理粒度结论

- **NOC**:细到 2021 版五位单位群组(516 个叶节点),与本站 `etl/noc.py` 同一版本、同一粒度 ——
  **零映射成本**,`jvws_vacancies.noc` 可直接等值 join `jobs.noc`。
- **地理**:本表最细到**经济区**(69 个,官方对 76 个抽样经济区中过小的 7 个做了合并;不到城市/CMA
  级)。本轮**只取国家 + 省/准州**(Canada + 10 省 + 3 准州,14 个地理成员);经济区级数据存在但本轮
  不取——E14 城市级职业榜(如果要用)需再评估经济区→本站城市映射的可行性,以及经济区级样本的抑制率
  (预期比省级更高)。**不是**城市级颗粒度,记录清楚以免下一批次误判。

### 7.3 抓取与构建(2026-08-08)

- 全表 CSV zip 97.4MB(URL 由 `getFullTableDownloadCSV` 实时解析,不可拼 URL 猜)。解压后单文件
  1.18GB(44 季度 × 136,784 series)。**不整表落库**——流式单遍扫描(约 30 秒),用 `COORDINATE`
  字段的 memberId(而非 GEO/NOC 文本名——PEI 省级行与其唯一经济区行文本名完全相同,textual match
  会误收)过滤到「14 个省级地理 × 516 个 NOC 五位叶节点 × Job vacancies 统计量」,得到 31 万行候选,
  再截最近 4 季度(`2025Q2..2026Q1`)= **28,896 行** → `data/raw/jvws/jvws-vacancies.json`(3.0MB,
  跟踪入库)。其中**有值 7,098 行 / 抑制或未采集 21,798 行**(省×细分 NOC 组合样本小,StatCan 大量
  打 `F`/`x`/`..`;全国口径 `NAT` 覆盖率明显更高,消费端应优先用全国口径,省级口径按需接受较高缺失率)。
- `etl/build_jvws_mart.py` 转出 `data/mart/jvws_vacancies.json`(28,896 行,6.4MB;派生 `available`
  字段 = quality 在 A-E 且 vacancies 非空)。
- **httpx 对 www150.statcan.gc.ca 直连 100% 失败**(`ConnectError`/TLS 握手超时,重试 5 次仍失败;同网络
  同机器 `curl`(schannel,强制 http/1.1)稳定可用)—— `build_jvws.py` 对该域名的请求统一改走 `curl`
  子进程(见脚本内 `_curl_get()` 注释),其余抓取脚本的 httpx-first 惯例不受影响,记此坑供下次踩同一
  域名时省事。

### 7.4 验算:担保率示例(2026-08-08)

用已有 `data/raw/lmia/tfwp_2026q1_pos_en.xlsx`(担保侧代理指标,单季度 approved positions)对比
`jvws_vacancies` 同季度(2026Q1)全国(NAT)口径:

| NOC | 职业 | LMIA 2026Q1 approved positions(担保侧代理) | JVWS 2026Q1 全国空缺(分母) | 比值 |
|---|---|---:|---:|---:|
| 21231 | 软件工程师/设计师 | 136 | 3,105 | 4.4% |
| 21232 | 软件开发/程序员 | 155 | 2,725 | 5.7% |
| 31301 | 注册护士 | 134 | 17,125 | 0.8% |
| 63200 | 厨师 | 541 | 9,040 | 6.0% |
| 85100 | 普通农场工人 | 1,572 | 1,120 | **140%**(>100%,见下) |

**结论:分母可用**——软件/护士/厨师三类落在个位数百分比区间(与「小部分岗位靠担保」的直觉一致,护士
0.8% 与预期参考值 1.1% 同量级);农场工人比值 >100% 是**方法论已知偏差**,不是分母的 bug:JVWS 定义
「vacancy」要求「雇主在外部市场积极招人」,而 Primary Agriculture 的 LMIA(多为 SAWP 季节性农业工人
计划)大量是**已内定劳工的续签/名录制**,根本不走公开招聘,因此 JVWS 系统性低估农业岗位的「空缺」计数
——这恰恰印证「农工担保依赖度接近饱和」的方向性判断,只是不能用这个朴素比值公式直接算数,留给担保率
消费端(下一批次)按行业分层处理(农业等「体制性绕开公开市场」的行业需要单独的分母口径,不能直接套
JVWS vacancy)。

**SQL 草稿**(留档,不执行,担保侧口径拍板前不接库):

```sql
-- 担保率示例(草稿):sponsor_side 具体口径待拍板(LMIA 全量 / 技能股 positionsSkilled / AIP+LMIA 并集)
SELECT
  j.noc,
  COUNT(*) FILTER (WHERE j.aip OR c.lmia_positions > 0)                       AS sponsor_side,
  v.vacancies                                                                  AS market_side,
  ROUND(COUNT(*) FILTER (WHERE j.aip OR c.lmia_positions > 0)::numeric
        / NULLIF(v.vacancies, 0) * 100, 1)                                     AS sponsor_rate_pct
FROM jobs j
JOIN companies c        ON c.slug = j.company_slug
JOIN jvws_vacancies v   ON v.noc = j.noc AND v.province = 'NAT' AND v.quarter = '2026Q1'
WHERE j.status = 'open'
GROUP BY j.noc, v.vacancies;
```

### 7.5 待办(留给 E14 后续批次)

1. **sponsor_side 口径拍板**:LMIA 全量 positions / 技能股 positionsSkilled(见 `build_lmia.py`)/
   AIP+LMIA 并集 —— 三选一或加权,直接决定担保率的分子,需要 Frank 拍板。
2. **seed 接线**:先跑 `docs/sql/e14-01-jvws-vacancies.sql`(生产先行),再加 `JvwsVacancies` collection
   + `seed/route.ts` 的 `dims[]` 白名单(New ETL dim table checklist 六步走一遍)。
3. **农业等体制性绕开公开市场的行业**:担保率公式需要分层处理(见 §7.4 结论),不能全行业统一套用。
4. **经济区级地理**(E14 城市级职业榜用,如果要做):评估 69 个经济区 → 本站城市映射的可行性 + 抑制率。
5. **JVWS 每季度更新节奏**:官方约每季度末发布下一期(本次 releaseTime 2026-06-16 覆盖到 2026Q1),
   `build_jvws.py` 重跑前需先删 `data/raw/jvws/14100444-eng.zip` 强制刷新(当前默认命中缓存不重下)。
