/**
 * 方案计算器(C3;设计《对话即产品-20260803》§三工具层 / §八验收金标 / §九不做什么)。
 *
 * 病根:工具层按红线**不排序不下结论**,LLM 按总红线**不许下结论** —— 于是金标那句最该收钱的话
 *   「走 SK 比信中介的 MB 快约 X 个月」
 * 没有任何一层负责生成。这一层就是那个负责人:**确定性的、可溯源的纯函数,不是 prompt**。
 *
 * 形状照 lib/report.ts:纯函数、无 IO、前后端同构。facts 由调用方拿 C1 的 lookup* 查好传进来,
 * 本文件**不查库、不调模型、不读时钟**(同一份输入永远出同一份 Plan —— 可测、可复现、可对账)。
 *
 * 四条红线(比功能更重要,改代码前先读):
 *
 *  ① **不许编时长。** 库里没有的一律 months=null,并说清是「官方不公布」还是「本站未收录」——
 *     C1 的 Availability 四态原样带出,绝不折成 0。**null 不是 0**:折成 0 就是替官方编了个数字,
 *     整条路径会凭空快出几个月。凡是本层算出的数字,都必须有 evidence.url 撑着;
 *     出处没了,这一段就判不可用(见 stepOf 的 evidence 兜底),**不许静默沿用**。
 *
 *  ② **不做概率、不做成功率预测。** 「AB 池里 23,056 人、上一轮发 833 邀」是两个**事实**,
 *     它们的比值是一个**算术**;但它**不是**「你有 3.6% 的机会」—— 池子构成、分数分布、
 *     你在池里的排位我们一概不知道。所以本层的 draw 段只回答「官方多久开一轮」(历史平均间隔,
 *     可核验),**永不回答「你要等几轮才被抽中」**。谁想加 `chanceOfInvite` 之类字段,先回来读这段。
 *
 *  ③ **金额不做结论性差额。** 官方规费(IRCC PR-fees)与中介报价是**两个口径**:前者是政府收费清单,
 *     后者是别人嘴里的一句话。本层把两者**并列摆出**(officialCosts / quotedCosts),
 *     **绝不相减**、绝不出 `saved` 字段 —— 「省掉那 2 万」这句话的措辞归上层,算术不归任何人,
 *     因为这两个数根本不在同一个口径上(中介费里含不含规费?我们不知道)。
 *
 *  ④ **只出结构化 Plan,不生成自然语言。** 措辞归上层(渲染/LLM 复述),计算归这里。
 *     所有 basis/why 字段是**算术的说明**(「12 个月 − 已有 0 个月」),不是给用户读的成品文案。
 */
import type { Availability, DrawsResult, Evidence, OpsResult, ProvThresholds, ThresholdRow, ThresholdsResult } from './chatTools'

// ── 换算常量(只此一处)──────────────────────────────────────────────────────
// 月长取 365.25/12 = 30.4375:周 → 月、天 → 月都走它。四舍五入到 0.1 个月,
// 精度到此为止 —— 官方给的就是「2 weeks」「每两周一轮」这种颗粒度,算到小数点后两位是假精确。
const DAYS_PER_MONTH = 30.4375
const round1 = (n: number) => Math.round(n * 10) / 10

/** 差值 → 月数。认得出的单位才换算,认不出返回 null(宁缺不猜,同 rules.areaOfPlace 的先例)。 */
function monthsFromUnit(value: number, unit: string): number | null {
  const u = (unit || '').toLowerCase()
  if (u.startsWith('month')) return round1(value)
  if (u.startsWith('year')) return round1(value * 12)
  if (u.startsWith('week')) return round1((value * 7) / DAYS_PER_MONTH)
  if (u.startsWith('day')) return round1(value / DAYS_PER_MONTH)
  return null
}

/**
 * 🔴 这些门槛差值**不许换算成月**,列在这里是为了让「为什么不换算」可被审。
 * language:考到 CLB X 要多久,取决于起点、学习强度、考位 —— **本站没有任何官方数据**,
 *          随便给个「3 个月」就是编(红线 ①)。差几个 CLB 照说,月数留 null。
 * income / wage:钱和时间不是一回事,涨薪要多久没人公布。
 */
const NOT_TIME_CONVERTIBLE: Record<string, string> = {
  language: '语言差 N 个档要考多久,本站没有官方数据,不换算成月(差几档见 short)',
  income: '收入差额不是时间,不换算成月',
  wage: '工资差额不是时间,不换算成月',
}

// ── 类型 ────────────────────────────────────────────────────────────────────

/** 一段的性质:gap=还缺什么(补齐要多久) / draw=然后要等多久(官方开一轮的间隔) / processing=递交后官方处理多久 */
type PlanStepKind = 'gap' | 'draw' | 'processing'

