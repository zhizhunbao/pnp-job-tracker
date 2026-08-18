// 第二步「取数」:工具层的返回压平成 Fact[](含时间线与路径裁决两块)。
//
// 与 tools.ts 的分界:那边是**查**(SQL 与官方口径),这边是**摆**(把查到的摆成模型能读的一行行事实)。
// ⚠️ 朋友服务 prompt 上限 6000 字符,所以 facts **先压平再压缩**才喂模型 ——
// 工具返回的整坨 JSON 一次就能把额度撑爆。
import { type Availability, PRIVATE_PROMISE, type PlanResult, type VerdictResult } from './tools'
import { type PathwayVerdict, type VerdictProfile, type VerdictReason } from '../pathVerdict'
import { systemShort } from '../pnpSelfScore'
import { type PlanStep } from '../planTimeline'
import { AVAIL_SENTENCE, CLAIM_LEAD, LBL, type LabelDict, type Lang, MONEY_WHY, PROMISE_WHY } from '../i18n'
import { isMoneyTalk } from './federal'
import { PROFILE_SLOTS } from './slots'
import type { ChatResult, Fact, Slots } from './types'
import { localizeUnits, stripMd } from './wording'

// ── 第二步:调工具 → 压平成 Fact[] ─────────────────────────────────────────

/** fact.label 的硬帽(见 fact():prompt 预算、降级清单、前端出处表共用同一个上限)。 */
export const LABEL_CAP = 320
const QUOTE_CAP = 60      // 原话的常规上限;真给多少由 claimLabel 现算(解释句先留够)
const MIN_QUOTE = 24      // 截到比这还短就不叫「引他的原话」了 —— 三语今天都够不着这条底线,claimLabel 那组断言盯着
/**
 * 🔴 **该截的是原话,不是尾巴**。
 *
 * 2026-08-07 实测 C14 英文:主张行撞 320 帽,结尾断成 `…, not a private promi.` ——
 * 被砍掉的正是这个产品对中介最有力的半句(「省提名只认官方条款,不认私下承诺」),一刀把它变成了错别字。
 * 病根是 `slice(0, 320)` 只会从尾巴上砍,而尾巴恰恰是**我们自己写的见客文案**。
 *
 * 所以按来源分工:原话长度由用户决定(不可控,可截,截了必留省略号 —— 别让他以为我们改了他的话);
 * 引导词 / 四态成句 / 解释句是我们写的,**一个字都不许少**。先把固定部分占掉的额度扣干净,剩下多少才给原话。
 * **不把帽调大**:调大只是把同一刀推到更长的下一句上;帽也不必按行类型分档 —— 扣完固定部分,
 * 三语最紧的一档(en + PROMISE_WHY)还剩 59 字给原话,320 够用,分档只是多一个会分叉的旋钮。
 */
export function claimLabel(lead: string, text: string, close: string, rest: string, cap = LABEL_CAP): string {
  const room = Math.max(MIN_QUOTE, Math.min(QUOTE_CAP, cap - (lead.length + close.length + rest.length)))
  return `${lead}${text.length > room ? `${text.slice(0, room - 1)}…` : text}${close}${rest}`
}
export const sepOf = (l: Lang) => (l === 'en' ? '. ' : '。')
/** 报价走交易判断;真正未收录的普通主张才走 Availability。 */
export function otherClaimLabel(text: string, lang: Lang): string {
  const [lead, close, dash] = CLAIM_LEAD[lang]
  const money = isMoneyTalk(text)
  return claimLabel(lead, text, close, `${dash}${money ? MONEY_WHY[lang] : AVAIL_SENTENCE[lang]['not-collected']}`)
}

/** 收费与包办话术合成一条结论,避免同一问答连续念两遍“无法核实”。 */
export function commercialClaimLabel(texts: string[], lang: Lang): string {
  const [lead, close, dash] = CLAIM_LEAD[lang]
  const unique = [...new Set(texts.map((x) => x.trim()).filter(Boolean))]
  const joiner = lang === 'en' ? '; ' : lang === 'ko' ? '; ' : ';'
  const quoted = unique.join(joiner)
  const promise = unique.some((x) => PRIVATE_PROMISE.test(x))
  return claimLabel(lead, quoted, close, `${dash}${promise ? PROMISE_WHY[lang] : MONEY_WHY[lang]}`)
}

