'use client'

import { useCallback, useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

// 读 localStorage 偏好(列/语言)用「绘制前」生效,避免 SSR 默认值闪一下再切到保存值。
// SSR 端 useLayoutEffect 无效且会告警 → 服务端退化成 useEffect。
const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

import { makeT, streamDisplay, eeDisplay, LANGS, LANG_KEY, COLS_COOKIE, type Lang, type TFn } from './i18n'
import { IconChart, IconCheck, IconClipboard, IconCompass, IconLock, IconMap, IconMapPin, IconMaximize, IconMinimize, IconNews, IconSave, IconSettings, IconStar, IconTarget, IconUser, IconWarn, IconX } from '../Icons'
import { SiteHeader } from '../SiteHeader'
import { BANNER_IMGS, Button, Notice, PageBanner } from '../ui/primitives'
import { SiteFooter } from '../SiteFooter'
import { Avatar } from '../Avatar'
import { AuthModal } from './AuthForm'
import { UpgradeCta, UpgradeModal } from './UpgradeModal'
import { PricingModal } from './PricingModal'
import { OnboardingWizard, OB_SEEN_KEY } from './OnboardingWizard'
import { useOverlayClose } from './overlay'
import { CARD, iconBtnS, SCRIM, useIsNarrow } from './Modal'
import { match as matchJob, matchRank, type MatchProfile, type MatchJob, type MatchReason } from '@/lib/match'
import { lmiaWageClass, isExemptSector, LMIA_REFUSAL_SOURCE } from '@/lib/lmiaStatus'

// 分层态(E3-05/E5-00,服务端 page.tsx 传入):gate 在服务端已生效,这里只做展示引导
export type Plan = {
  isPro: boolean
  loggedIn: boolean
  profileOk: boolean
  profile: MatchProfile | null
  freeMatchCap: number
  // #84(Frank「刷新头像闪一下?」):身份四件 SSR 直传——原客户端事后拉 /api/users/me,
  // 拉回前 Avatar 名字为空兜底成紫「?」,每次刷新闪一下;SSR 本就认识用户,直接带下来零闪
  email?: string | null
  displayName?: string | null
  avatar?: string | null
  proUntil?: string
}
const FREE_PLAN: Plan = { isPro: false, loggedIn: false, profileOk: false, profile: null, freeMatchCap: 0 }
// 中/小分类显示翻译(值仍是数据层中文,筛选/查询语义不变):cat.* 缺键退 broad.*(noc.py 兜底会把大类名当中/小类),再退原值
export function catName(t: TFn, v: string): string {
  for (const k of ['cat.' + v, 'broad.' + v]) { const s = t(k); if (s !== k) return s }
  return v
}
// ═══ E8-10 弹框三合一(2026-07-21 Frank 拍板「统一设计,统一改」)═══════════════════
// 原先 24 个字段各开一个顾问弹框,一套组件伺候 24 种字段 —— 当天三个 bug(公司面板渲岗位级匹配表 /
// JD 首节标题作用域开大 / 黄条同屏堆两条)**根子都在这**:任何「按字段特判」都会漏。
// 收成 3 个,对应用户真正会问的三件事(= 产品三问):这家靠谱吗 / 这活干什么给多少 / 这岗对我有没有用。
// 另有三种非弹框处置:map=直接开地图(Frank「地图跳转要保留」——删掉的是「解释」不是「点击」),
// note=悬停小注(零 LLM 零额度),none=什么都不做(值本身自明,一个日期不需要解释)。
// 设计与逐字段依据见 docs/implementation/E8-UI体验统一/10_弹框三合一收编.md
// #176(Frank 拍板「简化,精简才能长久」):'job' 组退役(与 JD 弹框二合一,ActModal 即职位弹框);
// 'category' 新立——点分类看分类,不再开移民全家桶(入口语义=内容)。
export type FieldGroup = 'company' | 'immigration' | 'category'
// 三档:并(→三个弹框之一)、图(直连地图)、无(不可点)。
// 原设计还有一档「注=悬停小注」,2026-07-21 Frank 拍板不做 —— 它与「无」行为完全一致,
// 留着只是个没兑现的意图,故合并(YAGNI:不为「可能用得上」保留结构)。
type Disposition = FieldGroup | 'map' | 'none'
// #175(Frank「所有的框都去掉可点吧。hover 高亮也去掉,只有 分类 公司 职位 可以点击弹框,
// 地址可以点击跳转」):可点集合大收编——满屏蓝绿都能点=没有重点。
const FIELD_GROUP: Partial<Record<ColKey, Disposition>> = {
  // ① 分类族 → 职业分类弹框(#176:点分类看分类——「这职业是干嘛的」,轻、快、零额度)
  noc: 'category', teer: 'category', broad: 'category', mid: 'category', fine: 'category',
  // ② 通道 → 移民弹框唯一入口(#176 恢复可点:「能不能帮我移民」归通道列,语义对得上)
  score: 'immigration',
  // ③ 公司 → 公司弹框;职位名不走本表(cellActionable 特判,直开 JD 弹框=职位弹框)
  company: 'company',
  // ④ 地址/省/市 → 地图直连(各查自己那一级,见 mapQuery;区/国家退回纯文本)
  address: 'map', province: 'map', city: 'map',
  // ⑤ 其余一律不可点(Pro 锁位的锁自己链升级弹窗,不走本路由)
  match: 'none', pnp: 'none', ee: 'none', aip: 'none', eligibility: 'none', vsMedian: 'none',
  salary: 'none', salaryYr: 'none', empHours: 'none', empTerm: 'none', accessibility: 'none', lmia: 'none',
  country: 'none', district: 'none',
  source: 'none', origin: 'none', direct: 'none', status: 'none',
  wageMedHr: 'none', wageMedYr: 'none',
  datePosted: 'none', lastSeen: 'none', closedAt: 'none',
}

// 这个格子点了有没有反应?——收编后 note/none 两档不再开弹框,若仍渲成 cursor:pointer
// 就成了「看着能点、点了没反应」,比不能点更糟。手型与真实行为绑同一个判据。
// title 例外:它不走 FIELD_GROUP,直开职位描述弹框(2026-07-19 Frank 拍板)。
export const cellActionable = (k: ColKey): boolean => {
  if (k === 'title') return true
  const d = FIELD_GROUP[k]
  return d != null && d !== 'none'
}

// Pro 专属列(与 lib/plan.ts PRO_COLUMNS 一致;免费用户列位打码,真值本就没进浏览器)
const PRO_COLS = new Set<ColKey>(['match', 'vsMedian', 'wageMedHr', 'wageMedYr'])
// #152 锁位统一打码(Frank「应该给他打上马赛克那种」;#130 详情页先例推广到表格):
// 每列一个**写死的假占位数**,blur 掉——传达「这儿有个数」比一把锁更能说明值多少。
// 真值免费态压根不出服务端,占位数是假的,扒开也没用。
const PRO_MASK: Partial<Record<ColKey, string>> = { vsMedian: '+15%', wageMedHr: '$28/hr', wageMedYr: '$58K/yr' }

// 未登录价值主张横幅(E5-01):一句话+关闭,可关闭。注册/定价按钮已归组进顶栏账户区(E8-01,2026-07-06 拍板)。
// 关闭记忆走 cookie(同 COLS_COOKIE 手法)→ SSR 首帧直接渲对,不再等水合后才弹出来(用户点名);bump cookie 名可重新展示
export const BANNER_COOKIE = 'jobs_banner_v1'
// ValueBanner 已退役(#65 收尾,Frank:「不需要两个蓝条」)——建档 CTA 并进 Jobs 页头右槽;BANNER_COOKIE 留给 page.tsx 旧 cookie 读取兼容

// 升级卡片(402 / 锁定块共用;都出现在已登录上下文)—— P1 换装(⓪ 2026-07-19):CTA=统一实心 UpgradeCta
// #160 起只保留给「整块功能不可用」的少数场景;被额度拦下的内容一律改 LockedText 打码(见下)
export function UpgradeCard({ t, reason }: { t: TFn; reason: string }) {
  return (
    <Notice kind="warn" lead={t('up.title')} action={<UpgradeCta t={t} loggedIn />} style={{ margin: '8px 0', fontSize: 13.5 }}>{reason}</Notice>
  )
}

// #160 打码占位(Frank 拍板「打码比直接不显示更能让用户有付费意愿」):
// 空白=零信息,用户不知道这儿有东西,也就没有失去感;打码=看得见摸不着,缺口才具体。
// 关键:**打码不需要真跑**——额度判定本就在调用之前,拦下就不生成(不预跑、不占朋友那台 qwen、不排队),
// 这里糊掉的是**假文本**,零成本。真内容只在放行时才生成,一次都不浪费。
// 真值同理不下发:blur 是视觉效果不是访问控制,右键就能读,故服务端剥离 + 前端渲假值(与 #130/#152 同一套)。
const MASK_TEXT = ['████████████████████████████████', '██████████████████████████', '███████████████████████████████████', '████████████████████']
// 锁行(打码块脚注)单独成件:全站所有打码位共用同一形态(锁 + 灰注 + UpgradeCta 文字链),不许各处自造。
// ctaLabel:未登录 429 场景的出路是「登录/注册」不是「升级 Pro」,文案随场景、行为同一个组件。
export function LockFoot({ t, loggedIn, msg, ctaLabel }: { t: TFn; loggedIn: boolean; msg?: string; ctaLabel?: string }) {
  return (
    <div style={{ marginTop: 6, fontSize: 11.5, color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      <IconLock />{msg || t('up.quota')}<UpgradeCta t={t} loggedIn={loggedIn} link label={ctaLabel} style={{ fontSize: 11.5 }} />
    </div>
  )
}
// #175(Frank「限额了不应该正常显示内容,但是模糊化吗」):429 限流态也走本件——
// 黄条 Notice 退役,改打码假文本 + 锁行(§3.6 地板规则:付费/限额内容永不留空白,最低打码占位)
export function LockedText({ t, loggedIn, lines = 3, msg, ctaLabel }: { t: TFn; loggedIn: boolean; lines?: number; msg?: string; ctaLabel?: string }) {
  return (
    <div style={{ marginTop: 4 }}>
      <div aria-hidden style={{ filter: 'blur(4px)', userSelect: 'none', pointerEvents: 'none', fontSize: 12.5, lineHeight: 1.9, color: '#d1d5db', letterSpacing: -1 }}>
        {MASK_TEXT.slice(0, lines).map((s, i) => <div key={i}>{s}</div>)}
      </div>
      <LockFoot t={t} loggedIn={loggedIn} msg={msg} ctaLabel={ctaLabel} />
    </div>
  )
}

// 顶栏账户区(E8-01,2026-07-06 归组拍板:登录/注册/Pro 一处):
// 未登录=[登录][注册][Pro] 一组(登录/注册开 AuthModal 对应 tab,Pro 开定价弹窗);
// 已登录=用户名 → /account + Pro 徽标(已 Pro)或 Pro 钮(开定价弹窗)。
// ?login=1(未登录访问 /account 被弹回时带上)→ 自动开登录弹框;登录成功整页刷新让 SSR 分层态(匹配列等)生效。
function AccountArea({ t, plan }: { t: TFn; plan: Plan }) {
  // #84:身份四件以 SSR plan 为初值(刷新零闪);fetch 兜底只在 SSR 没给时跑(老调用方兼容)
  const [email, setEmail] = useState<string | null>(plan.email ?? null)
  const [proUntil, setProUntil] = useState<string>(plan.proUntil ?? '')
  const [displayName, setDisplayName] = useState<string | null>(plan.displayName ?? null)   // E11-02:下拉头昵称
  const [avatar, setAvatar] = useState<string | null>(plan.avatar ?? null)                  // E11-02:头像 URL(无则首字母块)
  const [auth, setAuth] = useState<false | 'login' | 'register' | 'reset'>(false)
  const [resetTok, setResetTok] = useState('')   // E3-07:邮件链接 ?reset=<token> 落地
  const [pricing, setPricing] = useState(false)
  // 用户下拉(2026-07-16 用户拍板「用户这部分改成带下拉的按钮」):账户设置 / Pro 状态 / 退出登录
  const [menu, setMenu] = useState(false)
  const menuRef = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (!menu) return
    const h = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [menu])
  useEffect(() => {
    if (!plan.loggedIn || plan.email != null) return   // #84:SSR 已给身份则不再拉(拉回前的紫「?」闪烁根因)
    fetch('/api/users/me', { credentials: 'include' })
      .then((r) => r.json()).then((d) => { setEmail(d?.user?.email ?? null); setProUntil((d?.user?.proUntil || '').slice(0, 10)); setDisplayName(d?.user?.displayName ?? null); setAvatar(d?.user?.avatar ?? null) }).catch(() => {})
  }, [plan.loggedIn, plan.email])
  useEffect(() => {
    // 开框后立刻把 ?login=1 / ?reset= 从地址栏洗掉(第 15 轮用户反馈:留着参数,刷新就再弹一次)
    try {
      const sp = new URLSearchParams(window.location.search)
      const rst = sp.get('reset')   // E3-07:重置邮件链接落地,token 收进 state 再洗参
      if (sp.get('login') === '1' || sp.get('signup') === '1' || rst) {
        if (rst) { setResetTok(rst); setAuth('reset') }
        else setAuth(sp.get('signup') === '1' ? 'register' : 'login')   // ?signup=1:二级页头「注册」直达(统一 header)
        sp.delete('login'); sp.delete('signup'); sp.delete('reset')
        const qs = sp.toString()
        window.history.replaceState(null, '', window.location.pathname + (qs ? `?${qs}` : ''))
      }
    } catch { /* ignore */ }
  }, [])
  const done = () => {
    try { window.history.replaceState(null, '', '/') } catch { /* ignore */ }
    window.location.reload()
  }
  // Pro 钮不进 header(#65,Frank:「没有意义」)——升级入口=横幅/升级卡/用户菜单/定价页,四处都在
  // #63b(2026-07-19 Frank「太长太大,参考一亩三分地」):行距/字号/头部全面压紧
  const menuItem: React.CSSProperties = { display: 'block', width: '100%', textAlign: 'left', padding: '4px 12px', fontSize: 12.5, color: '#374151', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'none', whiteSpace: 'nowrap', boxSizing: 'border-box', lineHeight: 1.7 }
  const menuSect: React.CSSProperties = { fontSize: 10, color: '#9ca3af', letterSpacing: 0.5, padding: '3px 12px 0' }  // #63 区头小字
  const logout = async () => {
    try { await fetch('/api/users/logout', { method: 'POST', credentials: 'include' }) } catch { /* ignore */ }
    window.location.reload()
  }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      {plan.loggedIn ? (
        // 用户按钮+下拉(2026-07-16 拍板):圆形首字头像 + 邮箱前缀 + ▾;菜单右缘与按钮右缘对齐,
        // 菜单头=完整邮箱;Pro 徽标折进菜单,退出登录不再非去 /account 不可
        <span ref={menuRef} style={{ position: 'relative', display: 'inline-flex' }}>
          {/* E11-02 账户下拉;#63b(Frank「像 Google 那样只显示图标」):按钮=纯头像圆钮,名字挂 title */}
          <button onClick={() => setMenu((o) => !o)} title={displayName?.trim() || email || undefined}
            style={{ display: 'inline-flex', border: 'none', background: 'none', padding: 2, cursor: 'pointer', borderRadius: '50%', boxShadow: menu ? '0 0 0 2px #bfdbfe' : 'none' }}>
            <Avatar src={avatar} name={displayName || email} email={email} size={28} />
          </button>
          {menu && (
            <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, boxShadow: '0 10px 30px rgba(0,0,0,.12)', padding: '3px 0', zIndex: 30, minWidth: 185 }}>
              {/* 身份头:昵称+邮箱+Free/Pro 两行紧凑版(#63b 压缩:大头像退役) */}
              <a href="/account" style={{ display: 'block', padding: '7px 12px', textDecoration: 'none', borderBottom: '1px solid #f3f4f6', marginBottom: 2 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {displayName?.trim() || (email ? email.split('@')[0] : '—')}
                  <span style={{ fontWeight: 400, marginLeft: 6, fontSize: 11 }}>{plan.isPro
                    ? <span style={{ color: '#b45309', fontWeight: 600 }}>Pro{proUntil ? ` · ${proUntil}` : ''}</span>
                    : <span style={{ color: '#9ca3af' }}>{t('acct.plan.free')}</span>}</span>
                </div>
                <div style={{ fontSize: 11, color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</div>
              </a>
              {/* #63 Supabase 风分区(2026-07-18 效果图 Frank「可以」):求职/管理两区+区头小字,
                  升级 Pro 改通栏实心钮(免费号才显),退出置底灰字;条目图标全 Icons.tsx SVG */}
              <div style={menuSect}>{t('menu.sect.job')}</div>
              <a href="/?view=match" style={menuItem}><IconTarget /> {t('mv.entry')}</a>
              <a href="/pathways" style={menuItem}><IconCompass /> {t('pw.entry')}</a>
              <a href="/account?sec=favs" style={menuItem}><IconStar /> {t('fav.title')}</a>
              <a href="/account?sec=sjobs" style={menuItem}><IconClipboard /> {t('sj.title')}</a>
              <div style={{ borderTop: '1px solid #f3f4f6', margin: '4px 0' }} />
              <div style={menuSect}>{t('menu.sect.manage')}</div>
              <a href="/account?sec=profile" style={menuItem}><IconUser /> {t('prof.title')}</a>
              <a href="/account?sec=saved" style={menuItem}><IconSave /> {t('ss.title')}</a>
              <a href="/account" style={menuItem}><IconSettings /> {t('nav.acctTab')}</a>
              {!plan.isPro && (
                <Button kind="pro" sm onClick={() => { setMenu(false); setPricing(true) }}
                  style={{ display: 'block', width: 'calc(100% - 20px)', margin: '4px 10px', padding: '5px 0', textAlign: 'center' }}>
                  <IconStar /> {t('up.cta2')}
                </Button>
              )}
              <div style={{ borderTop: '1px solid #f3f4f6', margin: '2px 0' }} />
              <button onClick={logout} style={{ ...menuItem, color: '#9ca3af' }}>{t('acct.logout')}</button>
            </div>
          )}
        </span>
      ) : (
        <>
          {/* P1 换装:登录=ghost,注册=primary sm(每屏唯一主行动) */}
          <Button kind="ghost" sm onClick={() => setAuth('login')}>{t('nav.login')}</Button>
          <Button kind="primary" sm onClick={() => setAuth('register')}>{t('nav.register')}</Button>
        </>
      )}
      {auth && <AuthModal t={t} mode={auth} resetToken={resetTok || undefined} onClose={() => setAuth(false)} onDone={done} />}
      {pricing && <PricingModal t={t} loggedIn={plan.loggedIn} pro={plan.isPro} onClose={() => setPricing(false)} />}
    </span>
  )
}

export type JobRow = {
  id: string | number
  match: 'high' | 'mid' | 'low' | 'na' | null   // 与我的匹配(E5-00,服务端算;null=未建档/免费限额外/未登录)
  gradeChannel?: number | null   // E12-08:移民通道档 1-5(主表「通道」列,免费);明细走 /api/scoredetail 额度
  sponsorGrade?: number | null   // E12-08:公司担保档 1-5(公司名旁药丸;null=无记录不评)
  title: string
  company: string
  companyDescription: string
  companySectors: string
  companyWebsiteSrc: string   // 官网来路:''=雇主自报/名录 · jd=帖内线索 · searched=自动检索(加小字,E8-04 D2)
  source: string
  sourceLabel: string
  origin: string
  country: string
  province: string
  city: string
  district: string
  address: string
  noc: string
  category: string
  teer: number | null
  broad: string
  mid: string
  fine: string
  accessibility: string
  score: number | null
  pnpEligible: boolean
  pnpStream: string
  eeCategory: string
  aip: boolean
  eligibilityFlag?: string   // GAP1③:''|'no_sponsorship'|'pr_required'(数据层 visa_flag 检测)
  eligibilityQuote?: string  // 命中原句(可核验出处)
  // 雇佣形态 + 入职要求(E6-06/E6-07A,详情页结构化标注 05b 解析;空=未标注,ATS 岗天然空)
  employmentTerm: string      // permanent/term/casual/seasonal/''
  employmentHours: string     // full/part/''
  certificates: string[]      // 证书/执照要求原文(标准化词表)
  education: string           // 学历要求原文
  // LMIA 外劳雇佣记录(E6-02,公司级,ESDC 近 8 季聚合):历史事实,非「能担保」判定
  lmiaPositions: number | null
  lmiaPositionsSkilled?: number | null   // B4-02:技能股(High Wage/GTS);null=列未回填
  lmiaLastQuarter: string
  lmiaStreams: string
  salary: string
  salaryAnnual: number | null
  salaryText: string
  wageMedHourly: number | null
  wageMedAnnual: number | null
  wageLowHourly: number | null
  wageLowAnnual: number | null
  wageHighHourly: number | null
  wageHighAnnual: number | null
  wageYear: string
  officialUrl: string
  applyUrl: string
  datePosted: string
  firstSeen: string
  lastSeen: string
  status: string
  closedAt: string
}

const uniq = (xs: string[]) => Array.from(new Set(xs.filter(Boolean))).sort()
const accLabel: Record<string, string> = {
  'co-op': 'co-op', junior: '初级', intermediate: '中级', senior: '高级', unknown: '—',
}
// 大分类颜色(仅显示)。分类名/层级(broad/mid/fine/teer)由 ETL(etl/noc.py→mart)算好
// 存在 job 字段上,前端不再用 NOC 现算 —— 单一来源在数据层。
type Cat = { bg: string; fg: string }
const NA: Cat = { bg: '#fafafa', fg: '#9ca3af' }
const BROAD_COLOR: Record<string, Cat> = {
  管理: { bg: '#dbeafe', fg: '#1e40af' }, 商务: { bg: '#e0e7ff', fg: '#3730a3' },
  科技: { bg: '#cffafe', fg: '#155e75' }, 医疗: { bg: '#dcfce7', fg: '#166534' },
  教育: { bg: '#fae8ff', fg: '#86198f' }, 文体: { bg: '#fce7f3', fg: '#9d174d' },
  服务: { bg: '#fef9c3', fg: '#854d0e' }, 技工: { bg: '#ffedd5', fg: '#9a3412' },
  资源: { bg: '#ecfccb', fg: '#3f6212' }, 制造: { bg: '#f3f4f6', fg: '#374151' },
}
const colorOf = (broad?: string): Cat => (broad && BROAD_COLOR[broad]) || NA

// 薪资归一已下沉到数据层(etl/04d_clean_salary.py → salaryAnnual/salaryText);前端只读不算。
// (sortVal 客户端排序取值已随 E10 服务端化退役——排序全走 /api/jobs 的 orderByClause,#127 清死代码)
// #136/#137(Frank 问「外链是 Indeed 就没办法了吗」「为什么不能转载」):这些原站对我们的请求返回 403
// (实测连首页都 403 = 有意拦截)。不绕过——那是规避访问控制。文案只陈述实测到的事实「该站拒绝本站自动读取」,
// 不替对方做版权断言(职位描述文字多为雇主所写,版权通常归雇主而非平台)。仅列**实测确认拦截**的站;
// 抓不到但没拦截的(如 Québec emploi 是前端渲染的政府站)走通用空态。
const BLOCKED_SRC: Record<string, string> = { 'indeed.com': 'Indeed', '86network': '86network' }
export const blockedSrc = (j: JobRow): string => BLOCKED_SRC[(j.source || '').toLowerCase()] || ''
const teerOf = (noc: string): number | null => (noc && noc.length === 5 && /\d/.test(noc[1]) ? Number(noc[1]) : null)
const mapsUrl = (q: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`
// 本岗年薪 vs NOC 中位年薪(%);缺值返回 null
const vsPct = (j: JobRow): number | null => (j.salaryAnnual != null && j.wageMedAnnual ? (j.salaryAnnual / j.wageMedAnnual - 1) * 100 : null)
// 数值预设判定(下拉,不手填):年薪档、vs中位(评分谓词只在服务端 jobsSql,按 1-5 通道档)
const okSal = (a: number | null, f: string): boolean => !f || (a != null && (f === 'ge100' ? a >= 100000 : f === '80' ? a >= 80000 && a < 100000 : f === '60' ? a >= 60000 && a < 80000 : a < 60000))
const okVs = (v: number | null, f: string): boolean => !f || (v != null && (f === 'above' ? v >= 0 : f === 'above20' ? v >= 20 : v < 0))
// 「更新」时间显示为东部时区(显式 timeZone,避免 dev=host / 容器=UTC 不一致 + SSR 水合差异)
const fmtLocal = (iso: string): string => {
  try {
    return new Date(iso).toLocaleString('sv-SE', { timeZone: 'America/Toronto', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
  } catch { return (iso || '').slice(0, 16).replace('T', ' ') }
}
// 同上但带秒(更新时间列要看到时分秒)
const fmtLocalSec = (iso: string): string => {
  try {
    return new Date(iso).toLocaleString('sv-SE', { timeZone: 'America/Toronto', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
  } catch { return (iso || '').slice(0, 19).replace('T', ' ') }
}
// 大渥太华市 2001 年合并的社区(Job Bank 仍用老社区名标注)→ 显示为「社区, Ottawa」
const OTTAWA_COMMUNITIES = new Set([
  'nepean', 'gloucester', 'kanata', 'kanata north', 'orleans', 'orléans', 'orleans south',
  'stittsville', 'manotick', 'vanier', 'cumberland', 'greely', 'carp', 'dunrobin',
  'metcalfe', 'osgoode', 'richmond', 'barrhaven', 'rockcliffe',
])
// 社区别名归一(同一区域不同写法 → 规范名)
const DISTRICT_ALIAS: Record<string, string> = {
  'orleans': 'Orléans', 'orléans': 'Orléans', 'orleans south': 'Orléans',
  'kanata north': 'Kanata',
}
const canonDistrict = (low: string, core: string): string => DISTRICT_ALIAS[low] || core
// 地点显示名:渥太华社区统一带上「, Ottawa」,其它城市原样
const locDisplay = (j: JobRow): string => {
  let city = (j.city || '').trim()
  if (!city && j.address) city = j.address.split(',')[0].trim()
  if (!city) return ''
  const core = city.replace(/[,\s]+(on|ontario|canada)\b/gi, '').replace(/,\s*$/, '').trim()
  const low = core.toLowerCase()
  if (low.includes('ottawa')) return 'Ottawa'
  if (OTTAWA_COMMUNITIES.has(low)) return `${canonDistrict(low, core)}, Ottawa`
  return core || city
}
// ── 来源:Job Bank 渠道(含它聚合的 indeed/talent 等)统一显示「Job Bank」;ATS 平台名美化 ──
const fromJobBank = (j: JobRow) => /jobbank\.gc\.ca/i.test(j.applyUrl)
// 来源显示标签已在数据层(etl/09_build_mart.py)洗好存 job.sourceLabel,前端只读
const sourceLabel = (j: JobRow): string => j.sourceLabel || '—'
// 直接雇主:ATS 第一方=直接;Job Bank 渠道仅 source=='Job Bank'(雇主直发)算直接,其余是聚合转贴
const isDirect = (j: JobRow): boolean => (fromJobBank(j) ? j.source === 'Job Bank' : true)

// ── 地点拆 省/市/区 ──
// E8-07:export 给 /jobs/[id] 详情页(面包屑省全名)。详情页复用策略=只加 export 不搬代码(零回归;大搬家瘦身另立批)
export const PROV_NAMES: Record<string, string> = {
  ON: 'Ontario', BC: 'British Columbia', AB: 'Alberta', QC: 'Quebec', MB: 'Manitoba', SK: 'Saskatchewan',
  NS: 'Nova Scotia', NB: 'New Brunswick', NL: 'Newfoundland and Labrador', PE: 'Prince Edward Island',
  NT: 'Northwest Territories', YT: 'Yukon', NU: 'Nunavut',
}
// #146 显示用省名(Frank「中韩用户只看英文难理解」,拍板英文在前):中韩界面出「Ontario(安大略省)」,
// 英文界面译名==英文名故只出英文。**只用于显示**——筛选值仍是 PROV_NAMES 的英文全名(fProv/深链/保存的筛选都依赖它)
export const provName = (t: TFn, code: string): string => {
  const c = (code || '').toUpperCase()
  const en = PROV_NAMES[c] || code || ''
  const loc = t('prov.' + c)
  return loc && loc !== 'prov.' + c && loc !== en ? `${en}(${loc})` : en
}
// 地点已由清洗脚本(04c)规范化进库,这里直接读结构化字段(省码→全称仅用于显示)
const parseLoc = (j: JobRow): { country: string; prov: string; city: string; district: string } => ({
  country: j.country || (j.province ? 'Canada' : ''),
  prov: PROV_NAMES[(j.province || '').toUpperCase()] || j.province || '',
  city: j.city || '',
  district: j.district || '',
})
// 地点各级的地图查询串(单一来源;表格格与手机卡共用)。各级只查自己那一级(点省看省、点市看市),
// **省一律用全称**:省码 NL 既是纽芬兰也是荷兰国家码,单查会跳欧洲(#175 实测),全称无歧义。
const mapQuery = (field: ColKey, j: JobRow): string => {
  const L = parseLoc(j)
  return field === 'province' ? [L.prov, 'Canada'].filter(Boolean).join(', ')
    : field === 'city' ? [L.city, L.prov, 'Canada'].filter(Boolean).join(', ')
    : field === 'country' ? (L.country || 'Canada')
    : [j.address || L.district, L.city, L.prov].filter(Boolean).join(', ')
}

// 综合检索串:搜索框对所有列字段生效(职位/公司/省市区/NOC/分类/薪资/来源/经验/评分/TEER)
const searchHay = (j: JobRow): string => {
  const t = teerOf(j.noc)
  const L = parseLoc(j)
  return [
    j.title, j.company, sourceLabel(j), j.source, j.noc, j.salary,
    j.broad, j.mid, j.fine,
    L.prov, L.city, L.district, j.address,
    accLabel[j.accessibility], j.accessibility,
    j.score != null ? String(j.score) : '', t != null ? `TEER ${t}` : '',
  ].filter(Boolean).join(' ').toLowerCase()
}
// sourceUrl(来源板块根链接)已随 #175 来源格退回纯文本一并删除——死代码不留

// ── 列配置(可勾选;职位列始终显示) ──────────────────────────────
type ColKey = 'score' | 'match' | 'pnp' | 'ee' | 'aip' | 'lmia' | 'eligibility' | 'broad' | 'mid' | 'fine' | 'teer' | 'empHours' | 'empTerm' | 'title' | 'company' | 'noc' | 'accessibility' | 'salary' | 'salaryYr' | 'wageMedHr' | 'wageMedYr' | 'vsMedian' | 'country' | 'province' | 'city' | 'district' | 'address' | 'source' | 'origin' | 'direct' | 'status' | 'datePosted' | 'lastSeen' | 'closedAt' | 'actions'
// 默认显示 10 列(发布时间·大分类·公司·职位·省·市·薪资·年薪·vs中位·操作);其余用户自选。
// 布局:表格永远满宽不横向滚动,列按内容自适应,内容多行换行(不省略)——见 <table>/<td> 注释。
const COLUMNS: { key: ColKey; label: string; default: boolean; always?: boolean }[] = [
  { key: 'datePosted', label: '发布时间', default: true },
  { key: 'broad', label: '大分类', default: true },
  { key: 'mid', label: '中分类', default: false },
  { key: 'fine', label: '小分类', default: false },
  { key: 'teer', label: 'TEER', default: false },
  // J1(2026-07-19 Frank):职位类型拆「工时」「雇佣期」两列(禁「·」杂糅),默认藏,字段面板可开
  { key: 'empHours', label: '工时', default: false },
  { key: 'empTerm', label: '雇佣期', default: false },
  { key: 'company', label: '公司', default: true },
  { key: 'title', label: '职位', default: true, always: true },
  { key: 'match', label: '与我的匹配', default: false },  // E5-05:主表不再显示(独立「我的匹配」视图专属列,列选择器也不出)
  { key: 'noc', label: 'NOC', default: false },
  { key: 'accessibility', label: '经验级别', default: false },
  { key: 'country', label: '国家', default: false },
  { key: 'province', label: '省', default: true },
  { key: 'city', label: '市', default: true },
  { key: 'district', label: '区', default: false },
  { key: 'address', label: '地址', default: false },
  { key: 'salary', label: '薪资', default: true },
  { key: 'salaryYr', label: '年薪(折算)', default: true },
  { key: 'wageMedHr', label: '中位时薪', default: false },
  { key: 'wageMedYr', label: '中位年薪', default: false },
  { key: 'vsMedian', label: 'vs 中位', default: true },
  { key: 'source', label: '来源', default: false },
  { key: 'origin', label: '渠道', default: false },
  { key: 'direct', label: '发布', default: false },
  { key: 'pnp', label: 'PNP', default: false },
  { key: 'ee', label: 'EE 类别', default: false },
  { key: 'aip', label: 'AIP', default: false },
  { key: 'lmia', label: '外劳记录', default: false },  // E6-02:雇主近两年 LMIA 获批史(公司级信号)
  { key: 'eligibility', label: '身份预筛', default: false },  // GAP1③:JD 明确不担保/须 PR 红旗(C14/C15)
  { key: 'status', label: '状态', default: false },
  { key: 'lastSeen', label: '更新时间', default: false },
  { key: 'closedAt', label: '下架时间', default: false },
  { key: 'score', label: '通道', default: true },  // E12-08:评分列改「通道」档(1-5)且默认亮——核心差异点(原 0-100 分默认藏)
  { key: 'actions', label: '操作', default: true, always: true },  // 固定最后一列:公司信息 / 职位描述 按钮
]
const DEFAULT_COLS = COLUMNS.filter((c) => c.default).map((c) => c.key)
// 原子值列:内容单行不换行(日期/金额/百分比/分级等短值,断行会很丑)。其余文本列(职位/公司/地点等)允许多行,
// 以便表格压进容器宽度不横向滚动。表头一律不换行(=该列最小宽度)。
// salary 不在此列:薪资原文可为长文本(如 "40% commission per sale"),要像文本列一样换行;年薪/中位数等计算列恒短值。
const NOWRAP_COLS = new Set<ColKey>(['datePosted', 'lastSeen', 'closedAt', 'salaryYr', 'wageMedHr', 'wageMedYr', 'vsMedian', 'teer', 'empHours', 'empTerm', 'score', 'status', 'direct', 'aip', 'lmia', 'eligibility', 'match'])
const PREF_KEY = 'jobs.visibleCols.v10'  // v10:「通道」档默认列(E12-08);bump 版本让新默认生效
const writeColsCookie = (keys: string[]) => {
  try { document.cookie = `${COLS_COOKIE}=${encodeURIComponent(JSON.stringify(keys))}; path=/; max-age=31536000; SameSite=Lax` } catch { /* ignore */ }
}
// ── 本地偏好画像(E9-02 推荐横幅,2026-07-17 拍板「1+3」):浏览/收藏信号存 localStorage,
// **不上传**(隐私政策口径:浏览偏好存于设备)。打开任一岗位弹窗 +1,收藏 +3;维度=省/大类/薪资档。
const PREF_LS = 'jobsPref1'
const PREF_HIDE = 'jobsPrefHide'   // 当日关闭横幅
// combo(F2,2026-07-17 用户「最近浏览应该可以有多条,也可以删」):按省×大类**组合**记账——
// 原三维度各自最高票再拼,可能拼出用户从没浏览过的假组合;组合账才是真浏览轨迹。旧画像无 combo 键时,
// 组合账攒够(权重≥3)之前不出推荐(2026-07-17「去掉任何兜底分支」——不再退回假组合)。
type Combo = { w: number; sal: Record<string, number> }
type Pref = { ev: number; prov: Record<string, number>; broad: Record<string, number>; sal: Record<string, number>; combo: Record<string, Combo> }
const salBand = (a: number | null | undefined): string => (a == null ? '' : a >= 100000 ? 'ge100' : a >= 80000 ? '80' : a >= 60000 ? '60' : 'u60')
const readPref = (): Pref => {
  try { return { ev: 0, prov: {}, broad: {}, sal: {}, combo: {}, ...JSON.parse(localStorage.getItem(PREF_LS) || '{}') } }
  catch { return { ev: 0, prov: {}, broad: {}, sal: {}, combo: {} } }
}
const recordPref = (j: JobRow, w: number) => {
  try {
    const p = readPref()
    p.ev += w
    if (j.province) p.prov[j.province] = (p.prov[j.province] || 0) + w
    if (j.broad) p.broad[j.broad] = (p.broad[j.broad] || 0) + w
    const b = salBand(j.salaryAnnual)
    if (b) p.sal[b] = (p.sal[b] || 0) + w
    if (j.province || j.broad) {
      const ck = `${j.province || ''}|${j.broad || ''}`
      const c = p.combo[ck] || { w: 0, sal: {} }
      c.w += w
      if (b) c.sal[b] = (c.sal[b] || 0) + w
      p.combo[ck] = c
    }
    localStorage.setItem(PREF_LS, JSON.stringify(p))
  } catch { /* 本地存储不可用则放弃(无痕模式等) */ }
}
const topOf = (m: Record<string, number>, min: number): string => {
  const e = Object.entries(m).sort((a, b) => b[1] - a[1])[0]
  return e && e[1] >= min ? e[0] : ''
}
// E9-03 地区冷启动:首访无画像时用浏览器时区映射省(零依赖零上传,与画像同一隐私口径)。
// 白名单外(含 NT/YT/NU 与非加时区)不显示;Halifax→NS 为可接受近似(大西洋时区取人口主省,拍板点②)。
// export 给 page.tsx 的占位预判内联脚本(2026-07-17 用户「刷新怎么后弹出来」——横幅槽位首帧预留,反 CLS)
export const TZ_PROV: Record<string, string> = {
  'America/Toronto': 'ON', 'America/Vancouver': 'BC', 'America/Edmonton': 'AB',
  'America/Regina': 'SK', 'America/Swift_Current': 'SK', 'America/Winnipeg': 'MB',
  'America/St_Johns': 'NL', 'America/Moncton': 'NB', 'America/Halifax': 'NS',
}

const PAGE_ROWS = 50                    // 每页行数:首屏 50,点「显示更多」每次 +50(用户拍板:不随滚动自动加载)
const ORIGIN_LABEL: Record<string, string> = { jobbank: 'Job Bank', ats: 'ATS', directory: '社区名单' }

// E8-07:维度行类型 export 给详情页(SSR 取数按同一形状传入)
export type PnpOcc = { province: string; stream: string; label: string; type: string; noc: string; name: string; gtaRestricted: boolean; url: string; fetched: string }
// 省抽选事实(E6-04):score 是省自评分制(scale 标注),非 CRS —— 只作事实展示,不做资格/差分判定
export type PnpDraw = { province: string; kind: string; drawDate: string; stream: string; score: number | null; scale: string; invitations: number | null; note: string; label: string; url: string; fetched: string }
export type EeOcc = { category: string; label: string; noc: string; teer: number | null; title: string; url: string; fetched: string; drawCrs: number | null; drawDate: string; drawSize: number | null }
export type DesigEmp = { name: string; province: string; location: string; isTech: boolean }
export type NocDesc = { noc: string; title: string; titleZh?: string; titleKo?: string; duties: string; requirements: string; fetched: string }
// #147:界面语言下的职业名译名(英文界面/无译名→空,调用方不渲染灰注)。英文名永远是主文案(Frank 拍板「英文在前」)
export const nocLocalTitle = (n: NocDesc | null | undefined, lang: Lang): string =>
  (lang === 'zh' ? n?.titleZh : lang === 'ko' ? n?.titleKo : '') || ''
export type FieldSource = { field: string; kind: string; publisher: string; url: string; title: string; description: string; status: string; fetched: string; note: string }
// 官方移民新闻瘦行(E12-06):弹框「本省最新公告」行用,详情在 /news/[slug]
export type NewsSlim = { region: string; title: string; date: string; slug: string }
type Dims = {
  provinces: { code: string; name: string }[]
  cities: { name: string; province: string }[]
  districts: { name: string; city: string; province: string }[]
  nocCategories: { broad: string; mid: string; fine: string; teer: number | null }[]
  sources: { name: string }[]
  experienceLevels: { name: string }[]
  pnpOccupations: PnpOcc[]
  pnpDraws: PnpDraw[]
  eeCategories: EeOcc[]
  designatedEmployers: DesigEmp[]
  nocDescriptions: NocDesc[]
  fieldSources: FieldSource[]
  news: NewsSlim[]
}
const EMPTY_DIMS: Dims = { provinces: [], cities: [], districts: [], nocCategories: [], sources: [], experienceLevels: [], pnpOccupations: [], pnpDraws: [], eeCategories: [], designatedEmployers: [], nocDescriptions: [], fieldSources: [], news: [] }
const PROV_CODE: Record<string, string> = Object.fromEntries(Object.entries(PROV_NAMES).map(([c, n]) => [n, c]))

export default function JobsTable({ jobs: initialJobs, updatedAt: initialUpdatedAt, dims: initialDims = EMPTY_DIMS, initialCols, plan = FREE_PLAN, totalCount, proof, deferFull }: { jobs: JobRow[]; updatedAt?: string; dims?: Dims; initialCols?: string[]; plan?: Plan; initialBanner?: boolean; totalCount?: number; proof?: { named: number; lmia: number }; deferFull?: boolean }) {
  // 首屏拆分:SSR 带最近 50 行秒开;筛选/搜索/翻页由 fetch effect 打 /api/jobs 分页(E10-01 P3,旧 20k blob 已废);
  // 失败保底留首屏 50 行可用,loadedAll 复位以显示计数而非假「全量」。
  // E10-01 P3:服务端分页/筛选取代 20k blob。rows=当前累计页(SSR 首屏 50 起),total=同 WHERE 总数,page=已翻页数。
  const [rows, setRows] = useState<JobRow[]>(initialJobs)
  const [total, setTotal] = useState<number>(totalCount ?? initialJobs.length)
  const [updatedAt, setUpdatedAt] = useState(initialUpdatedAt)
  const [dims, setDims] = useState<Dims>(initialDims)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(false)
  // 全量匹配计数(FOMO「你今日共 X 个高匹配」):match 视图端点返回
  const [matchTotals, setMatchTotals] = useState<{ high: number; mid: number } | null>(null)
  const reqSeq = useRef(0)   // 竞态:晚到的旧响应丢弃
  // 大维度独立加载(cities/districts/designatedEmployers/nocDescriptions),不再随职位 blob
  useEffect(() => {
    let dead = false
    fetch('/api/dims').then((r) => (r.ok ? r.json() : null)).then((d) => { if (!dead && d?.dims) setDims((prev) => ({ ...prev, ...d.dims })) }).catch(() => {})
    return () => { dead = true }
  }, [])
  const [q, setQ] = useState('')
  const [directOnly, setDirectOnly] = useState(false)
  const [fElig, setFElig] = useState('')   // GAP1③:'ok'=排除明确不担保/须 PR 岗
  const [fCountry, setFCountry] = useState(''); const [fProv, setFProv] = useState(''); const [fCity, setFCity] = useState(''); const [fDistrict, setFDistrict] = useState('')
  const [fBroad, setFBroad] = useState(''); const [fMid, setFMid] = useState(''); const [fFine, setFFine] = useState('')
  const [fTeer, setFTeer] = useState(''); const [fSource, setFSource] = useState(''); const [fAcc, setFAcc] = useState('')
  const [fPnp, setFPnp] = useState(''); const [fAip, setFAip] = useState(''); const [fStatus, setFStatus] = useState(''); const [fOrigin, setFOrigin] = useState('')
  const [fScore, setFScore] = useState(''); const [fSal, setFSal] = useState(''); const [fVs, setFVs] = useState('')  // 数值预设(下拉,不手填)
  const [fEmp, setFEmp] = useState('')  // 职位类型(E6-06):full/part/gig
  // 「更多筛选」折叠恢复(2026-07-11 用户二次拍板:五行常驻太占竖向空间,恢复默认收起);
  // 开关行右侧带更新时间+字段按钮(同日「放到一行」拍板保留,只是宿主行从薪资行换成开关行)
  // 窄屏筛选抽屉(E8-03):≤640px 整个筛选区默认收起,一行「筛选」开关展开;CSS 媒体查询控制显隐,零水合差异
  const [fDrawer, setFDrawer] = useState(false)   // #59:「更多筛选」折叠开关(原窄屏抽屉退役,本 state 复用)
  const foldActive = [fCity, fDistrict, fMid, fFine, fAip, fEmp, fVs, fElig].filter(Boolean).length + (directOnly ? 1 : 0)
  // 初始列:服务端从 cookie 解析后由 initialCols 传入 → SSR 与客户端首帧一致(零闪);无则用默认
  const [visible, setVisible] = useState<ColKey[]>(() => {
    const v = (initialCols ?? []).filter((k): k is ColKey => COLUMNS.some((c) => c.key === k))
    return v.length ? v : DEFAULT_COLS
  })
  // URL 参数 → 初始筛选(stats/rankings 入口回流:?q= ?prov= ?broad=)
  useIsoLayoutEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search)
      const q0 = sp.get('q'); const pv = sp.get('prov'); const bd = sp.get('broad'); const md = sp.get('mid'); const fn = sp.get('fine')
      if (q0) setQ(q0)
      if (pv) setFProv(PROV_NAMES[pv.toUpperCase()] || pv)
      if (bd) setFBroad(bd)
      if (md) setFMid(md)  // stats 图表 L2 下钻深链(2026-07-19)
      if (fn) setFFine(fn)  // #142:详情页职业分类三级可点,小类深链补齐
      // E5-05 直链回流;进匹配视图默认按匹配度排(2026-07-21 Frank:横幅写「按匹配度排序」得名副其实,
      // 原默认发布时间序把非今日的高匹配全压在今日中匹配下面)
      if (sp.get('view') === 'match' && plan.loggedIn && plan.profileOk) { setMatchView(true); setSort({ key: 'match', dir: 'desc' }) }
    } catch { /* ignore */ }
  }, [])
  // E8-10:popup 存**分组**不再存字段(24 → 3);srcField 只用于打开时锚到哪一节,不参与内容分支
  const [popup, setPopup] = useState<{ group: FieldGroup; srcField: ColKey; job: JobRow; title: string } | null>(null)
  // 单一路由:查 FIELD_GROUP 决定开哪个弹框 / 跳地图 / 什么都不做。两处调用方(表格行、手机卡)共用,
  // 不再各自 setPopup —— 今天的三个 bug 全出在「按字段特判散落各处」。
  const openField = useCallback((field: ColKey, job: JobRow, title: string) => {
    const d = FIELD_GROUP[field]
    if (!d || d === 'none') return
    if (d === 'map') {
      // 各字段只查自己那一级(与「一格一事」同一原则):点省看省、点市看市、点区/地址才到街号。
      // 查询串统一走 mapQuery(与表格格 href、手机卡同源;省用全称消歧,见其注释)。
      const q = mapQuery(field, job)
      if (q) window.open(mapsUrl(q), '_blank', 'noopener')
      return
    }
    setPopup({ group: d, srcField: field, job, title })
  }, [])
  // C1 走查拍板(2026-07-07):删两套公司弹窗——操作列「公司信息」直接开顾问公司弹窗;ActModal 只剩 JD 快看
  const [actModal, setActModal] = useState<{ kind: 'desc'; job: JobRow } | null>(null)
  // 升级入口(Pro 锁列/保存筛选 gate)统一开独立升级弹框;未登录先走注册弹框(用户定:注册与购买分离)
  const [upsell, setUpsell] = useState<false | 'lock' | 'ss' | 'login' | 'match'>(false)   // match=①匹配锁(弹框带 FOMO 数字)
  // E11-05②:分型引导 wizard。首访自动弹(登录且无档案且没弹过);关/完成置 OB_SEEN 不再自动弹;横幅「建档」手动开忽略它
  const [wizard, setWizard] = useState(false)
  const closeWizard = () => { try { localStorage.setItem(OB_SEEN_KEY, '1') } catch { /* ignore */ } setWizard(false) }
  useEffect(() => {
    if (!plan.loggedIn || plan.profileOk) return
    try { if (localStorage.getItem(OB_SEEN_KEY)) return } catch { /* ignore */ }
    setWizard(true)
  }, [])
  // 我的求职(E9-01):已收藏映射 jobId → {saved-jobs 行 id, status};匿名点收藏 → 注册框(转化钩子)
  const [saved, setSaved] = useState<Record<string, { id: number | string; status: string }>>({})
  useEffect(() => {
    if (!plan.loggedIn) return
    fetch('/api/saved-jobs?limit=200&depth=0', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        const m: Record<string, { id: number | string; status: string }> = {}
        for (const doc of d?.docs || []) if (doc.job != null) m[String(doc.job)] = { id: doc.id, status: doc.status || 'wish' }
        setSaved(m)
      }).catch(() => {})
  }, [plan.loggedIn])
  // E9-02 推荐横幅(方案 1+3):本地画像凑够信号(ev≥5 且省或大类有主导项)→ 顶部一行推荐;
  // 当日可关;已有筛选时不打扰。CTA1=套筛选看岗,CTA2=建档反哺(匿名→注册框,登录→/account)
  type Rec = { key?: string; prov: string; broad: string; sal: string; src: 'pref' | 'geo' }
  const [recs, setRecs] = useState<Rec[]>([])
  const [dismissedRec, setDismissedRec] = useState<Set<string>>(new Set())  // 推荐卡「不感兴趣」隐藏(会话级)
  useEffect(() => {
    try {
      if (localStorage.getItem(PREF_HIDE) === new Date().toLocaleDateString('en-CA')) return
      const pf = readPref()
      if (pf.ev < 5) {
        // E9-03 冷启动:无画像时时区映射省(推荐非断言,套错一键可改);画像成型(ev≥5)即让位
        const gp = TZ_PROV[Intl.DateTimeFormat().resolvedOptions().timeZone || '']
        if (gp) setRecs([{ prov: gp, broad: '', sal: '', src: 'geo' }])
        return
      }
      // F2 多组合(2026-07-17 拍板):只按**真实浏览的省×大类组合**(权重≥3)出最多 2 条,各自可删。
      // 无兜底(2026-07-17 用户「去掉任何兜底分支」):组合账未成熟就不出推荐——绝不用各维度最高票
      // 硬拼假组合(那正是本功能要消灭的毛病)。全新无画像用户仍由上面 ev<5 的 geo 冷启动覆盖。
      const combos = Object.entries(pf.combo || {})
        .filter(([, c]) => c.w >= 3)
        .sort((a, b) => b[1].w - a[1].w).slice(0, 2)
        .map(([k, c]) => {
          const [prov, broad] = k.split('|')
          const sal = topOf(c.sal, 3)
          return { key: k, prov, broad, sal: sal === 'u60' ? '' : sal, src: 'pref' as const }
        })
      if (combos.length) setRecs(combos)
    } catch { /* ignore */ }
  }, [])
  // E9-02 信号采集:任一岗位弹窗打开 +1(popup=字段顾问族,actModal=公司/JD)
  useEffect(() => { if (popup?.job) recordPref(popup.job, 1) }, [popup])
  useEffect(() => { if (actModal?.job) recordPref(actModal.job, 1) }, [actModal])
  const toggleSave = async (j: JobRow) => {
    if (!plan.loggedIn) { setUpsell('lock'); return }
    recordPref(j, 3)  // 收藏=最强偏好信号
    const key = String(j.id)
    const cur = saved[key]
    if (cur) {
      setSaved((m) => { const c = { ...m }; delete c[key]; return c })
      await fetch(`/api/saved-jobs/${cur.id}`, { method: 'DELETE', credentials: 'include' }).catch(() => {})
    } else {
      const r = await fetch('/api/saved-jobs', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job: j.id, title: j.title, company: j.company, status: 'wish' }),
      }).catch(() => null)
      const d = r ? await r.json().catch(() => null) : null
      const id = d?.doc?.id
      if (id != null) setSaved((m) => ({ ...m, [key]: { id, status: 'wish' } }))
    }
  }
  const [sort, setSort] = useState<{ key: ColKey; dir: 'asc' | 'desc' }>({ key: 'datePosted', dir: 'desc' })
  const [colOpen, setColOpen] = useState(false)
  // 我的匹配视图(E5-05,D1=B):只看命中我档案的岗,匹配度排最前;免费=每日前 N 岗匹配 + 升级卡。
  // URL ?view=match 可分享/可回退;入口三态分流(未登录/未建档 → /account 建档)。
  const [matchView, setMatchView] = useState(false)
  // 跳转页面语义(2026-07-11 用户拍板):进出匹配视图=整页跳 /?view=match / /(URL 即状态,可分享可回退;
  // 2026-07-17 根域直出后职位板=根路径)。未登录直接弹登录框(同日用户:「不要先跳转页面再弹窗」),
  // 已登录未建档才去 /account 建档
  const toggleMatchView = () => {
    if (!plan.loggedIn) { setUpsell('login'); return }
    if (!plan.profileOk) { setWizard(true); return }   // E11-05②:未建档 → 开引导 wizard(原直跳 /account)
    window.location.href = matchView ? '/' : '/?view=match'
  }
  const colRef = useRef<HTMLDivElement>(null)
  // (E10-01 P3:客户端 limit 切片退役 → 服务端 page 分页,见下方 fetch effect)
  const [lang, setLang] = useState<Lang>('zh')    // 语言(localStorage 持久化)
  useIsoLayoutEffect(() => { try { const l = localStorage.getItem(LANG_KEY) as Lang | null; if (l === 'zh' || l === 'en' || l === 'ko') setLang(l) } catch { /* ignore */ } }, [])
  const setLangSaved = (l: Lang) => { try { localStorage.setItem(LANG_KEY, l) } catch { /* ignore */ } ; setLang(l) }
  const t = makeT(lang)
  // 大分类标签:'未分类' 复用规范 key cell.uncat(字典无 broad.未分类,否则会回退成原样输出 "broad.未分类")
  const broadLabel = (v?: string) => (v && v !== '未分类' ? t('broad.' + v) : t('cell.uncat'))
  const catLabel = (v?: string) => (!v || v === '未分类' ? t('cell.uncat') : catName(t, v))
  const toggleSort = (key: ColKey) =>
    setSort((s) => {
      if (s.key !== key) return { key, dir: 'desc' }       // 新列:降序
      if (s.dir === 'desc') return { key, dir: 'asc' }      // 第二下:升序
      // 第三下:取消 → 回本视图默认(匹配视图=匹配度,普通视图=发布时间;#127 评分默认序退役)
      return matchView ? { key: 'match', dir: 'desc' } : { key: 'datePosted', dir: 'desc' }
    })

  // 迁移:老用户有 localStorage 列偏好但还没 cookie(本次改动前设的)→ 应用 + 补写 cookie(一次性)。
  // 有 cookie 时服务端已渲对的列、initialCols 已传入 → 直接 return,不进迁移。
  useIsoLayoutEffect(() => {
    if (initialCols && initialCols.length) return
    try {
      const saved = localStorage.getItem(PREF_KEY)
      if (saved) {
        const keys = (JSON.parse(saved) as ColKey[]).filter((k) => COLUMNS.some((c) => c.key === k))
        if (keys.length) { setVisible(keys); writeColsCookie(keys) }
      }
    } catch { /* ignore */ }
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps
  const saveCols = (next: ColKey[]) => {
    writeColsCookie(next)                                      // 写 cookie:下次刷新服务端直接渲对
    try { localStorage.setItem(PREF_KEY, JSON.stringify(next)) } catch { /* ignore */ }  // 留一份兜底
    setVisible(next)
    setWidths({})                                             // 列集变了 → 回自动布局(否则新列在固定布局里塌陷成 0)
  }
  const toggleCol = (key: ColKey) => saveCols(visible.includes(key) ? visible.filter((k) => k !== key) : [...visible, key])
  // match 列不进列选择器(E5-05:独立视图专属;老 cookie 里的 match 也在 shown 处剔除)
  const TOGGLABLE = COLUMNS.filter((c) => !c.always && c.key !== 'match').map((c) => c.key)
  const selectAllCols = () => saveCols(TOGGLABLE)
  const invertCols = () => saveCols(TOGGLABLE.filter((k) => !visible.includes(k)))
  const mainCols = () => saveCols(DEFAULT_COLS) // 一键只显示默认的核心列
  const shownBase = COLUMNS.filter((c) => c.key !== 'match' && (c.always || visible.includes(c.key)))
  // 匹配视图:match 固定第一列,其余照用户列偏好
  const shownAll = matchView ? [COLUMNS.find((c) => c.key === 'match')!, ...shownBase] : shownBase

  // ── 列宽:默认纯自动布局(table-layout:auto,永不截断);用户拖表头竖线/双击才切固定布局。
  //    会话内有效、不落 localStorage —— 刷新即回自动布局。当初 bug 正是「localStorage 固定布局 +
  //    缺测列兜底 130px」导致加载后截断/收缩;此处切固定前**全量实测**每列自然宽,无任何常量兜底,
  //    故任何列都不会被压窄。切换可见列时清回自动(防新列塌陷成 0)。
  const [widths, setWidths] = useState<Record<string, number>>({})
  const headRowRef = useRef<HTMLTableRowElement>(null)
  const hasWidths = Object.keys(widths).length > 0

  // #35 已整轮回滚(2026-07-11 用户三轮拍板互斥后收敛:宽度不变+可滑动+无小注 = 原状):
  // v1 整列隐藏+小注 → 用户否;v2 容器收口到整列边界 → 用户否(表格变窄)。维持全宽横滚,末列
  // 在视口边缘被切属滚动常态,不再干预。此教训记档:改表格布局前先给用户看效果图。
  const shown = shownAll
  const totalW = shown.reduce((s, c) => s + (widths[c.key] ?? 0), 0)
  const resetWidths = () => setWidths({})

  // ── 固定左列(发布时间/大分类/公司/职位):横滚时 sticky 不动;其余列超宽则横向滚动可见 ──
  //    列给最小宽 → 列多时表格自然超容器 → 滚动看隐藏列;列少时 width:100% 拉满平均分配。
  const shownKey = shown.map((c) => c.key).join(',')
  const FROZEN = new Set<ColKey>(['datePosted', 'broad', 'company', 'title'])
  // 只冻结**最左连续**的固定列:中间插了非固定列就停,保证 sticky 偏移=真实累计位置(不会错位)
  const frozenKeys: ColKey[] = []
  for (const c of shown) { if (FROZEN.has(c.key)) frozenKeys.push(c.key); else break }
  const frozenSet = new Set(frozenKeys)
  const lastFrozen = frozenKeys[frozenKeys.length - 1]
  const [stickyLeft, setStickyLeft] = useState<Record<string, number>>({})
  const measureSticky = () => {  // 先量固定列实宽 → 算累计 left,再贴 sticky(先计算再显示)
    const head = headRowRef.current
    if (!head) return
    const offs: Record<string, number> = {}
    let cum = 0
    frozenKeys.forEach((key, i) => {
      offs[key] = cum
      const el = head.children[i] as HTMLElement | undefined
      cum += el ? Math.round(el.getBoundingClientRect().width) : 0
    })
    setStickyLeft(offs)
  }
  useIsoLayoutEffect(() => { measureSticky() }, [shownKey, hasWidths])  // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    window.addEventListener('resize', measureSticky)
    return () => window.removeEventListener('resize', measureSticky)
  }, [shownKey])  // eslint-disable-line react-hooks/exhaustive-deps

  // 固定列单元格:sticky + 累计 left + 不透明底色(挡住滚动内容);末固定列加右阴影分隔
  const frozenStyle = (key: ColKey, bg: string): React.CSSProperties =>
    !hasWidths && frozenSet.has(key) && stickyLeft[key] != null
      ? { position: 'sticky', left: stickyLeft[key], zIndex: 3, background: bg, ...(key === lastFrozen ? { boxShadow: '3px 0 5px -3px rgba(0,0,0,.18)' } : null) }
      : {}
  // 每列最小宽:文本列宽些(列内换行),其余够放原子值即可 → 列多时整表超容器可横滚
  // #85(Frank「最后一列宽度叠一起」):actions 原默认 78px 塞不下三钮 → 给足最小宽,配合 cell 内 flex wrap 兜底
  const MIN_W: Partial<Record<ColKey, number>> = { title: 170, company: 140, address: 150, datePosted: 92, lastSeen: 96, closedAt: 92, salary: 100, salaryYr: 86, wageMedHr: 88, wageMedYr: 88, actions: 92 }
  const colMin = (k: ColKey) => (hasWidths ? undefined : (MIN_W[k] ?? 78))
  // 量当前表头每个可见列的自然渲染宽(auto 布局下为真实内容宽),返回覆盖全可见列的完整 map
  const measureAll = (): Record<string, number> => {
    const head = headRowRef.current
    const m: Record<string, number> = {}
    if (head) shown.forEach((c, i) => {
      const el = head.children[i] as HTMLElement | undefined
      if (el) m[c.key] = Math.round(el.getBoundingClientRect().width)
    })
    return m
  }
  // 拖某列右缘竖线:先以全量实测作基线(已有手动宽优先),再只改本列宽 —— 左列不动、右列平移
  const startResize = (e: React.MouseEvent, key: string) => {
    e.preventDefault(); e.stopPropagation()
    const base = { ...measureAll(), ...widths }
    const startX = e.clientX
    const startW = base[key] ?? 120
    setWidths(base)
    const onMove = (ev: MouseEvent) => setWidths((p) => ({ ...p, [key]: Math.max(56, startW + (ev.clientX - startX)) }))
    const onUp = () => {
      document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); document.body.style.cursor = ''
    }
    document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp); document.body.style.cursor = 'col-resize'
  }
  // 双击竖线:按内容自适应该列(量表头+各行该列 scrollWidth 取 max+余量)——只会变宽,永不截断
  const autoFitColumn = (idx: number, key: string) => {
    const head = headRowRef.current
    const table = head?.closest('table') as HTMLTableElement | null
    if (!head || !table) return
    const base = { ...measureAll(), ...widths }
    let max = (head.children[idx] as HTMLElement).scrollWidth
    table.querySelectorAll('tbody tr').forEach((tr) => {
      const cell = (tr as HTMLElement).children[idx] as HTMLElement | undefined
      if (cell) max = Math.max(max, cell.scrollWidth)
    })
    base[key] = Math.max(56, max + 6)
    setWidths(base)
  }

  // Esc 关弹框
  useEffect(() => {
    if (!popup && !actModal) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') { setPopup(null); setActModal(null) } }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [popup, actModal])

  // 点击其他区域关闭「字段」下拉
  useEffect(() => {
    if (!colOpen) return
    const h = (e: MouseEvent) => { if (colRef.current && !colRef.current.contains(e.target as Node)) setColOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [colOpen])

  // 分页(E10-01 P3:服务端分页)——筛选/搜索/排序/切匹配视图变化 → 回第 0 页(fetch effect 随之重拉替换)
  useEffect(() => { setPage(0) }, [q, directOnly, fCountry, fProv, fCity, fDistrict, fBroad, fMid, fFine, fTeer, fSource, fAcc, fPnp, fAip, fStatus, fOrigin, fScore, fSal, fVs, fEmp, fElig, sort, matchView])

  // 联动选项来自维度表(provinces/cities/districts;E10-01 P3:维度独立加载后不再从 job 行现推)。
  // 国家/TEER 下拉已删(2026-07-07 文案审计);fCountry/fTeer state 保留给已存的 saved-search 兼容
  const provOpts = useMemo(() => dims.provinces.map((p) => p.name), [dims])
  const cityOpts = useMemo(() => { const code = fProv ? PROV_CODE[fProv] : ''; return uniq(dims.cities.filter((c) => !code || c.province === code).map((c) => c.name)) }, [dims, fProv])
  const distOpts = useMemo(() => { const code = fProv ? PROV_CODE[fProv] : ''; return uniq(dims.districts.filter((d) => (!code || d.province === code) && (!fCity || d.city === fCity)).map((d) => d.name)) }, [dims, fProv, fCity])
  // 分类筛选项来自维度表(noc_categories)
  const nc = dims.nocCategories
  const broadOpts = useMemo(() => uniq(nc.map((c) => c.broad)), [nc])
  const midOpts = useMemo(() => uniq(nc.filter((c) => !fBroad || c.broad === fBroad).map((c) => c.mid)), [nc, fBroad])
  const fineOpts = useMemo(() => uniq(nc.filter((c) => (!fBroad || c.broad === fBroad) && (!fMid || c.mid === fMid)).map((c) => c.fine)), [nc, fBroad, fMid])
  // 来源/状态/经验/评分下拉已下架(2026-07-16 拍板只留薪资);state 与谓词保留=URL/老保存筛选照常生效
  const anyFilter = q || directOnly || fCountry || fProv || fCity || fDistrict || fBroad || fMid || fFine || fTeer || fSource || fAcc || fPnp || fAip || fStatus || fOrigin || fScore || fSal || fVs || fEmp || fElig
  const clearAll = () => {
    setQ(''); setDirectOnly(false); setFCountry(''); setFProv(''); setFCity(''); setFDistrict(''); setFBroad(''); setFMid(''); setFFine(''); setFTeer(''); setFSource(''); setFAcc(''); setFPnp(''); setFAip(''); setFStatus(''); setFOrigin(''); setFScore(''); setFSal(''); setFVs(''); setFEmp(''); setFElig('')
    // 深链参数一并摘除(2026-07-19 Frank:「点击清除筛选,一刷新又回去了」)——否则刷新时 URL 初始化又读回来
    try {
      const u = new URL(window.location.href)
      for (const k of ['q', 'prov', 'broad', 'mid']) u.searchParams.delete(k)
      window.history.replaceState(null, '', u.pathname + (u.searchParams.toString() ? '?' + u.searchParams.toString() : '') + u.hash)
    } catch { /* ignore */ }
  }

  // ── E10-01 P3:筛选/搜索/排序/翻页全部打 /api/jobs(服务端 WHERE+分页);rows/total 来自服务端。
  //    useDeferredValue 让搜索输入跟手(dq 变化触发重拉,滞后一帧);reqSeq 丢弃晚到的旧响应。
  const dq = useDeferredValue(q)
  const firstFetch = useRef(true)
  useEffect(() => {
    const sp = new URLSearchParams()
    const term = dq.trim(); if (term) sp.set('q', term)
    if (directOnly) sp.set('directOnly', '1')
    for (const [k, v] of ([['fProv', fProv], ['fCity', fCity], ['fDistrict', fDistrict], ['fCountry', fCountry], ['fBroad', fBroad], ['fMid', fMid], ['fFine', fFine], ['fTeer', fTeer], ['fSource', fSource], ['fAcc', fAcc], ['fPnp', fPnp], ['fAip', fAip], ['fStatus', fStatus], ['fOrigin', fOrigin], ['fScore', fScore], ['fSal', fSal], ['fVs', fVs], ['fEmp', fEmp], ['fElig', fElig]] as [string, string][])) if (v) sp.set(k, v)
    if (sort.key) { sp.set('sort', sort.key); sp.set('dir', sort.dir) }
    if (matchView) sp.set('view', 'match')
    sp.set('page', String(page))
    // 首屏 page0 且无筛选非匹配 = SSR 已给 → 跳过首次重复拉取(不闪)
    if (firstFetch.current) { firstFetch.current = false; if (page === 0 && !matchView && !anyFilter) return }
    const seq = ++reqSeq.current
    setLoading(true)
    fetch('/api/jobs?' + sp.toString(), { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (seq !== reqSeq.current || !d) return
        setTotal(d.total ?? 0)
        if (d.updatedAt) setUpdatedAt(d.updatedAt)
        setMatchTotals(typeof d.matchHigh === 'number' ? { high: d.matchHigh, mid: d.matchMid || 0 } : null)
        setRows(page === 0 ? (d.rows || []) : (prev) => [...prev, ...(d.rows || [])])
      })
      .catch(() => { /* 网络失败:留现有行 */ })
      .finally(() => { if (seq === reqSeq.current) setLoading(false) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dq, directOnly, fCountry, fProv, fCity, fDistrict, fBroad, fMid, fFine, fTeer, fSource, fAcc, fPnp, fAip, fStatus, fOrigin, fScore, fSal, fVs, fEmp, fElig, sort, matchView, page])

  // 推荐板(E10-01 P3:blob 没了 → 用 /api/jobs 按组合拉前 3 + 总数;组合由 recs[0] 给,评分降序)
  const [recData, setRecData] = useState<{ cards: JobRow[]; total: number } | null>(null)
  useEffect(() => {
    const r = recs[0]
    if (!r || anyFilter || matchView) { setRecData(null); return }
    const sp = new URLSearchParams()
    if (r.prov) sp.set('fProv', PROV_NAMES[r.prov] || r.prov)
    if (r.broad) sp.set('fBroad', r.broad)
    if (r.sal) sp.set('fSal', r.sal)
    sp.set('sort', 'score'); sp.set('dir', 'desc'); sp.set('page', '0')
    let dead = false
    fetch('/api/jobs?' + sp.toString(), { credentials: 'include' })
      .then((x) => (x.ok ? x.json() : null))
      .then((d) => { if (!dead) setRecData({ cards: d?.rows || [], total: d?.total || 0 }) })
      .catch(() => { if (!dead) setRecData({ cards: [], total: 0 }) })
    return () => { dead = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recs, anyFilter, matchView])
  // 横幅槽位联动(反 CLS):水合后按真实显隐纠正 <html> 的 recslot 类——预判错了收回空槽,关横幅/套筛选后也收回。
  // 必须置于 anyFilter/recData 声明之后:effect 依赖数组在渲染时求值,不能引用声明在后的变量(TDZ)。
  // #75:纠正必须看「卡片实际可见数」——cards 拉空/全被「不感兴趣」时 section 渲染 null,只看 recs.length
  // 会把 48px 空带永久留在页头下;recData 未回(null)期间保留占位,维持反 CLS 初衷。
  useEffect(() => {
    const visible = recData ? recData.cards.filter((j) => !dismissedRec.has(String(j.id))).length : 1
    try { document.documentElement.classList.toggle('recslot', recs.length > 0 && !anyFilter && !matchView && visible > 0) } catch { /* ignore */ }
  }, [recs, anyFilter, matchView, recData, dismissedRec])

  return (
    <div style={{ background: '#fff', color: '#1f2937', minHeight: '100vh', fontFamily: 'system-ui, sans-serif', display: 'flex', flexDirection: 'column' }}>
      <style>{`.jcellAct:hover{background:#eff6ff !important}
        .colResize:hover{background:#93c5fd}
        .colResize:active{background:#3b82f6}
        .jtCards{display:none}
        .recSlot{min-height:0}
        html.recslot .recSlot{min-height:48px}
        @media (max-width:640px){
          .jtHideNarrow{display:none !important}
          .jtTableWrap{display:none !important}
          .jtCards{display:flex}
        }
        @media (max-width:1350px){.jtTagline{display:none}}`}</style>
      {/* 顶栏=全站统一 SiteHeader(#65 header 合一,2026-07-18 Frank 拍板;内联头退役,1320 头轨全站一致)。
          /jobs 特有件走 props:matchButton 切换态 + 完整 AccountArea(plan 下拉/弹框)。
          差异认账:未登录点「我的账户」由弹框改为 /account 302 回 /?login=1(终点同为登录框)。 */}
      <SiteHeader lang={lang} setLang={setLangSaved} t={t} sticky loggedIn={plan.loggedIn}
        matchButton={{ active: matchView, onClick: toggleMatchView }}
        accountArea={<AccountArea t={t} plan={plan} />}
        searchBar={/* E8-07 C:窄屏常驻搜索=同一 q state(即时筛选不刷页);筛选区原输入窄屏藏(jtHideNarrow) */
          <input placeholder={t('search.placeholder')} value={q} onChange={(e) => setQ(e.target.value)} enterKeyHint="search"
            style={{ width: '100%', boxSizing: 'border-box', height: 38, padding: '0 12px', border: '1px solid #d1d5db', borderRadius: 10, fontSize: 14, color: '#1f2937', background: '#fafafa' }} />} />
      {/* 榜单/统计弹窗已退役(2026-07-11 用户拍板顶栏改跳转页面);/stats 页「看职位」?prov=&broad= 回流照旧 */}
      {/* 价值横幅退役(#65 收尾,Frank:「不需要两个蓝条」)——建档 CTA 并进下方 Jobs 页头右槽 */}
      <div style={{ maxWidth: 1320, margin: '0 auto', padding: '1rem 1.25rem 1.5rem', width: '100%', boxSizing: 'border-box', flex: '1 0 auto' }}>
        {/* 页头=PageBanner(#65/#66 五模块统一浅色带,职位板=蓝)。标题数字口径不变:
            库内真实总数(第 15 轮 #34)/筛选匹配态只报命中数(第 17 轮 #42);证言行(第 5 轮 #14)作 sub */}
        <PageBanner module="jobs" title="Jobs" images={BANNER_IMGS.jobs}
          sub={<>
            {anyFilter || matchView ? t('subtitle.hits', { n: total }) : t('subtitle.count', { n: total })}
            {/* #170(Frank 批,实测证据):这行证言在 375px 上是 nowrap+省略号 —— 后半截被直接切掉,
                也就是说「N 家雇主有外劳雇佣记录」这条**手机用户从来没看见过**,而手机是主要流量。
                横幅手机高只有 104px,硬塞挤爆 → 窄屏整条隐藏(与数字胶囊 .pbStat 同一条媒体查询),
                只留「N 个职位」;证言是说服性内容,在首屏抢不过职位数。 */}
            {proof && (proof.named > 0 || proof.lmia > 0) && <span className="pbProof" style={{ marginLeft: 10 }}>{t('subtitle.proof', { named: proof.named, lmia: proof.lmia })}</span>}
          </>}
          right={!plan.loggedIn && (
            // #165(Frank 报障「这个按钮在手机端会挡住信息」):CTA 在横幅右槽带 nowrap + flexShrink:0,
            // **既不换行也不收缩** → 375px 上整条字占掉右半边,左边标题与职位数被压成省略号。
            // 旁边的数字胶囊(.pbStat)本就做了窄屏隐藏,这个漏了。
            // 不能直接隐藏它(手机是主要流量,建档是转化入口)→ 窄屏换短标签,长短同一枚不重复排版。
            // 注:JSX 属性位不能放 {/* */} 注释(TS1005),注释要写在表达式内 —— 与「return( 后不能跟注释」同类。
            <a href="/?signup=1" style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>
              <style>{'@media(max-width:640px){.ctaLong{display:none}.ctaShort{display:inline}}@media(min-width:641px){.ctaShort{display:none}}'}</style>
              <IconTarget /> <span className="ctaLong">{t('banner.text')}</span><span className="ctaShort">{t('banner.textShort')}</span>
            </a>
          )} />

        {/* 推荐板块(2026-07-17「找工作为主」重构):原蓝条降级为职位列表上方的「推荐岗位」内容行——
            取最强组合出前 3 张匹配岗卡片,每张可「不感兴趣」;有筛选/匹配视图时不打扰。
            外层 .recSlot=首帧占位槽(page.tsx 内联脚本预判,反「刷新后弹」CLS) */}
        <div className="recSlot">
        {recs.length > 0 && !anyFilter && !matchView && (() => {
          const r = recs[0]  // v1 只出最强的那个组合(多组合切换留后续)
          const cards = (recData?.cards || []).filter((j) => !dismissedRec.has(String(j.id))).slice(0, 3)  // E10-01 P3:组合前 3 从 /api/jobs 拉
          if (!cards.length) return null
          const chips = [r.prov, r.broad ? broadLabel(r.broad) : '', r.sal ? t('sal.' + r.sal) : ''].filter(Boolean).join(' · ')
          // fProv 值域=省全称(行过滤比较);r.prov 是省码,转全称再落,否则套出空列表
          const applyFilter = () => { setFProv(r.prov ? (PROV_NAMES[r.prov] || r.prov) : ''); setFCity(''); setFDistrict(''); if (r.broad) { setFBroad(r.broad); setFMid(''); setFFine('') } if (r.sal) setFSal(r.sal) }
          const tag = (bg: string, c: string, s: string) => <span style={{ fontSize: 11, color: c, background: bg, borderRadius: 5, padding: '2px 7px' }}>{s}</span>
          return (
            <section style={{ border: '0.5px solid #e5e7eb', borderRadius: 12, padding: '12px 14px', margin: '12px 0 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 500, color: '#374151' }}>{t(r.src === 'geo' ? 'rec.geoPrefix' : 'rec.prefix')}</span>
                <span style={{ fontSize: 12, color: '#4338ca', background: '#eef2ff', borderRadius: 20, padding: '3px 10px' }}>{chips}</span>
                <button onClick={() => { if (!plan.loggedIn) setUpsell('lock'); else setWizard(true) }}
                  style={{ marginLeft: 'auto', border: 'none', background: 'none', color: '#4f46e5', fontSize: 12.5, cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>{t('rec.build')}</button>
                <button onClick={() => { try { localStorage.setItem(PREF_HIDE, new Date().toLocaleDateString('en-CA')) } catch { /* ignore */ } setRecs([]) }}
                  aria-label="close" style={{ border: 'none', background: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 15, padding: '0 2px' }}>×</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 10 }}>
                {cards.map((j) => (
                  <div key={j.id} style={{ position: 'relative', background: '#f9fafb', borderRadius: 8, padding: '10px 12px' }}>
                    <button onClick={() => setDismissedRec((s) => new Set(s).add(String(j.id)))} title={t('rec.notInterested')} aria-label={t('rec.notInterested')}
                      style={{ position: 'absolute', top: 6, right: 7, border: 'none', background: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 13, padding: 0 }}>×</button>
                    <button onClick={() => setActModal({ kind: 'desc', job: j })}
                      style={{ display: 'block', textAlign: 'left', border: 'none', background: 'none', padding: 0, cursor: 'pointer', width: '100%' }}>
                      <div style={{ fontSize: 13.5, fontWeight: 500, color: '#111827', paddingRight: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.title}</div>
                      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{[j.company, j.city].filter(Boolean).join(' · ')}</div>
                      {j.salaryAnnual != null && <div style={{ fontSize: 12.5, color: '#111827', marginTop: 4 }}>${Math.round(j.salaryAnnual / 1000)}K/yr</div>}
                    </button>
                    <div style={{ display: 'flex', gap: 5, marginTop: 7, flexWrap: 'wrap' }}>
                      {j.pnpEligible && tag('#dcfce7', '#15803d', 'PNP')}
                      {j.lmiaPositions ? tag('#eef2ff', '#4338ca', 'LMIA') : null}
                      {j.eeCategory && tag('#dbeafe', '#1e40af', 'EE')}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 10 }}>
                <button onClick={applyFilter} style={{ border: 'none', background: 'none', color: '#4f46e5', fontSize: 12.5, cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>
                  {t('rec.seeAll', { n: recData?.total ?? 0 })}
                </button>
              </div>
            </section>
          )
        })()}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '1rem 0' }}>
          {/* ═══ #59 筛选区重设计(2026-07-18 效果图过目后 Frank「可以」):5 行 label+下拉收成
              「常用一行(搜索/省/大类/PNP/年薪)+ 更多筛选折叠(激活计数徽标)」;07-07 行序拍板与
              窄屏抽屉(jtDrawerToggle)一并退役——一行+折叠对窄屏同样成立,靠 flexWrap 自然换行。
              右端=更新时间+字段钮(#56 拍板延续)。市/区、中/小类仍是省/大类的联动下级,只在折叠区出现。 ═══ */}
          <div style={filtRow}>
            <input className="jtHideNarrow" placeholder={t('search.placeholder')} value={q} onChange={(e) => setQ(e.target.value)} style={{ ...ctrl, flex: '0 1 260px', minWidth: 160 }} />
            <Sel value={fProv} onChange={(v) => { setFProv(v); setFCity(''); setFDistrict('') }} opts={provOpts} all={t('all.prov')} />
            <Sel value={fBroad} onChange={(v) => { setFBroad(v); setFMid(''); setFFine('') }} opts={broadOpts} all={t('all.broad')} labelOf={broadLabel} />
            <Sel value={fPnp} onChange={setFPnp} opts={['yes', 'no']} all={t('all.pnp')} labelOf={(v) => t('opt.' + v)} />
            <Sel value={fSal} onChange={setFSal} opts={['ge100', '80', '60', 'u60']} all={t('all.sal')} labelOf={(v) => t('sal.' + v)} />
            {/* P1 换装:secondary 型(激活态浅蓝底描边蓝);高度 38 与同行下拉对齐 */}
            <Button kind="secondary" onClick={() => setFDrawer((o) => !o)}
              style={{ height: 38, display: 'inline-flex', alignItems: 'center', gap: 5, color: '#374151', ...(fDrawer || foldActive ? { background: '#eff6ff', borderColor: '#2563eb', color: '#1d4ed8' } : {}) }}>
              {t('filter.more')}
              {foldActive > 0 && <span style={{ background: '#2563eb', color: '#fff', borderRadius: 999, fontSize: 10.5, padding: '0 6px', lineHeight: '15px' }}>{foldActive}</span>}
              <span style={{ fontSize: 10, color: '#9ca3af' }}>{fDrawer ? '▲' : '▼'}</span>
            </Button>
            {anyFilter && <Button kind="secondary" onClick={clearAll} style={{ height: 38, color: '#b91c1c' }}>{t('clear')}</Button>}
            {/* 保存此筛选(E5-03;D1 2026-07-19 降免费):登录即可存,免费 2/Pro 5——免费触上限才弹升级 */}
            {anyFilter && plan.loggedIn && (
              <button
                onClick={async () => {
                  const name = window.prompt(t('ss.name'))
                  if (!name) return
                  const filters = { q, directOnly, fCountry, fProv, fCity, fDistrict, fBroad, fMid, fFine, fTeer, fSource, fAcc, fPnp, fAip, fStatus, fOrigin, fScore, fSal, fVs, fEmp, fElig }
                  const r = await fetch('/api/saved-searches', {
                    method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, filters, lang }),
                  }).catch(() => null)
                  if (r?.ok) { alert(t('ss.saved')); return }
                  let limitHit = false
                  try { limitHit = /limit/i.test(JSON.stringify(await r?.json())) } catch { /* 非 JSON,走 generic */ }
                  if (limitHit && !plan.isPro) setUpsell('ss')  // 免费位(2)用满 → 升级框「Pro 可存 5 个」
                  else alert(t('ss.err'))
                }}
                style={{ ...ctrl, cursor: 'pointer', background: '#eef2ff', color: '#3730a3' }}>
                <IconSave /> {t('ss.save')}
              </button>
            )}
            <div ref={colRef} className="jtHideNarrow" style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto' }}>
              {updatedAt && <span style={{ color: '#9ca3af', fontSize: 12, whiteSpace: 'nowrap' }}>{t('updated', { t: fmtLocal(updatedAt) })}</span>}
              <Button kind="secondary" onClick={() => setColOpen((o) => !o)} style={{ height: 38, display: 'inline-flex', alignItems: 'center', color: '#374151' }}><IconSettings style={{ marginRight: 5 }} />{t('fields', { n: shown.length })}</Button>
              {colOpen && (
                <div style={colPanel}>
                  <div style={{ display: 'flex', gap: 6, padding: '2px 4px 6px', borderBottom: '1px solid #f3f4f6', marginBottom: 4 }}>
                    <button onClick={mainCols} style={{ ...colBtn, fontWeight: 600, color: '#2563eb', borderColor: '#bfdbfe' }}>{t('fields.main')}</button>
                    <button onClick={selectAllCols} style={colBtn}>{t('fields.all')}</button>
                    <button onClick={invertCols} style={colBtn}>{t('fields.invert')}</button>
                    {hasWidths && <button onClick={resetWidths} style={colBtn}>{t('fields.resetW')}</button>}
                  </div>
                  {/* match 列是「我的匹配」视图专属(E5-05),勾了也不出列——不进选择器(第 2 轮 #11) */}
                  {COLUMNS.filter((c) => c.key !== 'match').map((c) => (
                    <label key={c.key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px', fontSize: 13, color: c.always ? '#9ca3af' : '#1f2937', cursor: c.always ? 'default' : 'pointer' }}>
                      <input type="checkbox" checked={c.always || visible.includes(c.key)} disabled={c.always} onChange={() => toggleCol(c.key)} />
                      {t('col.' + c.key)}{c.always ? t('fields.fixed') : ''}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
          {/* #59 折叠区:低频筛选(市/区、中/小类、AIP/类型/对比中位/直发);state 全保留=老保存筛选照常生效 */}
          {fDrawer && (
            <div style={{ border: '1px dashed #d1d5db', borderRadius: 8, padding: '10px 12px', background: '#fafafa', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={filtRow}>
                <span style={filtLabel}>{t('filter.geo')}</span>
                <Sel value={fCity} onChange={(v) => { setFCity(v); setFDistrict('') }} opts={cityOpts} all={t('all.city')} />
                <Sel value={fDistrict} onChange={setFDistrict} opts={distOpts} all={t('all.district')} />
              </div>
              <div style={filtRow}>
                <span style={filtLabel}>{t('filter.cat')}</span>
                <Sel value={fMid} onChange={(v) => { setFMid(v); setFFine('') }} opts={midOpts} all={t('all.mid')} labelOf={catLabel} />
                <Sel value={fFine} onChange={setFFine} opts={fineOpts} all={t('all.fine')} labelOf={catLabel} />
              </div>
              {/* gig=兼职∪casual∪seasonal(E6-06);未标注岗选类型自然不命中,与「未分类」同一诚实口径 */}
              <div style={filtRow}>
                <span style={filtLabel}>{t('filter.other')}</span>
                <Sel value={fAip} onChange={setFAip} opts={['yes', 'no']} all={t('all.aip')} labelOf={(v) => t('opt.' + v)} />
                <Sel value={fEmp} onChange={setFEmp} opts={['full', 'part', 'gig']} all={t('all.emp')} labelOf={(v) => t('emp.' + v)} />
                <Sel value={fVs} onChange={setFVs} opts={['above', 'above20', 'below']} all={t('all.vs')} labelOf={(v) => t('vs.' + v)} />
                <label style={{ ...ctrl, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', background: directOnly ? '#eef2ff' : '#fff', whiteSpace: 'nowrap' }} title={t('directOnly.tip')}>
                  <input type="checkbox" checked={directOnly} onChange={(e) => setDirectOnly(e.target.checked)} />{t('directOnly')}
                </label>
                {/* GAP1③:排除 JD 明确不担保/须 PR 的岗(红旗=数据层检测;未检出=通过,非担保保证) */}
                <label style={{ ...ctrl, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', background: fElig ? '#eef2ff' : '#fff', whiteSpace: 'nowrap' }} title={t('eligOnly.tip')}>
                  <input type="checkbox" checked={fElig === 'ok'} onChange={(e) => setFElig(e.target.checked ? 'ok' : '')} />{t('eligOnly')}
                </label>
              </div>
            </div>
          )}
        </div>

        {/* 匹配视图状态条(E5-05):说明口径 + 退出;免费限额提示(D1=B) */}
        {matchView && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', background: '#eff6ff', border: '1px solid #dbeafe', borderRadius: 8, padding: '7px 12px', marginBottom: 8, fontSize: 12.5 }}>
            {/* 只报「高」(第 6 轮 #23):中匹配门槛宽、数字动辄数千,报出来像灌水,反而稀释高匹配的可信度 */}
            {/* 匹配全放开(Frank 2026-07-21):不再报「免费仅前 N」封顶——只留「今日 N 个高匹配」纯信息 */}
            <span style={{ color: '#1e40af', flex: 1, minWidth: 200 }}><IconTarget /> {t('mv.on')}{matchTotals && matchTotals.high > 0 ? ` · ${t('mv.today', { h: matchTotals.high })}` : ''}</span>
            <button onClick={toggleMatchView} style={{ border: 'none', background: 'none', padding: 0, color: '#6b7280', cursor: 'pointer', fontSize: 12.5 }}>{t('mv.exit')} ×</button>
          </div>
        )}
        {/* 字段选择+更新时间已并入薪资筛选行右侧(2026-07-11 用户拍板「这两个放到一行」) */}
        {/* #83(Frank「点我的匹配先跳医疗再跳科技」):整表换血(第 0 页在拉)期间旧行原样挂着零提示,
            视觉像跳两次——换血中表格/卡片半透明+顶部「更新中」条,数据回来再恢复 */}
        {loading && page === 0 && (
          <div style={{ fontSize: 12.5, color: '#2563eb', padding: '4px 2px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 10, border: '2px solid #bfdbfe', borderTopColor: '#2563eb', borderRadius: '50%', display: 'inline-block', animation: 'jtspin .7s linear infinite' }} />
            {t('loading')}
            <style>{`@keyframes jtspin{to{transform:rotate(360deg)}}`}</style>
          </div>
        )}
        <div className="jtTableWrap" style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflowX: 'auto', ...(loading && page === 0 && { opacity: 0.45, pointerEvents: 'none', transition: 'opacity .2s' }) }}>
          <table style={{ width: hasWidths ? totalW : '100%', minWidth: '100%', borderCollapse: 'collapse', fontSize: 13.5, tableLayout: hasWidths ? 'fixed' : 'auto' }}>
            {/* 末列宽设 auto:固定布局下吸收剩余空间,右缘始终贴齐容器,无右侧缝隙 */}
            {hasWidths && <colgroup>{shown.map((c, i) => <col key={c.key} style={{ width: i === shown.length - 1 ? 'auto' : widths[c.key] }} />)}</colgroup>}
            <thead>
              <tr ref={headRowRef} style={{ textAlign: 'left', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                {shown.map((c, idx) => {
                  const active = sort.key === c.key
                  const isLast = idx === shown.length - 1
                  const handle = (  // 列右缘竖线:拖动调本列宽 / 双击按内容自适应
                    <span className="colResize" onMouseDown={(e) => startResize(e, c.key)} onClick={(e) => e.stopPropagation()} onDoubleClick={(e) => { e.stopPropagation(); autoFitColumn(idx, c.key) }} title={t('resize.tip')}
                      style={{ position: 'absolute', top: 0, right: 0, width: 13, height: '100%', cursor: 'col-resize', zIndex: 2 }} />
                  )
                  if (c.key === 'actions') return (  // 操作列:普通末列,不排序
                    <th key={c.key} style={{ padding: '8px 12px', color: '#374151', fontWeight: 600, whiteSpace: 'nowrap', userSelect: 'none', position: 'relative', minWidth: colMin('actions') }}>
                      {t('col.actions')}{handle}
                    </th>
                  )
                  return (
                    <th key={c.key} onClick={() => toggleSort(c.key)} title={t('th.tip')}
                      style={{ padding: '8px 12px', color: active ? '#2563eb' : '#374151', fontWeight: 600, whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none', position: 'relative', borderRight: isLast ? undefined : '1px solid #e5e7eb', minWidth: colMin(c.key), ...(hasWidths && { overflow: 'hidden', textOverflow: 'ellipsis' }), ...frozenStyle(c.key, '#f9fafb') }}>
                      {t('col.' + c.key)}<span style={{ color: active ? '#2563eb' : '#d1d5db', fontSize: 11 }}>{active ? (sort.dir === 'desc' ? ' ▼' : ' ▲') : ' ↕'}</span>{handle}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {rows.map((j, i) => {
                // #175:地点列地图直连只留「地址」格,mapsFor 死代码删(省/市/区退回纯文本)
                const L = parseLoc(j)                                                       // 省/市/区
                const cat = colorOf(j.broad)
                const open = (field: ColKey, title: string) => openField(field, j, title)
                return (
                  <tr key={j.id} className="jrow" style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 ? '#fcfcfd' : '#fff' }}>
                    {shown.map((c, idx) => {
                      const k = c.key
                      const rowBg = i % 2 ? '#fcfcfd' : '#fff'
                      if (k === 'actions') return (  // 操作列:只留收藏(2026-07-19 Frank:公司信息=公司格同一弹框纯重复删;职位描述并进职位格点击)
                        <td key={k} style={{ ...td, minWidth: colMin('actions') }}>
                          <button onClick={(e) => { e.stopPropagation(); toggleSave(j) }}
                            style={{ ...actBtn, whiteSpace: 'nowrap', ...(saved[String(j.id)] ? { color: '#b45309', borderColor: '#fde68a', background: '#fffbeb' } : {}) }}>
                            {saved[String(j.id)] ? t('sj.saved') : t('sj.save')}
                          </button>
                        </td>
                      )
                      let href: string | null = null
                      let node: React.ReactNode
                      const extra: React.CSSProperties = {}
                      // Pro 专属列(E3-05):免费用户列位显示锁标(数据在服务端已剥离,改偏好/cookie 绕不过)
                      if (PRO_COLS.has(k) && !plan.isPro && k !== 'match') {
                        {/* ③ lockTip 按列说人话(hover 就知道锁着什么);#152:锁标改打码占位数——
                            「这儿有个数」比一把锁更能让人判断值不值,和详情页 #130 同一套 */}
                        node = (
                          <button title={t('up.lockTip.' + k)} onClick={(e) => { e.stopPropagation(); setUpsell('lock') }}
                            style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', color: '#b45309', font: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <span aria-hidden style={{ filter: 'blur(4px)', userSelect: 'none', color: '#4b5563' }}>{PRO_MASK[k] || '—'}</span>
                            <IconLock />
                          </button>
                        )
                        Object.assign(extra, { whiteSpace: 'nowrap', textAlign: 'center' as const })
                      }
                      else if (k === 'match') {  // 与我的匹配(E5-00):高=绿 chip / 中=蓝 / 低=灰 / 不适用=浅;未建档→引导。
                        // 匹配全放开(Frank 2026-07-21):所有岗都出真实档位,不再有「超额打码」档——收费只剩 Pro 数据列
                        if (j.match) {
                          const M: Record<string, { bg: string; fg: string }> = { high: { bg: '#dcfce7', fg: '#166534' }, mid: { bg: '#dbeafe', fg: '#1e40af' }, low: { bg: '#f3f4f6', fg: '#6b7280' }, na: { bg: '#fafafa', fg: '#c4c4c8' } }
                          const c2 = M[j.match]
                          node = <span style={{ background: c2.bg, color: c2.fg, fontWeight: 600, fontSize: 12, padding: '2px 8px', borderRadius: 6, whiteSpace: 'nowrap' }}>{t('match.' + j.match)}</span>
                          Object.assign(extra, { whiteSpace: 'nowrap' })
                        } else if (!plan.loggedIn || !plan.profileOk) {
                          node = <a href="/account" style={{ fontSize: 12, color: '#2563eb', textDecoration: 'none', whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>{t('match.needProfile')} →</a>
                        } else {
                          node = <span style={{ color: '#d1d5db' }}>—</span>; Object.assign(extra, { whiteSpace: 'nowrap', textAlign: 'center' as const })
                        }
                      }
                      else if (k === 'score') { node = j.gradeChannel != null ? t('gr.ch.' + j.gradeChannel) : (j.score ?? '—'); Object.assign(extra, { fontWeight: 500, whiteSpace: 'nowrap', fontSize: 12.5, color: gradeColor(j.gradeChannel) }) }  // #132 档名人话化(Frank「X/5 看不懂」);旧库未回填退 0-100 旧分
                      else if (k === 'broad') { node = broadLabel(j.broad); Object.assign(extra, { whiteSpace: 'nowrap', color: cat.fg, fontWeight: 500 }) }
                      else if (k === 'mid') { node = (!j.mid || j.mid === '未分类') ? t('cell.uncat') : catLabel(j.mid); Object.assign(extra, { whiteSpace: 'nowrap', color: '#4b5563' }) }
                      else if (k === 'fine') { node = (j.mid === '未分类' || !j.mid) ? '—' : catLabel(j.fine); Object.assign(extra, { whiteSpace: 'nowrap', color: '#4b5563' }) }
                      else if (k === 'teer') { node = j.teer == null ? '—' : `TEER ${j.teer}`; Object.assign(extra, { whiteSpace: 'nowrap', color: '#4b5563' }) }
                      else if (k === 'empHours') { node = j.employmentHours ? t('emp.' + j.employmentHours) : '—'; Object.assign(extra, { whiteSpace: 'nowrap', color: j.employmentHours ? '#4b5563' : '#d1d5db', fontSize: 12.5 }) }
                      else if (k === 'empTerm') { node = j.employmentTerm ? t('term.' + j.employmentTerm) : '—'; Object.assign(extra, { whiteSpace: 'nowrap', color: j.employmentTerm ? '#4b5563' : '#d1d5db', fontSize: 12.5 }) }
                      // #175:职位/公司格的外链 href 摘除——点击行为只剩弹框(外链出口在弹框/详情页里,一格一个动作)
                      else if (k === 'title') { node = j.title; Object.assign(extra, wrapCell(360), { color: '#2563eb' }) }
                      else if (k === 'company') { node = j.company; Object.assign(extra, wrapCell(190), { color: '#2563eb' }) }
                      else if (k === 'noc') node = j.noc || '—'
                      else if (k === 'accessibility') node = t('acc.' + (j.accessibility || 'unknown'))
                      else if (k === 'salary') { node = <span title={j.salary || ''}>{j.salaryText || '—'}</span>; Object.assign(extra, { color: j.salary ? '#15803d' : '#9ca3af' }) }
                      else if (k === 'salaryYr') { const a = j.salaryAnnual; node = a != null ? `$${Math.round(a / 1000)}K/yr` : '—'; Object.assign(extra, { whiteSpace: 'nowrap', color: a != null ? '#15803d' : '#9ca3af' }) }
                      else if (k === 'wageMedHr') { node = j.wageMedHourly != null ? `$${j.wageMedHourly}/hr` : '—'; Object.assign(extra, { whiteSpace: 'nowrap', color: j.wageMedHourly != null ? '#4b5563' : '#9ca3af' }) }
                      else if (k === 'wageMedYr') { const m = j.wageMedAnnual; node = m != null ? `$${Math.round(m / 1000)}K/yr` : '—'; Object.assign(extra, { whiteSpace: 'nowrap', color: m != null ? '#4b5563' : '#9ca3af' }) }
                      else if (k === 'vsMedian') { const a = j.salaryAnnual, m = j.wageMedAnnual; if (a != null && m) { const p = Math.round((a / m - 1) * 100); node = `${p >= 0 ? '+' : ''}${p}%`; Object.assign(extra, { whiteSpace: 'nowrap', fontWeight: 600, color: p >= 0 ? '#15803d' : '#b45309' }) } else { node = '—'; Object.assign(extra, { whiteSpace: 'nowrap', color: '#9ca3af' }) } }
                      else if (k === 'address') { href = j.address ? mapsUrl(j.address) : null; node = j.address || '—'; Object.assign(extra, wrapCell(220)) }
                      else if (k === 'direct') { const dr = isDirect(j); node = dr ? t('cell.first') : t('cell.repost'); Object.assign(extra, { whiteSpace: 'nowrap', color: dr ? '#15803d' : '#9ca3af', fontSize: 12.5 }) }
                      else if (k === 'country') { node = L.country || '—'; Object.assign(extra, { whiteSpace: 'nowrap', color: '#4b5563' }) }
                      // 省/市 → 地图直连(Frank 2026-07-21:省市文字加跳转);区/来源仍纯文本
                      else if (k === 'province') { href = L.prov ? mapsUrl(mapQuery('province', j)) : null; node = L.prov || '—'; Object.assign(extra, { whiteSpace: 'nowrap', color: '#4b5563' }) }
                      else if (k === 'city') { href = L.city ? mapsUrl(mapQuery('city', j)) : null; node = L.city || '—'; Object.assign(extra, { whiteSpace: 'nowrap', color: '#4b5563' }) }
                      else if (k === 'district') { node = L.district || '—'; Object.assign(extra, { whiteSpace: 'nowrap', color: '#1f2937' }) }
                      else if (k === 'source') { node = sourceLabel(j); Object.assign(extra, { whiteSpace: 'nowrap', color: '#4b5563' }) }
                      else if (k === 'origin') { node = j.origin ? t('origin.' + j.origin) : '—'; Object.assign(extra, { whiteSpace: 'nowrap', color: '#4b5563' }) }
                      else if (k === 'pnp') {  // 三档强度 + 魁省N/A:强=具名紧缺通道(琥珀底色 chip,500)、中=可提名(绿,500)、弱=不符(灰—,400);魁省=紫,400(独立 N/A)
                        const stream = j.pnpStream  // 命中省 inclusion 清单才有,别处看不到的真信号
                        if (j.province === 'QC') { node = t('cell.pnpQc'); Object.assign(extra, { whiteSpace: 'nowrap', color: '#7c3aed', fontSize: 12.5 }) }
                        else if (stream) {       // 强:省点名招 → 浅琥珀底色徽章(全列唯一加底色的一档)
                          node = <span style={{ background: '#fef3c7', color: '#b45309', fontWeight: 500, fontSize: 12, padding: '2px 8px', borderRadius: 6, whiteSpace: 'nowrap' }}>{streamDisplay(t, stream)}</span>
                          Object.assign(extra, { whiteSpace: 'nowrap' })
                        }
                        else if (j.pnpEligible) { node = t('cell.pnpSkilled'); Object.assign(extra, { whiteSpace: 'nowrap', color: '#15803d', fontWeight: 500, fontSize: 12.5 }) }  // 中:可提名
                        else { node = '—'; Object.assign(extra, { whiteSpace: 'nowrap', color: '#9ca3af', fontSize: 12.5 }) }  // 弱:不符
                      }
                      else if (k === 'ee') {  // 联邦 EE 类别抽选(全国单一源,数据层算);命中→蓝,未列入→—
                        node = j.eeCategory ? eeDisplay(t, j.eeCategory) : '—'; Object.assign(extra, { whiteSpace: 'nowrap', color: j.eeCategory ? '#2563eb' : '#d1d5db', fontSize: 12.5 })
                      }
                      else if (k === 'aip') { node = j.aip ? t('cell.aipYes') : '—'; Object.assign(extra, { whiteSpace: 'nowrap', color: j.aip ? '#b45309' : '#d1d5db', fontSize: 12.5 }) }
                      else if (k === 'lmia') {  // E6-02:✓ 职位数 · 最近季度(历史事实;详情看弹框事实块)
                        node = j.lmiaPositions ? t('cell.lmiaYes', { n: j.lmiaPositions, q: j.lmiaLastQuarter }) : '—'
                        Object.assign(extra, { whiteSpace: 'nowrap', color: j.lmiaPositions ? '#0f766e' : '#d1d5db', fontSize: 12.5, fontWeight: j.lmiaPositions ? 500 : 400 })
                      }
                      else if (k === 'eligibility') {  // GAP1③:红旗=红字;未检出=灰杠(≠保证担保,口径看弹框)
                        node = j.eligibilityFlag ? t('cell.elig.' + j.eligibilityFlag) : '—'
                        Object.assign(extra, { whiteSpace: 'nowrap', color: j.eligibilityFlag ? '#b91c1c' : '#d1d5db', fontSize: 12.5, fontWeight: j.eligibilityFlag ? 600 : 400 })
                      }
                      else if (k === 'status') { const cl = j.status === 'closed'; node = cl ? t('cell.closed') : t('cell.open'); Object.assign(extra, { whiteSpace: 'nowrap', color: cl ? '#9ca3af' : '#15803d', fontSize: 12.5 }) }
                      else if (k === 'closedAt') { node = j.closedAt ? j.closedAt.slice(0, 10) : '—'; Object.assign(extra, { color: '#9ca3af', fontSize: 12.5, whiteSpace: 'nowrap' }) }
                      else if (k === 'datePosted') { node = j.datePosted ? j.datePosted.slice(0, 10) : '—'; Object.assign(extra, { color: '#6b7280', fontSize: 12.5, whiteSpace: 'nowrap' }) }
                      else { node = j.lastSeen ? fmtLocalSec(j.lastSeen) : '—'; Object.assign(extra, { color: '#9ca3af', fontSize: 12.5, whiteSpace: 'nowrap' }) }
                      // #175:hover 高亮只随可点格(可点必有态,不可点必无——E8-08 规范本来就这么写)
                      return (
                        <td key={k} className={cellActionable(k) ? 'jcell jcellAct' : 'jcell'} style={{ ...td, ...extra, cursor: cellActionable(k) ? 'pointer' : 'default', borderRight: idx === shown.length - 1 ? undefined : '1px solid #f3f4f6', minWidth: colMin(k), ...(NOWRAP_COLS.has(k) ? { whiteSpace: 'nowrap' } : { whiteSpace: 'normal', overflowWrap: 'break-word' }), ...(hasWidths && { overflow: 'hidden', textOverflow: 'ellipsis' }), ...frozenStyle(k, rowBg) }} title={typeof node === 'string' ? node : undefined} onClick={() => {
                          // 职位格=直开职位描述(2026-07-19 Frank:「点职位也能显示职位描述」);title 顾问弹框由 JD 框标题栏「AI 顾问」钮承接(同日报障回补)
                          if (k === 'title') { setActModal({ kind: 'desc', job: j }); return }
                          // Pro 锁列(免费态数据已在服务端剥离)不开顾问弹框——没数据只会误导;锁形本身已链去 /account。match 免费额度内有值仍可开。
                          if (PRO_COLS.has(k) && !plan.isPro && !(k === 'match' && j.match)) return
                          // 大标题=单元格字符串值;元素类 cell 只有薪资列回退薪资文本,其余留空(页眉已有字段名,别拿别列的值凑)
                          open(k, typeof node === 'string' ? node : (k === 'salary' ? (j.salaryText || j.salary || '') : ''))
                        }}>
                          {href
                            ? <a href={href} target="_blank" rel="noreferrer" style={link} onClick={(e) => e.stopPropagation()}>{node}</a>
                            : node}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
              {rows.length === 0 && (
                <tr><td colSpan={shown.length} style={{ padding: 24, textAlign: 'center', color: '#9ca3af' }}>
                  {matchView ? <>{t('mv.empty')} <a href="/account" style={{ color: '#2563eb', textDecoration: 'none' }}>{t('mv.editProfile')} →</a></> : t('empty')}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
        {/* 窄屏卡片列表(E8-03 续,2026-07-07 用户拍板):≤640px 表格→卡片,CSS 双渲染零水合差异(同 E8-03 抽屉手法)。
            卡=职位 / 公司·地点 / 薪资·时间 / 信号 chips;每处可点,开对应字段顾问弹窗(与桌面单元格同一 open());
            拍板:免费限额外的岗不显示匹配位(不放锁标,卡片寸土寸金);中位/渠道/NOC 码等低频字段留给弹窗。 */}
        <div className="jtCards" style={{ flexDirection: 'column', gap: 8, ...(loading && page === 0 && { opacity: 0.45, pointerEvents: 'none' }) }}>
          {rows.map((j) => {
            const open = (field: ColKey, title: string) => openField(field, j, title)  // 与表格行同一签名
            // #129(Frank「卡片本身点不进去」):整卡可点=进详情页;卡内既有交互(弹框/收藏/chips)stopPropagation 保持原行为
            const stop = (fn: () => void) => (e: React.MouseEvent) => { e.stopPropagation(); fn() }
            const L = parseLoc(j)
            const M: Record<string, { bg: string; fg: string }> = { high: { bg: '#dcfce7', fg: '#166534' }, mid: { bg: '#dbeafe', fg: '#1e40af' }, low: { bg: '#f3f4f6', fg: '#6b7280' } }
            const mc = j.match ? M[j.match] : undefined
            // #175:不可点的 chip 连 onClick 也摘(stopPropagation 会吞整卡点击=点了没反应)
            const chip = (bg: string, fg: string, txt: string, k: ColKey) => (
              <span key={k} onClick={cellActionable(k) ? stop(() => open(k, txt)) : undefined} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: bg, color: fg, cursor: cellActionable(k) ? 'pointer' : 'default', whiteSpace: 'nowrap' }}>{txt}</span>
            )
            const days = j.datePosted && (j.status || 'open') !== 'closed' ? Math.max(0, Math.floor((Date.now() - new Date(j.datePosted).getTime()) / 86400000)) : null
            return (
              <div key={j.id} onClick={() => { window.location.href = `/jobs/${j.id}` }}
                style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: '10px 12px', background: '#fff', cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
                  {/* #131(Frank 复拍推翻 #120B 蓝链):职位名文字=开 JD 弹框(和桌面职位格一致),整卡点击才进详情页;
                      <a href> 语义保留给爬虫/长按新开(preventDefault 只拦普通左键) */}
                  <a href={`/jobs/${j.id}`} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActModal({ kind: 'desc', job: j }) }}
                    style={{ fontSize: 14.5, fontWeight: 600, color: '#2563eb', textDecoration: 'none' }}>{j.title}</a>
                  <span style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                    {/* #167⑩(Frank「卡片胶囊应该统一放到一个位置吧」):匹配度胶囊原先孤零零挂在右上角,
                        与卡底那排(可提名/技能岗/…)分处两地 —— 同类东西两个位置=没有位置。
                        已下移到卡底那一排并排**首位**(它最值钱,排第一)。此处只留星标:它是按钮不是胶囊。 */}
                    {/* #52:收藏入口手机也要有(E9-01 闭环第一环)——卡片寸土寸金只放星标,匿名点=注册框(与桌面 toggleSave 同一逻辑) */}
                    <button onClick={(e) => { e.stopPropagation(); toggleSave(j) }} aria-label={saved[String(j.id)] ? t('sj.saved') : t('sj.save')}
                      style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', fontSize: 16, lineHeight: 1, color: saved[String(j.id)] ? '#b45309' : '#c4c9d4' }}>
                      {saved[String(j.id)] ? '★' : '☆'}
                    </button>
                  </span>
                </div>
                {/* #148 两列布局(Frank「卡片可以搞成左右两列」):**左列=身份**(公司/地点)、**右列=数字**(薪资/时间)。
                    右列右对齐后,整列在卡片流里连成一条竖线——手指下滑时眼睛只走右边就能比薪资、比新鲜度。
                    实现用 flex space-between 而非 grid:左列长内容(公司名)自己换行时不会把右列挤歪。 */}
                {(j.company || j.salaryText || j.salary) ? (
                  <div style={{ marginTop: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flexWrap: 'wrap' }}>
                      {j.company ? <span onClick={stop(() => open('company', j.company))} style={{ fontSize: 12.5, color: '#2563eb', cursor: 'pointer' }}>{j.company}</span> : null}
                      {j.sponsorGrade != null && <span title={t('gr.sponsorTip')} style={{ fontSize: 10.5, padding: '1px 7px', borderRadius: 999, background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', whiteSpace: 'nowrap' }}>{t('gr.sp.' + j.sponsorGrade)}</span>}
                    </span>
                    {/* #175:薪资退出可点集合——写死的 pointer+onClick 摘除(看着能点点了没反应比不能点更糟) */}
                    {(j.salaryText || j.salary) ? <span style={{ fontSize: 13, color: '#15803d', fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>{j.salaryText || j.salary}</span> : null}
                  </div>
                ) : null}
                <div style={{ fontSize: 12.5, marginTop: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
                  {/* 地点 → 地图直连(Frank 2026-07-21;与桌面省/市格同源 mapQuery);stopPropagation 保整卡进详情页 */}
                  {L.city ? <a href={mapsUrl(mapQuery('city', j))} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} style={{ color: '#2563eb', minWidth: 0, textDecoration: 'none' }}>{L.city}{j.province ? `, ${j.province}` : ''}</a> : <span />}
                  <span suppressHydrationWarning style={{ color: '#9ca3af', whiteSpace: 'nowrap', flexShrink: 0 }}>{(j.datePosted || '').slice(0, 10)}{days != null ? `(${t('fact.daysUpVal', { n: days })})` : ''}</span>
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                  {/* #167⑩:匹配度胶囊从右上角迁到此排首位(胶囊只此一处);它是个人化结论=最值钱,故排第一 */}
                  {mc && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: mc.bg, color: mc.fg, fontWeight: 600, whiteSpace: 'nowrap' }}>{t('match.' + j.match)}</span>}
                  {j.pnpEligible ? chip('#fef3c7', '#92400e', j.pnpStream ? t('cell.pnpYes') : t('cell.pnpSkilled'), 'pnp') : null}
                  {j.eeCategory ? chip('#dbeafe', '#1e40af', 'EE ' + eeDisplay(t, j.eeCategory), 'ee') : null}
                  {j.aip ? chip('#ffedd5', '#9a3412', t('cell.aipYes'), 'aip') : null}
                  {/* #145(Frank「这两个重复不」):是。LMIA 数与公司名旁的担保档同源(档位就是按 LMIA 份数+新近度算的),
                      手机卡上并排出现=一件事说两遍;有担保档时不再出 LMIA chip,无档(纯 AIP 等)才退回显数 */}
                  {j.lmiaPositions && j.sponsorGrade == null ? chip('#ccfbf1', '#0f766e', 'LMIA ✓' + j.lmiaPositions, 'lmia') : null}
                  {/* GAP1③:红旗 chip(手机卡片)——白投预警比正面信号更值得占位 */}
                  {j.eligibilityFlag ? chip('#fee2e2', '#b91c1c', t('cell.elig.' + j.eligibilityFlag), 'eligibility') : null}
                  {!j.pnpEligible && !j.eeCategory && !j.aip && j.teer != null ? chip('#f3f4f6', '#6b7280', `TEER ${j.teer}`, 'teer') : null}
                  {j.gradeChannel != null ? chip('#f3f4f6', '#6b7280', t('gr.ch.' + j.gradeChannel), 'score') : null}
                </div>
                {/* #167⑦(Frank「这个卡片最好有个更新时间吧,年月日时分秒」):发布时间只有日期没时刻(Job Bank 原样),
                    判断不了「刚抓到还是躺了一天」;更新时间是本站每小时抓取的实际时刻,精确到秒。
                    **此处必须带标签**:一张卡上两个日期并排,值自己说不清谁是谁 ——
                    正是 #166 定的「值自证就删标签」的那条例外。 */}
                {j.lastSeen ? (
                  <div suppressHydrationWarning style={{ marginTop: 6, fontSize: 11, color: '#9ca3af' }}>
                    {t('col.lastSeen')} {fmtLocalSec(j.lastSeen)}
                  </div>
                ) : null}
              </div>
            )
          })}
          {rows.length === 0 && (
            <div style={{ padding: 24, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
              {matchView ? <>{t('mv.empty')} <a href="/account" style={{ color: '#2563eb', textDecoration: 'none' }}>{t('mv.editProfile')} →</a></> : t('empty')}
            </div>
          )}
        </div>
        {/* 点击分页:不随滚动自动加载(用户拍板);按钮只报剩余条数——#42 同族,20000 载入护栏当分母像写死(2026-07-16 用户指出) */}
        <div style={{ textAlign: 'center', padding: '12px', fontSize: 12.5, color: '#9ca3af' }}>
          {rows.length === 0 ? ''
            : rows.length >= total ? t('allShown', { total })
            : <Button kind="secondary" sm disabled={loading} onClick={() => setPage((p) => p + 1)} style={{ opacity: loading ? 0.6 : 1 }}>{loading ? '…' : t('loadMore', { n: total - rows.length })}</Button>}
        </div>
        {/* 匹配全放开(Frank 2026-07-21):匹配不再限额 → 底部「升级看全量」升级卡退役;
            升级动力改由表内 Pro 数据列(vs中位/工资中位)打码承担 */}
      </div>
      {/* footer:全站共享 SiteFooter(2026-07-16 用户拍板统一 header/footer) */}
      <SiteFooter t={t} maxWidth={1320} />

      {popup && <AdvisorModal group={popup.group} field={popup.srcField} job={popup.job} title={popup.title} lang={lang} plan={plan} pnpOcc={dims.pnpOccupations} pnpDraws={dims.pnpDraws} news={dims.news} eeOcc={dims.eeCategories} desigEmp={dims.designatedEmployers} nocDesc={dims.nocDescriptions} fieldSources={dims.fieldSources} onClose={() => setPopup(null)} onOpenJob={(x) => setActModal({ kind: 'desc', job: x })} />}
      {actModal && <ActModal job={actModal.job} lang={lang} plan={plan} onClose={() => setActModal(null)} />}
      {wizard && <OnboardingWizard t={t} initial={plan.profile} onClose={closeWizard} />}
      {upsell && (plan.loggedIn
        ? <UpgradeModal t={t} reason={upsell === 'ss' ? t('ss.pro') : upsell === 'match' ? (matchTotals && matchTotals.high > plan.freeMatchCap ? t('up.matchN', { h: matchTotals.high, n: plan.freeMatchCap }) : t('up.match', { n: plan.freeMatchCap })) : undefined} onClose={() => setUpsell(false)} />
        : <AuthModal t={t} mode={upsell === 'login' ? 'login' : 'register'} onClose={() => setUpsell(false)} onDone={() => window.location.reload()} />)}
    </div>
  )
}

// ── 省提名清单区(点 PNP 字段时显示)────────────────────────────
// 清单是权威「事实」,来自 DB 维度表(pnp-occupations,经 props 传入),绝不让 LLM 编。
// 判定只用本岗既有字段(province/noc/teer)+ 清单比对,不在前端重算资格逻辑。
type PnpStream = { stream: string; label: string; type: string; url: string; fetched: string; occupations: { noc: string; name: string; gtaRestricted: boolean }[] }

// 本省最近抽选事实块(E6-04)。score 是省自评分制(SIRS/WEOI/MPNP EOI),非 CRS —— 只陈列事实,不判定资格。
// kind=notice(如 ON 2026-06 改制)渲染通告行;省内无数据(SK/QC 等)整块不出现。
function PnpDrawsBlock({ province, lang, draws, limit }: { province: string; lang: Lang; draws: PnpDraw[]; limit?: number }) {
  // limit(C2 走查拍板):省弹窗只留最近 1 条摘要(全量归 PNP 弹窗),消跨弹窗重复
  const t = makeT(lang)
  const rows = draws.filter((d) => d.province === province).slice(0, limit || undefined)
  if (!rows.length) return null
  const src = rows[0]
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>
        {t('pnpdraws.title', { label: src.label })}
        {src.scale ? <span style={{ color: '#9ca3af' }}> · {t('pnpdraws.scale', { scale: src.scale })}</span> : null}
      </div>
      <div style={{ border: '1px solid #f3f4f6', borderRadius: 8 }}>
        {rows.map((d, i) => d.kind === 'notice' ? (
          <div key={i} style={{ padding: '5px 10px', fontSize: 12.5, color: '#b45309', background: '#fffbeb' }}>
            {/* #153(Frank 报障「OINP 新通道出来了站上没更新」):原先整句写死在 i18n(只有日期是变量),
                ETL 抓到新通告也覆盖不掉,7-20 官方已公布资格标准而站上还在说「细则待公布」=过期误导。
                改为直接渲染抓到的官方通告原文(note),缺 note 才退回旧模板。 */}
            <IconWarn /> {d.note ? `${d.drawDate} ${d.note}` : t('pnpdraws.notice', { date: d.drawDate })}
          </div>
        ) : (
          <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '4px 10px', fontSize: 12.5, color: '#374151' }}>
            <span style={{ fontVariantNumeric: 'tabular-nums', color: '#9ca3af', whiteSpace: 'nowrap' }}>{d.drawDate}</span>
            <span style={{ flex: 1, minWidth: 0 }} title={d.note || undefined}>{d.stream}</span>
            {d.score != null && <span style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{t('pnpdraws.min', { score: d.score })}</span>}
            {d.invitations != null && <span style={{ color: '#6b7280', whiteSpace: 'nowrap' }}>{t('pnpdraws.inv', { n: d.invitations })}</span>}
          </div>
        ))}
      </div>
    </div>
  )
}

// 本省最新公告行(E12-06):最新 1-2 条官方新闻标题,链 /news/[slug];无数据整块不出现。
// 只摆标题+日期(事实),不解读——详情页自带 ©四件套与原文链。
function NewsLatestBlock({ province, lang, news }: { province: string; lang: Lang; news: NewsSlim[] }) {
  const t = makeT(lang)
  const rows = news.filter((n) => n.region === province).slice(0, 2)
  if (!rows.length) return null
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>
        {t('news.latest')}<a href="/news" style={{ color: '#2563eb', textDecoration: 'none', marginLeft: 8 }}>{t('news.more')}</a>
      </div>
      <div style={{ border: '1px solid #f3f4f6', borderRadius: 8 }}>
        {rows.map((n) => (
          <div key={n.slug} style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '4px 10px', fontSize: 12.5 }}>
            <span style={{ fontVariantNumeric: 'tabular-nums', color: '#9ca3af', whiteSpace: 'nowrap' }}>{n.date}</span>
            <a href={`/news/${n.slug}`} style={{ flex: 1, minWidth: 0, color: '#2563eb', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={n.title}>{n.title}</a>
          </div>
        ))}
      </div>
    </div>
  )
}

export function PnpListSection({ job, lang, occ, draws, news }: { job: JobRow; lang: Lang; occ: PnpOcc[]; draws: PnpDraw[]; news: NewsSlim[] }) {
  const t = makeT(lang)
  const matchRef = useRef<HTMLDivElement | null>(null)
  const isQc = job.province === 'QC'
  // 从扁平维度表取本省各通道(按 label 分组)
  const streams = useMemo<PnpStream[]>(() => {
    if (isQc || !job.province) return []
    const byLabel = new Map<string, PnpStream>()
    for (const r of occ) {
      if (r.province !== job.province) continue
      let s = byLabel.get(r.label)
      if (!s) { s = { stream: r.stream, label: r.label, type: r.type, url: r.url, fetched: r.fetched, occupations: [] }; byLabel.set(r.label, s) }
      s.occupations.push({ noc: r.noc, name: r.name, gtaRestricted: r.gtaRestricted })
    }
    return [...byLabel.values()]
  }, [occ, job.province, isQc])
  // 高亮行滚进视野(就近滚,尽量不动整个弹框)
  useEffect(() => { matchRef.current?.scrollIntoView({ block: 'nearest' }) }, [streams])

  const noc = job.noc, teer = job.teer, skilled = teer != null && teer <= 3
  let matched: PnpStream | null = null, excluded = false, hasInclusion = false
  for (const s of streams) {
    if (s.type === 'ineligible') { if (s.occupations.some((o) => o.noc === noc)) excluded = true }
    else { hasInclusion = true; if (s.occupations.some((o) => o.noc === noc)) matched = s }
  }
  let verdict = '', tone = '#6b7280', vIcon: React.ReactNode = null
  if (isQc) { verdict = t('pnplist.qc'); tone = '#7c3aed' }
  else if (streams.length === 0) { verdict = skilled ? t('pnplist.noList') : t('pnplist.notEligible'); tone = skilled ? '#15803d' : '#9ca3af' }
  else if (excluded) { verdict = t('pnplist.excludedHit', { noc }); tone = '#b91c1c'; vIcon = <IconX /> }
  else if (matched) { verdict = t('pnplist.onList', { noc, label: streamDisplay(t, matched.label) }); tone = '#b45309'; vIcon = <IconCheck /> }
  else if (hasInclusion) { verdict = skilled ? t('pnplist.generic', { teer }) : t('pnplist.notEligible'); tone = skilled ? '#15803d' : '#9ca3af' }
  else { verdict = skilled ? t('pnplist.excludedMiss', { teer }) : t('pnplist.notEligible'); tone = skilled ? '#15803d' : '#9ca3af' }

  return (
    <div style={{ marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid #f3f4f6' }}>
      <div style={{ fontSize: 13.5, fontWeight: 600, color: tone, marginBottom: 8 }}>{vIcon}{vIcon ? ' ' : null}{verdict}</div>
      {!isQc && job.province ? <PnpDrawsBlock province={job.province} lang={lang} draws={draws} /> : null}
      {/* 本省最新公告(E12-06,「本省最近抽选」块下);QC 也显——MIFI 部委新闻,资格口径由 /news 声明 */}
      {job.province ? <NewsLatestBlock province={job.province} lang={lang} news={news} /> : null}
      {/* #125(Frank「上面显示符合,下面还显示不符合干什么」):命中具名通道 → 只展示命中的那个清单;
          被排除 → 只展示排除清单;都没有才全量铺(浏览语境)——与 EE 节「命中只展开命中类」同一先例 */}
      {streams.filter((s) => s.occupations.length)
        .filter((s) => (matched ? s === matched : excluded ? s.type === 'ineligible' : true))
        .map((s) => (
        <div key={s.label + s.stream} style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>
            {/* 通道名挂官方政策页(url 维度字段一直有,07-06 质量盘点补渲染)—— 每条清单自带出处 */}
            {s.url ? <a href={s.url} target="_blank" rel="noreferrer" style={{ color: '#6b7280', textDecoration: 'none' }}>{streamDisplay(t, s.label)} ↗</a> : streamDisplay(t, s.label)}
          </div>
          <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid #f3f4f6', borderRadius: 8 }}>
            {s.occupations.map((o) => {
              const hit = o.noc === noc
              return (
                <div key={o.noc + o.name} ref={hit ? matchRef : undefined}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 10px', fontSize: 12.5,
                    background: hit ? '#fef3c7' : undefined, fontWeight: hit ? 600 : 400, color: hit ? '#92400e' : '#374151' }}>
                  <span style={{ fontVariantNumeric: 'tabular-nums', color: hit ? '#92400e' : '#9ca3af' }}>{o.noc}</span>
                  <span style={{ flex: 1 }}>{o.name}</span>
                  {hit && <span style={{ fontSize: 11, whiteSpace: 'nowrap' }}>← {t('pnplist.your')}</span>}
                  {o.gtaRestricted && <span style={{ fontSize: 11, color: '#9ca3af', whiteSpace: 'nowrap' }}>{t('pnplist.gta')}</span>}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── 联邦 EE 类别抽选区(点 EE 字段时显示)──────────────────────
// 与 PnpListSection 同理:清单来自 DB 维度表(ee-categories,经 props 传入),全国单一源。
// 命中→只展开该类别清单 + 高亮本岗;未命中→只列出各类别名+数量概览。EE ≠ PNP,独立信号。
type EeCat = { key: string; label: string; drawCrs: number | null; drawDate: string; drawSize: number | null; occupations: { noc: string; teer: number | null; title: string }[] }
export function EeCategorySection({ job, lang, cats, draws = [] }: { job: JobRow; lang: Lang; cats: EeOcc[]; draws?: PnpDraw[] }) {
  const t = makeT(lang)
  const matchRef = useRef<HTMLDivElement | null>(null)
  // #135(Frank「应该有个下拉箭头,点开按时间线看每一轮」):该类别历次抽选(pnp_draws 的 province=FED 行,
  // label=类别 key);近 24 月无抽选的类别拿不到行 → 不出箭头(没东西可展开就别给假入口)。
  const [openCat, setOpenCat] = useState<string | null>(null)
  const [showAllCats, setShowAllCats] = useState(false)   // #155:未命中时全类别默认收起
  const histOf = useMemo(() => {
    const m = new Map<string, PnpDraw[]>()
    for (const d of draws) {
      if (d.province !== 'FED' || !d.drawDate) continue
      const arr = m.get(d.label) || []
      arr.push(d); m.set(d.label, arr)
    }
    for (const arr of m.values()) arr.sort((a, b) => (a.drawDate < b.drawDate ? 1 : -1))
    return m
  }, [draws])
  // 扁平维度表按 label 分组
  const grouped = useMemo<EeCat[]>(() => {
    const byLabel = new Map<string, EeCat>()
    for (const r of cats) {
      let c = byLabel.get(r.label)
      if (!c) { c = { key: r.category, label: r.label, drawCrs: r.drawCrs, drawDate: r.drawDate, drawSize: r.drawSize, occupations: [] }; byLabel.set(r.label, c) }
      c.occupations.push({ noc: r.noc, teer: r.teer, title: r.title })
    }
    return [...byLabel.values()]
  }, [cats])
  useEffect(() => { matchRef.current?.scrollIntoView({ block: 'nearest' }) }, [grouped])

  const noc = job.noc
  const hit = grouped.filter((c) => c.occupations.some((o) => o.noc === noc))
  // #155(Frank「这个没有数据还需要列吗」= E8-09 开放问题①拍板):未命中时不再铺全部类别——
  // 本岗跟它们没关系,铺出来只是占屏;收成一行「未列入任何 EE 类别」+ 折叠入口,想看全景才展开。
  // #167⑥(Frank「没有抽签的类别是不是就不要显示了」):展开全景时,把**从未抽过签**的类别滤掉 ——
  // 一个没有任何抽选记录的类别对求职者没有可操作性(不知道分数线、不知道抽没抽、无从判断),
  // 列出来只是让人多读几行(如「军职 3 个职业」「研究 2 个职业」这类)。
  // 本岗**命中**的类别永远显示,哪怕没抽过 —— 那是与本岗直接相关的事实,不能因无抽选就藏。
  const hasDraw = (c: EeCat) => (histOf.get(c.label)?.length ?? 0) > 0 || c.drawDate != null
  const shown = hit.length ? hit : (showAllCats ? grouped.filter(hasDraw) : [])
  return (
    <div style={{ marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid #f3f4f6' }}>
      <div style={{ fontSize: 13.5, fontWeight: 600, color: hit.length ? '#2563eb' : '#9ca3af', marginBottom: 6 }}>
        {hit.length ? <><IconCheck /> {t('eelist.in', { noc, cats: hit.map((c) => eeDisplay(t, c.label)).join('/') })}</> : (
          <>
            {t('eelist.out')}
            {grouped.length ? (
              <button onClick={() => setShowAllCats((v) => !v)}
                style={{ marginLeft: 8, border: 'none', background: 'none', padding: 0, color: '#2563eb', cursor: 'pointer', font: 'inherit', fontWeight: 400 }}>
                {showAllCats ? '▴' : '▾'} {t('eelist.allCats', { n: grouped.length })}
              </button>
            ) : null}
          </>
        )}
      </div>
      {shown.map((c) => (
        <div key={c.key} style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: '#374151', marginBottom: 4 }}>{eeDisplay(t, c.label)} <span style={{ color: '#9ca3af', fontWeight: 400, marginLeft: 4 }}>{t('eelist.count', { n: c.occupations.length })}</span></div>
          {/* #135:近期抽选行=可展开入口(有历史才给箭头),展开=该类别历次抽选时间线 */}
          {c.drawCrs != null && c.drawDate ? (() => {
            const hist = histOf.get(c.key) || []
            const expandable = hist.length > 1
            const open = openCat === c.key
            return (
              <>
                <div onClick={expandable ? () => setOpenCat(open ? null : c.key) : undefined}
                  style={{ fontSize: 12, color: '#2563eb', marginBottom: 4, cursor: expandable ? 'pointer' : undefined, userSelect: 'none' }}>
                  {t('eelist.draw', { crs: c.drawCrs, date: c.drawDate, size: c.drawSize ?? '—' })}
                  {expandable ? <span style={{ marginLeft: 6, color: '#6b7280' }}>{open ? '▴' : '▾'} {t('eelist.hist', { n: hist.length })}</span> : null}
                </div>
                {expandable && open ? (
                  <div style={{ marginBottom: 6, border: '1px solid #f3f4f6', borderRadius: 8, overflow: 'hidden' }}>
                    {hist.map((h, i) => (
                      <div key={`${h.drawDate}-${i}`} style={{ display: 'flex', alignItems: 'baseline', gap: 10, padding: '4px 10px', fontSize: 12, background: i % 2 ? '#fafafa' : undefined }}>
                        <span style={{ fontVariantNumeric: 'tabular-nums', color: '#6b7280', whiteSpace: 'nowrap' }}>{(h.drawDate || '').slice(0, 10)}</span>
                        <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: '#1f2937', whiteSpace: 'nowrap' }}>{t('eelist.crsN', { crs: h.score ?? '—' })}</span>
                        <span style={{ flex: 1, color: '#6b7280', whiteSpace: 'nowrap' }}>{t('eelist.itaN', { n: h.invitations ?? '—' })}</span>
                      </div>
                    ))}
                    <div style={{ padding: '4px 10px', fontSize: 11, color: '#9ca3af', borderTop: '1px solid #f3f4f6' }}>{t('eelist.histNote')}</div>
                  </div>
                ) : null}
              </>
            )
          })() : null}
          {hit.length ? (
            <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid #f3f4f6', borderRadius: 8 }}>
              {c.occupations.map((o) => {
                const isHit = o.noc === noc
                return (
                  <div key={o.noc} ref={isHit ? matchRef : undefined}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 10px', fontSize: 12.5,
                      background: isHit ? '#dbeafe' : undefined, fontWeight: isHit ? 600 : 400, color: isHit ? '#1e40af' : '#374151' }}>
                    <span style={{ fontVariantNumeric: 'tabular-nums', color: isHit ? '#1e40af' : '#9ca3af' }}>{o.noc}</span>
                    <span style={{ flex: 1 }}>{o.title}</span>
                    {o.teer != null && <span style={{ fontSize: 11, color: '#9ca3af' }}>T{o.teer}</span>}
                    {isHit && <span style={{ fontSize: 11, whiteSpace: 'nowrap' }}>← {t('eelist.your')}</span>}
                  </div>
                )
              })}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  )
}

// ── 弹框上半:每字段「事实块」(凭证)—— 值 + 口径,绝不经 LLM ──────
// 框架:按 field 分支。pnp/ee 用既有清单组件;其余「零成本」字段(地点/薪资/分类/来源/经验/时间状态)
// 直接读 job 已加载的真实字段渲染。依赖 Part B 抓取的字段(职位 JD / 公司简介 / 官方职责 / 门槛 / 抽选线)留待后续填。
export function FactRow({ k, children }: { k: React.ReactNode; children: React.ReactNode }) {
  if (children == null || children === '' || children === '—') return null
  return (
    <div style={{ display: 'flex', gap: 10, padding: '3px 0', fontSize: 13 }}>
      <span style={{ minWidth: 88, color: '#9ca3af', flexShrink: 0 }}>{k}</span>
      <span style={{ flex: 1, color: '#374151', wordBreak: 'break-word' }}>{children}</span>
    </div>
  )
}
export function FactsBox({ children, note }: { children: React.ReactNode; note?: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid #f3f4f6' }}>
      {children}
      {note ? <div style={{ marginTop: 7, fontSize: 11.5, color: '#9ca3af', lineHeight: 1.5 }}>{note}</div> : null}
    </div>
  )
}
// 职位事实块:标题 + 匹配 NOC + 抓取的 JD 正文摘录(走 /api/jobtext,同 ActModal desc;列表 SQL 不带 description)
// NOC 官方主要职责 / 任职要求(StatCan Elements);noc 来自 noc-descriptions 维度,无则不渲染
function NocDutiesView({ noc, lang }: { noc: NocDesc | null; lang: Lang }) {
  const t = makeT(lang)
  if (!noc || (!noc.duties && !noc.requirements)) return null
  const block = (label: string, text: string) => text ? (
    <>
      <div style={{ marginTop: 8, fontSize: 11.5, color: '#9ca3af' }}>{label}{noc.fetched ? `(${noc.fetched})` : ''}</div>
      <ul style={{ margin: '3px 0 0', paddingLeft: 18, fontSize: 12.5, color: '#4b5563', lineHeight: 1.55 }}>
        {text.split('\n').filter(Boolean).map((d, i) => <li key={i}>{d}</li>)}
      </ul>
    </>
  ) : null
  return <>{block(t('fact.nocDuties'), noc.duties)}{block(t('fact.nocReqs'), noc.requirements)}</>
}
// 抓取的 JD 正文 → Job Bank 原版式(2026-07-06 用户拍板「按人家的格式」):
// 大节头(Overview/Responsibilities…)加粗放大、子节头(Tasks/Languages…)加粗,内容行缩进纯文本;
// 源头自带的 •/· 圆点剥掉(否则双圆点);全部展开不做内层滚动(弹窗整体滚)。
// 节头用白名单识别(Job Bank 固定小节),白名单外一律当内容行 —— 「English」这类单词值不会被误判成标题。
const JD_TOP_HEADS = new Set(['overview', 'responsibilities', 'requirements', 'experience and specialization', 'additional information', 'benefits', 'employment groups', 'who can apply for this job', 'who can apply to this job'])
const JD_SUB_HEADS = new Set(['languages', 'education', 'experience', 'on site', 'on the road', 'work setting', 'work site environment', 'tasks', 'supervision', 'credentials', 'certificates, licences, memberships, and courses', 'computer and technology knowledge', 'area of specialization', 'area of work experience', 'security and safety', 'transportation/travel information', 'work conditions and physical capabilities', 'weight handling', 'own tools/equipment', 'personal suitability', 'health benefits', 'financial benefits', 'long term benefits', 'other benefits', 'screening questions', 'green job'])
// Indeed/ATS 尾巴的内联标签(源头丢换行,如 "Job Type: Part-time Pay: $20 Benefits: * A * B"):
// 白名单标签前补换行 + 「* 」项拆行 —— 只认这些词,不会切碎正文散文段落。
const JD_INLINE_LABELS = ['Job Types', 'Job Type', 'Pay', 'Salary', 'Benefits', 'Schedule', 'Expected hours', 'Supplemental pay types', 'Flexible language requirement', 'Experience', 'Education', 'Language', 'Work Location', 'Licence/Certification', 'Ability to commute/relocate', 'Application question(s)', 'Application deadline', 'Expected start date', 'Shift availability']
// 第三套版式(2026-07-07 用户第三例):医疗/政府 HR 系统导出(SHA/SAHO 等)——整段「Label: value Label: value」
// 粘连,且有无空格粘边(「YesEducation- Bachelor」)和「Label- 值」破折号变体。照旧全白名单制,不碰散文。
const JD_HR_LABELS = ['Position #', 'Expected Start Date', 'Union', 'Facility', 'City/Town', 'Department', 'Type', 'FTE',
  'Shift Information', 'Number of Hours per Rotation', 'Relief', 'Float', 'Hours of Work', 'Salary or Pay Band',
  'Travel Required', 'Job Description', 'Human Resources Exemption', 'Multi-Cost', 'Licenses', 'Other Information',
  'About Us', 'About The Team']
const jdEsc = (s: string) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')
const JD_ALL_ALTS = [...JD_INLINE_LABELS, ...JD_HR_LABELS].map(jdEsc).join('|')
const JD_INLINE_RE = new RegExp(`\\s+(?=(?:${JD_ALL_ALTS}):)`, 'g')
const JD_HR_DASH_RE = new RegExp(`\\s+(?=(?:${JD_ALL_ALTS})-\\s)`, 'g')                                // 「 Education- Bachelor」
const JD_GLUE_RE = new RegExp(`(?<=[a-z)])(?=(?:${JD_ALL_ALTS})[:-])`, 'g')                            // 「YesEducation-」无空格粘边
const JD_HR_LINE_RE = new RegExp(`^(${JD_ALL_ALTS})-\\s*`)                                             // 行首「Label- 」→「Label: 」
// 2026-07-16 用户拍板:JD 弹窗去表格,原汁原味逐行显示——第 16 轮「键值段表格化+规则解读列」
// (c4e6f59/369aac0)整体退役(多张表的抽象感 + 解读列大量留空,读起来不如原文)。
// 双轨渲染:数据层给了真实换行(05b 块级序列化,原帖分段/列表/标题保真)→ 按原换行渲染,空行=段距;
// 压平老坨帖(Job Bank 聚合时丢格式,0 换行)→ 才走猜测式断行(粘连断行/bullet 拆行/一句一行,历轮拍板)。
export function JdTextView({ text, max = 4000 }: { text: string; max?: number }) {
  const clipped = text.slice(0, max)
  const hasBreaks = clipped.includes('\n')
  const lines = (hasBreaks
    ? clipped
      .replace(/[*\\_]{2,}/g, ' ')      // markdown 强调残渣照剥(第 12 轮 #31)
      .split('\n')
      .map((s) => s.trim().replace(/\s{2,}/g, ' '))
    : clipped
      .replace(JD_GLUE_RE, '\n')        // 无空格粘边先断(YesEducation- → Yes\nEducation-)
      .replace(JD_INLINE_RE, '\n')      // 已知标签前断行
      .replace(JD_HR_DASH_RE, '\n')     // HR「Label- 值」变体前断行
      .replace(/\s+\*\s+/g, '\n')       // "* 项" 拆行(星号本身在下方统一剥掉)
      // 行内圆点 bullet 拆行(2026-07-10 用户第四例,CER 帖:「decision making;• Design」——源头丢换行,
      // 圆点前可无空格;圆点后必有空格才算列表项,防误伤小数/代码;圆点在下方统一剥掉)
      .replace(/\s*[•▪◦‣]\s+/g, '\n')
      // markdown 强调残渣(第 12 轮 #31,第 5 套版式:Indeed 富文本转义,如「*Administrator *to」
      // 「*Key Responsibilities:*」「\**_*…*_」)——先拍掉连堆的 */_/\,再清孤立 */\;
      // 下划线只在连堆里清(URL/邮箱残件可能带合法下划线);真实 JD 不用星号行文,误伤面≈0。
      // 注意顺序:必须在上面「 * 项」拆行之后,别抢了列表拆行的星号。
      .replace(/[*\\_]{2,}/g, ' ')
      .replace(/[*\\]/g, ' ')
      .split('\n')
      // 一句一行(07-06 用户拍板):句末标点(前一字符是小写/数字/右括号,防 $20.00、U.S. 误拆)
      // + 可选空格 + 大写开头 → 断行;兼容 Job Bank 抓取的无空格粘连("asset.Core")
      .flatMap((l) => l.split(/(?<=[a-z0-9)][.!?])\s*(?=[A-Z])/))
      .map((s) => s.trim().replace(/^[•·▪◦‣*-]+\s*/, '').replace(/\s{2,}/g, ' '))
      .filter(Boolean)
  ).map((l) => l.replace(JD_HR_LINE_RE, '$1: '))  // HR「Label- 值」归一成「Label: 值」
    // 相邻重复行去重(2026-07-19 Frank 报障:ZipRecruiter 帖「Job Description」连出两遍,库内 349 帖同款
    // 模板节头重复)——跳过空行比较、只收 ≤80 字符短行(节头/标签),正文长句不碰;保留首次出现
    .filter((function () { let prev = ''; return (l: string) => { if (!l) return true; const dup = l === prev && l.length <= 80; prev = l; return !dup } })())
  // 保真轨保留空行作段距;行首「• 」保留(数据层给的列表符),只在猜测轨剥
  const renderLine = (l: string, i: number) => {
    if (!l) return <div key={i} style={{ height: 6 }} />
    if (l.startsWith('• ')) return <div key={i} style={{ paddingLeft: 22, textIndent: -8 }}>{l}</div>
    const low = l.toLowerCase()
    if (JD_TOP_HEADS.has(low)) return <div key={i} style={{ marginTop: i ? 12 : 0, fontSize: 14, fontWeight: 700, color: '#111827' }}>{l}</div>
    if (JD_SUB_HEADS.has(low)) return <div key={i} style={{ marginTop: i ? 8 : 0, fontWeight: 700, color: '#374151' }}>{l}</div>
    const bare = l.match(/^([A-Z][A-Za-z ()/#&'-]{1,40}):$/)  // 裸标签行(如 "Benefits:")→ 小节头
    if (bare) return <div key={i} style={{ marginTop: i ? 8 : 0, fontWeight: 700, color: '#374151' }}>{bare[1]}</div>
    const m = l.match(/^([A-Z][A-Za-z ()/#&'-]{1,40}):\s*(.+)$/)
    if (m) return <div key={i} style={{ paddingLeft: 14 }}><strong style={{ color: '#374151' }}>{m[1]}:</strong> {m[2]}</div>
    return <div key={i} style={{ paddingLeft: 14 }}>{l}</div>
  }
  return (
    <div style={{ margin: '4px 0 0', fontSize: 12.5, color: '#4b5563', lineHeight: 1.6 }}>
      {lines.map(renderLine)}
    </div>
  )
}
// J3 五节整理版渲染(2026-07-19 Frank 批):[ROLE]/[REQS]/[PAY]/[WORKHOURS]/[APPLY] 标记文本 → 节头加粗独立行,
// 节内一条一行(W 规范:禁「·」「/」杂糅);(not stated) → 「原帖未提及」灰字,缺节不脑补。
// trans=同结构译文(jd-translate 行位保真)→ 节内按行号逐句对照,样式与资讯页对照同规范(蓝条+深蓝字)
const jdParseSecs = (s: string): Record<string, string> => {
  const parts = s.split(/\[(ROLE|REQS|PAY|WORKHOURS|APPLY)\]/)
  const secs: Record<string, string> = {}
  for (let i = 1; i + 1 < parts.length + 1; i += 2) secs[parts[i]] = (parts[i + 1] || '').trim()
  return secs
}
const JD_ZH_LINE: React.CSSProperties = { margin: '2px 0 4px', padding: '1px 0 1px 10px', borderLeft: '3px solid #dbeafe', color: '#1e40af', fontWeight: 400 }
export function JdFormattedView({ text, t, fallbackPay, applyUrl, underTitle, trans }: { text: string; t: TFn; fallbackPay?: string; applyUrl?: string; underTitle?: boolean; trans?: string }) {
  const SECS: [string, string][] = [['ROLE', 'act.f.role'], ['REQS', 'act.f.reqs'], ['PAY', 'act.f.pay'], ['WORKHOURS', 'act.f.hours'], ['APPLY', 'act.f.apply']]
  const secs = jdParseSecs(text)
  const tSecs = trans ? jdParseSecs(trans) : null
  return (
    <div style={{ fontSize: 13, lineHeight: 1.75, color: '#374151' }}>
      {SECS.map(([m, key]) => {
        const body = (secs[m] || '').trim()
        const none = !body || /^\(not stated\)$/i.test(body)
        const lines = body.split('\n').map((s) => s.trim()).filter(Boolean)
        const zhLines = tSecs ? (tSecs[m] || '').split('\n').map((s) => s.trim()).filter(Boolean) : []
        const zh = (i: number) => (zhLines[i] && zhLines[i] !== lines[i] ? <div style={JD_ZH_LINE}>{zhLines[i].replace(/^-\s*/, '')}</div> : null)
        const hasBullets = lines.some((l) => l.startsWith('- '))
        return (
          <div key={m} style={{ marginBottom: 8 }}>
            {/* #155(Frank「这两个字也是重复的」):首节 ROLE 的小标题「这活干什么」紧贴大标题「职位描述」,
                两行说同一件事 —— 首节不出小标题,正文直接跟在「职位描述」下面;其余四节照旧有小标题分区。
                #161(Frank「这个地方缺 title 吧」):#155 的作用域开大了 —— 该组件另有一个容器(ActModal)
                上方只有「✨ AI 整理…」一行灰注、**没有大标题**,砍掉首节小标题后正文就裸奔了。
                改成按容器决定:underTitle=紧跟大标题(详情页)才省略,默认照常出小标题。 */}
            {m === 'ROLE' && underTitle ? null : <div style={{ fontWeight: 700, color: '#111827' }}>{t(key)}</div>}
            {/* #125(Frank「重复」):「怎么投」整节文本直接渲成官方原帖链接——一处内容一处链接,
                不再额外附按钮行(与底部合规来源行重复);「Click Here」类废句自身变成可点出口 */}
            {m === 'APPLY' && applyUrl ? (
              /* 原帖没写投递方式 → 直接完整显示官方原帖 URL(2026-07-21 Frank;原「查看官方原帖」按钮文案) */
              none
                ? <div style={{ paddingLeft: 14, overflowWrap: 'anywhere' }}><a href={applyUrl} target="_blank" rel="noreferrer" style={{ color: '#2563eb', textDecoration: 'none' }}>{applyUrl} ↗</a></div>
                : lines.map((l, i) => <div key={i} style={{ paddingLeft: 14 }}><a href={applyUrl} target="_blank" rel="noreferrer" style={{ color: '#2563eb', textDecoration: 'none' }}>{l.replace(/^-\s*/, '')} ↗</a>{zh(i)}</div>)
            ) : /* #123c(Frank「每个职位都有薪资吧」):原帖正文没写薪资但帖面字段有 → 兜底显示帖面薪资+来源灰注
                (仍是搬运原帖信息——JB 列表字段也是雇主自报,非编造) */
            none && m === 'PAY' && fallbackPay ? (
              <div style={{ paddingLeft: 14 }}>{fallbackPay} <span style={{ color: '#9ca3af', fontSize: 12 }}>{t('act.f.payFb')}</span></div>
            ) : none ? <div style={{ paddingLeft: 14, color: '#9ca3af' }}>{t('act.f.none')}</div>
              : hasBullets ? <ul style={{ margin: 0, paddingLeft: 30 }}>{lines.map((l, i) => <li key={i}>{l.replace(/^-\s*/, '')}{zh(i)}</li>)}</ul>
              : lines.map((l, i) => <div key={i} style={{ paddingLeft: 14 }}>{l}{zh(i)}</div>)}
          </div>
        )
      })}
    </div>
  )
}
// JD 框内嵌 AI 顾问初判(2026-07-19 Frank:「像公司顾问一样自动生成,不要再点一下」)——
// 打开职位描述即自动流式生成,不用再点「AI 顾问」钮;额度闸照走(402 升级卡/429 说人话);
// 同岗会话内缓存,反复开关不重复烧额度。深挖(对比表+追问对话)仍在「AI 顾问」钮的完整弹框里。
const jdAdvCache = new Map<string, string>()
// field:'title'=顾问初判(详情页,含移民路径);'jdRead'=纯 JD 速读(职位弹框,2026-07-21 Frank
// 「只速读这个 job 的内容即可,不需要过度解读移民信号」)
export function JdAdvisorSection({ job, lang, plan, title, field = 'title' }: { job: JobRow; lang: Lang; plan: Plan; title?: string; field?: 'title' | 'jdRead' }) {
  const t = makeT(lang)
  const ck = `${field}:${job.id}`
  const [text, setText] = useState(jdAdvCache.get(ck) || '')
  const [status, setStatus] = useState<'loading' | 'streaming' | 'done' | 'error' | 'upgrade' | 'limited'>(jdAdvCache.has(ck) ? 'done' : 'loading')
  const [freeLeft, setFreeLeft] = useState<number | null>(null)
  useEffect(() => {
    if (jdAdvCache.has(ck)) return
    const ctrl = new AbortController()
    setText(''); setStatus('loading')
    ;(async () => {
      try {
        const res = await fetch('/api/advisor', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ctrl.signal,
          body: JSON.stringify({ field, id: String(job.id), job, lang }),
        })
        const left = res.headers.get('X-Free-Left')
        if (left != null) setFreeLeft(Number(left))
        if (res.status === 402) { setStatus('upgrade'); return }
        if (res.status === 429) { setStatus('limited'); return }
        if (!res.ok || !res.body) { setStatus('error'); return }
        setStatus('streaming')
        const reader = res.body.getReader(); const dec = new TextDecoder()
        let acc = ''
        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          acc += dec.decode(value, { stream: true })
          setText(acc)
        }
        const { body } = extractSug(acc, job.company, lang)   // 尾行建议问题不在内嵌区展示(追问在完整弹框)
        jdAdvCache.set(String(job.id), body)
        setText(body); setStatus('done')
      } catch { if (!ctrl.signal.aborted) setStatus('error') }
    })()
    return () => ctrl.abort()
  }, [job, lang])
  return (
    /* 壳=裸段(Frank「AI 顾问和职位描述分成两个卡片」「不要卡片套卡片」):组件自己不带壳,
       详情页包进独立 sec 卡、JD 弹框包分隔线段——间隔样式归消费方。
       标题=卡标题级(每卡必有 title);「·」杂糅退役——剩余次数改空格灰注 */
    <div>
      <div style={{ fontSize: 13.5, fontWeight: 700, color: '#111827', marginBottom: 6 }}>
        <IconCompass /> {title || t('advisor.tag')}{freeLeft != null ? <span style={{ color: '#9ca3af', fontWeight: 400, fontSize: 11.5, marginLeft: 8 }}>{t('advisor.left', { n: freeLeft })}</span> : null}
      </div>
      {status === 'upgrade' ? <LockedText t={t} loggedIn={plan.loggedIn} />
        : status === 'limited' ? (
          /* #175:429 黄条退役 → 打码+锁行(限额内容不留空白也不占黄条,失去感靠打码传达) */
          <LockedText t={t} loggedIn={plan.loggedIn} msg={t('advisor.limit429')} ctaLabel={!plan.loggedIn ? t('advisor.limitCta') : undefined} />
        )
        : status === 'loading' ? <p style={{ margin: 0, fontSize: 13, color: '#9ca3af' }}>{t('advisor.loading')}</p>
        : status === 'error' ? <p style={{ margin: 0, fontSize: 13, color: '#9ca3af' }}>{t('advisor.unavail')}</p>
        : <div style={{ fontSize: 13.5, lineHeight: 1.7, color: '#374151' }}>{renderAI(text)}{status === 'streaming' && <span style={{ color: '#9ca3af' }}>▋</span>}</div>}
    </div>
  )
}
// #158:公司简介三节([WHAT]/[BASE]/[SIZE])。K 公司懒探索(2026-07-19 Frank 批):首开自动调查
// (命中缓存秒回);查不到/掉线整块消失不留孤儿。
// 2026-07-21 Frank「公司弹框参考类别重新设计」:嵌套小盒退役 → 每节一卡带题(与分类弹框同规范);
// 信息出处 URL 列表撤(同日「去掉 source 链接」);AI 检索声明=卡组上方一行灰注。
const CO_SECS: [string, string][] = [['WHAT', 'co.f.what'], ['BASE', 'co.f.base'], ['SIZE', 'co.f.size'], ['FOUNDED', 'co.f.founded'], ['NOTE', 'co.f.note']]
function CompanyAiSection({ company, t }: { company: string; t: TFn }) {
  const [d, setD] = useState<undefined | null | { brief: string; website: string; sources: string[]; fetched: string }>(undefined)
  useEffect(() => {
    let dead = false
    setD(undefined)
    fetch('/api/companyinfo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: company }) })
      .then((r) => (r.ok && r.status === 200 ? r.json() : null))
      .then((x) => { if (!dead) setD(x && x.brief ? x : null) })
      .catch(() => { if (!dead) setD(null) })
    return () => { dead = true }
  }, [company])
  if (d === null) return null
  if (d === undefined) return <div style={{ margin: '2px 0 12px', fontSize: 12.5, color: '#9ca3af' }}>✨ {t('fact.aiWorking')}</div>
  const attribution = <div style={{ margin: '2px 0 8px', fontSize: 11.5, color: '#9ca3af' }}>✨ {t('fact.aiIntro')}{d.fetched ? ` · ${d.fetched}` : ''}</div>
  const site = d.website ? (
    <div style={{ marginTop: 6 }}>
      <a href={d.website} target="_blank" rel="noreferrer" style={{ ...link, fontSize: 12.5, overflowWrap: 'anywhere' }}>{d.website}</a>
      <span style={{ marginLeft: 6, color: '#9ca3af', fontSize: 11 }}>{t('fact.aiSite')}</span>
    </div>
  ) : null
  // 存量散文格式(无标记)→ 单卡「公司简介」原样渲,不返工重跑模型(下次调查自然升级)
  if (!/\[(WHAT|BASE|SIZE|FOUNDED|NOTE)\]/.test(d.brief)) {
    return (
      <>
        {attribution}
        <div style={MODAL_CARD}>
          <div style={MODAL_CARD_HEAD}>{t('fact.coIntro')}</div>
          <div style={{ fontSize: 12.5, color: '#4b5563', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{d.brief}</div>
          {site}
        </div>
      </>
    )
  }
  const parts = d.brief.split(/\[(WHAT|BASE|SIZE|FOUNDED|NOTE)\]/)
  const secs: Record<string, string> = {}
  for (let i = 1; i + 1 <= parts.length - 1; i += 2) secs[parts[i]] = (parts[i + 1] || '').trim()
  const has = (m: string) => !!secs[m] && !/^\(not stated\)$/i.test(secs[m].trim())
  return (
    <>
      {attribution}
      {!has('WHAT') ? site : null}
      {CO_SECS.map(([m, key]) => {
        if (!has(m)) return null   // 缺项不占卡(宁可留空)
        return (
          <div key={m} style={MODAL_CARD}>
            <div style={MODAL_CARD_HEAD}>{t(key)}</div>
            <div style={{ fontSize: 12.5, color: '#4b5563', lineHeight: 1.7 }}>{secs[m].trim()}</div>
            {m === 'WHAT' ? site : null}
          </div>
        )
      })}
    </>
  )
}
// 公司弹框专用面板(2026-07-21 Frank「参考类别重新设计」):与分类弹框同规范——平级卡、每卡带题、不嵌套。
// 卡① 公司(官网/地址/行业/担保史+口径注)→ AI 检索卡组(K 懒探索,自动)→ 公司简介卡(名录抓取)→ 在榜职位卡。
function CompanyPanel({ job, jobs, lang, onOpenJob }: { job: JobRow; jobs: JobRow[]; lang: Lang; onOpenJob?: (j: JobRow) => void }) {
  const t = makeT(lang)
  const desc = job.companyDescription
  // 担保史阈值 ≥2(2026-07-07 用户点名「近两年就 1 个 = 相当于没有」):1 个不构成信号
  const sponsor = (job.lmiaPositions ?? 0) >= 2 ? t('fact.coLmia', { n: job.lmiaPositions!, q: job.lmiaLastQuarter || '—' }) : job.aip ? t('fact.coAip') : ''
  const here = jobs.filter((x) => x.company && x.company === job.company && (x.status || 'open') !== 'closed')
  // K:没简介或简介太薄(官网 meta 一句话)→ AI 联网调查
  const needAi = !!job.company && (!desc || desc.length < 200 || !job.officialUrl)
  // 口径注:担保史语义(C3 短版)+ 检索官网标注(D2 拍板:自动检索来的官网诚实标小字)
  const notes = [sponsor ? t('fact.coLmiaNote') : '', job.officialUrl && job.companyWebsiteSrc === 'searched' ? t('fact.siteSearched') : ''].filter(Boolean)
  const addr = job.address || [job.city, job.province].filter(Boolean).join(', ')
  const hasIdCard = !!(job.officialUrl || addr || job.companySectors || sponsor)
  return (
    <>
      {hasIdCard && (
        <div style={MODAL_CARD}>
          <div style={MODAL_CARD_HEAD}>{t('col.company')}</div>
          {job.officialUrl ? <FactRow k={t('act.site')}><a href={job.officialUrl} target="_blank" rel="noreferrer" style={{ ...link, fontSize: 12.5 }}>{job.officialUrl}</a></FactRow> : null}
          <FactRow k={t('act.addr')}>{addr || null}</FactRow>
          <FactRow k={t('fact.coSectors')}>{job.companySectors}</FactRow>
          <FactRow k={t('fact.coSponsor')}>{sponsor || null}</FactRow>
          {notes.length ? <div style={{ marginTop: 7, fontSize: 11.5, color: '#9ca3af', lineHeight: 1.5 }}>{notes.join('；')}</div> : null}
        </div>
      )}
      {desc ? (
        <div style={MODAL_CARD}>
          <div style={MODAL_CARD_HEAD}>{t('fact.coIntro')}</div>
          <div style={{ fontSize: 12.5, color: '#4b5563', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{desc}</div>
        </div>
      ) : null}
      {needAi ? <CompanyAiSection company={job.company!} t={t} /> : null}
      {here.length > 1 ? (
        <div style={MODAL_CARD}>
          <div style={MODAL_CARD_HEAD}>{t('act.jobsHere')} ({here.length})</div>
          <CompanyJobsList here={here} cur={job.id} lang={lang} onOpenJob={onOpenJob} />
        </div>
      ) : null}
    </>
  )
}
// #126 同岗 jobtext 会话缓存:三处调用点(事实块/JD 弹框/详情页 JD 区)共用,同一岗反复开关不重复
// 打端点烧额度(统一池 #124 下一次白开=一次额度)。只缓存 200 非空正文;402/空/失败不缓存,
// 服务端负缓存(10min)照管懒抓重试节奏。命中缓存时 freeLeft=null(没消耗,额度行不刷新)。
const jobTextCache = new Map<string, string>()
// #134(Frank 报障「点了一些工作发现都是空的」):429 曾掉进「空」分支——额度一用完,之后每个岗都显示
// 「本站暂未收录正文」,把限流谎报成缺数据(最恶的一种静默失败:用户以为站没数据)。三态分明:
// 402=免费额度用完(升级卡) · 429=匿名 IP 池用完(说人话+引导注册) · 其它非 2xx=取数失败(不是「没有」)。
export async function fetchJobText(applyUrl: string, signal?: AbortSignal): Promise<{ status: 'ok' | 'gated' | 'limited' | 'error' | 'empty'; text: string; freeLeft: number | null }> {
  const hit = jobTextCache.get(applyUrl)
  if (hit != null) return { status: 'ok', text: hit, freeLeft: null }
  const res = await fetch('/api/jobtext?url=' + encodeURIComponent(applyUrl), { signal })
  const left = res.headers.get('X-Free-Left')
  const freeLeft = left != null ? Number(left) : null
  if (res.status === 402) return { status: 'gated', text: '', freeLeft }
  if (res.status === 429) return { status: 'limited', text: '', freeLeft }
  if (!res.ok) return { status: 'error', text: '', freeLeft }
  const text = (await res.text()).trim()
  if (text) jobTextCache.set(applyUrl, text)
  return { status: text ? 'ok' : 'empty', text, freeLeft }
}
function TitleFacts({ job, lang, loggedIn }: { job: JobRow; lang: Lang; loggedIn: boolean }) {
  const t = makeT(lang)
  const [jd, setJd] = useState<string | null>(null)  // null=loading · ''=无正文
  const [gated, setGated] = useState(false)          // 402:JD 摘录免费试用用完(E3-05)
  const [limited, setLimited] = useState(false)      // #134:429 匿名池用完 ≠ 没数据
  useEffect(() => {
    const ctrl = new AbortController()
    ;(async () => {
      try {
        const r = await fetchJobText(job.applyUrl || '', ctrl.signal)
        if (r.status === 'gated') { setGated(true); setJd(''); return }
        if (r.status === 'limited') { setLimited(true); setJd(''); return }
        setJd(r.text)
      } catch { if (!ctrl.signal.aborted) setJd('') }
    })()
    return () => ctrl.abort()
  }, [job])
  return (
    <FactsBox>
      {/* 雇佣形态 + 入职要求(E6-06/E6-07A):详情页结构化标注原文,零 LLM。
          J1(2026-07-19 Frank):工时/雇佣期拆两行(禁「·」杂糅);未标注显灰字不再整行消失;证书一行一条 */}
      <FactRow k={t('col.empHours')}>{job.employmentHours ? t('emp.' + job.employmentHours) : <span style={{ color: '#9ca3af' }}>{t('fact.unstated')}</span>}</FactRow>
      <FactRow k={t('col.empTerm')}>{job.employmentTerm ? t('term.' + job.employmentTerm) : <span style={{ color: '#9ca3af' }}>{t('fact.unstated')}</span>}</FactRow>
      <FactRow k={t('fact.edu')}>{job.education || null}</FactRow>
      <FactRow k={t('fact.cert')}>{job.certificates?.length ? <>{job.certificates.map((c, i) => <div key={i}>{c}</div>)}</> : null}</FactRow>
      {/* 职位字段只做职位的事(07-06 用户拍板):职位名已在弹窗标题,NOC/TEER 归分类弹窗 —— 这里就是真实 JD */}
      <div style={{ fontSize: 11.5, color: '#9ca3af', marginTop: (job.employmentHours || job.education || job.certificates?.length) ? 8 : 0 }}>{t('fact.jdExcerpt')}</div>
      {gated ? <LockedText t={t} loggedIn={loggedIn} lines={4} />
        : limited ? <div style={{ marginTop: 4 }}><Notice kind="warn">{t('advisor.limit429')}</Notice></div>
        : jd === null ? <div style={{ marginTop: 4, fontSize: 12.5, color: '#9ca3af' }}>{t('act.loadingText')}</div>
        : jd ? <JdTextView text={jd} />
        : <div style={{ marginTop: 4, fontSize: 12.5, color: '#9ca3af' }}>
            {/* 空态解释原因(第 9 轮 #26);原帖链接不再内联(2026-07-11 用户指出与下方来源行重复,来源行=同一 applyUrl) */}
            {blockedSrc(job) ? t('act.noTextBlocked', { src: blockedSrc(job) }) : t('act.noText')}
          </div>}
    </FactsBox>
  )
}
// 公司名归一(镜像 etl/clean/05c_flag_aip.py 的 norm_name)—— 用于把岗位公司名匹配回 AIP 指定雇主记录
const AIP_SUFFIX = /\b(inc|incorporated|ltd|limited|llp|llc|corp|corporation|co|company|enr|ltee|ltée|holdings?|group|services?|enterprises?)\b\.?/gi
const normName = (name?: string) => (name || '').toLowerCase()
  .split(/\bo\/a\b|\bdba\b|\bd\/b\/a\b/)[0]
  .replace(AIP_SUFFIX, ' ').replace(/[^a-z0-9& ]/g, ' ').replace(/\s+/g, ' ').trim()
const ATLANTIC = new Set(['NL', 'NB', 'NS', 'PE'])
// E12-08:拆解弹框——三维档(1-5)明细走 /api/scoredetail 额度端点(「先试用再付费」拍板;
// 明细不随列表行下发=服务端真闸)。旧 0-100 加权分前端镜像 scoreBreakdown 随加权制退役。
function ScoreGradesSection({ job, lang, loggedIn }: { job: JobRow; lang: Lang; loggedIn: boolean }) {
  const t = makeT(lang)
  type Detail = { channel?: { g: number; v: string } | null; salary?: { g: number; v: number } | null; emp?: { g: number; v: string[] } | null }
  // E12-08 尾巴(#126):公司四维(担保/活跃/薪资/知名)——scoredetail 一直回传,此前 UI 只渲了担保档一行
  type CoDetail = {
    sponsor?: { g: number; v: { skilled?: number; total?: number; q?: string; aip?: boolean } } | null
    active?: { g: number; v: { open?: number; new30?: number } } | null
    salary?: { g: number; v: number } | null
    fame?: { g: number; v: { wiki?: boolean; provs?: number; open?: number } } | null
  }
  const [d, setD] = useState<undefined | 'upgrade' | 'limited' | 'error' | { detail: Detail | null; sponsorGrade: number | null; companyDetail: CoDetail | null }>(undefined)
  const [freeLeft, setFreeLeft] = useState<number | null>(null)
  useEffect(() => {
    let dead = false
    setD(undefined)
    fetch('/api/scoredetail', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: job.id }) })
      .then(async (r) => {
        const left = r.headers.get('X-Free-Left')
        if (left != null && !dead) setFreeLeft(Number(left))
        if (r.status === 402) return 'upgrade' as const
        if (r.status === 429) return 'limited' as const
        if (!r.ok) return 'error' as const
        return await r.json()
      })
      .then((x) => { if (!dead) setD(x) })
      .catch(() => { if (!dead) setD('error') })
    return () => { dead = true }
  }, [job])
  // #133(Frank「直接写文字,不要分成五个单位」):点阵刻度与 X/5 数字全部退役,档名彩字+依据句即全部
  const gname = (g: number, name: string) => <b style={{ color: gradeColor(g) }}>{name}</b>
  const row = (label: string, body: React.ReactNode) => (
    <div style={{ display: 'flex', gap: 10, padding: '5px 0', fontSize: 13, alignItems: 'baseline' }}>
      <span style={{ minWidth: 88, color: '#9ca3af', flexShrink: 0 }}>{label}</span>
      <span style={{ flex: 1, color: '#374151' }}>{body}</span>
    </div>
  )
  if (d === 'upgrade') return <LockedText t={t} loggedIn={loggedIn} />
  // #175:429 黄条退役 → 打码+锁行(全站限额态统一形态)
  if (d === 'limited') return <LockedText t={t} loggedIn={loggedIn} msg={t('advisor.limit429')} ctaLabel={!loggedIn ? t('advisor.limitCta') : undefined} />
  if (d === 'error') return <div style={{ fontSize: 13, color: '#9ca3af' }}>{t('advisor.unavail')}</div>
  if (d === undefined) return <div style={{ fontSize: 13, color: '#9ca3af' }}>{t('act.loadingText')}</div>
  const det = d.detail || {}
  const ch = det.channel, sal = det.salary, emp = det.emp
  return (
    <FactsBox note={t('fact.scoreNote')}>
      {freeLeft != null && <div style={{ fontSize: 11.5, color: '#9ca3af', marginBottom: 4 }}>{t('advisor.left', { n: freeLeft })}</div>}
      {ch ? row(t('gr.dim.channel'), <>{gname(ch.g, t('gr.ch.' + ch.g))}<div style={{ fontSize: 12.5, color: '#6b7280' }}>{t(`gr.channel.${ch.g}`, { v: ch.v || '' })}</div></>) : null}
      {sal ? row(t('gr.dim.salary'), <>{gname(sal.g, t('gr.sal.' + sal.g))}<div style={{ fontSize: 12.5, color: '#6b7280' }}>{t('gr.salary.d', { pct: sal.v >= 0 ? `+${sal.v}` : String(sal.v) })}</div></>)
        : row(t('gr.dim.salary'), <span style={{ color: '#9ca3af' }}>{t('gr.noData')}</span>)}
      {emp ? row(t('gr.dim.emp'), <>{gname(emp.g, t('gr.empn.' + emp.g))}<div style={{ fontSize: 12.5, color: '#6b7280' }}>{emp.v?.length ? emp.v.map((h) => t('gr.emp.' + h)).join('、') : t('gr.emp.none')}</div></>) : null}
      {/* #176(Frank「简化,精简才能长久」):参照区(公司四维行+省难度链)整块退役——
          公司的事在公司弹框(担保/在库/简介),省难度在 /stats,一条信息只在一个家。
          通道卡从此只回答一件事:这个岗自身的三维档。 */}
    </FactsBox>
  )
}
const LOC_FIELDS = new Set<ColKey>(['country', 'province', 'city', 'district', 'address'])
const SAL_FIELDS = new Set<ColKey>(['salary', 'salaryYr', 'wageMedHr', 'wageMedYr', 'vsMedian'])
const CLS_FIELDS = new Set<ColKey>(['noc', 'teer', 'broad', 'mid', 'fine'])
const SRC_FIELDS = new Set<ColKey>(['source', 'origin', 'direct'])
const TIME_FIELDS = new Set<ColKey>(['status', 'datePosted', 'lastSeen', 'closedAt'])
// 每个字段来源各归其源(07-06 用户拍板:不能都链 jobbank 列表根):
// 帖内字段 → 记录级 applyUrl(这一岗的原帖,每岗不同);第三方数据字段 → field_sources 注册表里各自的
// 官方数据集页(分类=StatCan NOC、中位=ESDC 工资、AIP/PNP/EE=IRCC、LMIA=ESDC 名录);
// 本站派生(评分/匹配)与公司(官网行即出处)不挂。vsMedian=对比字段,帖子+ESDC 两个输入都给。
const DATASET_SRC_FIELDS = new Set<ColKey>(['noc', 'teer', 'broad', 'mid', 'fine', 'wageMedHr', 'wageMedYr', 'aip', 'lmia', 'pnp', 'ee'])
// 本站派生字段(评分/匹配):无外部 URL,来源行显示算法说明文案(E8-04:所有字段都有来源,派生也诚实标注)
const DERIVED_SRC_FIELDS = new Set<ColKey>(['score', 'match'])
function fieldSrcUrls(field: ColKey, job: JobRow, sources: FieldSource[]): string[] {
  const reg = (k: string) => sources.find((s) => s.field === k && s.url)?.url || ''
  if (DERIVED_SRC_FIELDS.has(field)) return []
  // 公司:官网行本身就是出处(来源行不再重复它,2026-07-07 用户点名手机端重复);担保史行来源=ESDC/IRCC 名录
  // 阈值与画像一致(≥2 才显示担保史行 → 才挂名录来源)
  if (field === 'company') return [(job.lmiaPositions ?? 0) >= 2 ? reg('lmia') : '', job.aip ? reg('aip') : ''].filter(Boolean)
  if (field === 'vsMedian') return [job.applyUrl, reg('wageMedYr')].filter(Boolean)
  if (DATASET_SRC_FIELDS.has(field)) return [reg(field)].filter(Boolean)
  return job.applyUrl ? [job.applyUrl] : []
}

// 来源行极简版(2026-07-06 用户拍板):「来源: 完整 applyUrl」一行可点击,**紧跟事实/JD 内容、在 AI 区之前**
// (出处跟着对应内容走,不吊在弹窗底部);发布方/抓取时间/标签全不带 —— 合规已在 footer 统一声明。
// pnp/ee 字段例外:清单内容来自政策页,各通道行已带自己的 ↗ 官方链接,不加岗位帖来源行。
// field_sources 维度与 /sources 解释页照旧保留(E4-04 出处能力后置到解释页)。
// ═══ E8-10 S6:事实块按**分组**铺开(2026-07-21)═════════════════════════════════════
// 收编前:点「通道」列只渲通道一条 —— 弹框标题写着「移民」,里面却只有一个字段,
// 用户还得退出去再点 PNP、再点 EE、再点 AIP,每点一次烧一次额度。这正是 24 个弹框的病根。
// 收编后:一个分组一次把该组事实全铺出来。**复用既有 FieldFactsSection 当积木**(它=某字段事实+其来源行),
// 不重写任何渲染逻辑 —— 顺序即阅读顺序,先结论后依据。
const GROUP_SECTIONS: Record<FieldGroup, ColKey[]> = {
  // #176 四弹框终表:移民=「能不能走」(通道/PNP/EE/AIP/vs 中位)——职业分类挪去自己的家;
  // 分类=「这职业是干嘛的」(三级路径+官方职责+任职要求,一张卡);公司=「雇主靠谱吗」;
  // 职位组退役(ActModal 即职位弹框:JD 整理版自带薪资/怎么投节,不另立组)。
  immigration: ['score', 'pnp', 'ee', 'aip', 'vsMedian'],
  category: ['noc'],
  company: [],   // 2026-07-21:公司组走专用 CompanyPanel(平级卡),不经 GroupFactsSection
}
// 有没有这块事实 —— 没有就整块跳过,**绝不留孤儿小标题**(既有规范 §2「空段规则」)
function hasFacts(k: ColKey, job: JobRow): boolean {
  switch (k) {
    case 'score': return job.gradeChannel != null || job.score != null
    case 'pnp': return true          // 未命中也要说「未命中」,是结论不是空
    case 'ee': return true           // 同上(#155 已收成一行+折叠)
    case 'aip': return !!job.aip
    case 'noc': return !!job.noc
    case 'vsMedian': return job.salaryAnnual != null || job.wageMedAnnual != null
    case 'salary': return !!(job.salaryText || job.salary)
    case 'accessibility': return !!job.accessibility
    case 'title': return true
    case 'company': return !!job.company
    default: return true
  }
}
// 分节标题:走既有 col.* 人话名(通道 / PNP / EE 类别 / AIP / 薪资…),不新造术语。
// #174 对齐详情页卡规范(Frank「对齐」):原「标题在卡外、留白分隔」退役 ——
// 每节一张 sec 同款卡(白/#e5e7eb/r12),**每卡必有 title,单节组也不例外**(#173 铁律)。
const MODAL_CARD: React.CSSProperties = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '12px 16px', marginBottom: 14 }
const MODAL_CARD_HEAD: React.CSSProperties = { fontSize: 13.5, fontWeight: 700, color: '#111827', marginBottom: 6 }
// 弹框顶部胶囊钮(分类/职位弹框共用:显示中文对照 / AI 速读)
const PILL_BTN: React.CSSProperties = { border: '1px solid #e5e7eb', borderRadius: 999, padding: '5px 13px', fontSize: 12.5, background: '#fff', color: '#374151', cursor: 'pointer', fontWeight: 600 }
function GroupFactsSection(props: Omit<Parameters<typeof FieldFactsSection>[0], 'field'> & { group: FieldGroup }) {
  const { group, job, lang, ...rest } = props
  const t = makeT(lang)
  const keys = GROUP_SECTIONS[group].filter((k) => hasFacts(k, job))
  return (
    <>
      {keys.map((k) => (
        <div key={k} style={MODAL_CARD}>
          {/* 分类卡标题人话化:col.noc 是列名「NOC」,当卡标题裸奔(#176 实测抓到)*/}
          <div style={MODAL_CARD_HEAD}>{k === 'noc' ? t('grp.category') : t('col.' + k)}</div>
          <FieldFactsSection field={k} job={job} lang={lang} {...rest} />
        </div>
      ))}
    </>
  )
}

function FieldFactsSection({ field, job, jobs, lang, isPro, loggedIn, pnpOcc, pnpDraws, news, eeOcc, desigEmp, nocDesc, fieldSources, onOpenJob }: { field: ColKey; job: JobRow; jobs: JobRow[]; lang: Lang; isPro: boolean; loggedIn: boolean; pnpOcc: PnpOcc[]; pnpDraws: PnpDraw[]; news: NewsSlim[]; eeOcc: EeOcc[]; desigEmp: DesigEmp[]; nocDesc: NocDesc[]; fieldSources: FieldSource[]; onOpenJob?: (j: JobRow) => void }) {
  const t = makeT(lang)
  const urls = fieldSrcUrls(field, job, fieldSources)
  return (
    <>
      <FieldFactsInner field={field} job={job} jobs={jobs} lang={lang} isPro={isPro} loggedIn={loggedIn} pnpOcc={pnpOcc} pnpDraws={pnpDraws} news={news} eeOcc={eeOcc} desigEmp={desigEmp} nocDesc={nocDesc} onOpenJob={onOpenJob} />
      {DERIVED_SRC_FIELDS.has(field) ? (
        <div style={{ margin: '2px 0 0', fontSize: 11.5, color: '#9ca3af' }}>
          {t('src.label')}: {t('src.derived')}
        </div>
      ) : urls.length ? (
        /* #174:多 URL 的「 · 」连缀退役(W 规矩一行一条)——首条跟标签同行,其余各自成行 */
        <div style={{ margin: '2px 0 0', fontSize: 11.5, color: '#9ca3af', overflowWrap: 'anywhere' }}>
          {t('src.label')}: <a href={urls[0]} target="_blank" rel="noreferrer" style={{ color: '#6b7280', textDecoration: 'none' }}>{urls[0]}</a>
          {urls.slice(1).map((u) => <div key={u}><a href={u} target="_blank" rel="noreferrer" style={{ color: '#6b7280', textDecoration: 'none' }}>{u}</a></div>)}
        </div>
      ) : null}
    </>
  )
}
// 该公司在榜职位(第 10 轮 #27,用户反馈):行点击开本站职位描述弹窗(叠在公司弹窗上,关掉回列表;
// 不开顾问弹窗——那会每行烧一次 LLM 额度)、去「— 城市」尾缀;「… +N」改可展开全量
function CompanyJobsList({ here, cur, lang, onOpenJob }: { here: JobRow[]; cur: JobRow['id']; lang: Lang; onOpenJob?: (j: JobRow) => void }) {
  const t = makeT(lang)
  const [all, setAll] = useState(false)
  const shown = all ? here : here.slice(0, 8)
  // 同名岗才补灰色城市尾缀区分(2026-07-11 用户实机撞到两条同名 gas technician 分不清;
  // #27 拍板的「去城市尾缀」只对不重名的行生效——重名时城市是唯一区分度,不是废话)
  const titleCount = new Map<string, number>()
  for (const x of here) titleCount.set(x.title, (titleCount.get(x.title) || 0) + 1)
  return (
    <>
      {shown.map((x) => (
        <div key={x.id} style={{ fontSize: 12.5, padding: '2px 0', color: '#4b5563' }}>
          {/* 统一最原始超链接样式(2026-07-11 用户拍板);行首「·」按用户拍板去掉(链接本身已是行标识) */}
          {onOpenJob
            ? <button onClick={() => onOpenJob(x)} style={{ border: 'none', background: 'none', padding: 0, font: 'inherit', cursor: 'pointer', textAlign: 'left', color: '#2563eb', textDecoration: 'underline' }}>{x.title}</button>
            : x.title}
          {(titleCount.get(x.title) || 0) > 1 && x.city ? <span style={{ color: '#9ca3af' }}> · {x.city}</span> : null}
        </div>
      ))}
      {!all && here.length > 8 && (
        <button onClick={() => setAll(true)} style={{ border: 'none', background: 'none', padding: '2px 0', fontSize: 11.5, color: '#2563eb', cursor: 'pointer' }}>{t('act.showAll', { n: here.length - 8 })}</button>
      )}
    </>
  )
}
function FieldFactsInner({ field, job, jobs, lang, isPro, loggedIn, pnpOcc, pnpDraws, news, eeOcc, desigEmp, nocDesc, onOpenJob }: { field: ColKey; job: JobRow; jobs: JobRow[]; lang: Lang; isPro: boolean; loggedIn: boolean; pnpOcc: PnpOcc[]; pnpDraws: PnpDraw[]; news: NewsSlim[]; eeOcc: EeOcc[]; desigEmp: DesigEmp[]; nocDesc: NocDesc[]; onOpenJob?: (j: JobRow) => void }) {
  const t = makeT(lang)
  const noc = nocDesc.find((d) => d.noc === job.noc) || null
  if (field === 'pnp') return <PnpListSection job={job} lang={lang} occ={pnpOcc} draws={pnpDraws} news={news} />
  if (field === 'ee') return <EeCategorySection job={job} lang={lang} cats={eeOcc} draws={pnpDraws} />
  if (field === 'title') return <TitleFacts job={job} lang={lang} loggedIn={loggedIn} />
  const day = (s?: string) => (s || '').slice(0, 10)

  // field === 'company' 分支退役(2026-07-21):公司弹框走专用 CompanyPanel(平级卡),不再经本表

  if (field === 'score') {
    // E12-08:1-5 档三维拆解(额度 API);旧 0-100 加权分解表退役
    return <ScoreGradesSection job={job} lang={lang} loggedIn={loggedIn} />
  }

  if (field === 'aip') {
    const cn = normName(job.company)
    const matches = ATLANTIC.has(job.province) && cn
      ? desigEmp.filter((e) => e.province === job.province && normName(e.name) === cn)
      : []
    return (
      <FactsBox note={t('fact.aipNote')}>
        <FactRow k={t('col.aip')}>{job.aip ? t('cell.aipYes') : '—'}</FactRow>
        {matches.map((e, i) => (
          <FactRow key={i} k={e.name}>{[e.location, e.province, e.isTech ? t('fact.aipTech') : null].filter(Boolean).join('、')}</FactRow>
        ))}
      </FactsBox>
    )
  }

  if (field === 'eligibility') {  // GAP1③:红旗 + JD 命中原句(可核验);「—」口径=未检出≠保证担保
    return (
      <FactsBox note={t('fact.eligNote')}>
        <FactRow k={t('fact.elig')}>{job.eligibilityFlag ? t('cell.elig.' + job.eligibilityFlag) : '—'}</FactRow>
        {job.eligibilityQuote ? <FactRow k={t('fact.eligQuote')}>“{job.eligibilityQuote}”</FactRow> : null}
      </FactsBox>
    )
  }

  if (field === 'lmia') {  // E6-02:公司级 LMIA 获批史(ESDC 近 8 季聚合)——纯事实,股别/季度语境必带
    // E8-04:把「历史记录」升级为「今天这条路通不通」——按本岗高/低薪 + 豁免行业判前瞻可行性(数据:lib/lmiaStatus)
    const wc = lmiaWageClass(job.province, job.salaryAnnual)
    const exempt = isExemptSector(job.noc)
    const feasible = wc === 'high' ? { tone: '#15803d', txt: t('lmia.high') }        // 高薪类:不受冻结
      : wc === 'low' && exempt ? { tone: '#15803d', txt: t('lmia.exempt') }          // 低薪但豁免行业
      : wc === 'low' ? { tone: '#b45309', txt: t('lmia.lowFrozen') }                  // 低薪非豁免:大城市可能冻结
      : null                                                                          // 缺工资/门槛:不猜
    return (
      <FactsBox note={t('fact.lmiaNote')}>
        <FactRow k={t('col.lmia')}>{job.lmiaPositions ? t('cell.lmiaYes', { n: job.lmiaPositions, q: job.lmiaLastQuarter }) : '—'}</FactRow>
        <FactRow k={t('fact.lmiaStreams')}>{job.lmiaStreams || null}</FactRow>
        <FactRow k={t('col.company')}>{job.company}</FactRow>
        {feasible && (
          <FactRow k={t('lmia.route')}>
            <span style={{ color: feasible.tone, fontWeight: 500 }}>{feasible.txt}</span>{' '}
            <a href={LMIA_REFUSAL_SOURCE} target="_blank" rel="noreferrer" style={{ color: '#6b7280', textDecoration: 'none', fontSize: 11.5 }}>{t('lmia.official')} ↗</a>
          </FactRow>
        )}
      </FactsBox>
    )
  }

  if (LOC_FIELDS.has(field)) {
    // 点哪级只看哪级(含上级路径,07-06 用户拍板);地图链接按所看层级拼查询词(点省=省的地图,不带街址)
    const L = parseLoc(job)
    const depth = field === 'country' ? 1 : field === 'province' ? 2 : field === 'city' ? 3 : field === 'district' ? 4 : 5
    const mapQ = [depth >= 5 ? job.address : '', depth >= 4 ? L.district : '', depth >= 3 ? L.city : '', depth >= 2 ? L.prov : ''].filter(Boolean).join(', ')
    // 点「省」= 移民视角高价值内容(用户拍板:每字段要有料):该省具名通道数 + 最近抽选(数据已有,复用)
    const provStreams = field === 'province' && job.province && job.province !== 'QC'
      ? new Set(pnpOcc.filter((o) => o.province === job.province && o.type !== 'ineligible').map((o) => o.label)).size : 0
    return (
      // 缺地址/区时口径注明说(E8-04 诚实降级):留空=源帖没给,不猜;有值时无注(值即事实)
      <FactsBox note={field === 'address' && !job.address ? t('fact.noAddrNote')
        : field === 'district' && !L.district ? t('fact.noDistrictNote') : undefined}>
        {/* 省弹窗不再摆「国家 Canada」凑数行(2026-07-12 用户反馈「说明没看懂」——重复行是噪音);
            地图行给明确标签「地图 · 在 Google 地图查看」,不再用裸图标当行名+重复地名当链接文案 */}
        {field !== 'province' && <FactRow k={t('col.country')}>{L.country || 'Canada'}</FactRow>}
        {depth >= 2 && <FactRow k={t('col.province')}>{L.prov}</FactRow>}
        {depth >= 3 && <FactRow k={t('col.city')}>{L.city}</FactRow>}
        {depth >= 4 && <FactRow k={t('col.district')}>{L.district}</FactRow>}
        {depth >= 5 && <FactRow k={t('col.address')}>{job.address}</FactRow>}
        {mapQ ? <FactRow k={t('fact.map')}><a href={mapsUrl(mapQ)} target="_blank" rel="noreferrer" style={{ ...link, fontSize: 12.5 }}><IconMap /> {t('fact.mapView')}({mapQ})↗</a></FactRow> : null}
        {field === 'province' && job.province === 'QC' && <FactRow k={t('col.pnp')}>{t('pnplist.qc')}</FactRow>}
        {provStreams > 0 && <FactRow k={t('col.pnp')}>{t('fact.provStreams', { n: provStreams })}</FactRow>}
        {field === 'province' && job.province && <PnpDrawsBlock province={job.province} lang={lang} draws={pnpDraws} limit={1} />}
      </FactsBox>
    )
  }
  if (SAL_FIELDS.has(field)) {
    // 五个薪资字段各看各的(07-06 用户拍板):薪资=帖面原文;年薪=折算;中位时薪/年薪=ESDC band;
    // vs 中位=对比,天然要带两个输入(年薪+中位年薪)。中位口径注只跟用到中位的字段。
    const a = job.salaryAnnual, mHr = job.wageMedHourly, mYr = job.wageMedAnnual
    const lHr = job.wageLowHourly, hHr = job.wageHighHourly, lYr = job.wageLowAnnual, hYr = job.wageHighAnnual
    const vs = a != null && mYr ? Math.round((a / mYr - 1) * 100) : null
    const K = (n: number) => `$${Math.round(n / 1000)}K`
    const bandHr = mHr != null ? `${lHr != null ? `$${lHr} – ` : ''}$${mHr}${hHr != null ? ` – $${hHr}` : ''}/hr` : null
    const bandYr = mYr != null ? `${lYr != null ? `${K(lYr)} – ` : ''}${K(mYr)}${hYr != null ? ` – ${K(hYr)}` : ''}/yr` : null
    const usesMedian = field === 'wageMedHr' || field === 'wageMedYr' || field === 'vsMedian'
    // #154(Frank「这个文字没必要显示」):换算口径注不再常驻——同一句话每个岗重复一遍是噪音;
    // 改挂「年薪(折算)」标签的悬停提示(下方 FactRow),口径要查得到但不占版面
    return (
      <FactsBox note={!usesMedian ? undefined
        : (mHr != null || mYr != null)
          ? t('fact.medianSrc') + (job.wageYear ? ` · ${job.wageYear}` : '') + (field === 'vsMedian' && vs != null ? ' · ' + t('fact.vsNote') : '')
          // 中位缺失分两种,别混:免费层=数据被付费墙剥离(引导升级);Pro=该 NOC×省真无 ESDC 数据(宁可留空)
          : (isPro ? t('fact.noMedian') : t('fact.medianPro'))}>
        {field === 'salary' && <FactRow k={t('col.salary')}>{job.salaryText || job.salary}</FactRow>}
        {(field === 'salaryYr' || field === 'vsMedian') && <FactRow k={<span title={t('fact.salYrNote')}>{t('col.salaryYr')}</span>}>{a != null ? `$${Math.round(a / 1000)}K/yr` : null}</FactRow>}
        {field === 'wageMedHr' && <FactRow k={t('fact.wageBandHr')}>{bandHr}</FactRow>}
        {(field === 'wageMedYr' || field === 'vsMedian') && <FactRow k={t('fact.wageBandYr')}>{bandYr}</FactRow>}
        {field === 'vsMedian' && <FactRow k={t('col.vsMedian')}>{vs != null ? `${vs >= 0 ? '+' : ''}${vs}%` : null}</FactRow>}
        {/* ② 免费用户在「刚要判断薪资」的位置点出 Pro 能看什么;#152:整段说明文字退役,改打码占位数
            (Frank「打上马赛克那种,别写那么长」)——与详情页 #130、表格锁列同一套。真值免费态不出服务端 */}
        {!isPro && (field === 'salary' || field === 'salaryYr') && (
          <>
            {/* #167①(Frank「这种需要统一成一个按钮即可吧」):原先同一处并排两个升级入口 ——
                灰字「Pro 解锁」四字 + 下面一枚实心棕钮,两者点了去同一个地方,等于把同一句话说两遍。
                收成一个:打码占位数旁的「Pro 解锁」**自己就是那个入口**(UpgradeCta link 形态),
                实心棕钮撤走 —— 按 #160 定的规矩,实心钮只留顶栏与弹窗,稀缺性就是它的说服力。 */}
            <FactRow k={t('col.vsMedian')}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span aria-hidden style={{ filter: 'blur(5px)', userSelect: 'none' }}>+15%</span>
                <UpgradeCta t={t} loggedIn={loggedIn} link label={t('up.proShort')} style={{ fontSize: 12 }} />
              </span>
            </FactRow>
          </>
        )}
      </FactsBox>
    )
  }
  if (CLS_FIELDS.has(field)) {
    // 点哪级只看哪级(含上级路径,07-06 用户点名:大分类弹窗不该混进中/小分类):
    // broad=1 级 · mid=2 级 · fine=3 级;NOC 字段=全链 + 官方职责/任职要求(五位码职业级信息只在这)。
    const depth = field === 'broad' ? 1 : field === 'mid' ? 2 : field === 'fine' ? 3 : 0
    return (
      <FactsBox note={t('fact.nocNote')}>
        {field === 'noc' ? <>
          <FactRow k={t('col.noc')}>{job.noc}</FactRow>
          {noc?.title ? <FactRow k={t('fact.nocTitle')}>{noc.title}</FactRow> : null}
        </> : null}
        {(field === 'noc' || field === 'teer') && <FactRow k={t('col.teer')}>{job.teer != null ? `TEER ${job.teer} (${t('teer.' + job.teer)})` : null}</FactRow>}
        {(field === 'noc' || depth >= 1) && <FactRow k={t('col.broad')}>{job.broad && job.broad !== '未分类' ? t('broad.' + job.broad) : null}</FactRow>}
        {(field === 'noc' || depth >= 2) && <FactRow k={t('col.mid')}>{job.mid && job.mid !== '未分类' ? catName(t, job.mid) : null}</FactRow>}
        {(field === 'noc' || depth >= 3) && <FactRow k={t('col.fine')}>{job.fine && job.fine !== '未分类' ? catName(t, job.fine) : null}</FactRow>}
        {field === 'noc' && <NocDutiesView noc={noc} lang={lang} />}
      </FactsBox>
    )
  }
  if (SRC_FIELDS.has(field)) {
    // 来源/渠道/发布各看各的一行(07-06 用户拍板);口径注三者共用
    return (
      <FactsBox note={t('fact.sourceNote')}>
        {field === 'source' && <FactRow k={t('col.source')}>{job.sourceLabel || job.source}</FactRow>}
        {field === 'origin' && <FactRow k={t('col.origin')}>{(() => { const v = t('origin.' + job.origin); return v.startsWith('origin.') ? job.origin : v })()}</FactRow>}
        {field === 'direct' && <FactRow k={t('col.direct')}>{isDirect(job) ? t('fact.firstParty') : t('fact.repost')}</FactRow>}
      </FactsBox>
    )
  }
  if (field === 'accessibility') {
    // 未知时显式写「未知(帖内未写)」——acc.unknown 的列值是「—」会被 FactRow 隐藏,弹窗只剩孤零零一句口径注(文案审计)
    return <FactsBox note={t('fact.accNote')}><FactRow k={t('col.accessibility')}>{job.accessibility && job.accessibility !== 'unknown' ? t('acc.' + job.accessibility) : t('acc.none')}</FactRow></FactsBox>
  }
  if (TIME_FIELDS.has(field)) {
    // 时间四字段各看各的(07-06 用户拍板):状态/下架互为语境成对出现;发布带首次收录;抓取单独。
    // 「下架口径」注只跟状态/下架(发布、抓取时间与下架判定无关)。
    const isStatusish = field === 'status' || field === 'closedAt'
    return (
      <FactsBox note={isStatusish ? t('fact.timeNote') : undefined}>
        {isStatusish && <FactRow k={t('col.status')}>{t(job.status === 'closed' ? 'cell.closed' : 'cell.open')}</FactRow>}
        {field === 'datePosted' && <FactRow k={t('col.datePosted')}>{day(job.datePosted)}</FactRow>}
        {/* 挂帖时长(痛点盘点 P0 零抓取项):新鲜度信号,弹窗只在客户端开,无水合差异 */}
        {field === 'datePosted' && job.datePosted && (job.status || 'open') !== 'closed' && (() => {
          const d = Math.max(0, Math.floor((Date.now() - new Date(job.datePosted).getTime()) / 86400000))
          return <FactRow k={t('fact.daysUp')}>{t('fact.daysUpVal', { n: d })}</FactRow>
        })()}
        {field === 'datePosted' && <FactRow k={t('col.firstSeen')}>{day(job.firstSeen)}</FactRow>}
        {field === 'lastSeen' && <FactRow k={t('col.lastSeen')}>{day(job.lastSeen)}</FactRow>}
        {isStatusish && <FactRow k={t('col.closedAt')}>{job.closedAt ? day(job.closedAt) : null}</FactRow>}
      </FactsBox>
    )
  }
  return null  // title/company/noc-职责/aip/score 等依赖 Part B 抓取或 wiring,后续填
}

// ── AI 顾问弹框 ────────────────────────────────────────────────
// 所有字段都走本地大模型流式生成(按所选语言);前端只给极简头部 + 链接,正文由模型生成。
const CHAT_ON = false  // 顾问追问对话开关(2026-07-19 Frank 暂关:先做熟现有功能;亮回=初判切本地模型后)
const ADV_PREF = 'adv_modal_pref'  // 记忆 {full, w, h}(位置每次打开居中,避免窗口缩小后跑出屏外)
const JD_PREF = 'jd_modal_pref'    // 职位描述弹框同款记忆(独立键:两框常用尺寸不同)

// ── 浮动面板机器(标题栏拖动/八向拉伸/全屏/尺寸记忆)——顾问弹框与职位描述弹框共用 ──
const PANEL_EDGES: { dir: string; cursor: string; style: React.CSSProperties }[] = [
  { dir: 'n', cursor: 'ns-resize', style: { top: 0, left: 14, right: 14, height: 6 } },
  { dir: 's', cursor: 'ns-resize', style: { bottom: 0, left: 14, right: 14, height: 6 } },
  { dir: 'w', cursor: 'ew-resize', style: { left: 0, top: 14, bottom: 14, width: 6 } },
  { dir: 'e', cursor: 'ew-resize', style: { right: 0, top: 14, bottom: 14, width: 6 } },
  { dir: 'nw', cursor: 'nwse-resize', style: { top: 0, left: 0, width: 14, height: 14 } },
  { dir: 'ne', cursor: 'nesw-resize', style: { top: 0, right: 0, width: 14, height: 14 } },
  { dir: 'sw', cursor: 'nesw-resize', style: { bottom: 0, left: 0, width: 14, height: 14 } },
  { dir: 'se', cursor: 'nwse-resize', style: { bottom: 0, right: 0, width: 14, height: 14 } },
]
// 窄屏(E8-03):强制全屏,禁拖拽/拉伸/全屏切换钮
function useFloatPanel(prefKey: string, defW: number, defH: number) {
  const narrow = useIsNarrow()
  const [fullPref, setFullPref] = useState(false)
  const full = fullPref || narrow
  const [size, setSize] = useState({ w: defW, h: defH })
  const [pos, setPos] = useState(() => {
    if (typeof window === 'undefined') return { x: 80, y: 60 }
    const w = Math.min(defW, window.innerWidth - 24), h = Math.min(defH, window.innerHeight - 24)
    return { x: Math.max(12, (window.innerWidth - w) / 2), y: Math.max(12, (window.innerHeight - h) / 2) }
  })
  const sizeRef = useRef(size); sizeRef.current = size
  useEffect(() => {  // 载入记忆的尺寸/全屏,并按记忆尺寸重新居中
    try {
      const p = JSON.parse(localStorage.getItem(prefKey) || '{}')
      if (p.full) setFullPref(true)
      if (p.w && p.h) {
        const w = Math.min(p.w, window.innerWidth - 24), h = Math.min(p.h, window.innerHeight - 24)
        setSize({ w: p.w, h: p.h })
        setPos({ x: Math.max(12, (window.innerWidth - w) / 2), y: Math.max(12, (window.innerHeight - h) / 2) })
      }
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const savePref = (next: Record<string, unknown>) => {
    try { localStorage.setItem(prefKey, JSON.stringify({ ...JSON.parse(localStorage.getItem(prefKey) || '{}'), ...next })) } catch { /* ignore */ }
  }
  // 拖动(标题栏)—— 原生 pointer 事件,无依赖
  const startDrag = (e: React.PointerEvent) => {
    if (full) return
    e.preventDefault()
    const ox = e.clientX - pos.x, oy = e.clientY - pos.y
    const move = (ev: PointerEvent) => setPos({ x: ev.clientX - ox, y: ev.clientY - oy })
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up)
  }
  // 八方向拉伸(用户点名:上下左右都可放大缩小);西/北向同时移动位置,右/下边固定
  const MIN_W = 360, MIN_H = 280
  const startResize = (e: React.PointerEvent, dir: string) => {
    if (full) return
    e.preventDefault(); e.stopPropagation()
    const sx = e.clientX, sy = e.clientY, sw = size.w, sh = size.h, spx = pos.x, spy = pos.y
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - sx, dy = ev.clientY - sy
      let w = sw, h = sh, x = spx, y = spy
      if (dir.includes('e')) w = sw + dx
      if (dir.includes('s')) h = sh + dy
      if (dir.includes('w')) { w = sw - dx; x = spx + dx }
      if (dir.includes('n')) { h = sh - dy; y = spy + dy }
      if (w < MIN_W) { if (dir.includes('w')) x = spx + sw - MIN_W; w = MIN_W }
      if (h < MIN_H) { if (dir.includes('n')) y = spy + sh - MIN_H; h = MIN_H }
      setSize({ w, h }); setPos({ x, y })
    }
    const up = () => { savePref({ w: sizeRef.current.w, h: sizeRef.current.h }); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up)
  }
  const toggleFull = () => setFullPref((f) => { savePref({ full: !f }); return !f })
  const panel: React.CSSProperties = full
    ? { position: 'fixed', inset: 0, borderRadius: 0 }
    : { position: 'fixed', left: pos.x, top: pos.y, width: size.w, height: size.h }
  return { narrow, full, toggleFull, panel, startDrag, startResize }
}
// ── 对我意味着什么(E5-00 §3.5,FieldFactsSection 同级)────────────
// 依据链在弹框端用同一 match() 重算(lib/match.ts 纯函数,与服务端列一致);每条结论指回维度记录。
// 措辞红线:只说「符合/不符合公开清单条件」「高于/低于抽选线」,永不说「你能/不能移民」;块底带免责短句。
const VERDICT_ICON: Record<string, { icon: React.ReactNode; color: string }> = {
  pass: { icon: <IconCheck />, color: '#15803d' }, warn: { icon: <IconWarn />, color: '#b45309' }, fail: { icon: <IconX />, color: '#dc2626' }, na: { icon: '·', color: '#9ca3af' },
}
export function MeansForMe({ job, lang, plan, pnpOcc, eeOcc, nocDesc }: { job: JobRow; lang: Lang; plan: Plan; pnpOcc: PnpOcc[]; eeOcc: EeOcc[]; nocDesc: NocDesc[] }) {
  const t = makeT(lang)
  const result = useMemo(() => {
    if (!plan.profileOk || !plan.profile) return null
    const mj: MatchJob = {
      noc: job.noc, teer: job.teer, province: job.province, pnpEligible: job.pnpEligible,
      pnpStream: job.pnpStream, eeCategory: job.eeCategory, salaryAnnual: job.salaryAnnual, wageMedAnnual: job.wageMedAnnual,
      lmiaPositions: job.lmiaPositions, lmiaPositionsSkilled: job.lmiaPositionsSkilled, lmiaLastQuarter: job.lmiaLastQuarter,
    }
    return matchJob(plan.profile, mj, {
      pnpOccupations: pnpOcc.map((r) => ({ province: r.province, label: r.label, type: r.type, noc: r.noc, url: r.url, fetched: r.fetched })),
      eeCategories: eeOcc.map((r) => ({ category: r.category, label: r.label, noc: r.noc, drawCrs: r.drawCrs, drawDate: r.drawDate, url: r.url, fetched: r.fetched })),
    })
  }, [job, plan, pnpOcc, eeOcc])

  // 未登录/未建档:弹框内不再放建档引导(页头横幅 + 列表「建档案 →」列已覆盖;用户拍板:别到处都是)
  if (!plan.loggedIn || !plan.profileOk) return null
  // 匹配全放开(Frank 2026-07-21):匹配结论对所有已建档用户免费全出(本卡 result 本就前端按 profile 现算)——
  // 原「免费限额外整块打码」退役;付费墙只剩表内 Pro 数据列(vs中位/工资中位)。
  // 卡片化(E8-10 §3.5「逐条读判定 → 卡片」,双端统一;Frank 三拍:拆卡 / 值不换行不省略 / 英文在前中文灰注):
  // 依据链同源 match() reasons(1:1 映射,不另起炉灶);措辞红线照旧(只说符合与否)。
  if (!result) return null
  const lvColor: Record<string, string> = { high: '#166534', mid: '#1e40af', low: '#6b7280', na: '#9ca3af' }
  const pf = plan.profile!
  const noteS: React.CSSProperties = { color: '#9ca3af', fontSize: 11 }
  // #175(Frank「这种还是不要用括号了」):译名不再括号包,改灰注跟在英文后(头部卡
  // 「Esthetician…　美容师…」同款);省名同理,不再走 provName 的「En(译名)」字符串拼法
  const provCell = (c: string) => {
    const cc = (c || '').toUpperCase(); const en = PROV_NAMES[cc] || c
    const loc = t('prov.' + cc); const has = loc && loc !== 'prov.' + cc && loc !== en
    return <>{en}{has ? <span style={noteS}>　{loc}</span> : null}</>
  }
  // NOC:英文官方名主文案 + 界面语言译名灰注(#147),NOC 码作同行行尾灰注——不另起行
  const nocCell = (c: string) => {
    const d = nocDesc.find((x) => x.noc === c); const loc = nocLocalTitle(d, lang)
    return d?.title ? <>{d.title}{loc ? <span style={noteS}>　{loc}</span> : null} <span style={noteS}>NOC {c}</span></> : <>NOC {c}</>
  }
  // TEER 值同屏可能出现两次(省提名粗筛 / 技能层级),「0 最高,5 最低」灰注只随首次出现(一事只说一遍)
  let teerNoted = false
  const teerCell = () => {
    if (job.teer == null) return '—'
    const withNote = !teerNoted; teerNoted = true
    return <>TEER {job.teer}{withNote && <> <span style={noteS}>{t('mm.job.teerNote')}</span></>}</>
  }
  const salaryCell = job.salaryAnnual != null ? `$${Math.round(job.salaryAnnual / 1000)}K/yr` : t('mm.job.noSalary')
  type MMRow = { dim: string; jc: React.ReactNode; yc: React.ReactNode; verdict: 'pass' | 'warn' | 'fail' | 'na'; v: React.ReactNode; vTip?: string; src?: { label: string; url: string; fetched?: string } }
  const rows: MMRow[] = []
  for (const r of result.reasons as MatchReason[]) {
    const p: any = r.params || {}
    if (r.rule === 'noc') {
      if (r.key === 'match.r.noc.jobUncat') rows.push({ dim: t('mm.dim.noc'), jc: t('cell.uncat'), yc: '—', verdict: 'na', v: t('mm.v.uncat') })
      else if (r.key === 'match.r.noc.noProfile') rows.push({ dim: t('mm.dim.noc'), jc: nocCell(job.noc!), yc: t('mm.you.noNoc'), verdict: 'na', v: t('mm.v.noProfile') })
      else if (r.key === 'match.r.noc.exact') rows.push({ dim: t('mm.dim.noc'), jc: nocCell(job.noc!), yc: nocCell(job.noc!), verdict: 'pass', v: t('mm.v.match') })
      else if (r.key === 'match.r.noc.minor') rows.push({ dim: t('mm.dim.noc'), jc: nocCell(job.noc!), yc: nocCell(String(p.yours)), verdict: 'pass', v: t('mm.v.minor') })
      else rows.push({ dim: t('mm.dim.noc'), jc: nocCell(job.noc!), yc: <>{pf.nocCodes.map((c: string) => <div key={c}>{nocCell(c)}</div>)}</>, verdict: 'fail', v: t('mm.v.nomatch') })
    } else if (r.rule === 'prov') {
      if (r.key === 'match.r.prov.notTarget') rows.push({ dim: t('mm.dim.prov'), jc: provCell(String(p.prov)), yc: <>{pf.targetProvinces.map((c: string) => <div key={c}>{provCell(c)}</div>)}</>, verdict: 'warn', v: t('mm.v.notTarget') })
      else if (r.key === 'match.r.prov.qc') rows.push({ dim: t('mm.dim.pnp'), jc: provCell('QC'), yc: '—', verdict: 'na', v: t('mm.v.qc') })
      else if (r.key === 'match.r.prov.named') rows.push({ dim: t('mm.dim.pnp'), jc: streamDisplay(t, String(p.label)), yc: '—', verdict: 'pass', v: t('mm.v.named'), src: r.source })
      else if (r.key === 'match.r.prov.excluded') rows.push({ dim: t('mm.dim.pnp'), jc: streamDisplay(t, String(p.label)), yc: '—', verdict: 'fail', v: t('mm.v.excluded'), src: r.source })
      else if (r.key === 'match.r.prov.generic') rows.push({ dim: t('mm.dim.pnpPre'), jc: teerCell(), yc: '—', verdict: 'pass', v: t('mm.v.generic') })
      else rows.push({ dim: t('mm.dim.pnpPre'), jc: teerCell(), yc: '—', verdict: 'fail', v: t('mm.v.provNone') })
    } else if (r.rule === 'ee') {
      if (r.key === 'match.r.ee.none') rows.push({ dim: t('mm.dim.ee'), jc: t('mm.job.eeNone'), yc: '—', verdict: 'na', v: '—' })
      else if (r.key === 'match.r.ee.noDraw') rows.push({ dim: t('mm.dim.ee'), jc: t('mm.job.inCat', { cat: eeDisplay(t, String(p.cat)) }), yc: '—', verdict: 'na', v: t('mm.v.noDraw') })
      else {
        const noCrs = r.key === 'match.r.ee.noCrs'
        rows.push({ dim: t('mm.dim.ee'), jc: t('mm.job.inCat', { cat: eeDisplay(t, String(p.cat)) }), yc: noCrs ? t('mm.you.noCrs') : t('mm.you.crs', { crs: p.crs }), verdict: noCrs ? 'warn' : r.verdict as MMRow['verdict'], v: noCrs ? t('mm.v.fillCrs') : r.key === 'match.r.ee.above' ? t('mm.v.crsAbove', { diff: p.diff }) : t('mm.v.crsBelow', { gap: p.gap }) })
        rows.push({ dim: t('mm.dim.eeDraw'), jc: t('mm.job.draw', { draw: p.draw, date: p.date }), yc: '—', verdict: 'na', v: noCrs ? t('mm.v.fillCrsThen') : '—', src: r.source })
      }
    } else if (r.rule === 'teer') {
      if (r.key === 'match.r.teer.ok') rows.push({ dim: t('mm.dim.teer'), jc: teerCell(), yc: '—', verdict: 'pass', v: t('mm.v.teerOk') })
      else if (r.key === 'match.r.teer.channel') rows.push({ dim: t('mm.dim.teer'), jc: teerCell(), yc: '—', verdict: 'pass', v: t('mm.v.teerChannel', { stream: streamDisplay(t, String(p.stream)) }) })
      else rows.push({ dim: t('mm.dim.teer'), jc: teerCell(), yc: '—', verdict: 'fail', v: t('mm.v.teerLow') })
    } else if (r.rule === 'wage') {
      if (r.key === 'match.r.wage.above') rows.push({ dim: t('mm.dim.wage'), jc: salaryCell, yc: '—', verdict: 'pass', v: t('mm.v.wageAbove', { pct: p.pct }) })
      else if (r.key === 'match.r.wage.near') rows.push({ dim: t('mm.dim.wage'), jc: salaryCell, yc: '—', verdict: 'warn', v: t('mm.v.wageNear', { pct: p.pct }) })
      else if (r.key === 'match.r.wage.below') rows.push({ dim: t('mm.dim.wage'), jc: salaryCell, yc: '—', verdict: 'warn', v: t('mm.v.wageBelow', { pct: p.pct }) })
      else rows.push({ dim: t('mm.dim.wage'), jc: salaryCell, yc: '—', verdict: 'na', v: t('mm.v.wageNa') })
    } else if (r.rule === 'lmia') {
      if (r.key === 'match.r.lmia.na') rows.push({ dim: t('mm.dim.lmia'), jc: t('mm.job.lmiaNone'), yc: '—', verdict: 'na', v: t('mm.v.lmiaNa'), vTip: t('mm.v.lmiaNaTip') })
      else if (r.key === 'match.r.lmia.lowOnly') rows.push({ dim: t('mm.dim.lmia'), jc: t('mm.job.lmia', { n: p.n, q: p.q }), yc: '—', verdict: 'na', v: t('mm.v.lmiaLow'), src: r.source })
      else rows.push({ dim: t('mm.dim.lmia'), jc: t('mm.job.lmia', { n: p.n, q: p.q }), yc: '—', verdict: 'pass', v: t('mm.v.lmiaHas'), src: r.source })
    }
  }
  // 判定药丸:底色随判定(裸色字浮在白底上没有归属感);来源 ↗ 在药丸外
  const PILL: Record<MMRow['verdict'], { bg: string; fg: string }> = {
    pass: { bg: '#dcfce7', fg: '#15803d' }, warn: { bg: '#fef3c7', fg: '#b45309' }, fail: { bg: '#fee2e2', fg: '#dc2626' }, na: { bg: '#f3f4f6', fg: '#6b7280' },
  }
  const vCell = (r: MMRow) => {
    if (r.v === '—') return <span style={{ color: '#9ca3af' }}>—</span>
    const pill = PILL[r.verdict]; const v = VERDICT_ICON[r.verdict]
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
        <span title={r.vTip} style={{ background: pill.bg, color: pill.fg, fontWeight: 600, fontSize: 11.5, padding: '2px 8px', borderRadius: 999, whiteSpace: 'nowrap' }}>
          {v.icon} {r.v}{r.vTip ? ' ⓘ' : ''}
        </span>
        {r.src?.url && (
          <a href={r.src.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} style={{ fontSize: 11.5, color: '#2563eb', textDecoration: 'none' }}
            title={r.src.fetched ? t('match.srcFetched', { d: r.src.fetched }) : undefined}>↗</a>
        )}
      </span>
    )
  }
  return (
    /* 壳=页面统一卡规范(白底 #e5e7eb 描边 r12,详情页 sec 同款;Frank「一个页面统一风格」)——
       老弹框灰壳退役;卡里分组用灰内卡(白壳配灰内卡,不再白套白) */
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '12px 16px', margin: '0 0 14px' }}>
      <div style={{ fontSize: 13.5, fontWeight: 700, color: '#111827' }}>
        <IconTarget /> {t('match.title')}
        <span style={{ marginLeft: 10, fontWeight: 600, color: lvColor[result.level] }}>{t('match.levelLine', { level: t('match.' + result.level) })}</span>
      </div>
      {/* 一维度一段,分隔线分组(Frank「不要卡片套卡片更清晰」——#172 的灰内卡铺平):
          维度名左、判定药丸右;「本岗 / 我的」标签列 max-content 自适应,
          值一行放全——长值窄屏悬挂缩进折行,永不截断省略 */}
      <div style={{ marginTop: 4 }}>
        {rows.map((r, i) => (
          <div key={i} style={{ padding: '7px 0', borderBottom: i === rows.length - 1 ? undefined : '1px solid #f3f4f6' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11.5, color: '#6b7280', fontWeight: 600 }}>{r.dim}</span>
              {vCell(r)}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'max-content minmax(0,1fr)', columnGap: 8, rowGap: 1, marginTop: 3, fontSize: 12.5, color: '#4b5563', lineHeight: 1.55 }}>
              <span style={{ color: '#9ca3af' }}>{t('mm.col.job')}</span><span>{r.jc}</span>
              {r.yc !== '—' && <><span style={{ color: '#9ca3af' }}>{t('mm.col.you')}</span><span>{r.yc}</span></>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// 分类弹框主体(#176 分类=「这职业是干嘛的」;Frank 2026-07-21 三卡改版):
// 三张带 title 的卡 —— ① 职业分类(NOC/职业名/TEER/三级;点哪个字段该行高亮=「点哪个字段就显示哪个字段」
// 在「始终出完整三卡」下的落地)② 官方主要职责 ③ 任职要求。顶部两钮:
//  · 显示中文对照:职责/要求实时翻(/api/noc-translate 懒调朋友 qwen,进程缓存;数据层只存英文)。英文界面不出。
//  · AI 速读:点了才生成(复用 /api/advisor 免费额度 field=occRead,按 NOC 缓存)——不点不烧,#176 零成本默认不破。
function CategoryPanel({ job, lang, plan, nocDesc, srcField }: { job: JobRow; lang: Lang; plan: Plan; nocDesc: NocDesc[]; srcField: ColKey }) {
  const t = makeT(lang)
  const noc = nocDesc.find((d) => d.noc === job.noc) || null

  // 中文对照:首次点才调翻译;拿到后前端存一份,切换英/中零延迟
  const [showTrans, setShowTrans] = useState(false)
  const [trans, setTrans] = useState<{ duties: string; requirements: string } | null>(null)
  const [transStatus, setTransStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const toggleTrans = async () => {
    if (trans) { setShowTrans((v) => !v); return }
    setTransStatus('loading')
    try {
      const r = await fetch('/api/noc-translate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ noc: job.noc, lang }) })
      const d = await r.json().catch(() => null)
      if (d?.ok) { setTrans({ duties: d.duties || '', requirements: d.requirements || '' }); setShowTrans(true); setTransStatus('idle') }
      else setTransStatus('error')
    } catch { setTransStatus('error') }
  }

  // AI 速读:点了才生成,流式(复用顾问额度 = /api/advisor field=occRead,按 NOC 缓存)
  const [ai, setAi] = useState('')
  const [aiStatus, setAiStatus] = useState<'idle' | 'loading' | 'streaming' | 'done' | 'error' | 'upgrade' | 'limited'>('idle')
  const runAi = async () => {
    setAiStatus('loading'); setAi('')
    try {
      const res = await fetch('/api/advisor', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field: 'occRead', id: job.noc, job: { noc: job.noc, duties: noc?.duties, requirements: noc?.requirements }, lang }),
      })
      if (res.status === 402) { setAiStatus('upgrade'); return }
      if (res.status === 429) { setAiStatus('limited'); return }
      if (!res.ok || !res.body) { setAiStatus('error'); return }
      const reader = res.body.getReader(); const dec = new TextDecoder()
      setAiStatus('streaming')
      for (;;) { const { done, value } = await reader.read(); if (done) break; setAi((p) => p + dec.decode(value, { stream: true })) }
      setAiStatus('done')
    } catch { setAiStatus('error') }
  }

  // 身份卡各行(点击字段=该行高亮);NOC 与职业名同属 'noc' 字段,点 NOC 两行齐亮
  const rows: { f: ColKey; k: string; v: React.ReactNode }[] = [
    { f: 'noc', k: t('col.noc'), v: job.noc || null },
    { f: 'noc', k: t('fact.nocTitle'), v: noc?.title || null },
    { f: 'teer', k: t('col.teer'), v: job.teer != null ? `TEER ${job.teer} (${t('teer.' + job.teer)})` : null },
    { f: 'broad', k: t('col.broad'), v: job.broad && job.broad !== '未分类' ? t('broad.' + job.broad) : null },
    { f: 'mid', k: t('col.mid'), v: job.mid && job.mid !== '未分类' ? catName(t, job.mid) : null },
    { f: 'fine', k: t('col.fine'), v: job.fine && job.fine !== '未分类' ? catName(t, job.fine) : null },
  ]

  const btn = PILL_BTN
  // 逐行 duties/requirements;中文对照开 → **逐句对照**:英文行下跟译文行(noc-translate 按行编号对位,行数恒等)
  const listBlock = (title: string, en?: string, zh?: string) => {
    const items = (en || '').split('\n').map((s) => s.trim()).filter(Boolean)
    if (!items.length) return null
    const zhItems = showTrans && zh ? zh.split('\n').map((s) => s.trim()).filter(Boolean) : []
    return (
      <div style={MODAL_CARD}>
        <div style={MODAL_CARD_HEAD}>{title}{noc?.fetched ? <span style={{ fontSize: 11.5, fontWeight: 400, color: '#9ca3af' }}>（{noc.fetched}）</span> : null}</div>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: '#4b5563', lineHeight: 1.6 }}>
          {items.map((d, i) => (
            <li key={i}>
              {d}
              {zhItems[i] ? <div style={{ margin: '2px 0 4px', padding: '1px 0 1px 10px', borderLeft: '3px solid #dbeafe', color: '#1e40af' }}>{zhItems[i]}</div> : null}
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <>
      {/* 两钮:中文对照(英文界面无需=不出)+ AI 速读(点前只是一枚钮,不烧额度) */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {lang !== 'en' && (
          <button onClick={toggleTrans} disabled={transStatus === 'loading'} style={{ ...btn, opacity: transStatus === 'loading' ? 0.6 : 1 }}>
            {transStatus === 'loading' ? t('cat.translating') : transStatus === 'error' ? t('cat.transErr') : showTrans ? t('cat.hideZh') : t('cat.showZh')}
          </button>
        )}
        {aiStatus === 'idle' && <button onClick={runAi} style={btn}><IconCompass /> {t('cat.aiRead')}</button>}
      </div>

      {/* AI 速读卡(点了才出;置顶=点完不用往下翻) */}
      {aiStatus !== 'idle' && (
        <div style={MODAL_CARD}>
          <div style={MODAL_CARD_HEAD}><IconCompass /> {t('cat.aiRead')}</div>
          {aiStatus === 'upgrade' ? <LockedText t={t} loggedIn={plan.loggedIn} />
            : aiStatus === 'limited' ? <LockedText t={t} loggedIn={plan.loggedIn} msg={t('advisor.limit429')} ctaLabel={!plan.loggedIn ? t('advisor.limitCta') : undefined} />
            : aiStatus === 'error' ? <p style={{ margin: 0, fontSize: 13, color: '#9ca3af' }}>{t('cat.aiErr')}</p>
            : aiStatus === 'loading' ? <p style={{ margin: 0, fontSize: 14, color: '#9ca3af' }}>{t('advisor.loading')}</p>
            : <div style={{ fontSize: 14, lineHeight: 1.7, color: '#374151' }}>{renderAI(ai.split('❓')[0])}{aiStatus === 'streaming' && <span style={{ color: '#9ca3af' }}>▋</span>}</div>}
        </div>
      )}

      {/* 卡①:职业分类(点击字段该行高亮) */}
      <div style={MODAL_CARD}>
        <div style={MODAL_CARD_HEAD}>{t('grp.category')}</div>
        {rows.filter((r) => r.v != null).map((r, i) => {
          const on = r.f === srcField
          return (
            <div key={i} style={{ display: 'flex', gap: 10, padding: '3px 6px', margin: '0 -6px', borderRadius: 6, fontSize: 13, background: on ? '#eff6ff' : undefined }}>
              <span style={{ minWidth: 88, color: on ? '#2563eb' : '#9ca3af', flexShrink: 0, fontWeight: on ? 600 : 400 }}>{r.k}</span>
              <span style={{ flex: 1, color: '#374151', wordBreak: 'break-word' }}>{r.v}</span>
            </div>
          )
        })}
        <div style={{ marginTop: 7, fontSize: 11.5, color: '#9ca3af', lineHeight: 1.5 }}>{t('fact.nocNote')}</div>
      </div>

      {/* 卡②③:官方主要职责 / 任职要求 */}
      {listBlock(t('fact.nocDuties'), noc?.duties, trans?.duties)}
      {listBlock(t('fact.nocReqs'), noc?.requirements, trans?.requirements)}
    </>
  )
}

// E8-10:入参从 24 值的 field 改为 3 值的 group;field 保留仅用于「打开时锚到哪一节」,不再参与内容分支。
export function AdvisorModal({ group, field, job, title, lang, plan, pnpOcc, pnpDraws, news, eeOcc, desigEmp, nocDesc, fieldSources, onClose, onOpenJob }: { group: FieldGroup; field: ColKey; job: JobRow; title?: string; lang: Lang; plan: Plan; pnpOcc: PnpOcc[]; pnpDraws: PnpDraw[]; news: NewsSlim[]; eeOcc: EeOcc[]; desigEmp: DesigEmp[]; nocDesc: NocDesc[]; fieldSources: FieldSource[]; onClose: () => void; onOpenJob?: (j: JobRow) => void }) {
  const t = makeT(lang)
  const overlayClose = useOverlayClose(onClose)
  const a = advHeader(field, job, t)
  const [text, setText] = useState('')
  const [status, setStatus] = useState<'loading' | 'streaming' | 'done' | 'error' | 'upgrade' | 'limited'>('loading')
  // 同公司在榜岗(E10-01 P3:blob 没了 → 打开公司弹窗时按公司名从 /api/jobs 拉,不再靠父级全量列表)
  const [companyJobs, setCompanyJobs] = useState<JobRow[]>([])
  useEffect(() => {
    if (group !== 'company' || !job.company) { setCompanyJobs([]); return }
    let dead = false
    fetch('/api/jobs?company=' + encodeURIComponent(job.company) + '&page=0', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null)).then((d) => { if (!dead && d) setCompanyJobs(d.rows || []) }).catch(() => {})
    return () => { dead = true }
  }, [group, job.company])

  // 打字机(用户拍板:AI 内容必须流式感,不许整段蹦出来):网络块先进 pending,固定节奏吐字。
  // 覆盖三种「整段到达」场景:公司初判 web_fetch 工具阶段后快速吐完、服务端缓存命中、代理缓冲。
  // 吐字速率与积压成正比(每帧 1/12),整段大文本几秒内追平,不会无限拖尾。
  const pendingRef = useRef('')
  const doneRef = useRef(false)
  const textRef = useRef('')          // 已吐正文镜像(完成时和 pending 拼回完整回复摘建议)
  const [sug, setSug] = useState('')  // #36:初判结尾建议问题 → 传给对话框做首个 chip
  useEffect(() => {
    const id = setInterval(() => {
      // ❓ 标记后的内容截住不吐(建议行不进正文);完成时对完整回复统一摘取(含无标记兜底)
      const cut = pendingRef.current.indexOf(SUG_MARK)
      const avail = cut >= 0 ? pendingRef.current.slice(0, cut) : pendingRef.current
      if (avail) {
        const n = Math.max(2, Math.ceil(avail.length / 12))
        const chunk = avail.slice(0, n)
        pendingRef.current = pendingRef.current.slice(n)
        textRef.current += chunk
        setText((prev) => prev + chunk)
      } else if (doneRef.current) {
        doneRef.current = false
        const full = textRef.current + pendingRef.current
        pendingRef.current = ''
        const { body, sug: q } = extractSug(full, job.company, lang)
        textRef.current = body
        setText(body)
        if (q) setSug(q)
        setStatus('done')
      }
    }, 33)
    return () => clearInterval(id)
  }, [])

  // 弹框尺寸/全屏/位置 —— 默认更大(900×760,2026-07-10 用户反馈「弹框不够大,内容显示不全」再加档);
  // 拖动/拉伸/全屏/记忆 = 共用浮动面板机器(useFloatPanel,与职位描述弹框同款)
  const { narrow, full, toggleFull, panel, startDrag, startResize } = useFloatPanel(ADV_PREF, 900, 760)

  // 试用额度可见化(第 5 轮 #16):服务端 X-Free-Left 头,免费用户看得见剩几次,402 不再是惊吓
  const [freeLeft, setFreeLeft] = useState<number | null>(null)
  useEffect(() => {
    const ctrl = new AbortController()
    // AI 段只归移民弹框(分步方案)。公司弹框撤 AI 段=#167⑨(CompanyAiSection 结构化卡是唯一 AI 内容);
    // 分类弹框纯官方事实,零生成零额度(#176)。不发请求 = 不烧额度、不占朋友那台 qwen、不让用户干等。
    if (group !== 'immigration') { setStatus('done'); setText(''); return }
    setText(''); setStatus('loading'); setSug(''); pendingRef.current = ''; textRef.current = ''; doneRef.current = false
    ;(async () => {
      try {
        const res = await fetch('/api/advisor', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ctrl.signal,
          body: JSON.stringify({ field: group, id: String(job.id), job, lang }),   // E8-10:后端按分组取提示词
        })
        const left = res.headers.get('X-Free-Left')
        if (left != null) setFreeLeft(Number(left))
        if (res.status === 402) { setStatus('upgrade'); return }  // 免费试用用完(E3-05)→ 升级卡
        if (res.status === 429) { setStatus('limited'); return }  // 匿名 IP 限/日上限:说人话+给出路,不甩状态码(第 9 轮 #25)
        if (!res.ok || !res.body) { setStatus('error'); setText(t('advisor.unavail')); return }
        const reader = res.body.getReader(); const dec = new TextDecoder()
        setStatus('streaming')
        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          pendingRef.current += dec.decode(value, { stream: true })  // 进打字机队列,不直接上屏
        }
        doneRef.current = true  // 吐完 pending 后打字机自己切 done
      } catch {
        if (!ctrl.signal.aborted) { pendingRef.current = ''; setStatus('error'); setText(t('advisor.offline')) }
      }
    })()
    return () => ctrl.abort()
  }, [group, job, lang])

  const iconBtn = iconBtnS

  return (
    <div {...overlayClose} style={{ ...SCRIM, zIndex: 50 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...CARD, ...panel, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* 标题栏 = 拖动手柄 */}
        <div onPointerDown={startDrag} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, padding: '16px 20px 10px', cursor: full ? 'default' : 'move', userSelect: 'none', flexShrink: 0 }}>
          <div style={{ minWidth: 0 }}>
            {/* 标题后不挂「思考中」后缀(Frank 2026-07-18);流式等待态由正文区「努力思考中」占位承担 */}
            {/* E8-10 S6:页眉改「分组名」、大标题改**岗位/公司名** —— 收编前取的是被点单元格的值,
                于是点「通道」列开出来的弹框标题写着「技能岗」:一个胶囊的值当不了一屏内容的标题。
                现在:公司弹框=公司名、职位与移民弹框=岗位名,与弹框里铺开的整组事实对得上。 */}
            {/* #174:「AI 顾问 · 移民 · 免费今日剩 N 次」两个「·」退役——分组名与次数改空格灰注
                (#171 详情页同款手法);靛色随 #108 杂色归一改灰 */}
            {/* 页眉三弹框统一(Frank 2026-07-21「这三个也要保持一致」):灰色小标+纯名称,与职位弹框
                「职位描述」同款。「AI 顾问」标只留移民弹框(唯一真在流式生成顾问内容的;#176 分类零 AI,
                公司弹框的 AI 段 #167⑨ 已撤、只剩检索卡,挂「AI 顾问」名不副实)。 */}
            <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>{group !== 'immigration'
              ? t('grp.' + group)
              : <><IconCompass /> {t('advisor.tag')}<span style={{ color: '#9ca3af', fontWeight: 400, marginLeft: 8 }}>{t('grp.' + group)}</span>{freeLeft != null ? <span style={{ color: '#9ca3af', fontWeight: 400, marginLeft: 8 }}>{t('advisor.left', { n: freeLeft })}</span> : null}</>}</div>
            <h3 style={{ margin: '4px 0 0', fontSize: 17, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{group === 'company' ? (job.company || title || a.title) : (job.title || title || a.title)}</h3>
          </div>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            {!narrow && <button onClick={toggleFull} title={t(full ? 'advisor.exitFull' : 'advisor.full')} style={iconBtn}>{full ? <IconMinimize /> : <IconMaximize />}</button>}
            <button onClick={onClose} style={{ ...iconBtn, fontSize: 16 }}>×</button>
          </div>
        </div>
        {/* 正文(可滚动):上半真实清单 + 下半 AI 建议 */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 20px 20px' }}>
          {/* 对我意味着什么(E5-00):个人相关性放最上;依据链同源 match()。
              #161(Frank「公司显示这些信息也不合适吧」):公司面板不渲 —— 表里七个维度里
              职业方向/所在省/省提名粗筛/EE/技能层级/薪资 全是**岗位级**事实,挂在「Agilent Technologies」
              这个标题下答非所问(用户点公司是想了解公司)。岗位级判定留在岗位面板。 */}
          {group === 'immigration' && <MeansForMe job={job} lang={lang} plan={plan} pnpOcc={pnpOcc} eeOcc={eeOcc} nocDesc={nocDesc} />}
          {/* 分类组走专用三卡面板(Frank 2026-07-21:三卡 + 中文对照 + AI 速读);公司组走专用平级卡面板
              (同日「参考类别重新设计」);其余组照旧铺全组事实 */}
          {group === 'category'
            ? <CategoryPanel job={job} lang={lang} plan={plan} nocDesc={nocDesc} srcField={field} />
            : group === 'company'
            ? <CompanyPanel job={job} jobs={companyJobs} lang={lang} onOpenJob={onOpenJob} />
            : <GroupFactsSection group={group} job={job} jobs={companyJobs} lang={lang} isPro={plan.isPro} loggedIn={plan.loggedIn} pnpOcc={pnpOcc} pnpDraws={pnpDraws} news={news} eeOcc={eeOcc} desigEmp={desigEmp} nocDesc={nocDesc} fieldSources={fieldSources} onOpenJob={onOpenJob} />}
          {/* 建档 CTA(第 5 轮 #17 = 弹框规范 D1):身份信号族对未建档用户铺「事实 → 个人化」的桥 */}
          {!plan.profileOk && group === 'immigration' && (
            <div style={{ margin: '8px 0 10px' }}>
              <a href="/account" style={{ fontSize: 13, color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}><IconTarget /> {t('fact.buildCta')}</a>
            </div>
          )}
          {/* 免责/AI 声明不进弹框(2026-07-06 用户拍板:合规统一在 footer 说明) */}
          {/* #174:AI 解读收进自己的卡(每卡必有 title)——只有移民组会请求 AI,
              职位/公司组(status 直置 done、text 空)不渲,免得出一张空卡孤儿标题 */}
          {group === 'immigration' && (
            <div style={MODAL_CARD}>
              <div style={MODAL_CARD_HEAD}><IconCompass /> {t('advisor.tag')}</div>
              {status === 'upgrade' ? (
                <LockedText t={t} loggedIn={plan.loggedIn} />
              ) : status === 'limited' ? (
                /* #175:429 黄条退役 → 打码+锁行(转化靠失去感,不靠警示框) */
                <LockedText t={t} loggedIn={plan.loggedIn} msg={t('advisor.limit429')} ctaLabel={!plan.loggedIn ? t('advisor.limitCta') : undefined} />
              ) : status === 'loading' ? (
                <p style={{ margin: 0, fontSize: 14, color: '#9ca3af' }}>{t('advisor.loading')}</p>
              ) : (
                <div style={{ fontSize: 14, lineHeight: 1.7, color: '#374151' }}>{renderAI(text)}{status === 'streaming' && <span style={{ color: '#9ca3af' }}>▋</span>}</div>
              )}
            </div>
          )}
          {/* 来源行已随事实块走(FieldFactsSection 内,紧跟内容、在 AI 区之前)—— 底部不再重复 */}
          {/* 下半:对话框 —— 基于上方事实 + 初判,多轮 grounded 追问 */}
          {/* 追问对话暂关(2026-07-19 Frank:「先把现有的功能做成熟」;#95 开关式惯例)——
              亮回条件:顾问初判切本地模型后按需恢复,置 CHAT_ON=true 即亮 */}
          {CHAT_ON && status === 'done' && <AdvisorChat field={group} job={job} lang={lang} initialJudgment={text} initialSug={sug} />}
        </div>
        {/* 八方向拉伸手柄(透明边条+角块;右下角保留视觉提示三角) */}
        {!full && <div style={{ position: 'absolute', right: 0, bottom: 0, width: 18, height: 18, pointerEvents: 'none', background: 'linear-gradient(135deg, transparent 50%, #cbd5e1 50%)' }} />}
        {!full && PANEL_EDGES.map((h) => (
          <div key={h.dir} onPointerDown={(e) => startResize(e, h.dir)}
            style={{ position: 'absolute', cursor: h.cursor, ...h.style }} />
        ))}
      </div>
    </div>
  )
}

// ── 顾问对话框(弹框下半)──────────────────────────────────────
// 多轮 grounded chat:把「初判」当首个 assistant 轮喂回去保连续性;后端 system 始终带整条岗位事实 + 铁律。
type ChatMsg = { role: 'user' | 'assistant'; content: string }
// ❓ 建议行协议(第 15 轮 #36,用户点名「基于具体内容生成问题」):模型每次回复结尾附一行「❓问题」,
// 打字机 drain 时截住不显示,完成后取出做建议 chip;旧缓存/模型没给标记 → 退回 SUG_POOL 罐头兜底。
const SUG_MARK = '❓'
// 从完整回复里摘建议问题:① ❓ 标记行(协议);② 兜底=末行是独立短问句(模型偶发漏打标记,
// 问题裸奔在正文结尾 —— 2026-07-11 用户实机撞到)。都没有 → 原文返回,chip 走罐头池。
// 建议问题长度红线(2026-07-11 用户拍板「不要太长」):>60 字裁到首个问号;还收不住 → 弃用退罐头
// #49(第 19 轮):#44 的 prompt 约束(雇主用「这家公司」指代)模型不稳定遵守,缓存换血即复发
// (「TABOCHE TECHNOLOGY过去是否…」「ERA是否…」实拍)——前端兜底:占位里把公司名(含去后缀核心名)统一替换成指代词
const SUG_GENERIC: Record<Lang, string> = { zh: '这家公司', en: 'this company', ko: '이 회사' }
const scrubCompany = (q: string, company?: string, lang: Lang = 'zh'): string => {
  if (!company) return q
  const generic = SUG_GENERIC[lang]
  const core = company.replace(/\b(incorporated|inc|ltd|limited|llp|llc|corp|corporation|co)\.?\s*$/i, '').trim()
  for (const n of [...new Set([company.trim(), core])].sort((a, b) => b.length - a.length)) {
    if (n.length >= 3) q = q.replace(new RegExp(n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), generic)
  }
  return q.replace(new RegExp(`(${SUG_GENERIC[lang]})(的?\\s*\\1)+`, 'g'), '$1')  // 相邻重复合一
}
const capSug = (q: string, company?: string, lang?: Lang): string => {
  q = scrubCompany(q.replace(/\*{2,}/g, ''), company, lang)  // 剥 **(#43)+ 公司名指代(#49)
  if (q.length <= 60) return q
  const m = q.match(/^[^?？]{0,59}[?？]/)
  return m ? m[0] : ''
}
const extractSug = (s: string, company?: string, lang?: Lang): { body: string; sug: string } => {
  const i = s.lastIndexOf(SUG_MARK)
  if (i >= 0 && s.length - i <= 300) return { body: s.slice(0, i).replace(/\s+$/, ''), sug: capSug(s.slice(i + SUG_MARK.length).trim(), company, lang) }
  const t = s.replace(/\s+$/, '')
  const nl = t.lastIndexOf('\n')
  const last = t.slice(nl + 1).trim()
  if (nl > 0 && last.length >= 8 && last.length <= 70 && /[?？]$/.test(last) && !last.startsWith('【')) {
    return { body: t.slice(0, nl).replace(/\s+$/, ''), sug: capSug(last, company, lang) }  // 兜底分支同过 capSug(第 16 轮它绕过了)
  }
  return { body: t, sug: '' }
}
// 建议问题池(2026-07-10 用户点名「类似 Claude,Tab 填入直接提问」;07-11 追加「按轮迭代」):
// 每字段族 3 条,一轮问答完推进到下一条,用完即止(不循环重复)。
const SUG_POOL: Record<'title' | 'company' | 'generic', string[]> = {
  title: ['advisor.sug.title', 'advisor.sug.title2', 'advisor.sug.title3'],
  company: ['advisor.sug.company', 'advisor.sug.company2', 'advisor.sug.company3'],
  generic: ['advisor.sug.generic', 'advisor.sug.generic2', 'advisor.sug.generic3'],
}
function AdvisorChat({ field, job, lang, initialJudgment, initialSug }: { field: ColKey | FieldGroup; job: JobRow; lang: Lang; initialJudgment: string; initialSug?: string }) {
  const t = makeT(lang)
  const [msgs, setMsgs] = useState<ChatMsg[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const endRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'nearest' }) }, [msgs])

  // 建议问题(#36):首选 = 模型每轮结尾 ❓ 行生成的本岗专属问题(初判的经 initialSug 传入);
  // 旧缓存/模型没给 → 退 SUG_POOL 罐头,一轮推进一条,用完即止。
  const fam: 'title' | 'company' | 'generic' = field === 'title' ? 'title' : field === 'company' ? 'company' : 'generic'
  const [genSug, setGenSug] = useState(initialSug || '')
  const [sugIdx, setSugIdx] = useState(0)
  const suggestion = genSug || (sugIdx < SUG_POOL[fam].length ? t(SUG_POOL[fam][sugIdx]) : '')
  const showSug = !!suggestion && !busy && !input
  const fillSug = () => { setInput(suggestion); inputRef.current?.focus() }

  // 追问回答打字机(07-11 用户点名「要流式,不要一下蹦出来」):与初判同一手法——
  // 网络块进 pending,固定节奏吐字(速率与积压成正比);❓ 尾行截住做下一条建议;吐完才解 busy。
  const pendingRef = useRef('')
  const netDoneRef = useRef(false)
  const curRef = useRef('')  // 本轮已吐正文镜像(完成时和 pending 拼回完整回复摘建议)
  useEffect(() => {
    const id = setInterval(() => {
      const cut = pendingRef.current.indexOf(SUG_MARK)
      const avail = cut >= 0 ? pendingRef.current.slice(0, cut) : pendingRef.current
      if (avail) {
        const n = Math.max(2, Math.ceil(avail.length / 12))
        const chunk = avail.slice(0, n)
        pendingRef.current = pendingRef.current.slice(n)
        curRef.current += chunk
        setMsgs((m) => { const c = [...m]; c[c.length - 1] = { ...c[c.length - 1], content: c[c.length - 1].content + chunk }; return c })
      } else if (netDoneRef.current) {
        netDoneRef.current = false
        const full = curRef.current + pendingRef.current
        pendingRef.current = ''; curRef.current = ''
        const { body, sug: q } = extractSug(full, job.company, lang)
        setMsgs((m) => { const c = [...m]; c[c.length - 1] = { ...c[c.length - 1], content: body }; return c })
        if (q) setGenSug(q)
        else { setGenSug(''); setSugIdx((i) => i + 1) }  // 没摘到 → 罐头池推进一条
        setBusy(false)
      }
    }, 33)
    return () => clearInterval(id)
  }, [])

  const send = async () => {
    // 输入空但占位有建议问题 → 直接发建议问题(2026-07-17 用户:手机没有 Tab 键,点「发送」就该问这个)
    const q = input.trim() || (showSug ? suggestion : '')
    if (!q || busy) return
    const convo = [...msgs, { role: 'user' as const, content: q }]
    setMsgs([...convo, { role: 'assistant', content: '' }])  // 占位,流进去
    setInput(''); setBusy(true); curRef.current = ''
    // 喂回初判作首个 assistant 轮 → 用户可"你刚才说的…";后端 system 另带事实
    const payload: ChatMsg[] = [{ role: 'assistant', content: initialJudgment }, ...convo]
    try {
      const res = await fetch('/api/advisor', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field, id: String(job.id), job, lang, messages: payload }),
      })
      if (res.status === 402) {  // 免费试用用完(E3-05):对话里给升级引导
        setMsgs((m) => { const c = [...m]; c[c.length - 1] = { role: 'assistant', content: `${t('up.title')} · ${t('up.advisor')} → /account` }; return c })
        setBusy(false)
      } else if (!res.ok || !res.body) {
        setMsgs((m) => { const c = [...m]; c[c.length - 1] = { role: 'assistant', content: t(res.status === 429 ? 'advisor.limit429' : 'advisor.unavail') }; return c })
        setBusy(false)
      } else {
        // 流式回答(07-11 #36):网络块只进 pending,打字机节奏吐字;吐完(interval 里)才解 busy
        const reader = res.body.getReader(); const dec = new TextDecoder()
        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          pendingRef.current += dec.decode(value, { stream: true })
        }
        netDoneRef.current = true
      }
    } catch {
      pendingRef.current = ''  // 半途断流:清掉积压,别往错误文案后面继续吐字
      setMsgs((m) => { const c = [...m]; c[c.length - 1] = { role: 'assistant', content: t('advisor.offline') }; return c })
      setBusy(false)
    }
  }

  return (
    <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #f3f4f6' }}>
      {msgs.map((m, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: 6 }}>
          <div style={{ maxWidth: '85%', padding: '7px 11px', borderRadius: 10, fontSize: 13.5, lineHeight: 1.6, whiteSpace: 'pre-wrap',
            background: m.role === 'user' ? '#eef2ff' : '#f9fafb', color: '#374151' }}>
            {/* 追问回复同走 renderAI(#43 剥 **);等待首字时显「努力思考中」而非光秃 ▋(2026-07-12 用户:太生硬) */}
            {m.role === 'assistant' ? (m.content ? renderAI(m.content) : <span style={{ color: '#9ca3af' }}>{t('advisor.loading')}</span>) : m.content}
          </div>
        </div>
      ))}
      <div ref={endRef} />
      {/* 建议问题=输入框占位(2026-07-11 用户拍板:不要 chip,问题直接放文本框,Tab 自动补全) */}
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} disabled={busy}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
            else if (e.key === 'Tab' && showSug) { e.preventDefault(); fillSug() }  // Tab 补全占位里的建议问题
          }}
          placeholder={showSug ? suggestion : t('advisor.chatPlaceholder')}
          style={{ flex: 1, height: 36, boxSizing: 'border-box', padding: '0 10px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13.5, color: '#1f2937', background: '#fff' }} />
        <button onClick={send} disabled={busy || (!input.trim() && !showSug)}
          style={{ border: 'none', background: busy || (!input.trim() && !showSug) ? '#c7d2fe' : '#6366f1', color: '#fff', borderRadius: 8, padding: '0 14px', height: 36, cursor: busy || (!input.trim() && !showSug) ? 'default' : 'pointer', fontSize: 13.5, flexShrink: 0 }}>
          {t('advisor.chatSend')}
        </button>
      </div>
    </div>
  )
}

// ── 操作列弹框:职位描述快看(读真实抓取正文;公司信息已并入顾问公司弹窗,C1)────
function ActModal({ job, lang, plan, onClose }: { job: JobRow; lang: Lang; plan: Plan; onClose: () => void }) {
  // C1 后只剩 JD 快看(公司信息统一走顾问公司弹窗,消两套公司弹窗重复)
  // #112(2026-07-20 Frank):标题栏「AI 顾问」钮摘除——点钮会关本框跳顾问弹框,描述/整理版一去不回;
  // 初判本来就内嵌自动生成(#102,像公司顾问),按钮纯多余;深挖(对比表/字段解读)走字段格入口照旧
  const t = makeT(lang)
  const overlayClose = useOverlayClose(onClose)
  const { narrow, full, toggleFull, panel, startDrag, startResize } = useFloatPanel(JD_PREF, 760, 640)
  const [text, setText] = useState('')
  const [status, setStatus] = useState<'loading' | 'done' | 'empty' | 'upgrade' | 'limited'>('loading')   // #134:limited=429 不再谎报「空」
  const [freeLeft, setFreeLeft] = useState<number | null>(null)  // 第 5 轮 #16:试用额度可见化
  // J3(2026-07-19 Frank 批):AI 五节整理版懒生成——undefined=整理中,null=没有(降级原文),string=整理版
  const [fmt, setFmt] = useState<string | null | undefined>(undefined)
  const [showOrig, setShowOrig] = useState(false)
  // 2026-07-21 Frank「参考类别」:AI 速读点了才生成(不点不烧,额度闸在 JdAdvisorSection 内照走)
  const [aiOn, setAiOn] = useState(false)
  // 中文对照(参考分类弹框):整理版逐句翻(/api/jd-translate 行位保真);拿到后前端存一份,切换零延迟
  const [showTrans, setShowTrans] = useState(false)
  const [trans, setTrans] = useState<string | null>(null)
  const [transStatus, setTransStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const toggleTrans = async () => {
    if (trans) { setShowTrans((v) => !v); return }
    setTransStatus('loading')
    try {
      const r = await fetch('/api/jd-translate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: job.applyUrl || '', lang }) })
      const d = await r.json().catch(() => null)
      if (d?.ok && d.text) { setTrans(d.text); setShowTrans(true); setTransStatus('idle') }
      else setTransStatus('error')
    } catch { setTransStatus('error') }
  }
  useEffect(() => {
    const ctrl = new AbortController()
    setStatus('loading'); setText('')
    ;(async () => {
      try {
        const r = await fetchJobText(job.applyUrl || '', ctrl.signal)   // #126 同岗会话缓存
        if (r.freeLeft != null) setFreeLeft(r.freeLeft)
        if (r.status === 'gated') { setStatus('upgrade'); return }  // 免费试用用完(E3-05)
        if (r.status === 'limited') { setStatus('limited'); return }  // #134:匿名 IP 池用完
        setText(r.text); setStatus(r.text ? 'done' : 'empty')
      } catch { if (!ctrl.signal.aborted) setStatus('empty') }
    })()
    return () => ctrl.abort()
  }, [job])
  useEffect(() => {
    // 整理版与原文并行拉:命中缓存秒回;首次生成慢(模型现算),期间正文照常显示原文
    const ctrl = new AbortController()
    setFmt(undefined); setShowOrig(false)
    setAiOn(false); setShowTrans(false); setTrans(null); setTransStatus('idle')
    fetch('/api/jdformat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: job.applyUrl || '' }), signal: ctrl.signal })
      .then((r) => (r.status === 200 ? r.text() : ''))
      .then((tx) => setFmt(tx.trim() ? tx : null))
      .catch(() => { if (!ctrl.signal.aborted) setFmt(null) })
    return () => ctrl.abort()
  }, [job])
  return (
    <div {...overlayClose} style={{ ...SCRIM, zIndex: 50 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...CARD, ...panel, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* 标题栏 = 拖动手柄(与顾问弹框同款) */}
        <div onPointerDown={startDrag} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, padding: '16px 20px 8px', cursor: full ? 'default' : 'move', userSelect: 'none', flexShrink: 0 }}>
          <div style={{ minWidth: 0 }}>
            {/* 页眉与其余弹框统一灰(Frank 2026-07-21;靛色残余随 #108 杂色归一退役);
                「打开完整页」挪进下方胶囊钮行(同日「和其他两个按钮放一起,统一风格」) */}
            <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>
              {t('act.descTitle')}{freeLeft != null ? <span style={{ color: '#9ca3af', fontWeight: 400, marginLeft: 8 }}>{t('advisor.left', { n: freeLeft })}</span> : null}
            </div>
            <h3 style={{ margin: '4px 0 0', fontSize: 17, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{job.title || '—'}</h3>
          </div>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }} onPointerDown={(e) => e.stopPropagation()}>
            {!narrow && <button onClick={toggleFull} title={t(full ? 'advisor.exitFull' : 'advisor.full')} style={iconBtnS}>{full ? <IconMinimize /> : <IconMaximize />}</button>}
            <button onClick={onClose} style={{ ...iconBtnS, fontSize: 16 }}>×</button>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 20px 20px', fontSize: 14, lineHeight: 1.7, color: '#374151' }}>
          {/* 顶部钮行(2026-07-21 Frank「参考类别」):中文对照(英文界面不出;整理版在屏才可翻)+
              AI 速读(点了才生成,不点不烧——原「打开即自动生成初判」退役,额度省给真想看的人)+
              打开完整页(E8-07 详情页入口,从页眉挪入,同款胶囊;同日「统一风格」) */}
          <div style={{ display: 'flex', gap: 8, margin: '2px 0 12px', flexWrap: 'wrap' }}>
            {status !== 'loading' && lang !== 'en' && fmt && !showOrig ? (
              <button onClick={toggleTrans} disabled={transStatus === 'loading'} style={{ ...PILL_BTN, opacity: transStatus === 'loading' ? 0.6 : 1 }}>
                {transStatus === 'loading' ? t('cat.translating') : transStatus === 'error' ? t('cat.transErr') : showTrans ? t('cat.hideZh') : t('cat.showZh')}
              </button>
            ) : null}
            {status !== 'loading' && !aiOn && <button onClick={() => setAiOn(true)} style={PILL_BTN}><IconCompass /> {t('cat.aiRead')}</button>}
            <a href={`/jobs/${job.id}`} target="_blank" rel="noreferrer" style={{ ...PILL_BTN, textDecoration: 'none', display: 'inline-block' }}>{t('detail.openFull')} ↗</a>
          </div>
          {/* AI 速读卡(点了才出;置顶=点完不用往下翻,与分类弹框同规范;jdRead=纯 JD 速读不带移民解读) */}
          {aiOn && (
            <div style={MODAL_CARD}>
              <JdAdvisorSection job={job} lang={lang} plan={plan} title={t('cat.aiRead')} field="jdRead" />
            </div>
          )}
          {status === 'loading' ? <p style={{ color: '#9ca3af' }}>{t('act.loadingText')}</p>
            : status === 'upgrade' ? <LockedText t={t} loggedIn={plan.loggedIn} lines={4} />
            : status === 'limited' ? (   /* #134 限流说人话;#175 黄条退役 → 打码+锁行 */
              <LockedText t={t} loggedIn={plan.loggedIn} lines={4} msg={t('advisor.limit429')} ctaLabel={!plan.loggedIn ? t('advisor.limitCta') : undefined} />
            )
            : status === 'empty' ? (
              <div>
                <p style={{ color: '#9ca3af', margin: '4px 0 10px' }}>{blockedSrc(job) ? t('act.noTextBlocked', { src: blockedSrc(job) }) : t('act.noText')}</p>
                {job.applyUrl && <a href={job.applyUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-block', background: '#2563eb', color: '#fff', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>{t('act.seeOfficial')}</a>}
              </div>
            )
              : (
                <>
                  {/* J3:整理版默认在上,原文一键切换;生成中/没有整理版 → 原文照旧 */}
                  {fmt ? (
                    <div style={{ fontSize: 11.5, color: '#9ca3af', marginBottom: 6 }}>
                      ✨ {t('act.ai')}
                      <button onClick={() => setShowOrig((o) => !o)} style={{ border: 'none', background: 'none', padding: 0, marginLeft: 8, color: '#2563eb', cursor: 'pointer', fontSize: 11.5, fontWeight: 600 }}>{showOrig ? t('act.seeFmt') : t('act.seeOrig')}</button>
                    </div>
                  ) : fmt === undefined ? (
                    <div style={{ fontSize: 11.5, color: '#9ca3af', marginBottom: 6 }}>✨ {t('act.aiWorking')}</div>
                  ) : null}
                  {fmt && !showOrig ? <JdFormattedView text={fmt} t={t} fallbackPay={job.salaryText || job.salary || undefined} applyUrl={job.applyUrl || undefined} trans={showTrans && trans ? trans : undefined} /> : <JdTextView text={text} max={4000} />}
                </>
              )}
          {/* 底部来源行(republish 合规)只在整理版**没渲出**时兜底(#167③ 详情页同款;2026-07-21 Frank
              「去掉 source 链接」)——整理版在屏时「怎么投」整节已链官方原帖,出处不丢 */}
          {job.applyUrl && !(status === 'done' && fmt && !showOrig) && status !== 'empty' && (
            <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #f3f4f6', fontSize: 11.5, color: '#9ca3af', overflowWrap: 'anywhere' }}>
              {t('src.label')}: <a href={job.applyUrl} target="_blank" rel="noreferrer" style={{ color: '#6b7280', textDecoration: 'none' }}>{job.applyUrl}</a>
            </div>
          )}
        </div>
        {/* 八方向拉伸手柄(透明边条+角块;右下角保留视觉提示三角) */}
        {!full && <div style={{ position: 'absolute', right: 0, bottom: 0, width: 18, height: 18, pointerEvents: 'none', background: 'linear-gradient(135deg, transparent 50%, #cbd5e1 50%)' }} />}
        {!full && PANEL_EDGES.map((h) => (
          <div key={h.dir} onPointerDown={(e) => startResize(e, h.dir)}
            style={{ position: 'absolute', cursor: h.cursor, ...h.style }} />
        ))}
      </div>
    </div>
  )
}

// 把 AI 文本里的【小标题】加粗,保留换行;markdown 强调残渣 ** 先剥(第 16 轮 #43:正文 pre-wrap
// 纯文本渲染,模型写的 **加粗** 不会变粗只碍眼;流式期间跨帧的孤 * 下一帧凑齐即消,无需处理边界)
function renderAI(text: string): React.ReactNode {
  return text.replace(/\*{2,}/g, '').split(/(【[^】]+】)/g).map((seg, i) => {
    if (/^【[^】]+】$/.test(seg)) return <strong key={i} style={{ display: 'block', marginTop: i ? 10 : 0, marginBottom: 2, color: '#111827' }}>{seg}</strong>
    const body = seg.replace(/^\n+/, '').replace(/\n+$/, '').replace(/\n{3,}/g, '\n\n')  // 去段首尾空行+压多余空行,免大空隙
    return body ? <span key={i} style={{ whiteSpace: 'pre-wrap' }}>{body}</span> : null
  })
}

// ── 按字段类型生成顾问解读(基于该行数据;无需 API) ─────────────
// AI 顾问头部:标签(三语,复用列名)+ 上下文标题 + 链接;正文全部由 /api/advisor 大模型按所选语言生成。
function advHeader(field: ColKey, j: JobRow, t: TFn): { tag: string; title: string } {
  return { tag: t('col.' + field), title: j.title || j.company || '—' }
}

// E12-08 通道档色阶(1-5):5/4 绿深浅、3 默认、2 琥珀、1/缺 灰(scoreColor 0-100 版随加权分退役)
const gradeColor = (g: number | null | undefined) => (
  g == null ? '#9ca3af' : g >= 5 ? '#166534' : g >= 4 ? '#15803d' : g >= 3 ? '#374151' : g >= 2 ? '#b45309' : '#9ca3af'
)
const ctrl: React.CSSProperties = { height: 38, boxSizing: 'border-box', padding: '0 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, color: '#1f2937', background: '#fff' }
const filtRow: React.CSSProperties = { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }
const filtLabel: React.CSSProperties = { fontSize: 12, color: '#9ca3af', minWidth: 28, whiteSpace: 'nowrap' }
// 联动下拉:上级选了,下级选项随之收窄;当前值不在选项里也保留显示
// 宽度贴当前选中值(2026-07-17 用户拍板「不要有空白」;沿革:07-07 曾统一封顶 150 治「按最长选项撑宽」,
// 但短值如「全部省」仍剩大段空白):镜像文本按选中值占位、select 叠满其上——选短值不留空白,
// 选长值自动变宽仍封顶 150(下拉展开始终显示全文);代价=切换选中值时同行控件轻微挪位(拍板已认)
function Sel({ value, onChange, opts, all, labelOf }: { value: string; onChange: (v: string) => void; opts: string[]; all: string; labelOf?: (v: string) => string }) {
  const list = value && !opts.includes(value) ? [value, ...opts] : opts
  const shown = value ? (labelOf ? labelOf(value) : value) : all
  // select 的内在宽度=最长选项,放流内怎么都会撑满上限 → 镜像文本在流内定宽,select 绝对铺满不参与布局
  return (
    <span style={{ position: 'relative', display: 'inline-block', maxWidth: 150 }}>
      <span aria-hidden style={{ ...ctrl, display: 'block', visibility: 'hidden', paddingRight: 28, whiteSpace: 'nowrap', overflow: 'hidden', border: '1px solid transparent' }}>{shown}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={{ ...ctrl, position: 'absolute', inset: 0, width: '100%' }}>
        <option value="">{all}</option>
        {list.map((o) => <option key={o} value={o}>{labelOf ? labelOf(o) : o}</option>)}
      </select>
    </span>
  )
}
const td: React.CSSProperties = { padding: '7px 12px', verticalAlign: 'top' }
// 按词换行(不逐字断词);不设 wordBreak 以免列被挤成 1 字符宽
const wrapCell = (w: number): React.CSSProperties => ({ maxWidth: w, whiteSpace: 'normal', overflowWrap: 'break-word', wordBreak: 'normal' })
const link: React.CSSProperties = { color: '#2563eb', textDecoration: 'none' }
const colPanel: React.CSSProperties = { position: 'absolute', top: '110%', right: 0, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, boxShadow: '0 10px 30px rgba(0,0,0,.12)', padding: 8, zIndex: 20, minWidth: 210 }
const colBtn: React.CSSProperties = { flex: 1, whiteSpace: 'nowrap', padding: '4px 8px', fontSize: 12.5, border: '1px solid #d1d5db', borderRadius: 5, background: '#f9fafb', color: '#374151', cursor: 'pointer' }
const actBtn: React.CSSProperties = { whiteSpace: 'nowrap', padding: '3px 8px', fontSize: 12, border: '1px solid #d1d5db', borderRadius: 5, background: '#fff', color: '#374151', cursor: 'pointer' }