export type PlanStep = {
  kind: PlanStepKind
  /** gap:门槛因素名(experience/language/…);draw:'cadence';processing:官方通道口径(scope) */
  factor: string
  /** 🔴 null = 本层算不出。**永远不要 `?? 0`** —— 见红线 ①。 */
  months: number | null
  /** 这个数字**从哪来**:算术原文(「官方要 12 个月,已有 0 个月 → 差 12」),months=null 时为空串 */
  basis: string
  /** 四态原样沿用 C1(ok / not-published / not-collected / not-applicable),不重新发明 */
  availability: Availability
  /** months=null 时**必须**说清为什么算不出;能算出时可为空 */
  why: string
  /** 🔴 每一段都必须挂出处。数字段(months≠null)的 evidence.url 恒非空,否则这一段会被判不可用 */
  evidence: Evidence | null
}

/** 判不了的门槛(缺你的信息、或缺雇主材料)。**不是时间线的一段**,不计月数,但要摆出来。 */
type PlanBlocker = { factor: string; subject: string; need: number | null; unit: string; why: string; evidence: Evidence }

type PlanPath = {
  province: string
  stream: string
  steps: PlanStep[]
  /** 已确定各段之和 = 这条路的**下界**(还有 unknown 段时真实值只会更大,不会更小) */
  determinedMonths: number
  /** 🔴 只有全段确定时才是数;含 unknown 段时恒 null —— **下界不许冒充总数** */
  totalMonths: number | null
  timelineCertainty: 'complete' | 'partial'
  /** partial 的原因:哪几段算不出(steps 的子集,引用同一批对象) */
  unknownSteps: PlanStep[]
  /** 门槛判不了的项(不影响 timelineCertainty:时间线的确定性 ≠ 资格的确定性,两件事别混) */
  unresolved: PlanBlocker[]
  availability: Availability      // 该省门槛本身的可得性(not-collected = 连门槛都没收录)
  note: string
}

/**
 * 两条路的快慢差。**只在算术站得住时才生成**:
 *  · exact  = 两条都全段确定 → 差值是确定的;
 *  · atLeast= 快的那条全段确定(总数即上界),慢的那条只有下界,且**下界已经大于**快的那条总数
 *             → 「至少快 N 个月」成立(真实差只会更大)。
 * 其余情况一律不生成 —— 含 unknown 段的两条路互相比大小是没有意义的(红线 ①)。
 */
type PlanComparison = { fasterProvince: string; slowerProvince: string; monthsDelta: number; kind: 'exact' | 'atLeast'; basis: string }

/** 官方规费(IRCC PR-fees 等,带出处)。 */
type PlanCost = { label: string; amount: number; unit: string; evidence: Evidence }
/** 别人报的价(中介/朋友)。**原样带回,不核实、不换算、永不与 officialCosts 相减**(红线 ③)。 */
type QuotedCost = { label: string; amount: number | null; unit: string; text: string; source: string }

export type Plan = {
  noc: string
  title: string
  teer: number | null
  /** 全段确定的路径,按总月数升序 */
  ranked: PlanPath[]
  /** 含 unknown 段的路径,**单独成组**,按下界升序 —— 它们不与 ranked 混排(红线 ①) */
  partial: PlanPath[]
  comparisons: PlanComparison[]
  officialCosts: PlanCost[]
  quotedCosts: QuotedCost[]
  /** 给上层复述用的口径说明(不是成品文案) */
  notes: string[]
}

/** 一条候选路径的输入 = C1 三个工具对同一个省的返回值。 */
export type PlanPathInput = {
  province: string
  stream?: string
  thresholds: ProvThresholds | null
  draws: DrawsResult | null
  ops: OpsResult | null
  /**
   * 该通道**制度上就没有抽选这一步**(如 SINP International Skilled Worker 的 Employment Offer 子类
   * 不递 EOI、不进池,官方 EOI 页明示)。**必须带官方出处** —— 没有 evidence.url 的一律按 unknown 处理,
   * 绝不拿「库里没抽选记录」推成「不用抽选」(那正是红线 ① 说的编数字)。
   */
  noDrawStep?: { evidence: Evidence } | null
  /** ops 里挑哪一条处理时长(官方 scope 原文,如 'Employment Offer')。省内有多条又不指明 = 不替你挑。 */
  processingScope?: string
}

type PlanInput = {
  thresholds: ThresholdsResult          // 职业/TEER/各省门槛(lookupThresholds)
  paths: PlanPathInput[]
  officialCosts?: PlanCost[]
  quotedCosts?: QuotedCost[]
}

// ── 各段的算法 ──────────────────────────────────────────────────────────────

/**
 * 出处闸(反向验证的着力点):数字段没有 evidence.url 就地降级为不可用,**不静默沿用**。
 * 这是红线 ① 在代码里的唯一执行点 —— 所有 buildStep 都必须过它。
 */