/**
 * C1 的 note/why **全是中文硬编码**(DRAWS_POLICY / OPS_POLICY / OK_WHY / 各 lookup 的 note,
 * 2026-08-04 逐条核过),它们经 valueText 进 prompt,英文用户就会在英文答复里读到半句中文。
 * 工具层语言中立是对的 —— 所以这里定规矩:**C1 的中文注只给中文用户看**,en/ko 一律不带。
 * 代价是英文答复少一句取证注(四态成句已经把「不公布 vs 没收录」说清了);收益是不出中英夹生。
 */
export const zhOnly = (s: string | undefined, lang: Lang) => (lang === 'zh' ? (s ?? '') : '')

export const fact = (tool: string, label: string, value: number | null, valueText: string, unit: string, ev: { url: string; fetched: string }): Fact => ({
  // 🔴 这一刀只会从尾巴上砍,所以主张行**不能靠它收口**(见 claimLabel:被砍的正是我们自己的解释句)。
  //    主张行进来之前已按 LABEL_CAP 把原话截过,这里对它是个恒等式 —— 帽照旧存在,只是不再由它决定截谁。
  tool, label: stripMd(label).slice(0, LABEL_CAP), value, valueText: stripMd(valueText).slice(0, 110), unit,
  evidence: { url: ev.url, fetched: ev.fetched },
})
/**
 * 四态成句 + 官方原文摘要一起带走:摘要跟着 valueText 截到 110 字,够模型分清「不公布」和「没收录」,又不吃光 prompt 预算。
 *
 * 🔴 `availability === 'ok'` 却走到这条路 = **查过了但没有命中**(EE 全表查完这个职业一个类别都不在、
 * 某省清单查过但没这个职业)。旧版把 AVAIL_SENTENCE.ok 那个内部占位符 `ok` 原样喂了出去,
 * 于是英文答复里出现「Federal Express Entry categories are open for this occupation」——
 * 把「一个类别都不在」说成了「都能走」,**意思正好说反**(2026-08-05 实测 C06 英文)。
 * 中文侥幸没错是因为 C1 的中文 note 补了后半句,en/ko 没有 note → 只剩一个 `ok`。所以在这里就换成人话。
 */
export const statusFact = (tool: string, label: string, av: Availability, note: string, url: string, lang: Lang) =>
  fact(tool, label, null, `${av === 'ok' ? LBL[lang].noneFound : AVAIL_SENTENCE[lang][av]}${note ? ` — ${note}` : ''}`, 'status', { url, fetched: '' })

// ── 时间线 → Fact[](C3 buildPlan 的答案怎么摆给模型)────────────────────────
//
// 🔴 **合计与分段的出处不是一回事**,这一段的全部难点就在这儿:
//   · 分段(缺口 / 抽选间隔 / 处理时长)是**库里的数**,各自挂着自己的 evidence.url —— 出处区点得开;
//   · 合计与快慢差是**这几段的算术**,它自己没有一页官网可指。所以它们的 evidence 留空:
//     guard 照旧认这个数(它在 facts 里),但 citeFacts 不会把它列进出处 —— 出处列的是被加的那几段。
//     **不许**随手拿某一段的 url 冒充合计的出处:那是拿一段的官方页去给另一个数字背书。
// 段数封顶是为了不把答复变成清单:一条路最多 3 段有数 + 2 段算不出,最多 3 条路。
const PLAN_PATHS_SHOWN = 3
const PLAN_STEPS_SHOWN = 3
export const DERIVED = { url: '', fetched: '' }      // 见上:算术没有自己的出处,留空而不是借一个

/**
 * 段 → 名目(缺口段带上是哪个门槛;认不出的因素落 planGap[''])。
 *
 * 🔴 抽选段的 **0 个月有两种意思**,名目必须分开:通常的 0 不存在,而 `not-applicable` 的 0 是
 * 「这条通道官方明示不进池,压根没有『等抽选』这一步」。挂着「平均间隔」的名目报 0,
 * 中文还有 basis 兜着,英文就只剩一句「平均每 0 个月开一轮」—— 那是我们自己造的一句假话。
 */
