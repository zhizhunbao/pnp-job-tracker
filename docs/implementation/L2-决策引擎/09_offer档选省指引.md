# L2-09:offer 档反转成「选省求职指引」(2026-08-14;当日 Frank「开工吧」批准,已实现)

> 起因:Frank 三连问(08-14)——「至少还差 offer 怎么理解」→「我肯定要先知道哪个省最好,才去那个省找工作」
> →「在安省干一年再换省不现实吧」。结论:**offer 不是普通缺口,是绑定省份的行动**——第一份工作落在哪个省,
> 基本决定走哪条路(NL 官方原文要求 "eligible Newfoundland and Labrador employer";PGWP 时钟不可逆)。
> 现状三张卡齐刷刷写「至少还差 offer」,把这个互斥关系藏掉了,用户读不出「该押哪个省」。

## 1 · 背景与范围

决策页「可行通道初评」的 offer 档(blockedBy='offer' 的行)从**缺口视角**反转成**求职方向视角**:
回答「你该去哪个省找工作」,而不是「你差什么」。

**本批只动表达层 + 加一次反事实判定,不动排序**(障碍档主键 + 档内竞争度次序照旧,route.ts:114)。

三件事:
1. **组头指引**:offer 档第一行上方插两行——「offer 在哪个省,就走哪个省的通道」+「下面按竞争度排序,先定省,再投简历」。
2. **反事实徽标**:「至少还差 offer」→ 按「拿到该省 offer 之后的世界」分态(§3 状态映射)。
3. **行动链接**:每行加「看{省}在招岗 ›」→ `/jobs?prov=XX`(决策页 → 职位板闭环)。

## 2 · 实测前提(2026-08-14 调查)

- **offer 锁省是官方条文**,quote-anchored:gateManifest.ts:166 NL 国际毕业生 "Full-time job or job offer
  from an eligible **Newfoundland and Labrador** employer…"。各省雇主类通道同构。
- **经验可携带、身份时钟不可携带**:AB 机会通道 "24 months … in Canada or abroad"(ab-req.json),
  省外经验计入;但 NL 要 PGWP 剩 ≥4 月——在别省耗时间烧的是身份额度。这是组头指引的事实根据。
- 反事实的原料现成:`pathVerdict(profile, data)` 纯函数,`{...profile, hasOffer:true}` 重跑一次即得。
- 行内「名额竞争 N:1」**已在生产**(08-13「删了」之后的重组版又上了,以线上为准)——本方案不动它。
- 职位板筛选参数:`?prov=` 有(SSR 生效,jobs/page.tsx:83);**`?noc=` 没有**,职业维度只有 `?broad=` 大类
  → 初版链接只带省,不带职业(带大类是扩展项,见 §6)。
- 竞争度/在招岗数已有独立卡(九省竞争表 + 该职业分省竞争),行内不再重复报数。

## 3 · 设计

**效果图**(生产页注入 DOM 真样式,脚本 scratchpad/mockup_offer_band.py):

| | 现状 | 建议 |
|---|---|---|
| 桌面 1440 | ![](../../assets/mockups/L2-09-现状-桌面1440.png) | ![](../../assets/mockups/L2-09-建议-桌面1440.png) |
| 手机 375 | ![](../../assets/mockups/L2-09-现状-手机375.png) | ![](../../assets/mockups/L2-09-建议-手机375.png) |

**徽标状态映射**(反事实 = `pathVerdict` 重跑 `hasOffer:true`,取同 key 行):

| 反事实结果 | 徽标 | 色 |
|---|---|---|
| open 且 tier 0 | 拿到本省 offer 即可申请 | 蓝(#eff6ff/#1d4ed8,信息态非绿——仍非资格认定) |
| open 且 tier ≥1 | 拿 offer 后约需积累 N 个月(复用 dp.planTier 文案口径) | 琥珀 |
| blockedBy=language / statusInCanada / credentialCanada / selfEmployed | 拿 offer 后还差{语言成绩/加拿大身份/加拿大学历/…} | 琥珀 |
| needs-info(还有没答的闸) | 至少还差 offer(维持现状——答不全不敢承诺) | 琥珀 |

⚠️ 效果图里 MB 行「拿 offer 后还差本省经验」是**示意**:现有闸体系里没有「省内经验」这个 blockedBy,
真实第二态只会是上表四种。实现时以引擎输出为准,不新造闸。

**手机 375**:徽标+链接整体换行到行底(`flexWrap`,左缩进对齐正文),路名恢复单行——比现状(路名折两行)更干净。

**文案**(三语齐上,英文先验不折行;交付前过四闸):

| key | zh | en(待宽度实测) |
|---|---|---|
| dp.planOfferHead | offer 在哪个省,就走哪个省的通道 | Your offer's province decides your pathway |
| dp.planOfferSub | 下面按竞争度排序,先定省,再投简历 | Ranked by competition. Pick a province first |
| dp.planAfterOfferOk | 拿到本省 offer 即可申请 | Apply once you land a local offer |
| dp.planAfterOfferTier | 拿 offer 后约需积累 {n} 个月 | Offer + about {n} months to build |
| dp.planAfterOfferGap.* | 拿 offer 后还差{闸名} | After the offer: {gate} still short |
| dp.planSeeJobs | 看{省}在招岗 | See {prov} openings |

## 4 · 改动清单(2026-08-14 完成)

- [x] `route.ts`(profile-pathways):`hasOffer===false` 时重跑 `pathVerdict({...profile, hasOffer:true})`,
      对 blockedBy='offer' 的行附 `afterOffer: { verdict, blockedBy, tier }`(其余行不附,响应不膨胀)
- [x] `PrDecisionView.tsx`:Row 类型 + offer 档组头 + 徽标分态 + 行动链接 + 手机换行布局
- [x] `i18n.ts`:§3 键 × 三语(planOfferHead/Sub、AfterOfferOk/Tier1-3/Gap.*、SeeJobs/SeeJobsAip)
- [x] `pathVerdict.int.spec`:反事实不变量用例(offer 闸放行后不许再报 offer;42 测试全过)
- [x] 375 手机实测(徽标+链接落行底一行,路名单行不折)

**实现期落定的三个口径**(2026-08-14 当轮对话拍板):
- 行内竞争比值以**灰胶囊**形态回归(Frank「竞争名额也改成胶囊」,覆盖 08-13「删了」)。
- 直达链接按通道类型分流:省级 PNP 路 → `/jobs?prov=XX&pnp=1`;AIP 路 → `/jobs?aip=1`;
  RCIP 路**不给链接**,等 `jobs.pilot` 落地(E6-11,08-14 激活)。
- 链接文案用「看该省在招岗」不点省名(NL 全名 11 字,点名必折行;AIP 用「看指定雇主在招岗」)。

## 5 · 验收

- 无 offer 档案(offerBand=3)进 /plan/pr:offer 档带组头,各行徽标按反事实分态,链接直达 `/jobs?prov=XX`
- 有 offer / 全 needs-info 档案:组头不出现,现状不回归
- 排序与现状逐位一致(本方案不动排序)

## 6 · 不做的(本批)

- 不动排序、不动竞争表、不动行内竞争比值
- 链接不带职业维度(`?broad=` 大类映射是扩展项,另立)
- 不做「省份对比页」/「求职策略报告」(那是付费面的事,先把免费指引立住)
- 反事实不进 tripleVerdict(带岗态用户已有 offer,不存在这个档)
