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
import { useEffect, useState } from 'react'

import { makeT, reqStreamDisplay, streamDisplay, type Lang, type TFn } from '@/lib/i18n'

import { ConditionGrid } from './ConditionGrid'
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
  // #326:NOC 职业名中/韩译(服务端 tripleWire 带下;旧缓存响应可能没有 → 可选)
  nocTitleZh?: string | null
  nocTitleKo?: string | null
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
    <div className="card" style={{ padding: lg ? '14px 16px' : '12px 16px', margin: lg ? '12px 0 0' : '0 0 14px' }}>
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
    case row.key === 'tv.occ.noList':
      // 官方不设职业清单(引擎已举证:资格页逐条无职业清单条目)——与「本站未收录」是反义,别混。
      // icon 借 coarse 通道:不渲符号、正文深灰(2026-08-14 Frank「感叹号去掉」——info 的 i 标撤)
      return { main: t('tv.occ.noList', { prov }), icon: 'coarse' }
    case row.key === 'tv.occ.teer': {
      if (row.state === 'unknown') return { main: t('tv.occ.teerNa'), icon: 'unknown' }
      const main = t(p.coarsePass === false ? 'tv.occ.teerCoarseNo' : 'tv.occ.teerCoarse', { teer: P(p.teer), prov })
      const scopeTeers = Array.isArray(p.scopeTeers) ? (p.scopeTeers as string[]) : []
      const sub = p.scopeStream && scopeTeers.length
        ? t('tv.occ.teerScope', { stream: reqStreamDisplay(P(p.scopeStream), t.lang), teers: teerRange(scopeTeers) })
        : p.scoped === false ? t('tv.occ.teerNoScope', { prov }) : undefined
      // 2026-08-14 Frank「满足绿勾不满足红叉」:不再强制中性圆点,吃引擎的 pass/excluded 态
      return { main, sub }
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
    // 未知态收成两行瓦片(2026-08-13 Frank:「改成两行」):标签 + 一行内容(门槛与未收录用逗号同句,
    // 不再拆说明行、不用破折号)
    case row.key === 'tv.emp.years':
      return row.state === 'unknown'
        ? { main: t('tv.emp.yearsNa', { need: P(p.need), prov }) }
        : { main: t('tv.emp.yearsHave', { have: P(p.have) }), sub: t('tv.emp.yearsNeed', { need: P(p.need), prov }) }
    case row.key === 'tv.emp.staff':
      return row.state === 'unknown'
        ? { main: t('tv.emp.staffNa', { need: P(p.need), prov }) }
        : { main: t('tv.emp.staffHave', { have: P(p.have) }), sub: t('tv.emp.staffNeed', { need: P(p.need), prov }) }
    case row.key === 'tv.emp.revenue':
      // 公司营业额无源(08-10 永久结案)→ 恒「未收录」;门槛数字按 08-14 极简令不进正文
      return { main: t('tv.emp.revenueNa') }
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

// ── 样式 ──────────────────────
const CARD_HEAD: React.CSSProperties = { fontSize: 13.5, fontWeight: 700, color: '#111827', marginBottom: 6 }
/** 卡标题:与 Decision 的 H2 同一档(16/700)—— 全页所有卡标题一个字号 */
const CARD_TITLE: React.CSSProperties = { fontSize: 16, fontWeight: 700, color: '#111827' }
// 一段一张卡,每张自包含(Frank 2026-08-12:「section 分多个卡片,每个卡片都是自包含的」)——
// 卡内自带标题与出处,读到哪一张都不必回头看上一张。
// **必须在模块级**:先前定义在组件体内,每次渲染都是一个新的组件类型,React 按类型对不上就把
// 整棵子树卸了重挂 —— 纯展示内容看不出来,但估分卡(scoreSlot)挂进来后每次重挂 = 答案清零。
const Card = ({ title, action, children }: { title?: React.ReactNode; action?: React.ReactNode; children: React.ReactNode }) => (
  <div className="card" style={{ padding: '14px 18px 12px', margin: '0 0 10px' }}>
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

// conclusionText(结论句取词)已随「判定结论」头条卡一并删除(2026-08-14 Frank「没有用」)——
// 服务端 conclusion 字段照发(埋点/顾问仍消费),前端不再渲染。

function VRow({ state, label, main, sub }: { state: string; label: string; main: string; sub?: string }) {
  const ic = ICON[state] ?? ICON.info
  // 结论文字按状态配色(2026-08-13 Frank:「瓦片那种风格不是很清晰吗?还可以给瓦片的文字配色」);
  // 中性初筛(coarse)不配灰 —— 结论是主文案,#9ca3af 当主文案就是没墨了,退回深灰。
  // info 态 2026-08-16 Frank「感叹号去掉 颜色去掉」:摆事实不报警,深灰无符号(符号见下面的跳过表)
  const color = state === 'coarse' || state === 'info' ? '#374151' : ic.fg
  return (
    // 判定瓦片 = 与事实瓦片同一套解剖(Frank 拍板瓦片式):灰标签在上、加粗结论在下、说明降级,
    // 与事实瓦片同一副四列栅格(Frank:「不需要这么长」)。区别只有一处:结论带状态色 +
    // ✓/!/✗/? 符号(色弱用户靠符号兜底,可访问性不上砧板)。
    // 官方英文原句与出处链接/抓取日期**不再渲染**(2026-08-13 Frank:「这部分没有必要显示吧」)——
    // quote-anchored 依据仍在判定引擎与接口数据里,只是不占用户的屏。
    <div style={{ minWidth: 0, background: '#f8fafc', border: '1px solid #eef2f7', borderRadius: 9, padding: '7px 10px 8px' }}>
      <div style={{ color: '#9ca3af', fontSize: 11, lineHeight: 1.35, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color, lineHeight: 1.5 }}>
        {/* 中性点/问号/信息号不渲染(2026-08-13「前面不需要问号吧」+ 2026-08-16「感叹号去掉」——
            事实态措辞自解释,符号是再说一遍);✓/!/✗ 留着,那是判定行的扫读信号 */}
        {ic.ch !== '•' && ic.ch !== '?' && ic.ch !== 'i' ? <span aria-hidden style={{ marginRight: 5 }}>{ic.ch}</span> : null}
        {main}
      </div>
      {sub ? <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.55, marginTop: 2 }}>{sub}</div> : null}
    </div>
  )
}

