'use client'
// E12-09 · 省提名自评打分 + 跨省对照。Frank:「分不够赶紧换省换工作,不要继续耗」。
//
// 从 BcSirsCard(只有 BC)改成两省对照 —— **有两个省才谈得上「换哪个省更快」**,这是这块的全部价值。
// 现有:BC/SK/ON/MB 各自官方分制 + NL EE Skilled Worker 100 分制(67 分申请门槛)。
//
// 硬约束(别放宽):
//   ① 分值全部来自 pnp_score_factors(官方分值表),前端一分都不许自己编;算法见 pnpSelfScore.ts;
//   ② 用户只填**一套条件**,各省按各自官方表折算,并把命中的官方原文标签显出来让用户核对;
//   ③ 对照锚点只能是官方事实:BC=真实抽选记录(pnp_draws),SK=官方申请门槛 —— 没有就写「官方未公布」,不编;
//   ④ 结果只能说「按官方分值表自算」,**不是资格认定**;
//   ⑤ 默认值一律取保守值(非本岗省份的工作地区默认 0 分档),不许用有利默认把分数吹上去。
import { useEffect, useMemo, useState } from 'react'

import type { TFn } from './i18n'
import { DEFAULT_PROFILE, EDU_KEYS, scoreProvince, streamMatches, type DrawRow, type EduKey, type ScoreFactor, type SelfProfile } from '@/lib/pnpSelfScore'

// 打分是**关于你这个人**的功能,不绑某一个岗位(Frank 2026-07-27「应该单独弄个功能吧,
// 不应该放到 pnp 弹框里面」)—— 所以只收一个轻量语境:职业(拿该省在招数)、目标省(排序)、
// 时薪与城市(BC 的两项按官方规则要用,拿不到就让用户自己填)。全是可选。
export type ScoreCtx = { noc?: string; teer?: number | null; province?: string; hourly?: number | null; city?: string; hasOffer?: boolean }

// 大温地区(Area 1)成员市镇 —— 官方 PDF 只写「Metro Vancouver Regional District」,成员名单是公开事实。
const MVRD = ['vancouver', 'surrey', 'burnaby', 'richmond', 'coquitlam', 'delta', 'langley', 'maple ridge',
  'new westminster', 'north vancouver', 'port coquitlam', 'port moody', 'pitt meadows', 'white rock',
  'west vancouver', 'bowen island', 'anmore', 'belcarra', 'lions bay', 'tsawwassen']
const AREA2 = ['squamish', 'abbotsford', 'agassiz', 'mission', 'chilliwack']
const guessArea = (city: string): number => {
  const c = (city || '').toLowerCase()
  if (MVRD.some((m) => c.includes(m))) return 0
  if (AREA2.some((m) => c.includes(m))) return 1
  return 2
}

