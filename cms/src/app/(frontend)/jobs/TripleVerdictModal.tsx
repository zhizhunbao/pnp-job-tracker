'use client'
// #287 批D · 一键三合一判定区(设计 docs/design/一键三合一判定-20260809.md §5;
// 2026-08-10 并入 /plan/pr 主页面,不再在页面上自动套第二层弹窗。版式沿用三项文字胶囊条、免费行 ✓+官方 quote+出处日期、
// 锁区=行名可见值打码+ProCard、无档案态=行名+「—」+建档 CTA+预填问句、入口卡=标题+按钮零解释。
//
// 分层不在这里:付费闸在服务端(/api/triple-verdict 只给非 Pro 下发 gate/tier/key),
// 本组件拿到什么渲什么 —— locked 行天然没有 params,想漏都没得漏。
// 文案四闸:零逗号标题 / 无解释句 / 术语=职业匹配·雇主资质·你这边 / 值一行放下。
// 三关第三关 2026-08-12 由「个人条件」改称**「你这边」**(审计 A3):页面上那张问卷回显卡叫「你的条件」,
// 两块同屏名字打架 —— 这一关是**判定**(你这边达不达标),不是又一个输入面。
import { useEffect, useRef, useState } from 'react'

import { AuthModal } from './AuthForm'
import { makeT, reqStreamDisplay, streamDisplay, type Lang, type TFn } from './i18n'
import { UpgradeModal } from './UpgradeModal'
import { CARD_MD, CARD_SHELL, ProCard } from '../ui/primitives'
import { track } from '@/lib/track'
import { readAnswers, toEngineAnswers } from '@/lib/answers'

// ── wire(与 /api/triple-verdict 的响应一一对应)─────────────────────────────
type TvEv = { url?: string; fetched?: string; label?: string }
type TvRow = {
  gate: 'occupation' | 'employer' | 'person'
  tier: 'free' | 'paid'
  key: string
  locked?: boolean
  state?: 'pass' | 'gap' | 'excluded' | 'unknown' | 'info'
  params?: Record<string, string | number | boolean | string[]>
  quote?: string
  evidence?: TvEv
  followups?: string[]
}
/** 一句可复述的结论(服务端 tripleVerdict.conclude 拼好;前端只取词,不合成) */
type TvConclusion = {
  kind: 'ok' | 'blocked' | 'needs-info' | 'excluded' | 'not-collected'
  key: string
  params?: Record<string, string | number | boolean | string[]>
  pathway?: string
  gate?: string
}
type TvWire = {
  ok: boolean
  noc: string | null
  nocName: string | null
  teer: number | null
  province: string
  conclusion?: TvConclusion
  availability: string
  loggedIn: boolean
  pro: boolean
  hasProfile: boolean
  rows: TvRow[]
}

// ── 入口件(四处共用;版式 = se287 拍板稿)────────────────────────────────────
/** 职位板胶囊排尾的入口 pill(蓝系,与判定胶囊同排但按钮感明显) */
export const TV_PILL: React.CSSProperties = {
  border: '1px solid #bfdbfe', borderRadius: 999, padding: '2px 12px', fontSize: 12,
  background: '#eff6ff', color: '#1d4ed8', fontWeight: 600, whiteSpace: 'nowrap', cursor: 'pointer',
}

/** 弹框/详情页的入口卡:标题(详情页)或卡头(弹框)+ 主按钮,零解释句 */
export function TvEntryCard({ t, lg, onOpen }: { t: TFn; lg?: boolean; onOpen: () => void }) {
  return (
    <div style={{ ...CARD_SHELL, padding: lg ? '14px 16px' : '12px 16px', margin: lg ? '12px 0 0' : '0 0 14px' }}>
      <div style={{ fontSize: lg ? 14.5 : 13.5, fontWeight: 700, color: '#111827', marginBottom: lg ? 10 : 8 }}>
        {t(lg ? 'tv.entryTitle' : 'tv.head')}
      </div>
      <button onClick={onOpen} style={{
        background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer',
        padding: lg ? '11px 20px' : '7px 16px', fontSize: lg ? 14 : 13, fontWeight: 600, whiteSpace: 'nowrap',
      }}>{t('tv.cta')}</button>
    </div>
  )
}