/** 事实瓦片(职位名/雇主/地点/职业代码/职业层级):与判定瓦片同族,只是不配状态色。
 *  解剖与 VRow **逐值相同**(2026-08-14 Frank「英文和中文一行也没对齐」——先前内边距/字号/行高
 *  各差一点,同一行里事实瓦片与判定瓦片基线错位) */
function FactTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ minWidth: 0, background: '#f8fafc', border: '1px solid #eef2f7', borderRadius: 9, padding: '7px 10px 8px' }}>
      <div style={{ color: '#9ca3af', fontSize: 11, lineHeight: 1.35, marginBottom: 2 }}>{label}</div>
      <div title={value} style={{ color: '#374151', fontSize: 13, fontWeight: 600, lineHeight: 1.5, wordBreak: 'break-word' }}>{value}</div>
      {/* 灰字小注(#326 帖面原名):形态照 VRow 的 sub,一字不改 —— 同族瓦片一个长相 */}
      {sub ? <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.55, marginTop: 2, wordBreak: 'break-word' }}>{sub}</div> : null}
    </div>
  )
}

/** 判定瓦片的灰标签:行键 → 关别短名(个人侧沿用付费锁区那套 tv.k.*,职业/雇主侧新增) */
function rowLabel(t: TFn, key: string): string {
  if (key === 'tv.occ.teer') return t('tv.k.screen')
  if (key.startsWith('tv.occ.')) return t('tv.k.occList')
  if (key.startsWith('tv.emp.designat')) return t('tv.k.desig')
  if (key === 'tv.emp.years') return t('tv.k.years')
  if (key === 'tv.emp.revenue') return t('tv.k.revenue')
  if (key.startsWith('tv.emp.staff')) return t('tv.k.staff')
  if (key === 'tv.emp.publicSector') return t('tv.k.public')
  if (key === 'tv.you.notCollected') return t('tv.k.collect')
  return lockLabel(t, key)
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
export function TripleVerdictPanel({ job, lang, profileComplete = false, refreshKey = 0, initial, countPills, answerList = [], planSlot, scoreSlot, onBuildProfile, onEditAnswers }: {
  job: { id: string | number; title: string; company: string; city: string; province: string }
  lang: Lang
  profileComplete?: boolean
  refreshKey?: number
  /** 服务端先算好的那份 wire(/plan/pr SSR):首屏直接有内容,不再盯骨架。
   *  它按「无本地答案」算 —— 客户端读到本地答案后再 POST 刷一次,刷不出新东西就是原样。 */
  initial?: unknown
  /** 卡②标题旁的计数胶囊(已答 n/N · 估分 n/N,两段各报各的)—— 与无岗态摘要卡同一份,页面给什么摆什么 */
  countPills?: React.ReactNode
  /** 全部条件全传(答过的与没答的都要,Frank:「不然用户怎么对比?如果要修改答案呢?」)。
   *  key = 这格对应哪道题,点格子经 onEditAnswers(key) 直达;prov=''共用,其余按省分 tab。 */
  answerList?: { key: string; prov: string; label: string; value: string; filled: boolean }[]
  /** 第三张卡的位置留给页面的「你的初步方案」(Frank 2026-08-12 定的卡序:
   *  ① 这份工作 ② 你的条件 ③ 你的初步方案 ④⑤⑥ 三关 ⑦ 付费)。页面给什么就摆什么,面板不管它怎么算。 */
  planSlot?: React.ReactNode
  /** 各省估分整段(入口/题目/结果)并进卡②「你的条件」尾部(2026-08-13 Frank:「合并到申请人条件
   *  模块,不需要单独一个框」)。页面给什么摆什么;它内部有本地答题 state,别包在会重挂的容器里。 */
  scoreSlot?: React.ReactNode
  onBuildProfile?: () => void
  /** 打开问卷:不带 key 落第一道没答的题,带 key(点了条件格)直达那道题 */
  onEditAnswers?: (key?: string) => void
}) {
  const t = makeT(lang)
  // SSR 那份直接当初值:首屏就有结论与三关,骨架只在**纯客户端入口**(职位板弹窗)才出现
  const [d, setD] = useState<TvWire | null>((initial as TvWire) ?? null)
  const [err, setErr] = useState(false)

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
  // 本站初筛行 2026-08-14 Frank 拍板整块删除(「这个删掉」;此前同日刚从中性圆点改成绿勾红叉,
  // 一并作废)——引擎照常产出(金标测试与顾问消费),前端不再渲染
  const occRows = free.filter((r) => r.gate === 'occupation' && r.key !== 'tv.occ.teer')
  const empRows = free.filter((r) => r.gate === 'employer')
  const hasProfile = !!d?.hasProfile || profileComplete

  const askChat = () => {
    track('tv-build-profile')
    window.dispatchEvent(new CustomEvent('o2p:chat-open', { detail: { prefill: t('tv.ask', { co: job.company }) } }))
  }

  // 判定瓦片与事实瓦片同一副栅格(2026-08-13 Frank:「这个也不需要这么长啊」——
  // 一句结论占一整行太空,进四列格,内容多长格子多宽)。
  // rowTiles = 裸瓦片数组(要跟事实瓦片同挤一副栅格时用);rows = 自带栅格的整块。
  const rowTiles = (list: TvRow[]) => list.map((r, i) => {
    const v = rowText(t, r)
    return v ? <VRow key={r.key + i} state={v.icon ?? r.state ?? 'info'} label={rowLabel(t, r.key)} main={v.main} sub={v.sub} /> : null
  })
  // rows() 壳已不需要:唯一调用点(本职位判定行)并进事实瓦片同一栅格后直接用 rowTiles

  return (
    <>
      {/* 事实瓦片栅格:本职位与申请人条件两张卡共用一套 */}
      <style>{'.tvAnswers{display:grid;gap:8px;grid-template-columns:repeat(4,minmax(0,1fr))}@media(max-width:640px){.tvAnswers{grid-template-columns:repeat(2,minmax(0,1fr))}}'}</style>
      {/* ①「判定结论」头条卡 2026-08-14 Frank 拍板删(「这个先删了吧 没有用」,覆盖 08-12 的
          「单独一个卡片放到最上面」)——结论句与下方逐项判定重复,只留错误留痕行 */}
      {err ? <div style={{ fontSize: 13, color: '#6b7280' }}>{t('tv.err')}</div> : null}

      {/* ② 本职位:判的是哪一份岗。事实摆成与「申请人条件」同款瓦片 —— 同一页上同一种东西一个长相。
          职业匹配的判定行并在同卡尾部(2026-08-13 Frank:「这两个也合一起吧」)——
          它们判的就是这份岗的职业,不另立一张卡。 */}
      <Card title={t('tv.c.job')} action={
        <a href={`/jobs/${job.id}`} onClick={() => track('tv-open-job')} style={{ ...GHOST_SM, textDecoration: 'none', display: 'inline-block' }}>{t('tv.c.jobOpen')}</a>
      }>
        {/* 职位名收成第一块瓦片(2026-08-13 Frank:「为什么有两个 title」——
            卡标题「本职位」下再挂一行加粗岗位名,看着就是双标题);
            职业代码值写「NOC 63200」(同日 Frank 点名),职业英文名不再跟在码后。
            雇主/地点两块归「雇主资质」卡(同日 Frank:「这两个是不是应该放到雇主那里」) */}
        {/* 事实瓦片与判定瓦片同一副四列栅格**流式续排**(2026-08-14 Frank「为什么这个三个卡片一行」——
            先前两组各自起行,3+2;并进一个栅格后 4+1,与申请人条件卡同节奏) */}
        <div className="tvAnswers" style={{ marginTop: 4 }}>
          {/* #326:zh/ko 界面主文案=NOC 职业名对应语言(帖面标题无逐帖译文,官方职业名库里现成),
              帖面英文原名降灰注;en 界面/无译名照旧原名做主文案。标签仍是「职位名」。 */}
          {(() => {
            const nl = (lang === 'zh' ? d?.nocTitleZh : lang === 'ko' ? d?.nocTitleKo : '') || ''
            return nl && nl.toLowerCase() !== (job.title || '').toLowerCase()
              ? <FactTile label={t('tv.f.title')} value={nl} sub={job.title} />
              : <FactTile label={t('tv.f.title')} value={job.title} />
          })()}
          <FactTile label={t('tv.f.noc')} value={d?.noc ? `NOC ${d.noc}` : '—'} />
          <FactTile label={t('tv.f.teer')} value={d?.teer == null ? '—' : `TEER ${d.teer}`} />
          {rowTiles(occRows)}
        </div>
      </Card>

      {/* 雇主资质紧跟本职位(2026-08-13 Frank:「放到申请人条件上面」)——
          岗位侧的事实连排讲完,再进入申请人自己的条件。雇主/地点事实瓦片与判定瓦片同一副栅格。 */}
      <Card title={t('tv.g.emp')} action={
        <a href={`/jobs?q=${encodeURIComponent(job.company)}`} onClick={() => track('tv-next-employer')}
          style={{ ...GHOST_SM, textDecoration: 'none', display: 'inline-block' }}>{t('tv.next.jobs')}</a>
      }>
        <div className="tvAnswers">
          <FactTile label={t('tv.f.employer')} value={job.company} />
          {/* 市/省分开两块(2026-08-14 Frank「拆成 省 市 两个卡片」——一格塞两级地名是杂糅) */}
          <FactTile label={t('tv.f.city')} value={job.city || '—'} />
          <FactTile label={t('tv.f.prov')} value={provDisp(t, job.province)} />
          {rowTiles(empRows)}
        </div>
      </Card>

      {/* ② 你的条件:判定拿什么算的 + 8 项全列,每格可点进答题;标题旁挂两段计数(8 基础 + 9 估分) */}
      {d ? (
        <Card title={countPills
          ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>{t('dp.quiz')}{countPills}</span>
          : t('dp.quiz')} action={hasProfile
          ? <button onClick={() => (onEditAnswers ?? onBuildProfile)?.()} style={GHOST_SM}>{t('tv.edit')}</button>
          : <button onClick={onBuildProfile ?? askChat} style={PRIMARY_SM}>{t('tv.build')}</button>}>
          {answerList.length ? (
            <ConditionGrid rows={answerList} provLabel={(code) => provDisp(t, code)} ariaLabel={t('dp.prov')} idPrefix="tvCond"
              onTile={(key) => onEditAnswers ? onEditAnswers(key) : onBuildProfile?.()} />
          ) : null}
          {scoreSlot}
        </Card>
      ) : null}

      {/* ③ 你的初步方案(页面给的整块) */}
      {planSlot}

      {/* 加载占位(铁律:加载区必占位)。SSR 进来时 d 已经有值,这块根本不出 */}
      {!d && !err ? (
        <div className="card" style={{ padding: '14px 18px' }} aria-hidden>
          {[0, 1, 2].map((i) => <div key={i} style={{ height: 12, borderRadius: 4, background: '#f1f3f5', margin: '14px 0' }} />)}
        </div>
      ) : null}

      {/* 裸「下一步」动作条 2026-08-13 Frank 点名(「这两个是什么东西」)—— 两个无标题按钮浮在
          卡片之间,自包含决令下成了孤儿:「该雇主在招职位」收进上面雇主资质卡的头部动作位;
          「全部可行通道」删(带岗态它=刷回本页去掉岗位,顶栏「PR 评估」本来就是这个入口)。 */}

      {/* 「省提名政策」卡与「差距与时间评估」付费锁卡 2026-08-13 Frank 拍板**先删**(UI 层撤,
          判定引擎与付费闸后端原样):政策卡常年只剩一句「已收录门槛中无阻碍项」,锁卡在卖还看不见
          的东西([[pricing]] 不卖还不存在的东西)。付费面重新设计后再回来。 */}

      {/* 「粗筛信号,非资格认定」脚注 2026-08-14 Frank 拍板删(「删掉」)——虽属文案四保留类的
          「≠资格认定」,以当日指令为准;全站页脚的法律免责仍在兜底 */}
    </>
  )
}