// 官方标签是英文原文;中文/韩文界面按这张表出人话(**只译不改口径**,分值仍来自官方表)。
const L10N: Record<string, { zh?: string; ko?: string }> = {
  // BC
  'At least 1 year of directly related experience in Canada': { zh: '在加拿大有 1 年以上同职业经验', ko: '캐나다 내 동일 직종 1년 이상' },
  'Currently working full-time in B.C. for the employer in the occupation identified in the BC PNP registration': { zh: '目前在 BC 为该雇主全职做同一职业', ko: '현재 BC에서 해당 고용주와 동일 직종 풀타임' },
  'Post-secondary education completed in B.C., or': { zh: '学历在 BC 读的', ko: 'BC에서 취득한 학력' },
  'Post-secondary education completed in Canada (outside of B.C.)': { zh: '学历在加拿大其它省读的', ko: '캐나다 타 주에서 취득' },
  'Eligible professional designation in B.C.': { zh: '持 BC 认可的执业资格', ko: 'BC 인정 전문 자격 보유' },
  'Language proficiency in both English and French': { zh: '英法双语都达标', ko: '영어·프랑스어 모두 충족' },
  'Area 1: Metro Vancouver Regional District': { zh: 'Area 1 大温地区', ko: 'Area 1 메트로 밴쿠버' },
  'Area 2: Squamish, Abbotsford, Agassiz, Mission, and Chilliwack': { zh: 'Area 2 Squamish 等 5 市镇', ko: 'Area 2 Squamish 등 5개 지역' },
  'Area 3: Areas of B.C. not included in Area 1 or 2': { zh: 'Area 3 其余地区', ko: 'Area 3 기타 지역' },
  'Regional Experience, or': { zh: '有地区工作经验或地区院校毕业', ko: '지역 근무 경력 또는 지역 졸업' },
  // MB(MPNP EOI 加分/扣分项 —— Risk Assessment 两条是负分,符号由 Tick 按分值出)
  'Work experience in another province': { zh: '有外省工作经历', ko: '타 주 근무 경력' },
  'Fully recognized by provincial licensing body': { zh: '职业资格获省监管机构完全认证', ko: '주 면허기관 완전 인정 자격' },
  'Second Official Language — CLB 5 or higher (overall)': { zh: '第二官方语言 CLB 5 以上', ko: '제2공용어 CLB 5 이상' },
  'Studies in another province': { zh: '有外省就读经历', ko: '타 주 학업 경력' },
  'Close relative in Manitoba': { zh: '在曼省有近亲' },
  'Previous authorized work experience in Manitoba (six months or more)': { zh: '曾在曼省合法工作至少 6 个月' },
  'Completed post-secondary program in Manitoba (two years or more)': { zh: '在曼省完成至少 2 年的高等教育项目' },
  'Completed post-secondary program in Manitoba (one year)': { zh: '在曼省完成 1 年高等教育项目' },
  'Ongoing employment in Manitoba for six months or more with long-term job offer from the same employer': { zh: '已为同一曼省雇主工作至少 6 个月并获长期 offer' },
  'Invitation to Apply under a Strategic Initiative': { zh: '获曼省战略项目邀请' },
  'Immigration destination in Manitoba outside of Winnipeg': { zh: '计划定居温尼伯以外地区' },
  'Close relative in another province and no close relative in Manitoba': { zh: '外省有近亲、曼省无近亲' },
  'Previous immigration application to another province': { zh: '曾向其他省申请移民' },
  // ON Workforce Priority
  'Over 24 months working in job offer position': { zh: '已在 offer 对应岗位工作超过 24 个月' },
  '13 to 24 months working in job offer position': { zh: '已在 offer 对应岗位工作 13-24 个月' },
  '6 to 12 months working in job offer position': { zh: '已在 offer 对应岗位工作 6-12 个月' },
  'Less than 6 months working in job offer position or not currently working in position': { zh: '不足 6 个月或目前未在该岗位工作' },
  '$70k or more earnings in a year': { zh: '加拿大年报税收入 7 万加元以上' },
  '$50k to $69,999': { zh: '加拿大年报税收入 5万-69,999 加元' },
  '$30k to $49,999': { zh: '加拿大年报税收入 3万-49,999 加元' },
  'Under $30k earnings in a year': { zh: '加拿大年报税收入不足 3 万加元' },
  'With valid work permit': { zh: '持有效工签' },
  'With valid study permit': { zh: '持有效学签' },
  'Without valid work or study permit': { zh: '没有有效工签或学签' },
  'More than one Canadian credential': { zh: '有多个加拿大学历' },
  'One Canadian credential': { zh: '有一个加拿大学历' },
  'No Canadian credential': { zh: '没有加拿大学历' },
  'Northern Ontario': { zh: '安省北部' },
  'Eastern Ontario': { zh: '安省东部' },
  'Central Ontario outside GTA': { zh: '安省中部（GTA 以外）' },
  'Southwestern Ontario': { zh: '安省西南部' },
  'Inside GTA (except Toronto)': { zh: 'GTA 内（多伦多除外）' },
  'Toronto': { zh: '多伦多' },
  '$40 per hour or higher': { zh: '时薪 40 加元以上' },
  '$35 to $39.99 per hour': { zh: '时薪 35-39.99 加元' },
  '$30 to $34.99 per hour': { zh: '时薪 30-34.99 加元' },
  '$25 to $29.99 per hour': { zh: '时薪 25-29.99 加元' },
  '$20 to $24.99 per hour': { zh: '时薪 20-24.99 加元' },
  'Less than $20 per hour': { zh: '时薪不足 20 加元' },
  // SK
  'High skilled employment offer from a Saskatchewan employer': { zh: '有 SK 雇主的高技能岗 offer', ko: 'SK 고용주의 고숙련 오퍼 보유' },
  'Close family relative in Saskatchewan': { zh: '在 SK 有近亲(公民或永居)', ko: 'SK에 가까운 친척 거주' },
  'Past work experience in Saskatchewan': { zh: '在 SK 工作过(近 5 年满 12 个月)', ko: 'SK 근무 경력(최근 5년 12개월)' },
  'Past student experience in Saskatchewan': { zh: '在 SK 读过书(满一学年)', ko: 'SK 유학 경험(1학년도 이상)' },
  // NL Express Entry Skilled Worker - Annex A adaptability
  'Close relative in Newfoundland and Labrador': { zh: '本人或配偶在纽省有符合范围的近亲', ko: '본인 또는 배우자의 뉴펀들랜드 래브라도주 가까운 친척' },
  'Previous work experience in Newfoundland and Labrador': { zh: '近 5 年曾在纽省持有效工签工作至少 12 个月', ko: '최근 5년 내 뉴펀들랜드 래브라도주에서 유효한 취업허가로 12개월 이상 근무' },
  'Previous student experience in Newfoundland and Labrador': { zh: '曾在纽省认可院校持学签全日制就读至少 1 学年', ko: '뉴펀들랜드 래브라도주 인정 교육기관에서 유효한 유학허가로 1학년도 이상 수학' },
}
const label = (raw: string, lang: string) => (lang === 'zh' ? L10N[raw]?.zh : lang === 'ko' ? L10N[raw]?.ko : '') || raw

// 年龄下拉的选项档(打分按选中值算,预填吸附也以此为准 —— 两处必须同一张表)
const AGES = [17, 19, 25, 30, 34, 38, 42, 45, 48, 52]

type ExtraChoice = { key: string; text: string; active: boolean; apply: () => void }
type ExtraQuestion = { key: string; title: string; choices?: ExtraChoice[]; number?: { value: number; set: (value: number) => void } }
type ProvinceScore = NonNullable<ReturnType<typeof scoreProvince>>

const scoreAnchor = (s: ProvinceScore, draws: DrawRow[], matchedStream: string) => {
  const gridStream = /\(([^)]+)\)\s*$/.exec(s.system)?.[1] ?? ''
  const scored = draws.filter((d) => d.province === s.province && d.kind !== 'notice' && d.score != null)
    .filter((d) => !gridStream || streamMatches(d.stream, gridStream))
    .sort((a, b) => (a.drawDate < b.drawDate ? 1 : -1))
  const latest = scored.find((d) => streamMatches(d.stream, matchedStream))
  const line = latest?.score ?? s.passMark ?? null
  const hasOtherStreamDraws = !scored.length && draws.some((d) => d.province === s.province && d.kind !== 'notice' && d.score != null)
  const range = line == null && scored.length
    ? { lo: Math.min(...scored.map((d) => d.score as number)), hi: Math.max(...scored.map((d) => d.score as number)), n: scored.length }
    : null
  return { scored, latest, line, hasOtherStreamDraws, range }
}

const sel: React.CSSProperties = { width: '100%', height: 34, border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, background: '#fff', padding: '0 8px' }
const lbl: React.CSSProperties = { fontSize: 12, color: '#6b7280', marginBottom: 3 }