// ── 行渲染(key+params → 三语文案;与 tripleVerdict §6.1 行清单一一对应)───────
const P = (v: unknown): string => (v == null ? '' : String(v))

function provDisp(t: TFn, code: string): string {
  const full = t('prov.' + code)
  return full === 'prov.' + code ? code : full
}

/** TEER 档位表压成区间:[0,1,2,3] → 「0–3」;[0,1,4] → 「0–1、4」(no-dot-separator:枚举用顿号) */
function teerRange(list: string[]): string {
  const ns = list.map(Number).filter((n) => Number.isInteger(n)).sort((a, b) => a - b)
  const parts: string[] = []
  for (let i = 0; i < ns.length;) {
    let j = i
    while (j + 1 < ns.length && ns[j + 1] === ns[j] + 1) j++
    parts.push(i === j ? String(ns[i]) : `${ns[i]}–${ns[j]}`)
    i = j + 1
  }
  return parts.join('、')
}

/**
 * 免费/Pro 行 → {main, sub?}。unknown 的段落语义照组装器:判不了就说判不了,不编。
 * `icon` 覆盖状态符号:**本站粗筛的行不给对错符号**(设计 §跨步规矩 B1)——
 * 绿勾是「官方门槛行判出来」才配有的东西,粗筛只配一个中性圆点。
 */
