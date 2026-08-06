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
- [x] **C5b 完成(2026-08-06,29 测试绿/tsc 绿)**:`lib/pathVerdict.ts`(契约原样)+ `pathLevers` 第二导出。
      金标 ①-⑤ 全过;加测「攒 12 个月 MB 工作」tier 2→0,并**机器自跑出 C01 的核心结论**:
      同一年经验放安省 → MB 再扣 100 → 天花板 615<632 → excluded(「应避开曼省」的机器版)。
      两处判断已定(可推翻,文件头有注):分数鸿沟 = 语言拉满后的天花板仍 < refLine → excluded;
      MB score 按「门槛达成态」算并在 refLabel 明写。
      发现并已修:designated_employers mart 不带 url/fetched → NL 3 家事实挂不上 evidence
      (09+Payload+seed+`docs/sql/c5-designated-evidence.sql` 已补,DDL 已代跑生产);
      仍留:pnp_draws 无子通道键(MB 用全省兜底,BC 明令不开)、RCIP/MB-SWM 语言行缺、ON 第三档未收录。
- [ ] ~~**C5b pathVerdict 核心**~~(原始规格保留在下,已按上执行)(`lib/pathVerdict.ts` + `tests/int/pathVerdict.int.spec.ts`):
      通道注册表(C01 §二/§三的 15 条:FED-EE、ON-workforce、NB-sw、NS-sw、SK-offer、AIP、RCIP、
      MB-swm、AB-opportunity、BC-sw、BC-build、NL-intl-grad、PE-sw);逐通道:经验/语言/学历/年龄门槛
      走 evaluateRequirements + 通道特有规则(自雇不计/外省毕业生年限/JVA 豁免);估分通道挂 score
      与 refLine(最近抽选线,draws 查表);tier 按被卡的最长门槛算。
      **verdict 语义(定稿,消 C01「已排除」的双关)**:excluded = 有**攒时间补不齐**的硬伤
      (分数差鸿沟/职业清单不含);open+tier = 未达门槛全为可积累项(经验/居住),tier=还差多久;
      needs-info = 缺档案槽**或库缺门槛行**(availability 带 not-collected,不拿文档记忆当库)。
      金标断言(来自 C01,CRS 数字用 08-06 修正版):
      ① excluded 2 条:FED-EE(零经验不入池 + CRS 183/199 vs CEC 516,分差不可积累)、
        PE(72310 不在 PEI OID 清单——清单型硬伤;24 月另列 gap);
      ② open 分档:tier0=NL-intl-grad(无经验门槛,quote=op none);tier1=ON-workforce(6/毕业生3月)、
        NB-sw(6 月);tier2=NS、SK-offer、RCIP、MB-swm(12 月);tier3=AB、BC-sw、BC-build(24 月);
        MB-swm 必须带三条 warning:外省学习 −100(quote)/若先外省工作再 −100(595)/
        估分 695 与天花板 715 对照抽选 632·825;
      ③ AIP = needs-info:经验门槛行未收录(C5b-0 如实缺口),不许拿 C01 文档里的 1560h 当库;
      ④ SK-offer 不受 243 清单约束(appliesTo=OID/EE)且 72310 不在 Job Offer 排除清单(14 条);
      ⑤ 杠杆:75110(TEER 5)毁 TEER 匹配 → warning;CLB6→8:ON +8 / MB +20(查表得出)。
- [x] **C5c 完成(2026-08-06,19/19 新测试;chat 全家 137/137;全量 418 绿 1 红=既有脆测试,stash 复跑证明无关)**:
      触发 = NOC 到手 + 路径问法词表(纯函数不过模型)+ 档案槽 ≥3;缺槽反问(年龄→CLB→学历序,三语写死)。
      口径三则(接手必读):`married` 存的是**配偶随不随行**(CRS 分表判据),不是婚否;雅思/CELPIP 不心算
      CLB(换算表未收录 → 反问,已知取舍);tier 四句**零数字**(区间分档不给假精度)。
      facts 压平:C01 实测 23 条 <3000 字符,excluded 全带官方 quote(词边界截 76 字留省略号),
      抽选线 evidence 用结构判据认领,认不出整条不给。两处故意留 null:经验「在哪儿攒的」>0 时不猜、
      现居省无此槽(provs 是问的省)→ NB 居住门槛落 needs-info 是实话。

## 4.5 生产真 LLM 实测(2026-08-06 凌晨,两轮)

- ✅ 第二轮(档案含 PGWP):首句即「最快路径是纽芬兰国际毕业生类别,无需工作经验门槛」,
  逐省差距 + 曼省双倒扣毒点 + AIP 如实未收录,核查 14 项 —— C01 手工分析的对话版,价值先行。
- 🔴 **遗留(下轮首修)**:用户没提工签状态时,NL 掉进 needs-info 桶(上限 2)被 AIP/NB 挤掉,
  第一轮答复整个缺席。正确行为=「最快的可能路径是 NL——前提是有效 PGWP,你有吗?」:
  ① verdictFacts 的 needs-info 桶按 **tier 潜力**排序(tier0 潜力 > 其他),不按通道序;
  ② 缺 PGWP/身份槽时 followups 点名问工签状态。
- 过程整改(同晚 Frank 三连击):旧零经验剧本「缺的不是省份」删除,新增 PLAYBOOK_VERDICT
  (tier0 必点名/省份差异即答案/第一份工作与选省同一决策),`295334c` 生产已验。

## 五、验收

1. `pathVerdict(profileC01)` 与 C01 文档逐数字一致(上面 ①-④);
2. 既有测试零回归(chat* 全绿);`tsc --noEmit` 绿;
3. C5c 后:对话实答「我 40 岁已婚 CLB6 零经验学木工,走哪条路」不编数字(guardAnswer 兜底)。

## 六、进度记录

- 2026-08-05 深夜:立项,契约定稿;C5a 两估分器并行派出。
