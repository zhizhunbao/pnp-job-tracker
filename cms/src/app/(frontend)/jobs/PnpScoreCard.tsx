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

import { QuizChecks, QuizChoices, QuizNav, QuizSub, QuizTitle } from '../quiz/QuizUI'
import type { Lang, TFn } from './i18n'
import { officialLabel as label } from '@/lib/officialLabels'
import { pullAndMerge, readScoreAnswers, writeScoreAnswers } from '@/lib/answers'
import { DEFAULT_PROFILE, EDU_KEYS, scoreProvince, streamMatches, type DrawRow, type EduKey, type ScoreFactor, type SelfProfile } from '@/lib/pnpSelfScore'

// 打分是**关于你这个人**的功能,不绑某一个岗位(Frank 2026-07-27「应该单独弄个功能吧,
// 不应该放到 pnp 弹框里面」)—— 所以只收一个轻量语境:职业(拿该省在招数)、目标省(排序)、
// 时薪与城市(BC 的两项按官方规则要用,拿不到就让用户自己填)。全是可选。
import { TabPanel, Tabs } from '../ui/Tabs'

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

// 年龄下拉的选项档(打分按选中值算,预填吸附也以此为准 —— 两处必须同一张表)
const AGES = [17, 19, 25, 30, 34, 38, 42, 45, 48, 52]

// 时薪档位行 → 用户填的时薪落在哪一行。官方档位文字自己写着区间(「Less than $20」「$20 to $24.99」
// 「$40 per hour or higher」),按它读;**读不出或读出多行就返回 null**,那就照旧问用户 —— 前端不替官方编档。
const wageRowAt = (rows: ScoreFactor[], wage: number): ScoreFactor | null => {
  const hits = rows.filter((r) => {
    const nums = (r.label.match(/\d+(?:\.\d+)?/g) || []).map(Number)
    if (!nums.length) return false
    if (/less than|under/i.test(r.label)) return wage < nums[0]
    if (/or higher|or more|and above/i.test(r.label)) return wage >= nums[0]
    return nums.length >= 2 && wage >= nums[0] && wage <= nums[1]
  })
  return hits.length === 1 ? hits[0] : null
}