const planStepLabel = (s: PlanStep, T: LabelDict): string =>
  s.kind === 'gap' ? (T.planGap[s.factor] ?? T.planGap[''])
    : s.kind === 'draw' ? (s.availability === 'not-applicable' ? T.planNoDraw : T.planDraw)
      : T.planProc

/**
 * 算术原文 → 见客文本。两处归一,都不是审美:
 *  ① 单位跟着用户语言(库里的 unit 是英文原样,见下面 planFacts 里那段);
 *  ② `A = B` 换成 `A:B` —— RULE 5b 明令答复里不许出现 `=`,而 basis 里那个等号会被模型照抄,
 *     出口的 findFactDump 当场判违规,白烧一次重试(降级清单更是直接把它印给用户看)。
 */
export const plainly = (s: string, lang: Lang) => localizeUnits(s, lang).replace(/\s=\s/g, ':')

/**
 * 时间线 → facts。**一个数都不在这里算**:月数、下界、快慢差全是 buildPlan 已经定好的字段,
 * 本函数只负责给它们套上用户语言的名目(同 collectFacts 里其余六段的做法)。
 * 算不出的段照样出一行(statusFact:官方不公布 / 本站未收录)—— 那正是「多久」这个问题最该说清的一半:
 * 少说一段,读者就会把下界当成总数。
 */
export function planFacts(r: PlanResult, lang: Lang): Fact[] {
  const T = LBL[lang]
  const out: Fact[] = []
  if (r.availability !== 'ok') {
    out.push(statusFact('lookupPlan', T.planNone, r.availability, zhOnly(r.note, lang), '', lang))
    return out
  }
  // 口径注排在最前(同 lookupJobs 的 indexNote):没有它,「12.5 个月」会被读成「12.5 个月拿 PR」
  out.push(fact('lookupPlan', T.planScope, null, '', 'note', DERIVED))
  const shown = [...r.plan.ranked, ...r.plan.partial].slice(0, PLAN_PATHS_SHOWN)
  for (const p of shown) {
    // 全段确定才给总数;含未知段只给下界,且名目里就写着「这是下界不是总数」(红线:下界不冒充总数)
    if (p.totalMonths != null) out.push(fact('lookupPlan', `${p.province} ${T.planTotal}`, p.totalMonths, '', 'months', DERIVED))
    else if (p.determinedMonths > 0) out.push(fact('lookupPlan', `${p.province} ${T.planLower}`, p.determinedMonths, '', 'months', DERIVED))
    for (const s of p.steps.filter((x) => x.months != null).slice(0, PLAN_STEPS_SHOWN)) {
      // basis 是算术原文(中文硬编码,同 C1 的 note)→ 只给中文用户;英文/韩文只剩数字与名目。
      // ⚠️ 里面嵌着**库里的英文单位**(「官方要 12 months」——那是 pnp_requirements 的 unit 原样),
      //    不过 plainly 那道就两头出事:进 prompt 让模型抄出中英夹生,进 factsEnglish 的白名单
      //    还会把 months/weeks 整个放行,把 findEnglishUnits 那道检查一起废掉。
      out.push(fact('lookupPlan', `${p.province} ${planStepLabel(s, T)}`, s.months, zhOnly(plainly(s.basis, lang), lang), 'months',
        s.evidence ?? DERIVED))
    }
    for (const s of p.unknownSteps.slice(0, 2)) {
      out.push(statusFact('lookupPlan', `${p.province} ${planStepLabel(s, T)}`, s.availability,
        zhOnly(plainly(s.why, lang), lang), s.evidence?.url ?? '', lang))
    }
  }
  // 快慢差只说**两条路都摆出来了**的那对:读者看不见的省,一句「至少快 12.4 个月」没有着落
  const on = new Set(shown.map((p) => p.province))
  for (const c of r.plan.comparisons.filter((c) => on.has(c.fasterProvince) && on.has(c.slowerProvince)).slice(0, 2)) {
    out.push(fact('lookupPlan', T.faster(c.fasterProvince, c.slowerProvince, c.kind === 'atLeast'),
      c.monthsDelta, zhOnly(plainly(c.basis, lang), lang), 'months', DERIVED))
  }
  return out
}

