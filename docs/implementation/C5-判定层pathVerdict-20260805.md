# C5 判定层 pathVerdict —— 档案进,裁决出

> 上游:[路径裁决-C01复现计划](../design/路径裁决-C01复现计划-20260805.md) §C5。
> 双金标:[案例C01-路径分析](../design/案例C01-马龙木匠路径-路径分析-20260805.md) + 2026-08-03 木匠对话(对话即产品 §八)。
> C4 已备好数据(金标 `etl/audit_c01_gold.py` 20/20 绿,生产已验)。

## 一、目标

一套用户档案 → 每条通道给 `excluded(带官方 quote)/ open(带差距)/ needs-info(缺哪个槽)`,
可自算的通道给估分与参照线;按「offer 到手后还要等多久」分档(0=Day0 / 1=3-6月 / 2=12月 / 3=24月)。
**红线**:排除/估分/排序全在本层(纯 TS+SQL 查表),LLM 只组稿;每个数字挂 evidence;四态不合并。

## 二、既有资产(复用,不新造)

- `lib/rules.ts` `evaluateRequirements(reqs, RuleProfile)` → 门槛 pass/fail/unknown(带 basis/quote);
- `lib/pnpSelfScore.ts` `scoreProvince()` → BC/SK/ON 官方分值表查表估分(标签解析,零硬编码分值);
  MB EOI 表(C4)已进同一张 `pnp_score_factors`;
- `lib/chatTools.ts` → Evidence/Availability 类型、DRAWS_POLICY/OPS_POLICY 政策事实表;
- 表:`pnp_requirements`(253,quote-anchored)/`pnp_score_factors`(164)/`pnp_draws`(145,含 NB 类别)/
  `pnp_occupations`(630,type+appliesTo)/`designated_employers`(3476,NL 带 nocs)/`ee_points_grid`(380)。

## 三、契约(定死,各工作项照此实现)

```ts
// lib/pathVerdict.ts —— 纯函数核心(rows 入参),pool 包装照 chatTools 惯例
export type VerdictProfile = {
  age: number | null
  married: boolean | null            // 配偶是否随行申请(CRS 单身/已婚两套表)
  clb: number | null                 // 四项最低(站内口径,同 RuleProfile.clb)
  edu: EduKey | null                 // 沿用 pnpSelfScore 阶梯
  eduYears: number | null            // 学制年数(2 年制 → PGWP 3 年)
  canadaStudy: boolean | null        // 有无加拿大学历
  studyProvince: string | null
  noc: string | null
  teer: number | null
  expCanadaMonths: number | null     // 同职业加拿大受雇经验(自雇不计的口径由通道规则判)
  expForeignMonths: number | null
  foreignExpSelfEmployed: boolean | null   // 海外经验是否全为自雇(C01:开商店=自雇→多通道记 0)
  status: string | null              // pgwp / study / worker / other
  province: string | null            // 现居省
}
export type VerdictReason = { kind: 'excluded' | 'gap' | 'met' | 'needs-info'
  text: string                       // 人话一句(措辞层再翻译)
  quote?: string                     // 官方原句(excluded 必带)
  evidence?: Evidence }
export type PathwayVerdict = {
  key: string                        // 'FED-EE' / 'ON-workforce' / 'MB-swm' / 'SK-offer' / 'AIP' / ...
  province: string                   // 'FED' 或省码
  stream: string                     // 官方通道名
  verdict: 'excluded' | 'open' | 'needs-info'
  tier: 0 | 1 | 2 | 3 | null         // offer 后等多久:0=Day0 / 1=3-6月 / 2=12月 / 3=24月;excluded=null
  reasons: VerdictReason[]
  score?: { system: string; value: number; ceiling: number | null;
            refLine: number | null; refLabel: string; evidence: Evidence }  // 可自算的通道才有
  availability: Availability
}
```

- 估分器两个新文件:`lib/crsEstimate.ts`(CRS+FSW67,查 `ee_points_grid`,grid 键与 lookupCrs 同)、
  MPNP 走 `scoreProvince` 泛化(若其标签解析吃不动 MB 表再单写 `mbEoiEstimate`,**分值仍全查表**)。
