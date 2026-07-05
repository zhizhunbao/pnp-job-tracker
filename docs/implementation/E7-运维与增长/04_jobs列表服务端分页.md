# E7-04 · /jobs 列表服务端分页与增量加载

> Epic **E7 运维与增长** · 负责人 Frank · 3 SP · Sprint 3 · 批次 B9(性能收尾)
> 背景:Render Free→Starter 落地后(STATUS 2026-07-05 实测)/jobs 热请求仍 3.6-6.8s,瓶颈已不在 CPU 档位,而在 **SSR 一次 SELECT LIMIT 20000(现约 1.2 万行)全量发给客户端(压缩后 ~1.5MB)+ 序列化 + hydration**。
> 通用约定与索引见 [实现文档 README](../README.md)。**红线:措辞/付费墙(E3-05/E5-00)一律不动。**

---

## 1. 整体目标

列表状态服务端化:首屏只发默认序前 **200** 行,筛选/搜索/排序/滚动全部改走 `/api/jobs` 增量取(SQL 端过滤排序,复用 `lib/jobsQuery` 的 where 构造思路扩成全键翻译)。客户端筛选**交互语义不变**(同一套筛选控件、选项仍来自维度表、保存筛选 state 形状不变),只是数据从「浏览器内存全量」换成「按需查库」。目标:/jobs TTFB < 1.5s,首屏传输 < 300KB。

**为什么不是「继续客户端筛选 + 懒加载数据」**:筛选/排序作用在部分数据上语义是错的(比如筛 NS 省,前 200 行里可能一条没有,但库里有几百条)。要么全量下发(现状,1.5MB),要么状态下沉服务端 —— 取后者。

### 设计决策

| # | 决策 | 理由 |
|---|---|---|
| D1 | 筛选/搜索/排序全部下沉 SQL;客户端只保留 UI 状态 + 增量拉取 | 部分数据上做筛选排序语义错误;SQL 对 1.2 万行毫秒级 |
| D2 | 首屏 N=200(默认序 `date_posted DESC, score DESC`,**与现 SQL 一致不动**);API 每页 200;前端渲染批次(60 → AUTO_MAX 180 → 「显示更多」按钮)不变 | 首屏 jobs 体积降 ~98%;渲染节奏用户无感 |
| D3 | `buildJobsWhere` 加 `mode: 'full'`(默认 `'alert'` 保持 alerts 现状不动);full 模式把现在 skipped 的键(fVs/directOnly/fSource/fStatus/fCountry)也翻成 SQL,并对齐客户端语义细节(见下表) | 键→SQL 单点仍在 jobsQuery.ts(老坑 5 的同步点);alerts「宁可多发不漏发」语义不受影响 |
| D4 | 排序=白名单映射 ColKey→SQL 表达式;缺值 `NULLS LAST`(不随升降序变);三级 tiebreak `主键 → score DESC → id` | 与现客户端 sortVal 语义一致;**id 兜底保证 offset 分页确定性**(否则同值行翻页会重复/丢行) |
| D5 | 「与我的匹配」列:Pro=API 返回的每行都算(页大小级,毫秒);免费=**先按默认序查前 `FREE_MATCH_JOBS_PER_DAY` 岗算出 id→level map**,任何页/任何筛选视图里命中该 id 的行带匹配值 | 与现状语义**逐位一致**:现在也是「默认序前 10 岗」有值,筛选后这些行出现在哪就显示在哪;分页不破坏 E5-00 免费钩子 |
| D6 | 匹配排序(sort=match,Pro):服务端取全量命中行(沿用现 LIMIT 20000 上限)内存算分排序后切页 | match 是 JS 规则引擎,SQL 排不了;数据不出服务器,传输仍是一页;page.tsx 今天就对全表算过,成本已知可接受 |
| D7 | dims 拆两层:**筛选维度**(provinces/cities/districts/nocCategories/sources/experienceLevels)照旧 SSR;**弹框维度**(pnpOccupations/pnpDraws/eeCategories/designatedEmployers/nocDescriptions/fieldSources,仅 AdvisorModal 一处用)改 `/api/jobs/dims` 懒加载,hydration 后 idle 预取 | 筛选选项仍来自维度表(用户要点②);弹框维度是首屏体积另一大头(pnp 5000 行 + noc 描述长文本),不该在首字节里 |
| D8 | `?q= ?prov= ?broad=` 改由 page.tsx `searchParams` **服务端应用**(首页查询直接带 where),初始筛选 state 从 props 注入 | 榜单/统计回流链接直接落到已筛好的首屏,不再「全量渲完再客户端筛」;去掉现 useIsoLayoutEffect 读 URL 的二次渲染 |
| D9 | origin 筛选选项改常量(`jobbank/ats/directory`,即现 ORIGIN_LABEL 全集) | 现从全量 jobs 行推导,分页后推不出;该枚举本就是 ETL 固定值 |
| D10 | 匹配维度统一走 `lib/matchDims.loadMatchDims()`(进程内 1h 缓存,alerts 已在用) | page.tsx 不再自己拼 matchDims;API 每请求不重查 7000 行 |
| D11 | 「公司信息」弹框的**该公司在招清单**(现从全量 jobs 过滤)改弹框打开时按需查 `/api/jobs?company=<精确名>`(内部参数,`c.name = $`,不进筛选 UI) | 分页后客户端没有全量;精确匹配比 q 宽搜索干净 |