type ExtraChoice = { key: string; text: string; active: boolean; apply: () => void }
type ExtraCheck = { key: string; text: string; pts: number | null; on: boolean; toggle: (on: boolean) => void }
/** 一屏一题。三种题型共用同一副外观(题干 / 选项 / 底部动作条),区别只在选项形态 */
type ExtraQuestion = {
  key: string; title: string; sub?: string
  choices?: ExtraChoice[]                       // 单选:官方分值表的档位
  checks?: ExtraCheck[]                         // 多选:该省的加分项(一省一屏,不是一条一屏)
  number?: { value: number; set: (value: number) => void }
  /** 条件格子回显用的短名。单条加分项的 title 是整句问句(「你是否符合:…」),摆进格子要的是条件本身 */
  echoLabel?: string
}
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
  hiddenProfileInputs = [], limits, targetMode = false, questionnaireActive,
  onQuestionnaireProgress, onQuestionnaireComplete, onQuestionnaireBack, onQuestionnaireAnswers, focusQuestion }: {
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
  /** 基础卷已经问过**范围**的条件(如 CLB 6-7):精确题只在范围内出选项;范围里只剩一个值就整题不问 ——
      同一件事不问第二遍是效率,范围外的值也不该出现在选项里(那是在请人推翻自己刚给的答案)。 */
  limits?: Partial<Record<'clb1' | 'clb2' | 'expRecent' | 'expOlder', number[]>>
  /** 只评当前职位所在省:标题与说明改成“补充条件”,不再暗示跨省排行榜。 */
  targetMode?: boolean
  /** PR 主问卷选完省份后继续使用同一题区；关闭时保留本组件状态并显示结果。 */
  questionnaireActive?: boolean
  onQuestionnaireProgress?: (progress: { done: number; total: number }) => void
  onQuestionnaireComplete?: () => void
  onQuestionnaireBack?: () => void
  /** 逐题答案回显(2026-08-13 Frank:「全都算成基本信息」)—— 分值表的题与基础卷一视同仁,
   *  页面把它们摆进同一片条件格子。没答的 filled=false,值留空由页面写「待填写」;
   *  key 供「点哪格进哪题」回跳(focusQuestion);prov=''为全省共用,其余按省分 tab。 */
  onQuestionnaireAnswers?: (rows: { key: string; prov: string; label: string; value: string; filled: boolean }[]) => void
  /** 点条件格直达那道题:nonce 变一次跳一次(只传 key 的话,点同一格第二次就不动了) */
  focusQuestion?: { key: string; nonce: number } | null
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
    // workMonths(AB EOI 按月计经验)走引擎自动换算,进这张排除清单 —— 否则又把经验问第二遍
    .filter((name) => !['work', 'work5', 'work610', 'workMonths', 'education', 'language', 'language1', 'language2', 'age', 'offer'].includes(name))
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
    // 范围外的预填吸回范围内(范围只剩一个值时这一题不会再问,所以这里必须已经是那个值)
    for (const [k, allowed] of Object.entries(limits || {})) {
      // Object.entries 在 Partial 上会连 undefined 一起给出来(TS 那边看不见),先挡一道
      if (!allowed?.length) continue
      if (!allowed.includes(p[k as 'clb1'] as number)) p[k as 'clb1'] = allowed[0]
    }
    return p
  })
  const set = <K extends keyof SelfProfile>(k: K, v: SelfProfile[K]) => setProfile((p) => ({ ...p, [k]: v }))
  // 分值卡答案持久化(2026-08-15 Frank「学历以下的字段都有这个问题」):此前三个 map 只活在
  // state,刷新全丢。初始从 lib/answers 读档,变更即写回(键=用户自身条件,跨岗位跨页面通用)
  const [ticks, setTicks] = useState<Record<string, boolean>>(() => readScoreAnswers().ticks)
  const [wage, setWage] = useState<number>(() => Math.round(ctx.hourly ?? 0))
  // 保守默认:知道城市才猜地区,否则默认 Area 1(0 分)—— 不许用有利默认把分数吹上去
  const [areaI, setAreaI] = useState<number>(() => (ctx.city ? guessArea(ctx.city) : 0))
  const [hasOffer, setHasOffer] = useState<boolean>(() => !!ctx.hasOffer)
  // 官方表中没有通用自动映射的档位(如 ON 工作许可/加拿大收入)也必须有输入入口。
  // 空值=未回答=0 分;选择后直接使用该官方行的 points,不在前端另造规则。
  const [rowAnswers, setRowAnswers] = useState<Record<string, number>>(() => readScoreAnswers().rowAnswers)
  const [extraQuestionIndex, setExtraQuestionIndex] = useState(0)
  const [extraAnswered, setExtraAnswered] = useState<Record<string, boolean>>(() => readScoreAnswers().extraAnswered)
  useEffect(() => { writeScoreAnswers({ ticks, rowAnswers, extraAnswered }) }, [ticks, rowAnswers, extraAnswered])
  // 答案档入库(2026-08-15):挂载时拉服务端档合并(新者胜;未登录 401 无感)。必须排在
  // 上面持久化 effect 之后:同内容回写不记时刻(writeScoreAnswers 内容比对),拉档才不会被
  // 挂载即写误判成「本地更新」。拉回来有变化 → 三个 map 重建,后续改动照旧防抖同步。
  useEffect(() => {
    pullAndMerge().then((changed) => {
      if (!changed) return
      const s = readScoreAnswers()
      setTicks(s.ticks); setRowAnswers(s.rowAnswers); setExtraAnswered(s.extraAnswered)
    }).catch(() => { /* 静默 */ })
  }, [])

  // PR 评估页把官方表字段收敛成逐题选择。这里只换输入形态，不改任何分值或匹配规则；
  // 时薪是 BC 每整元计分，不能粗暴切区间，所以仍是单题数字输入。
  const extraQuestions: ExtraQuestion[] = []
  // 省名**恒显示**,不再只在多省时出:只选一个省时整屏找不到「BC」两个字,用户不知道这题在问谁的规矩
  const scopedSub = (province: string) => t('prov.' + province) || province
  // 行级适用范围:官方给了 NOC 清单的行,不在清单里就**不问**。
  // 实例:BC「执业资格 +5」原文写明只对 11 类职业成立(牙助/幼教/护理助理/技工…),
  // 干软件的被问到这一条既多点一次、又误导(2026-08-11 Frank 点名)。清单在数据层展开好,
  // 这里只做集合判断 —— 规则串坏了就照问,宁可多问一句,不静默吞掉用户可能有的 5 分。
  const rowApplies = (r: ScoreFactor) => {
    if (!r.rule) return true
    try {
      const list = (JSON.parse(r.rule) as { appliesNoc?: Record<string, string> }).appliesNoc
      return !list || !!list[ctx.noc || '']
    } catch { return true }
  }
  // 基础卷答过范围的条件,精确题只在范围内给选项;范围内只剩一个值 = 已经问过了,不再占一屏
  const inRange = (k: 'clb1' | 'clb2' | 'expRecent' | 'expOlder', all: number[]) => {
    const allowed = limits?.[k]
    return allowed ? all.filter((n) => allowed.includes(n)) : all
  }
  const addChoices = (key: string, title: string, choices: ExtraChoice[], sub?: string, echoLabel?: string) => {
    if (choices.length > 1) extraQuestions.push({ key, title, sub, choices, echoLabel })
  }
  if (!hiddenProfileInputs.includes('edu') && factors.some((f) => f.factor === 'education')) {
    addChoices('profile:edu', t('ps.f.education'), EDU_KEYS.map((k) => ({
      key: k, text: t('ps.edu.' + k), active: profile.edu === k, apply: () => set('edu', k as EduKey),
    })))
  }
  if (!hiddenProfileInputs.includes('expRecent') && factors.some((f) => f.factor === 'work' || f.factor === 'work5')) {
    addChoices('profile:expRecent', t(splitWork ? 'ps.f.expRecent' : 'ps.f.expTotal'), inRange('expRecent', [0, 1, 2, 3, 4, 5]).map((n) => ({
      key: String(n), text: n === 5 ? t('ps.yr5') : t('ps.yr', { n }), active: profile.expRecent === n, apply: () => set('expRecent', n),
    })))
  }
  if (!hiddenProfileInputs.includes('expOlder') && factors.some((f) => f.factor === 'work' || f.factor === 'work610')) {
    addChoices('profile:expOlder', t('ps.f.expOlder'), inRange('expOlder', [0, 1, 2, 3, 4, 5]).map((n) => ({
      key: String(n), text: n === 5 ? t('ps.yr5') : t('ps.yr', { n }), active: profile.expOlder === n, apply: () => set('expOlder', n),
    })))
  }
  if (!hiddenProfileInputs.includes('clb1') && factors.some((f) => f.factor === 'language' || f.factor === 'language1')) {
    addChoices('profile:clb1', t('ps.f.clb1'), inRange('clb1', [0, 4, 5, 6, 7, 8, 9, 10]).map((n) => ({
      key: String(n), text: n ? `CLB ${n}` : t('ps.clbNone'), active: profile.clb1 === n, apply: () => set('clb1', n),
    })))
  }
  if (!hiddenProfileInputs.includes('clb2') && factors.some((f) => f.factor === 'language2')) {
    addChoices('profile:clb2', t('ps.f.clb2'), inRange('clb2', [0, 4, 5, 6, 7, 8, 9, 10]).map((n) => ({
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
    extraQuestions.push({ key: 'job:wage', title: t('ps.in.wage'), sub: scopedSub(wageProvince), number: { value: wage, set: setWage } })
  }
  const bcAreaRows = factors.filter((f) => f.province === 'BC' && f.factor === 'area' && f.kind === 'row')
  if (bcAreaRows.length) {
    addChoices('job:bcArea', t('ps.in.area'), bcAreaRows.map((r, i) => ({
      key: String(r.seq), text: label(r.label, lang), active: areaI === i, apply: () => setAreaI(i),
    })), scopedSub('BC'))
  }
  for (const { prov, name, key, rows } of manualQuestions) {
    // 时薪已经用数字问过一遍(BC 按每整元计分),别再让人从档位里挑同一个数 ——
    // 落哪一档由官方档位文字自己说了算(只认唯一命中,读不出区间就照旧问)
    if (name === 'wage' && wageProvince && wageRowAt(rows, wage) != null) continue
    addChoices(key, t('ps.f.' + name), rows.map((r) => ({
      key: String(r.seq), text: label(r.label, lang), active: rowAnswers[key] === r.seq,
      apply: () => setRowAnswers((m) => ({ ...m, [key]: r.seq })),
    })), scopedSub(prov))
  }
  // 加分项:**一屏一组、每屏 ≤4 条**(2026-08-11 Frank「一页问题小于等于 4,太多看麻了,而且要相关」)。
  // 组 = 官方表自己的因素(经验 / 学历 / 语言 / 地区),不是我随手划的 —— 一省七条摊一屏时
  // 标题只能写成「以下哪些符合你的情况」,**这个问句没有主语**,Frank 自己都没看懂。
  // 现在标题就是组名、小注是省名(恒显示),一屏内的几条必定同源。
  for (const prov of provinces) {
    const groups: { factor: string; rows: ScoreFactor[] }[] = []
    const offer = factors.find((f) => f.province === prov && f.factor === 'offer' && f.kind === 'row')
    // 基础卷答过「手上的 offer」就不再问(2026-08-14 offer 合一,与语言/经验同批):
    // ctx.hasOffer 有值 = 答过(有/没有都算),答案直接进算分;undefined = 没答或「不清楚」,照问
    if (offer && ctx.hasOffer === undefined) groups.push({ factor: 'offer', rows: [offer] })
    const bonus = factors.filter((f) => f.province === prov && f.kind === 'bonus').filter(rowApplies)
    for (const name of Array.from(new Set(bonus.map((b) => b.factor)))) {
      groups.push({ factor: name, rows: bonus.filter((b) => b.factor === name) })
    }
    for (const g of groups) {
      // 现有最大的组是 3 条;这道闸是给以后加省的数据留的,别让某个省一屏冒出 8 条
      for (let i = 0; i < g.rows.length; i += 4) {
        const chunk = g.rows.slice(i, i + 4)
        const isOffer = g.factor === 'offer'
        const tickKey = (r: ScoreFactor) => (isOffer ? `${prov}:offer` : `${prov}:${r.factor}:${r.seq}`)
        const isOn = (r: ScoreFactor) => (isOffer ? hasOffer : !!ticks[tickKey(r)])
        // 官方原文「…, or」= 与上一条二选一(xorPrev)。把连成一串的 xor 归成同一簇:
        // 勾上一条就把同簇的另一条放下 —— 算分本来就只取簇内最大的那条,UI 放任两个都勾
        // 等于显示与口径分叉(用户勾了 8 和 6,以为 14,实际只算 8)
        const cluster: number[] = []
        chunk.forEach((r, idx) => cluster.push(idx === 0 ? 0 : (r.xorPrev ? cluster[idx - 1] : cluster[idx - 1] + 1)))
        const setOn = (r: ScoreFactor, on: boolean) => {
          if (isOffer) { setHasOffer(on); return }
          const mine = cluster[chunk.indexOf(r)]
          setTicks((m) => {
            const next = { ...m, [tickKey(r)]: on }
            if (on) chunk.forEach((sib, idx) => { if (sib !== r && cluster[idx] === mine) next[tickKey(sib)] = false })
            return next
          })
        }
        const screenKey = `${prov}:${g.factor}:${i}`
        if (chunk.length === 1) {
          // 只有一条的组不摆一个孤零零的勾选框 —— 退回是/否单选,标题就是那一条
          const r = chunk[0]
          addChoices(screenKey, t('ps.q.meet', { condition: label(r.label, lang) }), [
            { key: 'yes', text: t('ps.yes'), active: isOn(r), apply: () => setOn(r, true) },
            { key: 'no', text: t('ps.no'), active: !isOn(r), apply: () => setOn(r, false) },
          ], t('ps.bonusOf', { prov: t('prov.' + prov) || prov }), label(r.label, lang))
        } else {
          extraQuestions.push({
            key: screenKey,
            title: t('ps.f.' + g.factor) || g.factor,
            sub: t('ps.bonusOf', { prov: t('prov.' + prov) || prov }),
            checks: chunk.map((r) => ({
              key: tickKey(r), text: label(r.label, lang), pts: r.points,
              on: isOn(r), toggle: (on: boolean) => setOn(r, on),
            })),
          })
        }
      }
    }
  }
  const extraQuestionCount = extraQuestions.length
  const extraAnsweredCount = extraQuestions.filter((q) => extraAnswered[q.key]).length
  const extraComplete = extraQuestions.every((q) => extraAnswered[q.key])
  const extraIndex = Math.min(extraQuestionIndex, Math.max(extraQuestionCount - 1, 0))
  const activeExtraQuestion = extraQuestions[extraIndex]
  const activeAnswered = !!activeExtraQuestion && (!activeExtraQuestion.choices || !!extraAnswered[activeExtraQuestion.key])
  useEffect(() => {
    onQuestionnaireProgress?.({ done: extraAnsweredCount, total: extraQuestionCount })
  }, [extraAnsweredCount, extraQuestionCount, onQuestionnaireProgress])
  // 逐题答案回显上抛(与计数同口径:翻过/选过才算答了)。用签名串做依赖 ——
  // echoRows 每轮渲染都是新数组,直接进依赖就是每帧给父级 setState 一次,循环重渲。
  // 每题归属的省(''=全省共用):页面按省分 tab 摆格子(2026-08-13 Frank「按省份划分,tab 切换」)。
  // 省码从题 key 派生:profile:* 共用;job:wage/bcArea 是岗位事实题,归各自的省;其余 key 首段就是省码
  const provOfKey = (key: string) =>
    key.startsWith('profile:') ? '' : key === 'job:wage' ? (wageProvince ?? '') : key === 'job:bcArea' ? 'BC' : key.split(':')[0]
  const echoRows = extraQuestions.map((q) => {
    const filled = !!extraAnswered[q.key]
    const value = !filled ? '' : q.choices
      ? (q.choices.find((c) => c.active)?.text ?? '')
      : q.checks
        ? (q.checks.filter((c) => c.on).map((c) => c.text).join(lang === 'zh' ? '、' : ', ') || t('ps.no'))
        : q.number ? `$${q.number.value}/hr` : ''
    // 省名不再拼进标签(tab 上就是省名);加分项组保留「加分项」前缀 —— MB 的风险评估
    // 同时是档位题和加分勾选,没这个前缀两个格子同名。bonus 题的 key 恒为 省:因素:批 三段。
    const short = q.echoLabel || q.title
    const isBonus = q.key.split(':').length === 3
    const bonusWord = t('ps.bonusOf', { prov: '' }).trim()
    return { key: q.key, prov: provOfKey(q.key), label: isBonus ? `${bonusWord} ${short}` : short, value, filled }
  })
  const echoSig = JSON.stringify(echoRows)
  useEffect(() => {
    onQuestionnaireAnswers?.(JSON.parse(echoSig) as { key: string; prov: string; label: string; value: string; filled: boolean }[])
  }, [echoSig, onQuestionnaireAnswers])
  useEffect(() => {
    if (showQuestionnaire && extraQuestionCount === 0) onQuestionnaireComplete?.()
  }, [extraQuestionCount, onQuestionnaireComplete, showQuestionnaire])
  // 中途退出再进来:落在**第一道没答的题**,不让人从头再翻一遍答过的
  useEffect(() => {
    if (!showQuestionnaire) return
    const first = extraQuestions.findIndex((q) => !extraAnswered[q.key])
    if (first > 0) setExtraQuestionIndex(first)
    // 只在进入答题段的那一下对位;进来之后的翻页归用户的上一题/下一题管
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showQuestionnaire])
  // 点条件格直达那道题。**必须声明在「第一道没答的题」那个 effect 之后**:两者常在同一次提交里
  // 都触发(点格子=开段+定位),同序执行时后声明的赢 —— 反过来就是「点哪格都落第一道没答的」。
  useEffect(() => {
    if (!focusQuestion) return
    const i = extraQuestions.findIndex((q) => q.key === focusQuestion.key)
    if (i >= 0) setExtraQuestionIndex(i)
    // 只认 nonce:questions 数组每轮渲染都是新引用,进依赖就成了每帧重定位
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusQuestion?.nonce])
  // 选中**不自动跳**(2026-07-31 拍板,全站答题同一条规矩):自动跳会在选中的瞬间换掉整屏,
  // 看着就是「闪一下」,也没法改主意。翻页永远由用户按右下角那颗按钮。
  const pickExtra = (question: ExtraQuestion, apply: () => void) => {
    apply()
    setExtraAnswered((m) => ({ ...m, [question.key]: true }))
  }
  const nextExtra = (question: ExtraQuestion) => {
    setExtraAnswered((m) => ({ ...m, [question.key]: true }))
    if (extraIndex < extraQuestionCount - 1) setExtraQuestionIndex(extraIndex + 1)
    else onQuestionnaireComplete?.()
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
      // 时薪档:已经用数字问过就按数字落档(问卷里同步跳过了这一题),不靠用户再选一次
      if (name === 'wage' && mine.some((f) => f.factor === 'wage' && f.kind === 'rule') === false
        && factors.some((f) => f.factor === 'wage' && f.kind === 'rule')) {
        const hit = wageRowAt(mine.filter((f) => f.factor === 'wage' && f.kind === 'row'), wage)
        if (hit) { overrides[name] = { pts: hit.points ?? 0, matched: hit.label, source: 'job' }; continue }
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

  const asking = !!(inputs && targetMode && showQuestionnaire)
  // 结果区(含标题)在答完之前整块不出:各省估分是自愿的第二段,没答就该只留外层那个入口,
  // 不许剩一个「各省估分」的空标题在那儿(标题在、内容不在 = 看着像加载坏了)
  const showResults = !targetMode || (!showQuestionnaire && extraComplete)
  return (
    // 卡壳(边框/圆角/内边距)由外层 MODAL_CARD 提供 —— 这里再画一层就是卡中卡
    <div className={asking ? 'qzFill' : undefined}>
      {/* 答题中不再自带标题与进度:题卡外层已经有一个「你的条件 · 已答 n/N」和一条进度条,
          这里再来一套就是同一件事说两遍,而且两条进度还各走各的(2026-08-10 Frank 点名) */}
      {showResults && (
        // 制度名不再跟在标题后面串一行(375 下折两行还对不齐)——各省折叠行里各自带
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 10px' }}>
          {t(targetMode ? 'ps.resultTitle' : 'ps.title')}
        </h2>
      )}

      {/* 官方分值表要的条件也走答题壳的同一副皮(题干 / 选项卡片 / 底部动作条),
          不再自己画一层卡中卡 —— 「统一风格」的做法是共用组件,不是照着调样式 */}
      {asking && activeExtraQuestion && (
        <>
          <QuizTitle>{activeExtraQuestion.title}</QuizTitle>
          {activeExtraQuestion.sub ? <QuizSub>{activeExtraQuestion.sub}</QuizSub> : null}
          {activeExtraQuestion.choices ? (
            <QuizChoices name={activeExtraQuestion.key} lang={lang as Lang}
              choices={activeExtraQuestion.choices.map((c) => ({ value: c.key, text: c.text }))}
              value={extraAnswered[activeExtraQuestion.key] ? activeExtraQuestion.choices.find((c) => c.active)?.key : undefined}
              onPick={(key) => {
                const choice = activeExtraQuestion.choices?.find((c) => c.key === key)
                if (choice) pickExtra(activeExtraQuestion, choice.apply)
              }} />
          ) : activeExtraQuestion.checks ? (
            <QuizChecks items={activeExtraQuestion.checks} />
          ) : activeExtraQuestion.number ? (
            <input type="number" min={0} value={activeExtraQuestion.number.value}
              onChange={(e) => activeExtraQuestion.number?.set(Number(e.target.value))}
              aria-label={activeExtraQuestion.title}
              style={{ ...sel, height: 44, maxWidth: 220, fontSize: 15 }} />
          ) : null}
          {/* 第一屏的「上一题」上面没有题了 —— 它退回的是结果页,所以写「返回」不写「上一题」。
              全卷已答满、又不在最后一题时,「下一题」旁边给一颗「完成」直接收卷
              (2026-08-13 Frank:「有的时候只是改一个答案」);最后一题的主钮本来就是「完成」,不重复给。 */}
          <QuizNav prevLabel={extraIndex > 0 ? t('plan.prev') : t('ps.back')}
            nextLabel={extraIndex < extraQuestionCount - 1 ? t('plan.next') : t('ps.finish')}
            onPrev={extraIndex > 0 ? () => setExtraQuestionIndex(extraIndex - 1) : onQuestionnaireBack}
            onNext={() => nextExtra(activeExtraQuestion)} nextDisabled={!activeAnswered}
            doneLabel={extraComplete && extraIndex < extraQuestionCount - 1 ? t('ps.finish') : undefined}
            onDone={onQuestionnaireComplete}
            hint={activeExtraQuestion.checks ? t('ps.q.multiHint') : undefined} />
        </>
      )}

      {/* 你的条件 —— 一套答案,各省按各自官方表折算。
          inputs=false(决策页):不渲下拉 —— 答题是唯一输入面,分数由答案自动算(Frank 2026-08-10);
          时薪/工作地区是岗位事实,走 ctx,不问人 */}
      {inputs && !targetMode && (<>
      <div style={lbl}>{t('ps.you')}</div>
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

      {/* 各省:**选项卡**(Frank 2026-08-12:「还是需要一个通用的选项卡组件,不能用按钮代替」+
          「只给估分功能加选项卡吧」)。原来是折叠手风琴 —— 一省一行点开看明细,与 08-11「折叠撤掉」那条
          背道而驰,四个省堆下来也读不出对比。改成一省一个选项卡:选中省的合计分与明细直接摊开。
          🔴 勾选(ticks/hasOffer)存在**本组件**的 state 里,不在面板里 —— 所以面板可以随切随卸,答案不丢。 */}
      {showResults && (<>
      <div style={{ marginTop: 12 }}>
        <Tabs
          idPrefix="ps-prov"
          ariaLabel={t('ps.resultTitle')}
          value={resolvedOpen || scores[0].province}
          onChange={setOpenProv}
          // 选项卡上只放省名:合计分在选中省的面板里就是最大的那个数,标签上再挂一遍是同一件事说两遍
          items={scores.map((s) => ({ key: s.province, label: t('prov.' + s.province) || s.province }))}
        />
      </div>
      {scores.map((s) => {
        const open = s.province === (resolvedOpen || scores[0].province)
        const list = bonusOf(s.province)
        const offerRow = factors.find((f) => f.province === s.province && f.factor === 'offer' && f.kind === 'row')
        const { line } = scoreAnchor(s, draws, streams[s.province] || '')
        const gap = line == null ? null : line - s.total
        return (
          <TabPanel key={s.province} idPrefix="ps-prov" tabKey={s.province} active={open}>
            <div style={{ padding: '12px 0 0' }}>
              {/* 该省合计分 + 与最近一轮抽选线的差距(选项卡上只放合计,差距摆这儿) */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 22, fontWeight: 700, color: '#1d4ed8', fontVariantNumeric: 'tabular-nums' }}>
                  {s.total}{s.maxTotal ? <span style={{ fontSize: 13, color: '#9ca3af', fontWeight: 500 }}> / {s.maxTotal}</span> : null}
                </span>
                <span style={{ fontSize: 12.5, color: '#9ca3af' }}>{s.system}</span>
                <span style={{ marginLeft: 'auto', color: gap == null ? '#94a3b8' : gap <= 0 ? '#15803d' : '#b45309', fontSize: 12.5, fontWeight: 650, whiteSpace: 'nowrap' }}>
                  {gap == null ? t('ps.noCompareLine') : gap <= 0 ? t('ps.met') : t('ps.under', { n: gap })}
                </span>
              </div>
              {!targetMode && (list.length || offerRow) ? (
                <div style={{ margin: '10px 0 8px' }}>
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
          </TabPanel>
        )
      })}

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