// ── 路径裁决 → Fact[](C5c:pathVerdict 的十三条判定怎么摆给模型)────────────────
//
// 🔴 三条约束,都不是风格问题:
//   ① **中文的判定理由只给中文用户**(zhOnly,同 C1 的 note 那条规矩):pathVerdict 的 reason.text
//      是中文硬编码,漏进英文答复会被 findForeignScript 当场硬拦,而 88% 的流量是英文。
//      en/ko 拿到的是「我们自己的三语名目 + 官方英文原句 + 数字」—— 事实一条不少,只是不夹生。
//   ② **tier 不写成月数**(见 LBL.vTier):tier 是「差距落在哪个区间」的分档,写成「还要 12 个月」
//      等于给一个区间编了一个精度。真实月数在该通道自己的理由里(带官方原句与出处),那才是能报的数。
//   ③ **条数封顶**:13 条通道全铺 = 又一次「材料变提纲」。排除的全给(那是他最该知道的),
//      open 给最前几条**外加有估分的那几条**(估分是他自己算不出来的东西),needs-info 一句话带过。
const VERDICT_EXCLUDED_SHOWN = 3
const VERDICT_OPEN_SHOWN = 3
const VERDICT_NEEDS_SHOWN = 2
/** 语言杠杆问的是「提到哪一档」。这个数同时喂给 pathLevers 与见客标签 —— 两处各写一个迟早对不上。 */
export const VERDICT_CLB_TARGET = 8

/**
 * 抽选线那个数的出处是**抽选页**,不是分值表。pathVerdict 没把它单列出来,但它留了一个
 * **结构判据**:只有 `evOfDraw` 造的 evidence.label 里带 `(YYYY-MM-DD`(门槛行是官方原文、
 * 清单行是「stream — noc name」、分值表行是 system 名,都不长这样)。认不出就返回 undefined,
 * 那时这条线整个不给 —— 宁可少一个数,也不拿分值表的 url 去给抽选线背书。
 */