function stepOf(s: PlanStep): PlanStep {
  if (s.months == null) return s
  if (s.evidence?.url) return s
  return { ...s, months: null, basis: '', availability: 'not-collected', why: `${s.factor}:这个数字在本站没有出处,不能用(出处缺失 → 判不可用)` }
}

/** ① 还缺什么:门槛 fail 的差值 → 月数。fail 之外的行不进时间线(pass 无缺口,unknown 进 unresolved)。 */
function gapSteps(rows: ThresholdRow[]): PlanStep[] {
  return rows.filter((r) => r.verdict === 'fail').map((r) => {
    const blocked = NOT_TIME_CONVERTIBLE[r.factor]
    const months = blocked || r.short == null ? null : monthsFromUnit(r.short, r.unit)
    return stepOf({
      kind: 'gap', factor: r.factor, months,
      basis: months == null ? '' : `官方要 ${r.need} ${r.unit},已有 ${r.have ?? 0} ${r.unit} → 差 ${r.short} ${r.unit}`,
      availability: months == null ? 'not-collected' : 'ok',
      why: months == null ? (blocked ?? `差值单位「${r.unit}」不能换算成月,不猜`) : '',
      evidence: r.evidence,
    })
  })
}

/** 门槛判不了的行(verdict=unknown)→ blocker。**不计月数**:判不了 ≠ 要等多久。 */
function blockersOf(rows: ThresholdRow[]): PlanBlocker[] {
  return rows.filter((r) => r.verdict === 'unknown').map((r) => ({
    factor: r.factor, subject: r.subject, need: r.need, unit: r.unit,
    why: r.subject === 'employer' ? '雇主侧事实本站没有,要雇主出材料' : '本站不知道你这一项的情况,判不了',
    evidence: r.evidence,
  }))
}

/**
 * ② 然后要等多久 —— **官方多久开一轮**(历史平均间隔),不是「你要等几轮才被抽中」(红线 ②)。
 * ≥2 轮才有间隔可算;只有 1 轮 = 算不出节奏(1 个点画不出周期)。
 */
function drawStep(p: PlanPathInput): PlanStep {
  const base = { kind: 'draw' as const, factor: 'cadence' }
  if (p.noDrawStep?.evidence?.url) {
    return stepOf({ ...base, months: 0, basis: '该通道官方明示不递 EOI、不进池 → 没有「等抽选」这一步', availability: 'not-applicable', why: '', evidence: p.noDrawStep.evidence })
  }
  const d = p.draws
  const rows = d?.rows ?? []
  if (d?.availability !== 'ok' || rows.length < 2) {
    return {
      ...base, months: null, basis: '', availability: d?.availability ?? 'not-collected',
      why: d?.note || (rows.length === 1 ? `${p.province} 本站只有 1 轮记录,算不出开轮间隔` : `本站未收录 ${p.province} 的抽选记录 —— 不等于该省没有抽选`),
      evidence: rows[0]?.evidence ?? null,
    }
  }
  const days = [...new Set(rows.map((r) => r.drawDate).filter(Boolean))].sort()
  const gaps = days.slice(1).map((d2, i) => (Date.parse(d2) - Date.parse(days[i])) / 86400000)
  const avg = gaps.reduce((a, b) => a + b, 0) / gaps.length
  return stepOf({
    ...base, months: round1(avg / DAYS_PER_MONTH),
    basis: `${days[0]} 起 ${days.length} 轮,平均间隔 ${Math.round(avg)} 天 = 官方开一轮的周期(不是「你要等几轮」)`,
    availability: 'ok', why: '', evidence: rows[0].evidence,
  })
}

/** ③ 递交后官方处理多久 = ops 的 processing_weeks。省内多条通道又没指明 scope = 不替你挑。 */
function processingStep(p: PlanPathInput): PlanStep {
  const base = { kind: 'processing' as const }
  const o = p.ops
  const all = (o?.metrics ?? []).filter((m) => m.key === 'processing_weeks')
  if (!all.length) {
    // ops 整体 ok(该省有别的运营指标)但**独独没有处理时长** = 本站未收录这一项,
    // 不能沿用整体的 ok —— 那会让「有数据」和「有这项数据」混成一件事(铁律 ②)。
    const availability: Availability = o?.availability === 'ok' ? 'not-collected' : (o?.availability ?? 'not-collected')
    return {
      ...base, factor: 'processing_weeks', months: null, basis: '', availability,
      why: o?.availability === 'ok' ? `${p.province} 官方运营统计里没有处理时长这一项(本站收录的其他指标不含它)` : (o?.note || `本站没有 ${p.province} 的官方处理时长`),
      evidence: null,
    }
  }
  const scoped = p.processingScope ? all.filter((m) => m.scope === p.processingScope) : all
  if (scoped.length !== 1) {
    return {
      ...base, factor: p.processingScope || 'processing_weeks', months: null, basis: '', availability: 'not-collected',
      why: scoped.length === 0 ? `${p.province} 官方处理时长里没有「${p.processingScope}」这条口径` : `${p.province} 官方按 ${scoped.length} 条通道分别公布处理时长,没指明走哪条 —— 不替你挑`,
      evidence: null,
    }
  }
  const m = scoped[0]
  // 🔴 value=null 是官方的隐私抑制 / 不适用(valueText 原文如 "N/A"),**不是 0 周**
  const months = m.value == null ? null : monthsFromUnit(m.value, m.unit)
  return stepOf({
    ...base, factor: m.scope || 'processing_weeks', months,
    basis: months == null ? '' : `官方${m.period ? ` ${m.period}` : ''}「${m.label}」${m.value} ${m.unit}`,
    availability: months == null ? (o?.availability ?? 'not-collected') : 'ok',
    why: months == null ? `官方这一格是「${m.valueText || '空'}」,不是一个可用的周数` : '',
    evidence: m.evidence,
  })
}