function rowText(t: TFn, row: TvRow): { main: string; sub?: string; icon?: string } | null {
  const p = row.params ?? {}
  const prov = provDisp(t, P(p.prov))
  switch (true) {
    case row.key === 'tv.occ.listed':
      return { main: t('tv.occ.listed', { list: streamDisplay(t, P(p.list)) }) }
    case row.key === 'tv.occ.excluded':
      return { main: t('tv.occ.excluded', { list: streamDisplay(t, P(p.list)) }) }
    case row.key === 'tv.occ.notListed': {
      // 定向清单只绑它自己那条通道 → 适用范围写进主文案(哪张清单、多少个职业),
      // 不再一句「未命中任何具名清单」判死。**不配安慰句**:「不在清单上不等于走不了」是废话,清单名+职业数已经把范围说清了。
      const n = Number(p.listCount ?? 0)
      if (!n) return { main: t('tv.occ.notListedNone', { prov }) }
      return {
        main: n === 1
          ? t('tv.occ.notListedOne', { list: streamDisplay(t, P(p.list)), count: P(p.count) })
          : t('tv.occ.notListedN', { prov, n }),
      }
    }
    case row.key === 'tv.occ.teer': {
      if (row.state === 'unknown') return { main: t('tv.occ.teerNa'), icon: 'unknown' }
      const main = t(p.coarsePass === false ? 'tv.occ.teerCoarseNo' : 'tv.occ.teerCoarse', { teer: P(p.teer), prov })
      const scopeTeers = Array.isArray(p.scopeTeers) ? (p.scopeTeers as string[]) : []
      const sub = p.scopeStream && scopeTeers.length
        ? t('tv.occ.teerScope', { stream: reqStreamDisplay(P(p.scopeStream), t.lang), teers: teerRange(scopeTeers) })
        : p.scoped === false ? t('tv.occ.teerNoScope', { prov }) : undefined
      return { main, sub, icon: 'coarse' }
    }
    // 「你这边」的免费裁决行:被卡住的那道闸(与结论句同源;逐项差值仍在锁区)
    case row.key === 'tv.you.gate':
      return { main: t('tv.you.gateRow', { gate: t('tv.gate.' + P(p.gate)) }) }
    // 本站没收录门槛的通道:说清是**我们的窟窿**,并指路官网(≠「官方不要求」,≠「你不行」)
    case row.key === 'tv.you.notCollected': {
      const routes = (Array.isArray(p.routes) ? (p.routes as string[]) : []).map((k) => t('jpw.p.' + k))
      return routes.length ? { main: t('tv.you.notCollectedRow', { routes: routes.join(t('sep')) }) } : null
    }
    case row.key === 'tv.emp.designated':
      return { main: t('tv.emp.designated', { program: P(p.program) }), sub: t('tv.emp.listedAs', { name: P(p.name) }) }
    // 多配:名录里同名法人多家(连锁加盟),只报家数不点名——点名等于替用户认了一家不可证的雇主
    case row.key === 'tv.emp.designatedMulti':
      return { main: t('tv.emp.desigMulti', { program: P(p.program) || 'AIP', count: P(p.count) }), sub: t('tv.emp.desigMultiSub') }
    case row.key === 'tv.emp.designationUnknown':
      return { main: t('tv.emp.desigNa') }
    case row.key === 'tv.emp.years':
      return row.state === 'unknown'
        ? { main: t('tv.emp.yearsNa', { need: P(p.need), prov }) }
        : { main: t('tv.emp.yearsHave', { have: P(p.have) }), sub: t('tv.emp.yearsNeed', { need: P(p.need), prov }) }
    case row.key === 'tv.emp.staff':
      return row.state === 'unknown'
        ? { main: t('tv.emp.staffNa', { need: P(p.need), prov }) }
        : { main: t('tv.emp.staffHave', { have: P(p.have) }), sub: t('tv.emp.staffNeed', { need: P(p.need), prov }) }
    case row.key === 'tv.emp.staffFact':
      return { main: t('tv.emp.staffFact', { staff: P(p.staff) }), sub: t('tv.emp.estimate') }
    case row.key === 'tv.emp.publicSector':
      return { main: t('tv.emp.public') }
    case row.key === 'tv.person.language':
      return row.state === 'unknown' ? { main: t('tv.pe.langNa', { need: P(p.need) }) }
        : { main: t(row.state === 'pass' ? 'tv.pe.langPass' : 'tv.pe.langGap', { need: P(p.need), have: P(p.have) }) }
    case row.key === 'tv.person.experience':
      return row.state === 'unknown' ? { main: t('tv.pe.expNa', { need: P(p.need) }) }
        : { main: t(row.state === 'pass' ? 'tv.pe.expPass' : 'tv.pe.expGap', { need: P(p.need), have: P(p.have), short: P(p.short) }) }
    case row.key.startsWith('tv.person.'):
      // 其余 factor(income/funds…)通用句:need+unit 全来自官方行,不硬翻单位
      return row.state === 'unknown' ? { main: t('tv.pe.genNa', { need: P(p.need), unit: P(p.unit) }) }
        : { main: t(row.state === 'pass' ? 'tv.pe.genPass' : 'tv.pe.genGap', { need: P(p.need), unit: P(p.unit), have: P(p.have) }) }
    case row.key === 'tv.time.permit':
      return row.state === 'unknown' ? { main: t('tv.time.na') } : { main: t('tv.time.months', { months: P(p.months) }) }
    case row.key === 'tv.compare.listed':
      return { main: t('tv.cmp.listed', { prov, list: streamDisplay(t, P(p.list)) }), sub: t('tv.cmp.basis', { prov: provDisp(t, P(p.basisProv)) }) }
    case row.key === 'tv.compare.notListed':
      return { main: t('tv.cmp.notListed', { prov }) }
    case row.key === 'tv.compare.noTarget':
      return { main: t('tv.cmp.noTarget') }
    case row.key === 'tv.route.fastest': {
      if (row.state === 'unknown') return { main: t('tv.route.na') }
      const keys = Array.isArray(p.keys) ? (p.keys as string[]) : []
      const names = keys.map((k) => t('jpw.p.' + k))
      return keys.length > 1
        ? { main: t('tv.route.tied', { routes: names.join(t('sep')) }) }
        : { main: t('tv.route.one', { route: names[0] ?? '' }) }
    }
    case row.key === 'tv.next.employer': {
      if (row.state === 'unknown') return { main: t('tv.next.na') }
      const lmiaKnown = p.lmiaKnown === true
      const n = Number(p.lmiaSameNoc ?? 0)
      const sub = lmiaKnown ? (n > 0 ? t('tv.next.lmiaN', { n }) : t('tv.next.lmia0')) : t('tv.next.lmiaNa')
      return p.program ? { main: t('tv.next.viaProgram', { program: P(p.program) }), sub } : { main: sub }
    }
    default:
      return null
  }
}