- 排除规则的每条 quote 从 `pnp_requirements.valueText/basis` 或政策事实表取,**代码里不许出现编造的官方原文**。

## 四、工作项

- [ ] **C5a-1 CRS 估分器**(`lib/crsEstimate.ts` + `tests/int/crsEstimate.int.spec.ts`):
      档案→CRS(单身/已婚两套)与 FSW67;金标:C01 已婚 185(47+91+32+15)/单身 199;fixture 取自 mart。
- [x] **C5a-2 MPNP 估分器**:✅ 2026-08-06 单写 `lib/mbEoiEstimate.ts`(scoreProvince 判定吃不动:
      语言按单项×4、负分 factorMax 是地板、work/age/education 词表全不匹配;仅复用 bonusPoints)。
      金标 695/595/715 全绿,21/21 测试,分值零硬编码;风险地板用符号感知分支,合成负行验证过真干活。
      ⚠️ 顺带发现:chatTools.int.spec 有一条断言生产库实值的既有脆测试(BC 池 1728≠今日 1651),与本批无关待修。
- [x] **C5b-0 门槛行补口**:✅ 2026-08-06 ON 6 月/毕业生 3 月(appliesCondition=recent-on-graduate,
      basis=employerTenure)、NB Experience 6 月+居住 6 月(residence 新 factor,数据层先落)、
      RCIP workHours 1560+自雇不计(Rural/Francophone 两页文案逐字同,引用核验闸过)。
      **AIP 未补**:门槛数字只在联邦 canada.ca 页,现有 crawl 无覆盖 → 缺 URL 待爬(需新 slug fed-aip),
      C5b 注册表里 AIP 先标 not-collected。ON 第三档(近5年同NOC 2 年)超范围未收录,builder 注释留痕。
- [ ] **C5b pathVerdict 核心**(`lib/pathVerdict.ts` + `tests/int/pathVerdict.int.spec.ts`):
      通道注册表(C01 §二/§三的 15 条:FED-EE、ON-workforce、NB-sw、NS-sw、SK-offer、AIP、RCIP、
      MB-swm、AB-opportunity、BC-sw、BC-build、NL-intl-grad、PE-sw);逐通道:经验/语言/学历/年龄门槛
      走 evaluateRequirements + 通道特有规则(自雇不计/外省毕业生年限/JVA 豁免);估分通道挂 score
      与 refLine(最近抽选线,draws 查表);tier 按被卡的最长门槛算。金标断言(全部来自 C01):
      ① excluded 5 条:FED-EE(CRS 185 vs CEC 516 + 零经验不入池)/PE(24 月)/BC-sw(24 月)/
        AB(24 月)/MB-swm(外省毕业生 12 月 + 695<825 天花板 715);
      ② open 分档:tier0=NL-intl-grad(无经验门槛,PGWP≥4 月);tier1=ON-workforce(3-6 月)、NB-sw(6 月);
        tier2=NS/SK-offer/AIP/RCIP/MB-swm(12 月);tier3=AB/BC(24 月);
      ③ SK-offer 不受 243 清单约束(appliesTo)且 72310 不在 Job Offer 排除清单;
      ④ 杠杆:75110(TEER 5)会毁掉 TEER 匹配 → 单独输出 warning;CLB6→8 对 ON +8 / MB +20。
- [ ] **C5c 编排接线**(`chatOrchestrate.ts` Slots 扩五槽 age/married/clb/edu/canadaStudy +
      `lookupVerdict` 薄封装 + STEP 三语 + 缺槽反问文案):纯联邦/普通职位问法不触发;缺槽列 needs-info
      不硬算;对话金标 = 木匠一句话进 → 排除/可用/杠杆多轮出,每个数字可溯源。

## 五、验收

1. `pathVerdict(profileC01)` 与 C01 文档逐数字一致(上面 ①-④);
2. 既有测试零回归(chat* 全绿);`tsc --noEmit` 绿;
3. C5c 后:对话实答「我 40 岁已婚 CLB6 零经验学木工,走哪条路」不编数字(guardAnswer 兜底)。

## 六、进度记录

- 2026-08-05 深夜:立项,契约定稿;C5a 两估分器并行派出。