// ── 主函数 ──────────────────────────────────────────────────────────────────

/** 核心算法:每条路 = 三类段 → 分组(全确定 / 含未知)→ 组内升序 → 只在算术站得住时生成快慢差。 */
export function buildPlan(input: PlanInput): Plan {
  const paths: PlanPath[] = input.paths.map((p) => {
    const t = p.thresholds ?? input.thresholds.provinces.find((x) => x.province === p.province) ?? null
    const rows = t?.rows ?? []
    const steps = [...gapSteps(rows), drawStep(p), processingStep(p)]
    const unknownSteps = steps.filter((s) => s.months == null)
    const determinedMonths = round1(steps.reduce((n, s) => n + (s.months ?? 0), 0))
    return {
      province: p.province, stream: p.stream ?? '', steps, determinedMonths,
      totalMonths: unknownSteps.length ? null : determinedMonths,           // 🔴 下界不冒充总数
      timelineCertainty: unknownSteps.length ? 'partial' : 'complete',
      unknownSteps, unresolved: blockersOf(rows),
      availability: t?.availability ?? 'not-collected', note: t?.note ?? '',
    }
  })
  const byMonths = (k: 'totalMonths' | 'determinedMonths') => (a: PlanPath, b: PlanPath) => (a[k] as number) - (b[k] as number) || a.province.localeCompare(b.province)
  const ranked = paths.filter((p) => p.timelineCertainty === 'complete').sort(byMonths('totalMonths'))
  const partial = paths.filter((p) => p.timelineCertainty === 'partial').sort(byMonths('determinedMonths'))
  return {
    noc: input.thresholds.noc, title: input.thresholds.title, teer: input.thresholds.teer,
    ranked, partial, comparisons: compare(ranked, partial),
    officialCosts: input.officialCosts ?? [], quotedCosts: input.quotedCosts ?? [],
    notes: NOTES,
  }
}

/** 快慢差:只有「快的那条全段确定」才敢说 —— 它的总数同时也是上界,慢的那条拿下界比才成立。 */
function compare(ranked: PlanPath[], partial: PlanPath[]): PlanComparison[] {
  const out: PlanComparison[] = []
  for (const a of ranked) {
    for (const b of ranked) {
      if (b === a || (b.totalMonths as number) <= (a.totalMonths as number)) continue
      out.push({
        fasterProvince: a.province, slowerProvince: b.province,
        monthsDelta: round1((b.totalMonths as number) - (a.totalMonths as number)), kind: 'exact',
        basis: `${b.province} ${b.totalMonths} 个月 − ${a.province} ${a.totalMonths} 个月(两条都全段有官方数据)`,
      })
    }
    for (const b of partial) {
      if (b.determinedMonths <= (a.totalMonths as number)) continue    // 下界没超过 = 比不出来,不生成
      out.push({
        fasterProvince: a.province, slowerProvince: b.province,
        monthsDelta: round1(b.determinedMonths - (a.totalMonths as number)), kind: 'atLeast',
        basis: `${b.province} 光已确定的段就 ${b.determinedMonths} 个月(还有 ${b.unknownSteps.length} 段本站算不了,真实值只会更大)− ${a.province} 全段合计 ${a.totalMonths} 个月`,
      })
    }
  }
  return out
}

const NOTES = [
  '月数只包含本站有官方出处的段;标 partial 的路径有一段算不了,它的数是**下界**,不是总数',
  '抽选段回答的是「官方多久开一轮」,不是「你要等几轮才被抽中」—— 池子构成与你的排位本站不知道',
  '官方规费与他人报价是两个口径,本层并列摆出、不相减',
  '门槛判定沿用 rules.ts:pass/fail/unknown 三态,unknown 进 unresolved,不计月数',
]