/** 付费行显示顺序(效果图定稿:语言→经验→其余个人→时间窗→换省→比路→雇主下一步) */
const PAID_ORDER = (key: string): number =>
  key === 'tv.person.language' ? 1 : key === 'tv.person.experience' ? 2 : key.startsWith('tv.person.') ? 3
  : key === 'tv.time.permit' ? 4 : key.startsWith('tv.compare.') ? 5 : key === 'tv.route.fastest' ? 6 : 7

/** 锁行/无档案行的行名(付费行只带 key 时的关别标签) */
function lockLabel(t: TFn, key: string): string {
  if (key === 'tv.person.language') return t('tv.k.language')
  if (key === 'tv.person.experience') return t('tv.k.experience')
  if (key.startsWith('tv.person.')) return t('tv.k.person')
  if (key === 'tv.time.permit') return t('tv.k.permit')
  if (key.startsWith('tv.compare.')) return t('tv.k.compare')
  if (key === 'tv.route.fastest') return t('tv.k.route')
  if (key === 'tv.next.employer') return t('tv.k.next')
  return t('tv.k.person')
}

// ── 样式(token 与 JobsTable MODAL_CARD / primitives 同源)────────────────────
const CARD: React.CSSProperties = CARD_MD   // 白卡壳全站一份(ui/primitives),这里只留个本地别名
const CARD_HEAD: React.CSSProperties = { fontSize: 13.5, fontWeight: 700, color: '#111827', marginBottom: 6 }
/** 卡标题:与 PrDecisionView 的 H2 同一档(16/700)—— 全页所有卡标题一个字号 */
const CARD_TITLE: React.CSSProperties = { fontSize: 16, fontWeight: 700, color: '#111827' }
const ICON: Record<string, { bg: string; fg: string; ch: string }> = {
  pass: { bg: '#dcfce7', fg: '#15803d', ch: '✓' },
  gap: { bg: '#fef3c7', fg: '#b45309', ch: '!' },
  excluded: { bg: '#fee2e2', fg: '#b91c1c', ch: '✗' },
  unknown: { bg: '#f3f4f6', fg: '#6b7280', ch: '?' },
  info: { bg: '#eff6ff', fg: '#1e40af', ch: 'i' },
  // 本站粗筛:中性圆点,既不是对也不是错 —— 对错符号只归官方门槛行
  coarse: { bg: 'transparent', fg: '#9ca3af', ch: '•' },
}
/** 抬头行的「改答案」= 链接态按钮(它不是动作主角,主角是下面的三关与下一步) */
const LINK_BTN: React.CSSProperties = {
  border: 'none', background: 'none', padding: 0, fontSize: 12, color: '#2563eb',
  cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
}
const PRIMARY_SM: React.CSSProperties = {
  background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px',
  fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
}
const GHOST_SM: React.CSSProperties = {
  background: '#fff', color: '#374151', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 16px',
  fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
}

/**
 * 结论句取词。**一个字都不在这里合成** —— kind/gate/params 全是服务端确定性层给的,
 * 这里只负责三语与人话名(通道名走 jpw.p.*、闸名走 tv.gate.*、档案槽走 tv.slot.*)。
 */