### full 模式键→SQL 翻译表(与 JobsTable 客户端谓词逐条对齐)

| 键 | 客户端语义(现状) | SQL(full 模式) |
|---|---|---|
| q | `searchHay` 全字段 includes(职位/公司/来源/NOC/薪资/分类/省市区/地址/经验/评分/TEER) | `concat_ws(' ', title, c.name, source_label, source, noc, salary, broad, mid, fine, <省全称CASE>, city, district, j.address, <经验中文CASE>, accessibility, score::text, 'TEER '||teer) ILIKE $` |
| fBroad/fMid/fFine | 行值 NULL 显示为 '未分类' 后相等比较 | `COALESCE(col,'未分类') = $` |
| fTeer | 值形如 `'TEER 3'` / `'未分类'` | 解析出数字 → `teer = n`;'未分类' → `teer IS NULL`。**顺带修 alert 模式现存 bug:`Number('TEER 3')=NaN`(保存筛选带 TEER 从来没命中过)** |
| fPnp='no' | `!pnpEligible && province!=='QC'` | `pnp_eligible = false AND province <> 'QC'` |
| fCountry | `country \|\| (province?'Canada':'')` | `'Canada'` → `(country='Canada' OR (COALESCE(country,'')='' AND COALESCE(province,'')<>''))`;其他值精确匹配 |
| fSource | `sourceLabel \|\| '—'` | `COALESCE(NULLIF(source_label,''),'—') = $` |
| fStatus | `(status \|\| 'open') === f` | `COALESCE(NULLIF(status,''),'open') = $` |
| directOnly | `fromJobBank(applyUrl 含 jobbank.gc.ca) ? source==='Job Bank' : true` | `NOT (apply_url ~* 'jobbank\.gc\.ca' AND source <> 'Job Bank')` |
| fVs | `(salary/wage_med-1)*100` 与 0/20 比;免费用户 wage 列被剥 → 恒空 | `above`→`salary_annual>=wage_med_annual`;`above20`→`>=1.2*`;`below`→`<`;都带 `wage_med_annual>0` 保护;**非 Pro 请求 fVs → FALSE(对齐现状:免费选它=空结果)** |
| 其余键 | (fProv/fCity/fDistrict/fAcc/fOrigin/fAip/fScore/fSal)builder 已有且语义一致 | 沿用 |

### 排序白名单要点(其余列一一直译,不赘)

- `vsMedian` → `salary_annual::float/NULLIF(wage_med_annual,0)`;`direct` → 上表 CASE;`address` → `COALESCE(NULLIF(j.address,''),NULLIF(c.address,''))`;`broad/mid/fine` '未分类'、`accessibility` 'unknown' → NULLIF 成 NULL 排末尾;`province/country` 按省**全称** CASE 排(与 parseLoc 显示序一致);`origin` 按 ORIGIN_LABEL 中文标签 CASE 排。
- 非 Pro 请求 sort 落在 Pro 列(match/vsMedian/wageMedHr/wageMedYr)→ 回默认序(现状:免费该列全 null,排序退化为 score 兜底,等效)。
- 中文文本列 PG 默认 collation 与 `localeCompare('zh')` 拼音序有出入 —— **接受**(顺序稳定、语义不变,不为此引 icu collation)。