/** 加分项一条 = [勾选框 | 条目 | +N] 三列 —— +N 单独成列才对得齐(别塞回文字尾巴上) */
function Tick({ on, onToggle, text, pts }: { on: boolean; onToggle: (v: boolean) => void; text: string; pts: number | null }) {
  return (
    <label style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr max-content', alignItems: 'baseline',
      columnGap: 5, fontSize: 12, color: '#374151', cursor: 'pointer', lineHeight: 1.7 }}>
      <input type="checkbox" checked={on} onChange={(e) => onToggle(e.target.checked)} style={{ alignSelf: 'center' }} />
      <span>{text}</span>
      {/* MB 有负分 bonus(Risk Assessment -100):符号跟着分值走,别拼出「+-100」 */}
      <span style={{ color: '#9ca3af', fontVariantNumeric: 'tabular-nums' }}>{pts != null && pts >= 0 ? `+${pts}` : pts}</span>
    </label>
  )
}

export function PnpScoreCard({ t, lang, ctx, factors, draws, profileClb, streams = {}, initial, inputs = true,
  hiddenProfileInputs = [], targetMode = false, questionnaireActive,
  onQuestionnaireProgress, onQuestionnaireComplete, onQuestionnaireBack }: {
  t: TFn; lang: string; ctx: ScoreCtx; factors: ScoreFactor[]; draws: DrawRow[]; profileClb?: number | null
  /** 省 → 你的职业命中的具名通道名。抽选线按通道对照,对不上就不给差分结论(见 ProvinceResult) */
  streams?: Record<string, string>
  /** 答题答案预填(决策页:同一个条件不问两遍);只作初值,卡内下拉仍可改 */
  initial?: Partial<SelfProfile>
  /** false = 纯结果卡(决策页:答题是唯一输入面,卡内不再出「你的条件」下拉;
      时薪/地区走 ctx 岗位事实)。缺省 true 保 /pathways 现行为(批2 随页退役) */
  inputs?: boolean
  /** 决策页已经问过的条件不再重复问。 */
  hiddenProfileInputs?: (keyof SelfProfile)[]
  /** 只评当前职位所在省:标题与说明改成“补充条件”,不再暗示跨省排行榜。 */
  targetMode?: boolean
  /** PR 主问卷选完省份后继续使用同一题区；关闭时保留本组件状态并显示结果。 */
  questionnaireActive?: boolean
  onQuestionnaireProgress?: (progress: { done: number; total: number }) => void
  onQuestionnaireComplete?: () => void
  onQuestionnaireBack?: () => void
}) {
  const showQuestionnaire = questionnaireActive ?? targetMode
  // 有官方分值表的省(数据层决定,加省不用改这里)。目标省排第一列,其余省作「换省」对照。
  const provinces = useMemo(() => {
    const all = Array.from(new Set(factors.map((f) => f.province))).filter(Boolean)
    return all.sort((a, b) => (a === ctx.province ? -1 : b === ctx.province ? 1 : a < b ? -1 : 1))
  }, [factors, ctx.province])

  const manualQuestions = useMemo(() => provinces.flatMap((prov) => Array.from(new Set(factors
    .filter((f) => f.province === prov && f.kind === 'row')
    .map((f) => f.factor)))
    .filter((name) => !['work', 'work5', 'work610', 'education', 'language', 'language1', 'language2', 'age', 'offer'].includes(name))
    .filter((name) => !(name === 'area' && prov === 'BC'))
    .filter((name) => !(name === 'teerCat' && ctx.teer != null))
    .filter((name) => !(name === 'occCat' && /^\d{5}$/.test(ctx.noc || '')))
    .map((name) => ({ prov, name, key: `${prov}:${name}`, rows: factors.filter((f) => f.province === prov && f.factor === name && f.kind === 'row') }))),
  [provinces, factors, ctx.noc, ctx.teer])
  const splitWork = factors.some((f) => f.factor === 'work5' || f.factor === 'work610')

  const [profile, setProfile] = useState<SelfProfile>(() => {
    const p = { ...DEFAULT_PROFILE, clb1: profileClb ?? DEFAULT_PROFILE.clb1, ...initial }
    // 预填年龄吸附到下拉选项(答题档位给的是 33 这类档中值,不在选项表里 select 会显示成第一项,
    // 显示与打分口径就分叉了 —— 吸最近项,显示=实际用的值)
    if (initial?.age != null) p.age = AGES.reduce((b, a) => (Math.abs(a - initial.age!) < Math.abs(b - initial.age!) ? a : b))
    return p
  })
  const set = <K extends keyof SelfProfile>(k: K, v: SelfProfile[K]) => setProfile((p) => ({ ...p, [k]: v }))
  const [ticks, setTicks] = useState<Record<string, boolean>>({})
  const [wage, setWage] = useState<number>(() => Math.round(ctx.hourly ?? 0))
  // 保守默认:知道城市才猜地区,否则默认 Area 1(0 分)—— 不许用有利默认把分数吹上去
  const [areaI, setAreaI] = useState<number>(() => (ctx.city ? guessArea(ctx.city) : 0))
  const [hasOffer, setHasOffer] = useState<boolean>(() => !!ctx.hasOffer)
  // 官方表中没有通用自动映射的档位(如 ON 工作许可/加拿大收入)也必须有输入入口。
  // 空值=未回答=0 分;选择后直接使用该官方行的 points,不在前端另造规则。
  const [rowAnswers, setRowAnswers] = useState<Record<string, number>>({})
  const [extraQuestionIndex, setExtraQuestionIndex] = useState(0)
  const [extraAnswered, setExtraAnswered] = useState<Record<string, boolean>>({})
  const [reviewExtra, setReviewExtra] = useState(false)

  // PR 评估页把官方表字段收敛成逐题选择。这里只换输入形态，不改任何分值或匹配规则；
  // 时薪是 BC 每整元计分，不能粗暴切区间，所以仍是单题数字输入。
  const extraQuestions: ExtraQuestion[] = []
  const addChoices = (key: string, title: string, choices: ExtraChoice[]) => extraQuestions.push({ key, title, choices })
  const scopedTitle = (province: string, title: string) => provinces.length > 1 ? `${t('prov.' + province)} · ${title}` : title
  if (!hiddenProfileInputs.includes('edu') && factors.some((f) => f.factor === 'education')) {
    addChoices('profile:edu', t('ps.f.education'), EDU_KEYS.map((k) => ({
      key: k, text: t('ps.edu.' + k), active: profile.edu === k, apply: () => set('edu', k as EduKey),
    })))
  }
  if (!hiddenProfileInputs.includes('expRecent') && factors.some((f) => f.factor === 'work' || f.factor === 'work5')) {
    addChoices('profile:expRecent', t(splitWork ? 'ps.f.expRecent' : 'ps.f.expTotal'), [0, 1, 2, 3, 4, 5].map((n) => ({
      key: String(n), text: n === 5 ? t('ps.yr5') : t('ps.yr', { n }), active: profile.expRecent === n, apply: () => set('expRecent', n),
    })))
  }
  if (!hiddenProfileInputs.includes('expOlder') && factors.some((f) => f.factor === 'work' || f.factor === 'work610')) {
    addChoices('profile:expOlder', t('ps.f.expOlder'), [0, 1, 2, 3, 4, 5].map((n) => ({
      key: String(n), text: n === 5 ? t('ps.yr5') : t('ps.yr', { n }), active: profile.expOlder === n, apply: () => set('expOlder', n),
    })))
  }
  if (!hiddenProfileInputs.includes('clb1') && factors.some((f) => f.factor === 'language' || f.factor === 'language1')) {
    addChoices('profile:clb1', t('ps.f.clb1'), [0, 4, 5, 6, 7, 8, 9, 10].map((n) => ({
      key: String(n), text: n ? `CLB ${n}` : t('ps.clbNone'), active: profile.clb1 === n, apply: () => set('clb1', n),
    })))
  }
  if (!hiddenProfileInputs.includes('clb2') && factors.some((f) => f.factor === 'language2')) {
    addChoices('profile:clb2', t('ps.f.clb2'), [0, 4, 5, 6, 7, 8, 9, 10].map((n) => ({
      key: String(n), text: n ? `CLB ${n}` : t('ps.clbNone'), active: profile.clb2 === n, apply: () => set('clb2', n),
    })))
  }
  if (!hiddenProfileInputs.includes('age') && factors.some((f) => f.factor === 'age')) {
    addChoices('profile:age', t('ps.f.age'), AGES.map((n) => ({
      key: String(n), text: t('ps.age.v', { n }), active: profile.age === n, apply: () => set('age', n),
    })))
  }
  const wageProvince = factors.find((f) => f.factor === 'wage' && f.kind === 'rule')?.province
  if (wageProvince) {
    extraQuestions.push({ key: 'job:wage', title: scopedTitle(wageProvince, t('ps.in.wage')), number: { value: wage, set: setWage } })
  }
  const bcAreaRows = factors.filter((f) => f.province === 'BC' && f.factor === 'area' && f.kind === 'row')
  if (bcAreaRows.length) {
    addChoices('job:bcArea', scopedTitle('BC', t('ps.in.area')), bcAreaRows.map((r, i) => ({
      key: String(r.seq), text: label(r.label, lang), active: areaI === i, apply: () => setAreaI(i),
    })))
  }
  for (const { prov, name, key, rows } of manualQuestions) {
    addChoices(key, scopedTitle(prov, t('ps.f.' + name)), rows.map((r) => ({
      key: String(r.seq), text: label(r.label, lang), active: rowAnswers[key] === r.seq,
      apply: () => setRowAnswers((m) => ({ ...m, [key]: r.seq })),
    })))
  }
  for (const prov of provinces) {
    const offer = factors.find((f) => f.province === prov && f.factor === 'offer' && f.kind === 'row')
    if (offer) {
      addChoices(`${prov}:offer`, scopedTitle(prov, t('ps.q.meet', { condition: label(offer.label, lang) })), [
        { key: 'yes', text: t('ps.yes'), active: hasOffer, apply: () => setHasOffer(true) },
        { key: 'no', text: t('ps.no'), active: !hasOffer, apply: () => setHasOffer(false) },
      ])
    }
    for (const bonus of factors.filter((f) => f.province === prov && f.kind === 'bonus')) {
      const key = `${prov}:${bonus.factor}:${bonus.seq}`
      addChoices(key, scopedTitle(prov, t('ps.q.meet', { condition: label(bonus.label, lang) })), [
        { key: 'yes', text: t('ps.yes'), active: !!ticks[key], apply: () => setTicks((m) => ({ ...m, [key]: true })) },
        { key: 'no', text: t('ps.no'), active: !ticks[key], apply: () => setTicks((m) => ({ ...m, [key]: false })) },
      ])
    }
  }
  const extraQuestionCount = extraQuestions.length
  const extraAnsweredCount = extraQuestions.filter((q) => extraAnswered[q.key]).length
  const extraComplete = extraQuestions.every((q) => extraAnswered[q.key])
  const activeExtraQuestion = extraQuestions[Math.min(extraQuestionIndex, Math.max(extraQuestionCount - 1, 0))]
  useEffect(() => {
    onQuestionnaireProgress?.({ done: extraAnsweredCount, total: extraQuestionCount })
  }, [extraAnsweredCount, extraQuestionCount, onQuestionnaireProgress])
  useEffect(() => {
    if (showQuestionnaire && extraQuestionCount === 0) onQuestionnaireComplete?.()
  }, [extraQuestionCount, onQuestionnaireComplete, showQuestionnaire])
  const answerExtra = (question: ExtraQuestion, apply?: () => void) => {
    apply?.()
    setExtraAnswered((m) => ({ ...m, [question.key]: true }))
    if (extraQuestionIndex < extraQuestionCount - 1) setExtraQuestionIndex((i) => i + 1)
    else {
      setReviewExtra(false)
      onQuestionnaireComplete?.()
    }
  }

  // 换省事实:同职业在各省的在招数(/api/quiz?noc= 已有,免费事实,不新增端点)
  const [byProv, setByProv] = useState<Record<string, { n: number; eligible: number }>>({})
  useEffect(() => {
    if (!ctx.noc) return
    let dead = false
    fetch(`/api/quiz?noc=${ctx.noc}`).then((r) => r.json()).then((d) => {
      if (dead || !d?.facts?.byProv) return
      setByProv(Object.fromEntries(d.facts.byProv.map((r: any) => [r.province, { n: r.n, eligible: r.eligible }])))
    }).catch(() => { /* 事实拿不到就不显示,不编 */ })
    return () => { dead = true }
  }, [ctx.noc])

  const scores = useMemo(() => provinces.map((prov) => {
    const mine = factors.filter((f) => f.province === prov)
    const overrides: Record<string, { pts: number; matched: string; source: 'profile' | 'job' | 'tick' }> = {}
    // BC:时薪按官方规则算(每整元 1 分,$16 起、$70 封顶);地区取用户选的档
    const wageRule = mine.find((f) => f.factor === 'wage' && f.kind === 'rule')
    if (wageRule) {
      let cfg: { floorAt?: number; capAt?: number } = {}
      try { cfg = JSON.parse(wageRule.rule || '{}') } catch { /* 规则串坏了就按官方默认 */ }
      const floorAt = cfg.floorAt ?? 16, capAt = cfg.capAt ?? 70
      const pts = wage < floorAt ? 0 : Math.min(Math.floor(Math.min(wage, capAt)) - 15, wageRule.factorMax ?? 55)
      overrides.wage = { pts, matched: `$${wage}/hr`, source: 'job' }
    }
    const areaRows = mine.filter((f) => f.factor === 'area' && f.kind === 'row')
    // guessArea 只描述 BC 的三片区。ON 的地区档完全不同,必须由用户按官方档位选择。
    if (prov === 'BC' && areaRows.length) {
      const r = areaRows[Math.min(areaI, areaRows.length - 1)]
      overrides.area = { pts: r?.points ?? 0, matched: r?.label ?? '', source: 'job' }
    }
    const offerRows = mine.filter((f) => f.factor === 'offer' && f.kind === 'row')
    if (offerRows.length) {
      overrides.offer = { pts: hasOffer ? (offerRows[0].points ?? 0) : 0, matched: offerRows[0].label, source: 'tick' }
    }
    for (const name of Array.from(new Set(mine.filter((f) => f.kind === 'row').map((f) => f.factor)))) {
      // 这些因素已有 profile/job 映射;其余因素由用户直接选择官方档位。
      if (['work', 'work5', 'work610', 'education', 'language', 'language1', 'language2', 'age', 'offer'].includes(name)) continue
      if (name === 'area' && prov === 'BC') continue
      if (name === 'teerCat' && ctx.teer != null) {
        const hit = mine.find((f) => f.factor === name && f.kind === 'row'
          && (f.label.match(/\d/g) || []).map(Number).includes(ctx.teer!))
        if (hit) overrides[name] = { pts: hit.points ?? 0, matched: hit.label, source: 'job' }
        continue
      }
      if (name === 'occCat' && /^\d{5}$/.test(ctx.noc || '')) {
        const cat = Number(ctx.noc![0])
        const hit = mine.find((f) => f.factor === name && f.kind === 'row'
          && (f.label.match(/\d/g) || []).map(Number).includes(cat))
        if (hit) overrides[name] = { pts: hit.points ?? 0, matched: hit.label, source: 'job' }
        continue
      }
      const answer = rowAnswers[`${prov}:${name}`]
      if (answer == null) continue
      const hit = mine.find((f) => f.factor === name && f.kind === 'row' && f.seq === answer)
      if (hit) overrides[name] = { pts: hit.points ?? 0, matched: hit.label, source: 'profile' }
    }
    return scoreProvince(factors, prov, profile, overrides, ticks)
  }).filter(Boolean) as NonNullable<ReturnType<typeof scoreProvince>>[], [provinces, factors, profile, ticks, wage, areaI, hasOffer, rowAnswers, ctx.noc, ctx.teer])

  // 手风琴展开态:目标省默认开;'__closed' = 全收起(点开着的行就是收起)
  const [openProv, setOpenProv] = useState<string | null>(null)

  if (!scores.length) return null
  const resolvedOpen = openProv === '__closed' ? ''
    : (openProv ?? (scores.some((x) => x.province === ctx.province) ? ctx.province! : scores[0].province))

  const bonusOf = (prov: string) => factors.filter((f) => f.province === prov && f.kind === 'bonus')

  return (
    // 卡壳(边框/圆角/内边距)由外层 MODAL_CARD 提供 —— 这里再画一层就是卡中卡
    <div>
      {/* 制度名不再跟在标题后面串一行(375 下折两行还对不齐)——各省折叠行里各自带 */}
      <div style={{ marginBottom: 10 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>
          {t(targetMode ? 'ps.extraTitle' : 'ps.title')}{targetMode && extraQuestionCount > 0 ? <span style={{ color: '#9ca3af', fontSize: 12, fontWeight: 500 }}> · {t('ps.progress', { done: extraAnsweredCount, total: extraQuestionCount })}</span> : null}
        </h2>
        {targetMode && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4, lineHeight: 1.55 }}>{t('ps.extraHint')}</div>}
      </div>

      {inputs && targetMode && extraQuestionCount > 0 && showQuestionnaire && (
        extraComplete && !reviewExtra ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, border: '1px solid #dbeafe', borderRadius: 10, background: '#f8fbff', padding: '9px 11px' }}>
            <span style={{ display: 'grid', placeItems: 'center', width: 22, height: 22, borderRadius: 999, background: '#2563eb', color: '#fff', fontSize: 12, fontWeight: 700 }}>✓</span>
            <span style={{ color: '#1f2937', fontSize: 13, fontWeight: 600 }}>{t('ps.complete', { n: extraQuestionCount })}</span>
            <button type="button" onClick={() => { setExtraQuestionIndex(0); setReviewExtra(true) }}
              style={{ marginLeft: 'auto', border: 0, background: 'transparent', color: '#2563eb', font: '600 12px/1.4 inherit', cursor: 'pointer', padding: 4 }}>
              {t('ps.edit')}
            </button>
          </div>
        ) : activeExtraQuestion ? (
          <div aria-live="polite" style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: '14px', background: '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 11 }}>
              <span style={{ color: '#2563eb', fontSize: 11.5, fontWeight: 700 }}>{t('ps.questionN', { current: extraQuestionIndex + 1, total: extraQuestionCount })}</span>
              <span style={{ flex: 1, height: 4, borderRadius: 999, background: '#eef2f7', overflow: 'hidden' }}>
                <span style={{ display: 'block', width: `${((extraQuestionIndex + 1) / extraQuestionCount) * 100}%`, height: '100%', borderRadius: 999, background: '#2563eb', transition: 'width .2s' }} />
              </span>
            </div>
            <div style={{ color: '#111827', fontSize: 15, fontWeight: 700, lineHeight: 1.55, marginBottom: 12 }}>{activeExtraQuestion.title}</div>
            {activeExtraQuestion.choices ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {activeExtraQuestion.choices.map((choice) => (
                  <button type="button" key={choice.key} aria-pressed={choice.active}
                    onClick={() => answerExtra(activeExtraQuestion, choice.apply)}
                    style={{ minHeight: 38, border: `1px solid ${choice.active ? '#2563eb' : '#d1d5db'}`, borderRadius: 999,
                      background: choice.active ? '#eff6ff' : '#fff', color: choice.active ? '#1d4ed8' : '#374151',
                      padding: '8px 14px', font: `${choice.active ? 650 : 500} 13px/1.35 inherit`, cursor: 'pointer', textAlign: 'left' }}>
                    {choice.text}
                  </button>
                ))}
              </div>
            ) : activeExtraQuestion.number ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, maxWidth: 320 }}>
                <input type="number" min={0} value={activeExtraQuestion.number.value}
                  onChange={(e) => activeExtraQuestion.number?.set(Number(e.target.value))}
                  aria-label={activeExtraQuestion.title}
                  style={{ ...sel, height: 40, flex: 1, fontSize: 14 }} />
                <button type="button" onClick={() => answerExtra(activeExtraQuestion)}
                  style={{ height: 40, border: 0, borderRadius: 9, background: '#2563eb', color: '#fff', padding: '0 17px', font: '600 13px/1 inherit', cursor: 'pointer' }}>
                  {t('ps.confirm')}
                </button>
              </div>
            ) : null}
            {(extraQuestionIndex > 0 || onQuestionnaireBack) && (
              <button type="button" onClick={() => (extraQuestionIndex > 0 ? setExtraQuestionIndex((i) => Math.max(0, i - 1)) : onQuestionnaireBack?.())}
                style={{ marginTop: 12, border: 0, background: 'transparent', color: '#6b7280', font: '500 12px/1.4 inherit', cursor: 'pointer', padding: 0 }}>
                ← {t('ps.previous')}
              </button>
            )}
          </div>
        ) : null
      )}

      {/* 你的条件 —— 一套答案,各省按各自官方表折算。
          inputs=false(决策页):不渲下拉 —— 答题是唯一输入面,分数由答案自动算(Frank 2026-08-10);
          时薪/工作地区是岗位事实,走 ctx,不问人 */}
      {inputs && !targetMode && (<>
      <div style={lbl}>{t(targetMode ? 'ps.extraYou' : 'ps.you')}</div>
      {/* 126 = 375 手机上正好两列:弹框内宽 301 − 卡片左右 padding 28 = 273,126×2+10=262 放得下
          (先试的 132 差 1px 就掉回一列 —— 算的时候别忘了减卡片自己的 padding)。纯 CSS auto-fit,不做 JS 宽度探测 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(126px, 1fr))', gap: 10 }}>
        {!hiddenProfileInputs.includes('edu') && factors.some((f) => f.factor === 'education') && <div><div style={lbl}>{t('ps.f.education')}</div>
          <select value={profile.edu} onChange={(e) => set('edu', e.target.value as EduKey)} style={sel}>
            {EDU_KEYS.map((k) => <option key={k} value={k}>{t('ps.edu.' + k)}</option>)}
          </select></div>}
        {!hiddenProfileInputs.includes('expRecent') && factors.some((f) => f.factor === 'work' || f.factor === 'work5') && <div><div style={lbl}>{t(splitWork ? 'ps.f.expRecent' : 'ps.f.expTotal')}</div>
          <select value={profile.expRecent} onChange={(e) => set('expRecent', Number(e.target.value))} style={sel}>
            {[0, 1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n === 5 ? t('ps.yr5') : t('ps.yr', { n })}</option>)}
          </select></div>}
        {!hiddenProfileInputs.includes('expOlder') && factors.some((f) => f.factor === 'work' || f.factor === 'work610') && <div><div style={lbl}>{t('ps.f.expOlder')}</div>
          <select value={profile.expOlder} onChange={(e) => set('expOlder', Number(e.target.value))} style={sel}>
            {[0, 1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n === 5 ? t('ps.yr5') : t('ps.yr', { n })}</option>)}
          </select></div>}
        {!hiddenProfileInputs.includes('clb1') && factors.some((f) => f.factor === 'language' || f.factor === 'language1') && <div><div style={lbl}>{t('ps.f.clb1')}</div>
          <select value={profile.clb1} onChange={(e) => set('clb1', Number(e.target.value))} style={sel}>
            <option value={0}>{t('ps.clbNone')}</option>
            {[4, 5, 6, 7, 8, 9, 10].map((n) => <option key={n} value={n}>CLB {n}</option>)}
          </select></div>}
        {!hiddenProfileInputs.includes('clb2') && factors.some((f) => f.factor === 'language2') && <div><div style={lbl}>{t('ps.f.clb2')}</div>
          <select value={profile.clb2} onChange={(e) => set('clb2', Number(e.target.value))} style={sel}>
            <option value={0}>{t('ps.clbNone')}</option>
            {[4, 5, 6, 7, 8, 9, 10].map((n) => <option key={n} value={n}>CLB {n}</option>)}
          </select></div>}
        {!hiddenProfileInputs.includes('age') && factors.some((f) => f.factor === 'age') && <div><div style={lbl}>{t('ps.f.age')}</div>
          <select value={profile.age} onChange={(e) => set('age', Number(e.target.value))} style={sel}>
            {AGES.map((n) => <option key={n} value={n}>{t('ps.age.v', { n })}</option>)}
          </select></div>}
        {factors.some((f) => f.factor === 'wage' && f.kind === 'rule') ? (
          <div><div style={lbl}>{t('ps.in.wage')}</div>
            <input type="number" value={wage} min={0} onChange={(e) => setWage(Number(e.target.value))} style={sel} /></div>
        ) : null}
        {scores.some((s) => s.province === 'BC' && s.parts.some((p) => p.factor === 'area')) ? (
          <div><div style={lbl}>{t('ps.in.area')}</div>
            <select value={areaI} onChange={(e) => setAreaI(Number(e.target.value))} style={sel}>
              {factors.filter((f) => f.factor === 'area' && f.kind === 'row').map((r, i) => <option key={r.label} value={i}>{label(r.label, lang)}</option>)}
            </select></div>
        ) : null}
        {manualQuestions.map(({ name, key, rows }) => {
            return (
              <div key={key}><div style={lbl}>{t('ps.f.' + name)}</div>
                <select value={rowAnswers[key] ?? ''} onChange={(e) => setRowAnswers((m) => {
                  if (!e.target.value) { const next = { ...m }; delete next[key]; return next }
                  return { ...m, [key]: Number(e.target.value) }
                })} style={sel}>
                  <option value="">{t('ps.choose')}</option>
                  {rows.map((r) => <option key={r.seq} value={r.seq}>{label(r.label, lang)} ({r.points ?? 0})</option>)}
                </select>
              </div>
            )
          })}
      </div>
      </>)}

      {/* 各省:折叠手风琴(Frank 2026-08-10「四个省都列出来吗」)—— 一省一行(省名+制度+合计分),
          目标省默认展开;该省的加分勾选也收进展开区(勾了才算;二选一组只算一项)。
          收起行只有合计 —— 对比一眼可见,明细点开才有。 */}
      {(!targetMode || (!showQuestionnaire && extraComplete && !reviewExtra)) && (<>
      {scores.length > 1 ? (
        <div style={{ marginTop: 12, borderRadius: 9, background: '#f8fafc', color: '#64748b', fontSize: 12, lineHeight: 1.55, padding: '8px 10px' }}>
          {t('ps.compareHint')}
        </div>
      ) : null}
      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {scores.map((s) => {
          const open = s.province === resolvedOpen
          const list = bonusOf(s.province)
          const offerRow = factors.find((f) => f.province === s.province && f.factor === 'offer' && f.kind === 'row')
          const { line } = scoreAnchor(s, draws, streams[s.province] || '')
          const gap = line == null ? null : line - s.total
          return (
            <div key={s.province} style={{ border: '1px solid #e5e7eb', borderRadius: 10 }}>
              <button onClick={() => setOpenProv(open ? '__closed' : s.province)}
                style={{ display: 'flex', alignItems: 'center', gap: 9, width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '10px 12px', fontFamily: 'inherit', textAlign: 'left' }}>
                <span style={{ minWidth: 0, flex: 1 }}>
                  <span style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t('prov.' + s.province) || s.province}</span>
                  <span style={{ display: 'block', marginTop: 2, fontSize: 11, color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.system}</span>
                </span>
                <span style={{ textAlign: 'right', flexShrink: 0 }}>
                  <span style={{ display: 'block', fontSize: 15, fontWeight: 700, color: '#1d4ed8', fontVariantNumeric: 'tabular-nums' }}>
                    {s.total}{s.maxTotal ? <span style={{ fontSize: 11.5, color: '#9ca3af', fontWeight: 500 }}> / {s.maxTotal}</span> : null}
                  </span>
                  <span style={{ display: 'block', marginTop: 2, color: gap == null ? '#94a3b8' : gap <= 0 ? '#15803d' : '#b45309', fontSize: 11, fontWeight: 650, whiteSpace: 'nowrap' }}>
                    {gap == null ? t('ps.noCompareLine') : gap <= 0 ? t('ps.met') : t('ps.under', { n: gap })}
                  </span>
                </span>
                <span style={{ color: '#9ca3af', fontSize: 11, flexShrink: 0 }}>{open ? '▴' : '▾'}</span>
              </button>
              {open && (
                <div style={{ padding: '0 12px 11px' }}>
                  {!targetMode && (list.length || offerRow) ? (
                    <div style={{ marginBottom: 8 }}>
                      <div style={lbl}>{t('ps.bonus')}</div>
                      {/* 一行两个事实(条目、+N)拆成列(同 FactGrid 规矩):外层 auto-fit 决定几列,
                          条目内部 [勾选框 | 条目 | +N] 三列,+N 在同一列上对齐 */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '4px 16px' }}>
                        {offerRow ? (
                          <Tick on={hasOffer} onToggle={setHasOffer} text={label(offerRow.label, lang)} pts={offerRow.points} />
                        ) : null}
                        {list.map((b) => {
                          const key = `${s.province}:${b.factor}:${b.seq}`
                          return (
                            <Tick key={key} on={!!ticks[key]} onToggle={(v) => setTicks((m) => ({ ...m, [key]: v }))}
                              text={label(b.label, lang)} pts={b.points} />
                          )
                        })}
                      </div>
                    </div>
                  ) : null}
                  <ProvinceResult t={t} lang={lang} s={s} draws={draws} byProv={byProv}
                    switchable={s.province !== ctx.province} matchedStream={streams[s.province] || ''} factors={factors} />
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 8, lineHeight: 1.7 }}>
        <div>{t('ps.note')}</div>
        <div>{scores.map((s) => `${s.province} ${s.guideEffective ? t('ps.eff', { d: s.guideEffective }) : t('ps.asof', { d: s.fetched })}`).join('、')}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 2 }}>
          {scores.map((s) => (
            <a key={s.province} href={s.url} target="_blank" rel="noreferrer" style={{ color: '#2563eb', textDecoration: 'none' }}>{s.province} {t('ps.official')}</a>
          ))}
        </div>
      </div>
      </>)}
    </div>
  )
}

function ProvinceResult({ t, lang, s, draws, byProv, switchable, matchedStream, factors }: {
  t: TFn; lang: string; s: ProvinceScore; draws: DrawRow[]
  byProv: Record<string, { n: number; eligible: number }>; switchable: boolean
  matchedStream: string; factors: ScoreFactor[]
}) {
  // 对照锚,按可信度排序:①本岗所在通道的最近一次抽选;②官方申请门槛;
  // ③都没有 → 只摆近期各通道分数线区间,**不给差分结论**(拿别的通道的线判你差多少分是编)。
  // 打分表可以自报它属于哪条通道(system 里的括号,如「OINP EOI points (Ontario Workforce Priority stream)」)——
  // ON 已公布的分数线全是改制前已关停通道的 EOI 分,与新通道不是同一套分制,拿来对照就是错的锚。
  // 声明了通道的省,只认同一条通道的抽选;没声明的(BC SIRS / SK)照旧全取。
  const { latest, line, hasOtherStreamDraws, range } = scoreAnchor(s, draws, matchedStream)
  const gap = line == null ? null : s.total - line
  const ok = (gap ?? 0) >= 0
  // 该省有分数线、但全是别的通道的(ON:旧通道已关停)→ 说清楚为什么这里没有线,而不是含糊说「未公布」
  // 「换省」可操作的一步:该省官方给雇主 offer 记多少分 —— 拿到就 +N,直接说出合计
  const offerRow = factors.find((f) => f.province === s.province && f.factor === 'offer' && f.kind === 'row')
  const offerPart = s.parts.find((p) => p.factor === 'offer')
  const offerGain = switchable && offerRow && (offerPart?.pts ?? 0) === 0 ? (offerRow.points ?? 0) : 0
  const jobs = byProv[s.province]

  return (
    // 省名/制度/合计分都在手风琴行头上(收起也可见)—— 这里只渲展开后的明细。
    // 「/ 总分」只在官方**公布了**总分上限时才显示(行头同规矩):ON 的 OINP EOI 页只印各项分值、
    // 不印总分,拿各项相加冒充官方总分就是编数(BC 200 / SK 110 都是官方白纸黑字印着的)
    <div>
      {/* 分项:命中的官方原文标签一并显出来,好让用户核对我们选对了没有 */}
      {/* 「12 / 40」是两个事实 —— 拆成 得分 / 上限 两列(斜杠自成一列),数字才跨行对齐。
          标签列吃 max-content、数字列右对齐:两张省卡等宽,数字列因此也跨卡对齐。 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr max-content max-content', columnGap: 6, rowGap: 2, fontSize: 12, alignItems: 'baseline' }}>
        {s.parts.filter((p) => p.max > 0).map((p) => [
          <span key={p.factor + 'k'} style={{ color: '#9ca3af', gridColumn: '1 / 3' }} title={p.matched ? label(p.matched, lang) : ''}>{t('ps.f.' + p.factor) || p.factor}</span>,
          <span key={p.factor + 'v'} style={{ color: '#374151', fontWeight: 600, fontVariantNumeric: 'tabular-nums', textAlign: 'right', minWidth: 22 }}>{p.pts}</span>,
          <span key={p.factor + 'm'} style={{ color: '#9ca3af', fontVariantNumeric: 'tabular-nums' }}>/ {p.max}</span>,
        ]).flat()}
      </div>

      {s.province === 'NL' ? (
        <div style={{ marginTop: 8, padding: '7px 9px', borderRadius: 8, background: '#eff6ff', color: '#1e40af', fontSize: 11.5, lineHeight: 1.55 }}>
          {t('ps.nlScope')}
        </div>
      ) : null}

      <div style={{ marginTop: 8, padding: '8px 10px', borderRadius: 8, fontSize: 12.5, lineHeight: 1.6,
        background: line == null ? '#f9fafb' : ok ? '#f0fdf4' : '#fffbeb', color: line == null ? '#6b7280' : ok ? '#166534' : '#b45309' }}>
        {line == null ? (range ? t('ps.range', { lo: range.lo, hi: range.hi, n: range.n }) : t(hasOtherStreamDraws ? 'ps.noLineStream' : 'ps.noLine')) : (
          <>
            {latest?.score != null
              ? t('ps.cut', { n: line, date: (latest.drawDate || '').slice(0, 10), stream: latest.stream })
              : t('ps.pass', { n: line })}
            <br />
            {ok ? t('ps.over', { n: gap ?? 0 }) : t('ps.under', { n: Math.abs(gap ?? 0) })}
          </>
        )}
      </div>

      {/* 换省这一步具体怎么走:官方给的 offer 分 + 该省同职业在招数(都是事实,不评价「更容易」) */}
      {offerGain > 0 ? (
        <div style={{ fontSize: 12, color: '#374151', marginTop: 6, lineHeight: 1.6 }}>
          {t('ps.switch', { prov: t('prov.' + s.province) || s.province, n: offerGain, total: s.maxTotal ? Math.min(s.total + offerGain, s.maxTotal) : s.total + offerGain })}
        </div>
      ) : null}
      {jobs ? (
        <div style={{ fontSize: 11.5, color: '#6b7280', marginTop: 4 }}>{t('ps.openJobs', { n: jobs.n, e: jobs.eligible })}</div>
      ) : null}
    </div>
  )
}