function conclusionText(t: TFn, c: TvConclusion): string {
  const p = c.params ?? {}
  const prov = provDisp(t, P(p.prov))
  // 缺槽既可能是三类闸(offer/境内身份/加拿大学历)也可能是档案槽(语言/经验/职业/现居省)——
  // 先查闸名再查槽名,两处都没有的**不出现**(宁可少点一样,也不把内部键名摆给用户看)
  // **槽名优先**(tv.slot.*:用户听得懂的问法「有没有 offer」),闸名兜底(tv.gate.*:用在「你还缺 X」那句)
  const slotName = (s: string) => {
    const k = t('tv.slot.' + s)
    if (!k.startsWith('tv.slot.')) return k
    const g = t('tv.gate.' + s)
    return g.startsWith('tv.gate.') ? '' : g
  }
  const slots = (Array.isArray(p.slots) ? (p.slots as string[]) : []).map(slotName).filter(Boolean)
  switch (c.kind) {
    case 'ok': return t('tv.sum.ok', { route: t('jpw.p.' + P(p.route)) })
    // 语言/自雇这两道闸不是「缺一样东西」:他答过 CLB,只是没到门槛;自雇经历也在,只是不计。
    // 一句「你还缺语言成绩」会让答过题的人以为我们没读到他的答案(Frank 实拍点名)。
    case 'blocked':
      if (c.gate === 'language' && p.need) return t('tv.sum.blockedLang', { need: P(p.need) })
      if (c.gate === 'selfEmployed') return t('tv.sum.blockedSelf')
      return t('tv.sum.blocked', { gate: t('tv.gate.' + P(c.gate)) })
    // 缺哪个槽点不出名字时,不许含糊说「缺资料」—— 退回「本站未收录」那句(谁的窟窿说清楚)
    case 'needs-info': return slots.length
      ? t('tv.sum.needsInfo', { slots: slots.join(t('sep')) })
      : t('tv.sum.notCollected', { prov })
    case 'excluded': return t('tv.sum.excluded', { prov, list: streamDisplay(t, P(p.list)) })
    default: return t('tv.sum.notCollected', { prov })
  }
}