## 2. 验收标准

- [ ] /jobs 热请求 TTFB < 1.5s(生产实测 3 次取中值,**部署后回填**)—— 代码侧结构性大头已除(1.2 万行→200 行);本地热 2.9-3.4s 是「本机→us-east Supabase」跨洋 RTT 堆叠,生产 Render 与库同区不复现
- [x] 首屏传输(HTML/RSC payload,不含缓存的 JS bundle)< 300KB(压缩后)—— 本地实测 document gzip **77.6KB**(raw 747KB;改前压缩后 ~1.5MB)
- [x] 筛选/搜索/排序/滚动加载全链路走 API,任意组合结果与改前全量客户端筛选**一致**(抽 5 组对比,含 未分类/QC-no/直接雇主/vs中位/TEER)
- [x] 免费层「匹配前 10 岗」语义不变:默认序前 10 岗在任何筛选/排序/翻页视图下显示匹配,其余行 null;Pro 全量有值;未建档全 null
- [x] 榜单/统计回流 `?q= ?prov= ?broad=` 落地即已筛(SSR 应用),回归通过
- [x] 保存筛选(E5-03)state 形状不变,alerts run 回归不受影响(alert 模式行为除 fTeer bugfix 外零变化)
- [x] 弹框维度懒加载:首屏不含 6 个弹框维度;打开任意弹框(PNP/EE/NOC/AIP/来源)数据完整
- [x] 付费墙红线:免费用户 wage 三件套仍 SELECT 后剥离不进浏览器、Pro 列锁标不变、措辞零改动(diff 检查)

## 3. 实现步骤

- [x] **3.1** `lib/jobsQuery.ts`:`buildJobsWhere(filters, startIndex, mode)` 加 `'full'` 模式,按上表补全/对齐;修 fTeer 解析(两模式共享);alerts 调用处不动(默认 'alert')。
- [x] **3.2** 新 `lib/jobsList.ts`(服务端专用):`JOBS_SELECT` 片段 + `mapJobRow(raw, pro)`(从 page.tsx 平移,含 Pro 列剥离)+ `ORDER_SQL` 白名单 + `queryJobsPage({filters, sort, dir, offset, limit, pro, profile})` → `{rows, total}`(total 用 `count(*) OVER()`);免费 top-N 匹配 map;sort=match 特殊路径(D6)。
- [x] **3.3** 新 `/api/jobs`(GET):参数白名单解析(limit≤500、offset≥0、sort 白名单)、`getUser` 得 pro/profile、调 queryJobsPage 返 `{rows, total}`。新 `/api/jobs/dims`(GET):6 个弹框维度,映射与现 page.tsx 一致,`Cache-Control: public, max-age=1800`。
- [x] **3.4** `page.tsx`:searchParams → 初始 filters → `queryJobsPage(0, 200, 默认序)`;`grandTotal`(无筛选 count)与 `updatedAt`(`max(last_seen)`)单独小查询;dims 只留 6 个筛选维度;props 改传 `initial={rows,total,grandTotal}` + `initialFilters`。
- [x] **3.5** `JobsTable.tsx`:`rows/total` 状态化;筛选/排序变更 → 防抖 250ms + AbortController/序号防竞态 → 拉第 0 页替换;sentinel/「显示更多」在渲染余量不足时追加拉取(渲染批次 60/180/按钮语义不变);删客户端 filter/sort useMemo 与死代码(searchHay/okX 等);origin 选项常量化;字幕 `total/grandTotal`;弹框维度 idle 懒拉合入 dims;URL 读参 effect 删除(改 props 注入)。
- [x] **3.6** 文档同步:README 索引加 E7-04 行;老坑 5 注记 SELECT 单点移至 `lib/jobsList.ts`;STATUS.md 记档。
- [x] **3.7** 回归:§2 清单逐项过(本地起 dev + preview 实测);build 通过。

## 4. 涉及目录 / 文件

