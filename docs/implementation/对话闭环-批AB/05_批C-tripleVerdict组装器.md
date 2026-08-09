# 批C · tripleVerdict 组装器 + 金标

> 子工 C · 2026-08-09(Frank 拍板「先2后1」放行)
> 上位设计:[一键三合一判定-20260809](../../design/一键三合一判定-20260809.md) §2 完美案例(金标)/ §3 三关拼装 / §5 锁合成不锁事实;
> [对话闭环总设计-20260809](../../design/对话闭环总设计-20260809.md) §3 批C(断点 **D5**:三关各自能判,没有拼装器)。
> 前置批 B(G-AIP)已落地 → [03_G-AIP申请人门槛](03_G-AIP申请人门槛.md);其 §8 交给批C 的两条待办在本文 §8 逐条销账。

## 0. 现状核实(2026-08-09 生产库只读实查)

| 实查项 | SELECT 结果 | 与设计 §2 的出入 |
|---|---|---|
| 岗 11039073 | continuing care assistant @ company 1214626,NOC 33102,TEER 3,NS/Berwick,`pnp_stream='NS 紧缺空缺'`,`aip=t`,`pnp_eligible=t` | 一致 |
| 雇主 1214626 | Grand View Manor,`founded_year=1969`,`staff_est=230`,`sector=NULL`,`lmia_nocs=NULL` | 设计写「经营 55 年」,按 1969 至 2026 应为 **57 年**;`lmia_nocs` 该行**未回填**(#286 整点批还没覆盖到它) |
| 指定名录 | `designated_employers` 有 `Grand View Manor Continuing Care Community o/a Grand View Manor`,`source='AIP'`,`province='NS'`,`url/fetched` 为空 | 一致(出处空 = pathVerdict 已留痕的同一个数据缺口) |
| `companies.is_designated_employer` | **false** | 与名录行矛盾 → 该列不可作 AIP 判据(见 §8-①) |
| NS 门槛 | 4 行:语言 CLB5(TEER 0-3)/ CLB4(TEER 4-5)、经验 12 个月、雇主经营 2 年 | 一致 |
| AIP 门槛 | `program='AIP'` **36 行**(批B 08-09 入库) | 设计 §4 的「0 行」缺口已闭合 |
| 33102 具名清单 | 6 行:BC 医疗 / MB 乡镇在需 / NS 紧缺空缺 / NS 毕业生 / PE 在需职业 / SK 医疗 | 一致(设计 §2 的「初稿 BC 无直通为误」再次确认) |

## 1. 整体目标

`tripleVerdict()` 纯函数:**岗 × 雇主 × 档案 → 一张判定卡的结构化行**。
零新判定逻辑——职业关查 `pnp_occupations` + jobs 行的 08_score 字段,雇主关调 `employerVerdict`(#284),
个人关调 `rules.evaluateRequirements`(与 report / chatTools 同一套挑行口径),比路调 `pathVerdict`(C5)并原样沿用它的 tier 与排序语义。
每行带:关别、免费/付费位、结论态、缺槽点名(followups)、evidence + 官方 quote。
**本批止于纯函数与金标**;UI、付费闸、collections/schema、既有判定件一律不动。

## 2. 验收标准

- [x] ① `cms/src/lib/tripleVerdict.ts` 纯函数(无 IO;门槛/清单/名录行与公司事实全由调用方传入)
- [x] ② 金标 `cms/tests/int/tripleVerdict.int.spec.ts` 覆盖设计 §2 的七行 + 反证用例,**21 断言块全绿**
- [x] ③ fixture 全部来自生产库只读实查冻结,复查 SELECT 逐块贴在常量上方(生产库零写入)
- [x] ④ `tsc --noEmit` 绿
- [x] ⑤ 既有 `employerVerdict`(6)/ `rules`(全部)测试不红;`pathVerdict` 的 6 红为**批B 落地导致的既有红**,与本批无关(§7)
- [x] ⑥ 行结构只存 `key + params`,不写死中文 UI 句子(金标有一条断言逐行扫中文)
- [x] ⑦ 本实施文档

## 3. 实现步骤

- [x] **3.1** 读复用件签名:`employerVerdict.ts`(三态 + 点名缺项)、`pathVerdict.ts`(13 通道注册表、tier 语义、四态 availability)、
      `rules.ts`(`evaluateRequirements` 的 RuleResult 结构化 need/have/short/evidence)、`api/pathways` + `chatTools.loadVerdictData`(VerdictData 现成读法)。
- [x] **3.2** 生产只读实查冻结 fixture(jobs / companies / designated_employers / pnp_requirements NS+AIP / pnp_occupations 33102)。
- [x] **3.3** 入参形状定稿:`TripleJob`(jobs 行,08_score 口径)、`TripleCompany`(`facts` 直接复用 `EmployerFacts` + 名录命中行 + `lmiaNocs`)、
      `TripleProfile`(= `VerdictProfile` + `permitMonthsLeft` / `targetProvinces` / `familySize` 三槽)、`data: VerdictData`(不另起数据面)。
- [x] **3.4** 三关行:`occupationRows`(具名/排除清单 + TEER 粗筛)、`employerRows`(名录 + employerVerdict items + 雇员数旁证 + 下一步)、
      `personRows`(该省门槛行 × 档案 → evaluateRequirements,`subject='employer'` 的行剔掉不重复摆)。
- [x] **3.5** 时间窗行 / 换省对照行 / 比路 `compareRows` + `tv.route.fastest` 行。
- [x] **3.6** 金标 + 反证(抽掉 AIP 门槛行、抽掉名录命中、抽掉该省门槛行三种退化)。

## 4. 涉及文件

| 文件 | 动作 |
|---|---|
| `cms/src/lib/tripleVerdict.ts` | **新增**(唯一新逻辑文件) |
| `cms/tests/int/tripleVerdict.int.spec.ts` | **新增**(金标) |
| `docs/implementation/对话闭环-批AB/05_批C-tripleVerdict组装器.md` | **新增**(本文) |
| `cms/src/lib/pathVerdict.ts` | **收尾批改**:仅 `fedLangApplies` 一个解析点(§7.2),判定逻辑与注册表零改动 |
| `cms/tests/int/pathVerdict.int.spec.ts` | **收尾批改**:6 条过期金标翻正向 + 区间回归组(§7.3) |
| `cms/tests/int/chatVerdict.int.spec.ts` | **收尾批改**:2 条过期金标翻正向(§7.3) |

`employerVerdict.ts` / `rules.ts` / collections / schema / UI 全程未碰。

## 5. 现有代码(复用点)

| 关 | 复用件 | 本层做的事 |
|---|---|---|
| 职业关 | `jobs.pnp_stream / pnp_eligible / teer / noc`(08_score)+ `pnp_occupations` | 只查表:清单命中→`tv.occ.listed`,排除命中→`tv.occ.excluded`,TEER 档→`tv.occ.teer` |
| 雇主关 | `employerVerdict(facts, province, reqs, nowYear)` | 原样调用,`items` 逐条摊成行并回挂 `pnp_requirements` 的官方原句 |
| 雇主关 | `designated_employers` 命中行 | 有→`pass`;**认不出→`unknown`**(名录按名字匹配,认不出 ≠ 官方没指定) |
| 个人关 | `rules.evaluateRequirements` | 挑行口径照抄 `report.requirementLines` / `chatTools.lookupThresholds`:`province === job.province` 的全部行喂引擎 |
| 比路 | `pathVerdict(profile, data)` | 名次与 tier 全部沿用,本层只做「入选」与「并列标记」 |

## 6. 完成定义(DoD)

- [x] 21 金标断言块全绿(`npx vitest run tests/int/tripleVerdict.int.spec.ts`)
- [x] `tsc --noEmit` 零错
- [x] 生产库只读(仅 SELECT / information_schema),零写入
- [x] 未起 dev server、未 commit / push
- [x] 判定卡行零中文硬编码,i18n 键前缀统一 `tv.*`

### 6.1 判定卡行清单(批D 排版直接照这张表)

| key | 关 | 位 | 态 | 说明 |
|---|---|---|---|---|
| `tv.occ.listed` | occupation | 免费 | pass | 每命中一张具名清单一行;`params.matchesJobStream` 标出哪一张是职位板 pnp 列显示的那张 |
| `tv.occ.excluded` | occupation | 免费 | excluded | 命中官方排除清单 |
| `tv.occ.notListed` | occupation | 免费 | info | 一张具名清单都没命中(不在清单 ≠ 不合格) |
| `tv.occ.teer` | occupation | 免费 | pass/gap/unknown | TEER 粗筛档 |
| `tv.emp.designated` | employer | 免费 | pass | 指定雇主名录命中,`params.program` = AIP / RCIP / … |
| `tv.emp.designationUnknown` | employer | 免费 | unknown | 名录里没认出这家 —— **本站的缺口,不写「未被指定」** |
| `tv.emp.years` | employer | 免费 | pass/gap/unknown | 经营年限 need/have/short,带官方原句 |
| `tv.emp.staff` | employer | 免费 | pass/gap/unknown | 雇员数(该省收录了门槛才有这一行) |
| `tv.emp.staffFact` | employer | 免费 | info | 该省没收录雇员数门槛但本站有估算 → 旁证事实,不冒充判定 |
| `tv.emp.publicSector` | employer | 免费 | info | `sector='public'` 整体旁路 |
| `tv.next.employer` | employer | **付费** | info/unknown | 「对这家怎么谈」:指定项目 + 该雇主担保过本职业几次(`lmiaSameNoc`;`lmiaKnown=false` = 该列未回填) |
| `tv.person.<factor>` | person | **付费** | pass/gap/unknown | 逐条官方门槛 × 档案;`unknown` 时带 `followups` 点名缺槽 |
| `tv.time.permit` | person | **付费** | info/unknown | 工签剩余月数(**只摆事实,不编概率**) |
| `tv.compare.listed` / `.notListed` / `.noTarget` | person | **付费** | info/unknown | 换省对照;`params.basisProv` 恒是手上这份岗的省 |
| `tv.route.fastest` | person | **付费** | info/unknown | 比路结论;`params.keys` 是并列最快的通道 key 数组,`tied` 标并列 |

## 7. 实测发现(必须让 Frank 看见的三件)

### 7.1 设计 §2「比路 = AIP 最快」在今天的数据上**不成立,是并列**

`pathVerdict` 的 tier 语义 =「offer 到手后还要等多久」。对这份档案实算:

- `NS-sw`:经验门槛 12 个月,经验槽未答 → `needs-info`,tier **2**
- `AIP`:1,560 小时 = 官方自写的「1 年」→ 12 个月,同样未答 → `needs-info`,tier **2**

两条同 tier,注册表原序 NS-sw 在前。**在库数据里找不到任何一条能让 AIP 严格更快的依据**
(AIP 在本站反而门槛行更多:学历+ECA、资金档、语言时效)。
处置:`fastest` 允许多条同时为 true,`tv.route.fastest` 出 `tied=true` + 两个 key,**并列就说并列,不替用户挑**。
设计 §2 那句「雇主已是 AIP 指定=你最快的一条路」建议按此改口径(同 §2 自己「初稿 BC 无直通为误」的纠错先例)。

### 7.2 `pathVerdict.fedLangApplies` 把 AIP 的 TEER **区间**读成了**端点枚举**

`stream` 形如 `teer-0-3` 被 `split('-')` 解析成 `[0, 3]`:

| stream | TEER 0 | 1 | 2 | 3 | 4 |
|---|---|---|---|---|---|
| `teer-0-3`(AIP 语言 CLB 5) | ✓ | **✗** | **✗** | ✓ | ✗ |
| `teer-2-4`(AIP 学历档) | — | — | ✓ | **✗** | ✓ |

联邦 CEC/FSW 的 `teer-0-1`/`teer-2-3` 恰好是两元枚举所以从没炸过;批B 引入区间式 stream 后,
**TEER 1 / TEER 2 的 AIP job offer 会一条语言门槛行都挑不到**,`langRowsSeen=0` → 输出
「本站尚未收录 AIP 的语言门槛条文」——**这是一句假话**(库里明明有)。

**已修(2026-08-09 收尾批,Lead 授权)**:`fedLangApplies` 恰好两个数字时按**闭区间**展开,
三个及以上仍按枚举(库里没有这种写法,不为它猜语义);`pathVerdict` 其余判定一行未动。
回归组见 `pathVerdict.int.spec.ts`「金标 ③ → teer-0-3 闭区间」:TEER 0/1/2/3 各一条(挑得到 CLB 5 行、
quote 对得上)、TEER 4 走 CLB 4 不串档、五档全不许再出现「尚未收录语言门槛」、
外加 `teer-0-3` / `teer-4-5` 两种写法的合成解析单测。

### 7.3 批B 落地导致的八条过期金标(收尾批已逐条翻正向)

`pathVerdict.int.spec.ts`(6)与 `chatVerdict.int.spec.ts`(2)写死「AIP 0 行 / not-collected / mart 259 行」,
批B 灌进 36 行后(现 300)这些断言测的是一个已经不存在的世界 —— **断言过期,不是引擎坏**。
收尾批逐条改法:

| # | 文件 · 断言 | 原口径 | 新口径 |
|---|---|---|---|
| 1 | pathVerdict「六张表行数」 | requirements 259 | **300** + 单列 `AIP === 36`;`draws` / `designated_employers` 按周增长,改 `>=`(146 / 3867),政策四表继续钉死 |
| 2 | pathVerdict「tier3 BC Build」 | 抽选线钉死 97 | 从 `data.draws` 取最近一轮 Build(08-06 那轮 88 已顶掉 97),分数**数据里取** |
| 3 | pathVerdict「AIP = needs-info + not-collected + 禁止出现 1,560」 | 断言缺口本身 | **正向**:`open` + `ok` + tier 2;1,560 hours **必须**出现且必须来自 quote;禁止按工时反推月数 |
| 4 | pathVerdict「库里一行 AIP 都没有」 | `toHaveLength(0)` | `toHaveLength(36)` + 每行有官方原句、有出处 |
| 5 | pathVerdict「四态不合并」 | not-collected 名单 `['AIP']` | `[]` + 13 条全 `ok`(断言本意不变:四态只许由库里有没有行决定) |
| 6 | pathVerdict「jobPathways 口径」 | AIP `not-collected` + months null | AIP `ok` + months **12** + `tenure=false` |
| 7 | chatVerdict「C01 金标 AIP 那条」 | 必须是四态 status 行、含「本站尚未收录」 | AIP 已判得了 → **不许**再有四态 status 行、不许再说「尚未收录」;它排在 top-3 open 之外故不出现在 facts 是对的 |
| 8 | chatVerdict「lookupVerdict 薄封装」 | AIP `not-collected` | AIP `ok` + `open` + tier 2 + 13 条门槛行齐全 |

每条断言旁已注「2026-08-09 批B AIP 36 行入库后更新」。
`chatTools`(BC SIRS,连生产库)/ `chatOrchestrate`(走活体 LLM)各 1 条既有红**不属本批,未碰**。

## 8. 接口缺口与批D 入参清单

### 8.1 接口缺口(本批只记录,一律不顺手改)

1. **`companies.is_designated_employer` 与 `designated_employers` 名录矛盾**:Grand View Manor 名录在册(`source='AIP'`)
   但 `companies.is_designated_employer = false`。组装器因此**只信名录行**,不读该布尔列。该列口径要么修要么废,请数据侧定夺。
2. ~~**`pathVerdict.fedLangApplies` 区间解析缺陷**~~ —— **已修**(收尾批,见 §7.2)。
   遗留一条同族**未修**:`teer-2-4` 的 AIP **学历**行(`factor='education'`)当前没有任何消费端读取(见下面第 3 条),
   一旦有人去读它,同一个区间语义必须走同一套解析,别再写第二份。
3. **批B §8 交办的 `workHealthcareCrossQualify` 消费路径:今天是断的。** 该行(NOC 31201/31301 经验可用于 33102/44101 的 offer)
   `factor` 不在 `pathVerdict.pickGate` 的 `experience | workHours` 过滤里,也不在 `rules.evaluateRequirements` 的任何分支里 →
   **全站没有任何代码读它**。本案例经验槽未答所以结论不受影响,但一旦用户答了「护士经验 2 年」,AIP 那条会照 33102 的经验判,漏掉这条豁免。
   同族失读行还有 `workTeerMatch` / `offerSkillLevel` / `workExemptGrad*`(大西洋毕业生豁免,4 行)/ `fundsMinimum`(7 档)。
4. **`designated_employers` mart 行不带 `url` / `fetched`**(pathVerdict 已留痕的同一个缺口)→ `tv.emp.designated` 行**挂不上 evidence**。
   09 带出这两列后本层自动开始挂(代码已按可选字段写)。
5. **`companies.lmia_nocs` 该行未回填** → `tv.next.employer` 的 `lmiaSameNoc=0` 且 `lmiaKnown=false`。
   批D 渲染时**必须区分「担保过 0 次」与「本站没这列数据」**,否则又是一句假话。
6. **档案缺三个槽**:`permitMonthsLeft`(时间窗行的唯一数据源)、`targetProvinces`(换省对照)、`familySize`(AIP 资金档)。
   `permitMonthsLeft` 现在档案里没有对应字段 —— 批A 的槽回填要把它带上,否则时间窗行恒 `unknown`。
7. **比路范围**:当前入选 = 岗所在省的通道 ∪ AIP(雇主已指定时)∪ 目标省的通道。
   `FED-EE` / `RCIP` 不入选(它们与「这份 offer」无直接因果)。若批D 要摆联邦线,是一次口径变更,需拍板。
8. **`pnp_ops_stats` 未接**:设计 §2 时间窗行原话「时长事实按 pnp_ops_stats 摆」。本批没加这个入参(YAGNI),
   批D 若要在时间窗行摆处理时长,给 `tripleVerdict` 加一个可选 `opsMonths` 入参即可,判定逻辑不变。

### 8.2 批D(判定卡 UI + 付费闸)需要的入参清单

调用方(RSC / API 路由)要备齐这四样,组装器自己不查库:

| 入参 | 来源 | 备注 |
|---|---|---|
| `job: TripleJob` | `jobs` 行 | 需带 `noc_descriptions.title` 作 `nocName`(代码不裸奔);字段名与 JobsTable 的 `pnpStream/pnpEligible/aip` 同源 |
| `company: TripleCompany` | `companies` 行 + `designated_employers` 名字匹配 | `facts` 就是 `employerVerdict` 的 `EmployerFacts`;名字匹配沿用 named 快照那套(**不要**用 `is_designated_employer`) |
| `profile: TripleProfile` | `users.profile` | = `VerdictProfile` + `permitMonthsLeft` / `targetProvinces` / `familySize` |
| `data: VerdictData` | `chatTools.loadVerdictData(pool)` | 与 `/api/pathways` **同一个缓存对象**;详情页是全站流量最大的页,判定层六张表禁每请求现算(TTL 10 分钟,prod-pool-wedge 教训) |

付费闸接线点:按 `row.tier === 'paid'` 一刀切即可,组装器已把「三关事实 free / 比路结论+差值+时间窗+换省对照+下一步 paid」分好。
锁态渲染建议:付费行**保留 key 与关别**(让用户看见有几行结论被锁),`params` 由服务端剥掉后再下发 —— 别把结论先发到前端再用 CSS 遮。