const drawEvidenceOf = (v: PathwayVerdict) =>
  v.reasons.find((r) => /\(\d{4}-\d{2}-\d{2}/.test(r.evidence?.label ?? ''))?.evidence

export function verdictFacts(r: VerdictResult, lang: Lang): Fact[] {
  const T = LBL[lang]
  if (r.availability !== 'ok') {
    return [statusFact('lookupVerdict', T.vPaths, r.availability, zhOnly(r.note, lang), '', lang)]
  }
  const out: Fact[] = []
  // 口径注排最前(同 planFacts 的 planScope):没有它,「这条走不通」会被读成一句资格认定
  out.push(fact('lookupVerdict', T.vScope, null, '', 'note', DERIVED))

  const name = (v: PathwayVerdict) => `${v.province} ${v.stream}`
  /**
   * 一条通道 + 一条理由 → 一句话:名目(三语)+ 中文用户额外拿到的判定理由,官方原句接在冒号后面。
   *
   * 🔴 **截断的官方原句要看得出被截过**(valueText 的硬帽是 110 字):`fact()` 那一刀只会齐字砍,
   *    砍完读者拿到的是一句完整模样、其实少了半截的「官方原话」—— 那比不引用更糟。这里按词边界先截、
   *    并留省略号(同 claimLabel 对用户原话的做法:别人的话可以截,但必须让人看出来截过)。
   */
  const clip = (t: string, cap: number): string => {
    const x = (t || '').trim()
    if (x.length <= cap) return x
    const cut = x.slice(0, cap - 1)
    const sp = cut.lastIndexOf(' ')
    return `${sp > cap * 0.6 ? cut.slice(0, sp) : cut}…`
  }
  /** `null` = 这一行一个字的信息都没有(en/ko 拿不到中文理由、这条理由又没有官方原句)—— 不摆空名目。 */
  const line = (v: PathwayVerdict, head: string, x?: VerdictReason): Fact | null => {
    const why = zhOnly(x?.text ? `——${x.text}` : '', lang)
    // 76 而不是 110 帽满打:整段 FACTS 的预算是 4200 字,十几条通道判定再各挂一句百来字的英文原文,
    // 就会把在招岗位那几行从 prompt 里挤出去(facts 数组一条不少,挤掉的只是这次的稿子)。
    // 原句在这里的作用是**锚**(让模型看得见判定有出处),不是给人读全文 —— 全文点出处链接去看。
    const quote = clip(x?.quote ?? '', 76)
    if (head === T.vWhy && !why && !quote) return null
    return fact('lookupVerdict', `${name(v)} ${head}${why}`, null, quote, 'path', x?.evidence ?? DERIVED)
  }
  const push = (f: Fact | null) => { if (f) out.push(f) }
  const scoreOf = (v: PathwayVerdict): Fact[] => {
    const s = v.score
    if (!s) return []
    const rows = [fact('lookupVerdict', `${name(v)} ${T.vScore}(${s.system})`, s.value, '', 'points', s.evidence)]
    if (s.ceiling != null) rows.push(fact('lookupVerdict', `${name(v)} ${T.vCeiling}(${s.system})`, s.ceiling, '', 'points', s.evidence))
    const dev = drawEvidenceOf(v)
    if (s.refLine != null && dev) {
      rows.push(fact('lookupVerdict', `${name(v)} ${T.vRefLine}(${s.system})`, s.refLine, clip(zhOnly(s.refLabel, lang), 104), 'points', dev))
    }
    return rows
  }
  /**
   * 该通道最该说的那几条理由:有差距就说差距,没差距(tier0)就说「官方明说没有这道门槛」那种带原句的。
   * 同一句话不摆两遍 —— 联邦三个子通道的经验差距文案逐字相同(只有官方原句不同),
   * 两行并排读起来就是在念表格(RULE 5b 那条老病)。
   */
  const pick = (v: PathwayVerdict, n: number): VerdictReason[] => {
    const gaps = v.reasons.filter((x) => x.kind === 'gap')
    const pool = gaps.length ? gaps : v.reasons.filter((x) => x.kind === 'met' && x.quote)
    return pool.filter((x, i, a) => a.findIndex((y) => y.text === x.text) === i).slice(0, n)
  }

  const excluded = r.pathways.filter((v) => v.verdict === 'excluded')
  const open = r.pathways.filter((v) => v.verdict === 'viable')
  const needs = r.pathways.filter((v) => v.verdict === 'needs-info')

  for (const v of excluded.slice(0, VERDICT_EXCLUDED_SHOWN)) {
    const hard = v.reasons.filter((x) => x.kind === 'excluded')
      .filter((x, i, a) => a.findIndex((y) => y.text === x.text) === i)
    // 排除的理由**必须能溯源**:头一句就带官方原句(pathVerdict 保证 excluded 的 reason 有 quote)
    push(line(v, T.vExcluded, hard[0]))
    for (const x of hard.slice(1, 2)) push(line(v, T.vWhy, x))
    out.push(...scoreOf(v))
  }
  // 有估分的通道即使排在后面也要进来:估分与抽选线是他自己算不出的东西,
  // 而按 tier 排序时它们常常压在第四第五位(金标 C01 的 MB 就是第七条)。
  const openShown = open.filter((v, i) => i < VERDICT_OPEN_SHOWN || !!v.score).slice(0, VERDICT_OPEN_SHOWN + 2)
  for (const v of openShown) {
    const reasons = pick(v, v.score ? 3 : 2)
    // 🔴 头一句只跟**差距**并排:差距就是 tier 的来由,并在一起读得通。一条差距都没有(tier0)时
    //    并进来的会是一条 met —— 「当天就能递」后面接一句「官方明说不要求语言成绩」,读者会以为
    //    tier0 是语言判出来的。那时头一句单独站着,理由另起一行。
    const paired = reasons[0]?.kind === 'gap' ? reasons[0] : undefined
    push(line(v, T.vTier[(v.tier ?? 0) as 0 | 1 | 2 | 3], paired))
    for (const x of reasons.slice(paired ? 1 : 0)) push(line(v, T.vWhy, x))
    out.push(...scoreOf(v))
  }
  // 有估分的 needs-info 通道也要进来:**估分与抽选线是算出来的事实,跟「能不能走」是两回事**。
  // 2026-08-12 实撞:门槛清单上线后 MB 因「没答有没有 offer」从 open 掉进 needs-info,
  // 于是 695/715/632 三个数连同官方警告整块消失 —— 判不了的是资格,不是那几个数。
  const needsShown = needs.filter((v, i) => i < VERDICT_NEEDS_SHOWN || !!v.score).slice(0, VERDICT_NEEDS_SHOWN + 2)
  for (const v of needsShown) {
    const why = v.reasons.find((x) => x.kind === 'needs-info')
    // 🔴 「本站没收录这条通道的门槛」和「你还没告诉我年龄」是两件事:前者带 availability(四态成句),
    //    后者只是缺槽。合并成一句「判不了」等于把我们的窟窿说成他的问题。
    if (v.availability !== 'ok') {
      // 注跟着 valueText 的 110 字帽走,四态成句要先占够 —— 截到一半的解释比不给解释还难读
      out.push(statusFact('lookupVerdict', `${name(v)} ${T.vNeedsInfo}`, v.availability,
        clip(zhOnly(why?.text ?? '', lang), 68), why?.evidence?.url ?? '', lang))
    } else {
      push(line(v, T.vNeedsInfo, why))
    }
    // 估分通道的官方警告(如曼省「外省学习 −100」)与估分同源,一并照发 —— 同上:判不了的是资格,不是那些数
    if (v.score) for (const x of pick(v, 2).filter((x) => x.kind !== 'needs-info')) push(line(v, T.vWhy, x))
    out.push(...scoreOf(v))     // 判不了的是资格,不是估分 —— 那几个数照发(见上方注释)
  }
  for (const l of r.levers.slice(0, 2)) {
    if (l.key === 'clb-boost') {
      for (const g of (l.gains ?? []).slice(0, 2)) {
        // systemShort:分制名尾巴上那个「(Ontario Workforce Priority stream)」是它自报的通道名,
        // 套进我们自己的括号里就成了套娃(「…能多拿的分(OINP EOI points (Ontario …))」)
        out.push(fact('lookupVerdict', `${g.province} ${T.vLeverClb(VERDICT_CLB_TARGET)}(${systemShort(g.system)})`, g.delta, '', 'points', g.evidence))
      }
    } else if (l.key === 'teer-downgrade') {
      out.push(fact('lookupVerdict', `${T.vLeverTeer}${zhOnly(`——${l.text}`, lang)}`,
        (l.affected ?? []).length, '', 'paths', l.reasons?.[0]?.evidence ?? DERIVED))
    }
  }
  return out
}

/**
 * Slots → VerdictProfile。**一个槽都不补默认值**:缺的原样传 null,pathVerdict 会把该通道判成
 * needs-info,编排层据此反问(verdictFollowups)。默认一个「一般人」的年龄或语言 = 算另一个人的分。
 */
export function verdictProfileOf(slots: Slots, teer: number | null): VerdictProfile {
  // 🔴 「一共几个月经验」拆不出「在哪儿攒的」—— 只有 0 是无歧义的(哪儿都没干过)。
  //    >0 时两边都留 null:相关通道落 needs-info,那正是实话。**不许**默认算加拿大经验
  //    (多数通道只认加拿大的,会把一个海外申请人的路凭空判开),也不许默认算海外经验(反过来一样错)。
  const zeroExp = slots.expMonths === 0
  return {
    age: slots.age ?? null,
    married: slots.married ?? null,
    clb: slots.clb ?? null,
    edu: slots.edu ?? null,
    eduYears: slots.eduYears ?? null,
    canadaStudy: slots.canadaStudy ?? null,
    studyProvince: slots.studyProvince ?? null,
    noc: slots.noc,
    teer,
    expCanadaMonths: zeroExp ? 0 : null,
    expForeignMonths: zeroExp ? 0 : null,
    foreignExpSelfEmployed: null,
    // 门槛清单三类闸:对话链没有「有没有 offer」这个槽 → 留 null(该通道落 needs-info,那正是实话);
    // 「人在不在境内」由既有 status 槽推得出,pgwp/study/worker 都是已在境内,other/null 不猜。
    hasOffer: null,
    inCanada: ['pgwp', 'study', 'worker'].includes(String(slots.status ?? '')) ? true : null,
    status: slots.status,
    // 现居省本站还没有这个槽(slots.provs 是他**问的**省,不是他**住的**省 —— 拿它当现居地,
    // 一个在安省问「曼省怎么样」的人会被当成曼省居民)。留 null → 带居住门槛的通道落 needs-info。
    province: null,
    // 许可(2026-08-15 拆闸):对话链只有处境槽,学签/PGWP 推得出来,其余判不了留 null
    permit: slots.status === 'pgwp' ? 'pgwp' : slots.status === 'study' ? 'study' : null,
    // 专业对口:对话链没有这个槽 → 留 null(该通道落 needs-info,那正是实话)
    fieldMatch: null,
    // 法语:对话链没有这个槽 → 留 null(FCIP 落 needs-info,那正是实话)
    frenchOk: null,
  }
}

/** 缺槽反问:按 PROFILE_SLOTS 的顺序问最要紧的几个(问句是本层写死的三语文案,不过模型)。 */
export function verdictFollowups(slots: Slots, lang: Lang, limit = 3): string[] {
  return PROFILE_SLOTS.filter((k) => slots[k] == null).slice(0, limit).map((k) => LBL[lang].vAsk[k])
}

/**
 * C6 选项卡的第一个真实场景:裁决已出但**身份不明**(与 vAsk.status 那条追问同一触发)。
 * 三张选项写死三语 —— label/consequence 是 UI 文案(零逗号);sendText 是用户口吻整句,
 * 发出去走既有抽槽(status 词表:student/graduated/working…),**不塞任何用户没说过的事实**。
 */
export function permitOptions(lang: Lang): NonNullable<ChatResult['options']> {
  const O: Record<Lang, NonNullable<ChatResult['options']>> = {
    zh: {
      reason: '先确认工签——它决定最快的通道对你开不开',
      items: [
        { label: '我有有效的 PGWP', consequence: '相关通道立刻可判', sendText: '我持有有效的 PGWP 工签', recommended: true },
        { label: '工签已过期或没有工签', consequence: '先看不吃身份的通道', sendText: '我没有有效的工签' },
        { label: '学签在读', consequence: '按毕业后的时间线算', sendText: '我还在读书(持学签)' },
      ],
    },
    en: {
      reason: 'Confirm the work permit first — it decides whether the fastest pathway is open to you',
      items: [
        { label: 'I hold a valid PGWP', consequence: 'those pathways can be ruled on right away', sendText: 'I hold a valid PGWP work permit.', recommended: true },
        { label: 'My permit expired or I have none', consequence: 'look first at pathways that need none', sendText: 'I do not hold a valid work permit.' },
        { label: 'Still on a study permit', consequence: 'plan on the post-graduation timeline', sendText: 'I am still studying on a study permit.' },
      ],
    },
    ko: {
      reason: '취업 허가부터 확인하세요 · 가장 빠른 통로의 가능 여부가 여기서 갈립니다',
      items: [
        { label: '유효한 PGWP 보유', consequence: '해당 통로 즉시 판정 가능', sendText: '유효한 PGWP 취업 허가를 갖고 있습니다.', recommended: true },
        { label: '허가 만료 또는 없음', consequence: '신분 요건 없는 통로부터 확인', sendText: '유효한 취업 허가가 없습니다.' },
        { label: '학생 비자로 재학 중', consequence: '졸업 후 일정으로 계산', sendText: '아직 학생 비자로 재학 중입니다.' },
      ],
    },
  }
  return O[lang]
}