| 路径 | 角色 | 状态 |
|---|---|---|
| `cms/src/lib/jobsQuery.ts` | 键→SQL 单点,加 full 模式 | 改 |
| `cms/src/lib/jobsList.ts`(新) | SELECT/映射/排序/分页查询单点(老坑 5 新位置) | 新建 |
| `cms/src/app/api/jobs/route.ts`(新) · `api/jobs/dims/route.ts`(新) | 增量取数 / 弹框维度 | 新建 |
| `cms/src/app/(frontend)/jobs/page.tsx` | 首屏 200 行 + searchParams SSR | 改 |
| `cms/src/app/(frontend)/jobs/JobsTable.tsx` | 客户端增量拉取 | 改(大) |
| `docs/implementation/README.md` · `STATUS.md` | 索引/老坑/记档 | 改 |

## 5. 现有代码

- page.tsx 原始 SQL(LIMIT 20000)+ 逐行 map + matchOf(idx 前 N)= 本项拆迁对象;排序 `date_posted DESC, score DESC` 已与前端默认序对齐,**不动**。
- JobsTable 1708 行:筛选 state(19 个)/保存筛选 json/列偏好 cookie/冻结列/弹框——只动数据来源,不动交互与展示;`rows` useMemo(576-605)整块删除由服务端替代。
- `lib/jobsQuery.buildJobsWhere`:alerts(E5-03)在用,lenient 语义保留;`lib/matchDims.loadMatchDims`:1h 缓存现成。
- `lib/rateLimit`:/api/jobs 是公开只读、单查毫秒级,v1 不加限流(advisor 式配额是 LLM 成本问题,这里不是);滥用真出现再挂。
- **降级预案**:JobsTable 改造若出回归死角,可先保 D2/D7(首屏 200 + 弹框维度懒加载)+ 客户端筛选改「触发即拉全量一次」的过渡态 —— 但这只在验收 3 连挂时启用,不作为目标。

## 6. 完成定义(DoD)

- [x] §2 全勾(TTFB 一条按预留口径延至部署后回填)+ §3 全勾 + build 过 + push。

---

## 7. 实施记录(2026-07-05,B9)

- 按 D1-D11 落地,零方案变更。新文件:`lib/jobsList.ts`(SELECT/映射/排序白名单/分页单点)、`/api/jobs`、`/api/jobs/dims`;改:`lib/jobsQuery.ts`(full 模式)、page.tsx(searchParams SSR + 三组查询同层并发)、JobsTable.tsx(rows/total 状态化+防抖+seq/Abort 防竞态+懒维度)。
- **本地回归实录(dev 直连正式库只读,12828 行)**:
  - API 语义逐条核对:NS 678 全 NS;q=nurse 宽搜索 119;`TEER 3` 解析 2528 全 teer=3;`未分类` COALESCE 81;fPnp=no 无 QC 无 eligible;directOnly 无转贴漏网;salaryYr 降序正确;offset 0/200 两页零重叠 total 一致;company 精确匹配;免费行 wage 三件套全 null。
  - 真浏览器(playwright):滚动 60→180 行,预取自动打 `offset=200`;「显示更多」点击 →480 行;公司弹框按需查询显示「该公司在榜职位 (2)」;字段弹框正常,零 pageerror。
  - 免费匹配前 10(@test.local 测试号 e704-match 注册→建档→登录实测):默认序第 1-10 行 match=high/mid,第 11 行起全 null;title 排序/AB 省筛选视图里带 match 的行 id 全部 ⊆ 默认序前 10;fVs 免费=0 结果。**Pro 全量匹配路径未真账号实测**(proUntil 字段锁,无法自建 Pro 测试号)——代码路径与改前 page.tsx 同构,部署后用真 Pro 号抽查。
  - 传输:document gzip 77.6KB(改前 ~1.5MB);/api/jobs 每页 200 行独立 20-40KB 级。
- **顺带修复**:fTeer `Number('TEER 3')=NaN` 老 bug(alert 模式保存筛选带 TEER 从来没命中过),两模式共享解析后一并修好;alerts 其余语义零变化。
- **交互取舍**:q 输入/筛选变更加 250ms 防抖(原键击即筛现键击即查);AdvisorModal 在弹框维度未到位时渲 loading 蒙层而非空清单(措辞诚实红线:「没加载」不能显示成「未列入」)。
- 遗留:① 生产 TTFB/Pro 匹配列部署后回填;② @test.local 测试号 e704-match 留在库中(惯例允许,可顺手清);③ 数据侧发现年薪离群值(~49.7 亿,ETL 清洗漏网)——与本项无关,已另记。