function VRow({ state, main, sub, quote, ev, t }: { state: string; main: string; sub?: string; quote?: string; ev?: TvEv; t: TFn }) {
  const ic = ICON[state] ?? ICON.info
  const host = ev?.url ? ev.url.replace(/^https?:\/\//, '').split('/')[0] : ''
  return (
    <div style={{ display: 'flex', gap: 8, padding: '7px 0', borderBottom: '1px solid #f3f4f6', alignItems: 'flex-start' }}>
      <span style={{ flexShrink: 0, width: 18, height: 18, borderRadius: '50%', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2, background: ic.bg, color: ic.fg }}>{ic.ch}</span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13.5, color: '#111827', lineHeight: 1.55 }}>{main}</div>
        {sub ? <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.55, marginTop: 1 }}>{sub}</div> : null}
        {quote ? <div style={{ fontSize: 11.5, color: '#9ca3af', lineHeight: 1.55, marginTop: 3 }}>{quote}</div> : null}
        {ev?.url ? (
          <div style={{ fontSize: 11.5, marginTop: 2 }}>
            <a href={ev.url} target="_blank" rel="noreferrer" style={{ color: '#2563eb', textDecoration: 'none' }}>{host} ↗</a>
            {ev.fetched ? <span style={{ color: '#9ca3af', marginLeft: 8 }}>{ev.fetched}</span> : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}

// ── 主组件 ──────────────────────────────────────────────────────────────────
//
// 2026-08-12 B2「第三步重排」整卡重做(Frank:「这一部分先删了,重新设计」)。形状照
// design/PR评估页三步重设计-20260812.md §2 第三步与 §3 效果图:
//   抬头(岗位+雇主+城市省)→ **一句可复述的结论** → 三关(职业匹配/雇主资质/你这边)→ 下一步动作
// 撤掉的:三项胶囊条(结论句上来了,三个词的胶囊只是同一件事说两遍)、
//         「身份判定 + 岗位名大标题」那套抬头(岗位名降成灰字一行,主角让给结论句)。
// 带岗态**不再重复摆问卷卡**(A1/A3 的结构那半):答过几项收成抬头下面一行 +「改答案」。
// 付费块从三关中间挪到**下一步之后**(C4:免费事实与结论在前,可执行推演在后);
// **免费/付费口径一个字没动** —— 结论句与「你这边」那条闸来自 pathVerdict,与同一页上
// 免费的「你的初步方案」同源;逐项差值(差几分/差几个月)仍在 paid 行里锁着。
export function TripleVerdictPanel({ job, lang, profileComplete = false, refreshKey = 0, initial, answered, answerTotal, answerList = [], planSlot, onBuildProfile, onEditAnswers }: {
  job: { id: string | number; title: string; company: string; city: string; province: string }
  lang: Lang
  profileComplete?: boolean
  refreshKey?: number
  /** 服务端先算好的那份 wire(/plan/pr SSR):首屏直接有内容,不再盯骨架。
   *  它按「无本地答案」算 —— 客户端读到本地答案后再 POST 刷一次,刷不出新东西就是原样。 */
  initial?: unknown
  /** 已答项数 / 总项数 + 已答项的回显(带岗态问卷卡整张并进本卡,数与值都由页面给) */
  answered?: number
  answerTotal?: number
  /** 8 项条件全传(答过的与没答的都要,Frank:「不然用户怎么对比?如果要修改答案呢?」) */
  answerList?: { label: string; value: string; filled: boolean }[]
  /** 第三张卡的位置留给页面的「你的初步方案」(Frank 2026-08-12 定的卡序:
   *  ① 这份工作 ② 你的条件 ③ 你的初步方案 ④⑤⑥ 三关 ⑦ 付费)。页面给什么就摆什么,面板不管它怎么算。 */
  planSlot?: React.ReactNode
  onBuildProfile?: () => void
  onEditAnswers?: () => void
}) {
  const t = makeT(lang)
  // SSR 那份直接当初值:首屏就有结论与三关,骨架只在**纯客户端入口**(职位板弹窗)才出现
  const [d, setD] = useState<TvWire | null>((initial as TvWire) ?? null)
  const [err, setErr] = useState(false)
  const [up, setUp] = useState<false | 'up' | 'auth'>(false)
  const lockSeen = useRef(false)

  useEffect(() => {
    track('tv-open')
    let dead = false
    // 服务端已经算过一版(无本地答案那版)。**本地一条答案都没有时就别再问一遍** ——
    // 同样的入参问两次,只会让首屏白闪一下再渲成一样的东西。
    const local = toEngineAnswers(readAnswers())
    const hasLocal = Object.values(local).some((v) => Array.isArray(v) ? v.length > 0 : v != null && v !== '' && v !== 0)
    if (initial && !hasLocal && !refreshKey) return
    // POST 带上本地答案(2026-08-12 Frank「匿名也可以访问」):没登录也判得出个人条件。
    // 服务端逐槽以落档的档案优先,本地答案只补它缺的那几样;付费闸与此无关(锁不锁看是不是 Pro)。
    fetch('/api/triple-verdict', {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job: job.id, answers: local }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((x) => { if (!dead) { if (x?.ok) setD(x) ; else setErr(true) } })
      .catch(() => { if (!dead) setErr(true) })
    return () => { dead = true }
  }, [job.id, refreshKey])

  const free = d?.rows.filter((r) => r.tier === 'free') ?? []
  const occRows = free.filter((r) => r.gate === 'occupation')
  const empRows = free.filter((r) => r.gate === 'employer')
  const youFree = free.filter((r) => r.gate === 'person')
  const paid = (d?.rows.filter((r) => r.tier === 'paid') ?? []).slice().sort((a, b) => PAID_ORDER(a.key) - PAID_ORDER(b.key))
  // 锁区一行一个关别标签(compare 可多行 → 去重;计数用去重后的行数,与显示一致)
  const paidLabels = Array.from(new Set(paid.map((r) => lockLabel(t, r.key))))
  const hasProfile = !!d?.hasProfile || profileComplete

  // 付费位曝光(漏斗:锁区/建档位第一次渲染记一次)
  useEffect(() => {
    if (d && paid.length && !lockSeen.current) { lockSeen.current = true; track('tv-lock-seen', { kind: d.pro ? 'pro' : hasProfile ? 'locked' : 'noprofile' }) }
  }, [d, hasProfile, paid.length])

  const askChat = () => {
    track('tv-build-profile')
    window.dispatchEvent(new CustomEvent('o2p:chat-open', { detail: { prefill: t('tv.ask', { co: job.company }) } }))
  }

  const rows = (list: TvRow[]) => list.map((r, i) => {
    const v = rowText(t, r)
    return v ? <VRow key={r.key + i} state={v.icon ?? r.state ?? 'info'} main={v.main} sub={v.sub} quote={r.quote} ev={r.evidence} t={t} /> : null
  })

  // 一段一张卡,每张自包含(Frank 2026-08-12:「section 分多个卡片,每个卡片都是自包含的」)——
  // 卡内自带标题与出处,读到哪一张都不必回头看上一张。
  const Card = ({ title, action, children }: { title?: string; action?: React.ReactNode; children: React.ReactNode }) => (
    <div style={{ ...CARD, padding: '14px 18px 12px', margin: '0 0 10px' }}>
      {/* 卡头:标题左、动作右上角(全站按钮同一款,不再是行内蓝链接) */}
      {title || action ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div style={{ ...CARD_TITLE, flex: 1, minWidth: 0 }}>{title}</div>
          {action}
        </div>
      ) : null}
      {children}
    </div>
  )

  return (
    <>
      {/* 事实瓦片栅格:本职位与申请人条件两张卡共用一套 */}
      <style>{'.tvAnswers{display:grid;gap:8px;grid-template-columns:repeat(4,minmax(0,1fr))}@media(max-width:640px){.tvAnswers{grid-template-columns:repeat(2,minmax(0,1fr))}}'}</style>
      {/* ① 判定结论:**整页的头条,单独一张卡**(Frank 2026-08-12:「这个要单独一个卡片放到最上面」)。
          句子由确定性层拼好(服务端 conclusion),这里只取词 —— 一个字都不在前端合成。 */}
      <Card title={t('tv.c.verdict')}>
        {d?.conclusion ? (
          <h3 style={{ margin: 0, fontSize: 19.5, lineHeight: 1.45, color: '#111827' }}>{conclusionText(t, d.conclusion)}</h3>
        ) : !d && !err ? (
          <div aria-hidden style={{ height: 24, borderRadius: 4, background: '#f1f3f5', maxWidth: 420 }} />
        ) : null}
        {err ? <div style={{ fontSize: 13, color: '#6b7280' }}>{t('tv.err')}</div> : null}
      </Card>

      {/* ② 本职位:判的是哪一份岗。事实摆成与「申请人条件」同款瓦片 —— 同一页上同一种东西一个长相 */}
      <Card title={t('tv.c.job')} action={
        <a href={`/jobs/${job.id}`} onClick={() => track('tv-open-job')} style={{ ...GHOST_SM, textDecoration: 'none', display: 'inline-block' }}>{t('tv.c.jobOpen')}</a>
      }>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', lineHeight: 1.45 }}>{job.title}</div>
        <div className="tvAnswers" style={{ marginTop: 10 }}>
          {[
            [t('tv.f.employer'), job.company],
            [t('tv.f.place'), `${job.city} ${provDisp(t, job.province)}`.trim()],
            [t('tv.f.noc'), d?.noc ? `${d.noc}${d.nocName ? ` ${d.nocName}` : ''}` : '—'],
            [t('tv.f.teer'), d?.teer == null ? '—' : `TEER ${d.teer}`],
          ].map(([label, value]) => (
            <div key={label} style={{ minWidth: 0, background: '#f8fafc', border: '1px solid #eef2f7', borderRadius: 9, padding: '6px 9px' }}>
              <div style={{ color: '#9ca3af', fontSize: 11, lineHeight: 1.35 }}>{label}</div>
              <div title={value} style={{ color: '#374151', fontSize: 12.5, fontWeight: 600, lineHeight: 1.4, wordBreak: 'break-word' }}>{value}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* ② 你的条件:判定拿什么算的 + 8 项全列,每格可点进答题 */}
      {d ? (
        <Card title={t('dp.quiz')} action={hasProfile
          ? <button onClick={onEditAnswers ?? onBuildProfile} style={GHOST_SM}>{t('tv.edit')}</button>
          : <button onClick={onBuildProfile ?? askChat} style={PRIMARY_SM}>{t('tv.build')}</button>}>
          {answerList.length ? (
            <>
              <div className="tvAnswers">
                {answerList.map((a) => (
                  <button key={a.label} onClick={onEditAnswers ?? onBuildProfile} style={{
                    minWidth: 0, textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit',
                    background: a.filled ? '#f8fafc' : '#fafafa',
                    border: `1px ${a.filled ? 'solid #eef2f7' : 'dashed #cbd5e1'}`,
                    borderRadius: 9, padding: '6px 9px',
                  }}>
                    <div style={{ color: '#9ca3af', fontSize: 11, lineHeight: 1.35 }}>{a.label}</div>
                    <div title={a.value} style={{ color: a.filled ? '#374151' : '#94a3b8', fontSize: 12.5, fontWeight: a.filled ? 600 : 400, lineHeight: 1.4, wordBreak: 'break-word' }}>{a.value}</div>
                  </button>
                ))}
              </div>
            </>
          ) : null}
        </Card>
      ) : null}

      {/* ③ 你的初步方案(页面给的整块) */}
      {planSlot}

      {/* 加载占位(铁律:加载区必占位)。SSR 进来时 d 已经有值,这块根本不出 */}
      {!d && !err ? (
        <div style={{ ...CARD, padding: '14px 18px' }} aria-hidden>
          {[0, 1, 2].map((i) => <div key={i} style={{ height: 12, borderRadius: 4, background: '#f1f3f5', margin: '14px 0' }} />)}
        </div>
      ) : null}

      {/* ②③④ 三关:一关一张卡,各自带标题、行、官方出处 */}
      {occRows.length ? <Card title={t('tv.g.occ')}>{rows(occRows)}</Card> : null}
      {empRows.length ? <Card title={t('tv.g.emp')}>{rows(empRows)}</Card> : null}
      {d ? (
        <Card title={t('tv.g.youCard')}>
          {d.pro && d.hasProfile ? rows([...youFree, ...paid]) : youFree.length ? rows(youFree) : (
            // 没有拦路的闸时**不许含糊**:能走就说没有已知门槛拦着,判不了就说判不了,没答就说没答
            <div style={{ fontSize: 13, color: '#6b7280', padding: '7px 0' }}>
              {!hasProfile ? t('tv.you.unanswered') : d.conclusion?.kind === 'ok' ? t('tv.you.clear') : t('tv.you.na')}
            </div>
          )}
        </Card>
      ) : null}

      {/* 下一步(设计 §2 第三步「完成判据 = 用户知道下一步做什么」) */}
      {d ? (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '0 0 10px', padding: '0 2px' }}>
          <a href={`/jobs?q=${encodeURIComponent(job.company)}`} onClick={() => track('tv-next-employer')}
            style={{ ...PRIMARY_SM, textDecoration: 'none', display: 'inline-block' }}>{t('tv.next.jobs')}</a>
          <a href="/plan/pr" onClick={() => track('tv-next-allpaths')}
            style={{ ...GHOST_SM, textDecoration: 'none', display: 'inline-block' }}>{t('tv.next.paths')}</a>
        </div>
      ) : null}

      {/* ⑤ 付费位:可执行推演(差多少 / 先补哪一项 / 多久能到),摆在结论与动作之后 */}
      {d && !d.pro && paid.length ? (
        <Card title={t('tv.paidHead')}>
          <div style={{ position: 'relative', marginTop: 2 }}>
            {paidLabels.map((k, i) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '7px 0', borderBottom: '1px solid #f3f4f6', alignItems: 'baseline' }}>
                <span style={{ fontSize: 13, color: '#374151', whiteSpace: 'nowrap' }}>{k}</span>
                {/* 打码占位:纹理假(真内容服务端没下发),LockedRows 同款手法 */}
                <span aria-hidden style={{ fontSize: 13.5, color: '#9ca3af', filter: 'blur(5px)', userSelect: 'none', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                  {['结论文字在这一行', '差值与结论在此行', '一行结论文字示例'][i % 3]}
                </span>
              </div>
            ))}
            <ProCard overlay={paidLabels.length >= 4} text={t('tv.lockN', { n: paidLabels.length })} cta={t('pro.unlock')}
              onClick={() => { track('tv-pro-click'); setUp(d.loggedIn ? 'up' : 'auth') }} />
          </div>
        </Card>
      ) : null}

      {d ? <div style={{ fontSize: 11.5, color: '#9ca3af', lineHeight: 1.6, margin: '0 0 10px', padding: '0 2px' }}>{t('jpw.foot')}</div> : null}

      {up === 'up' && <UpgradeModal t={t} reason={t('tv.lockN', { n: paidLabels.length })} onClose={() => setUp(false)} />}
      {up === 'auth' && <AuthModal t={t} mode="register" onClose={() => setUp(false)} onDone={() => window.location.reload()} />}
    </>
  )
}
