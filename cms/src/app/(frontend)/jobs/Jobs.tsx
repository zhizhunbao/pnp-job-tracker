'use client'
// 职位板页面:横幅、筛选、桌面表格、手机卡片、弹框编排、顶栏账户区。
//
// 2026-08-17 拆分:本文件原 4446 行,里头塞着 20+ 个与职位板无关的渲染件(公司卡、JD 解析、
// 省提名事实块、顾问弹框…),/jobs/[id] 与 /companies/[slug] 反过来从这儿 import 身体渲染器。
// 现按关注点各归其位:./types(形状)、./Pnp、./Company、./Jd、./Advisor、
// ./Lock,地点/来源/NOC 三组工具下沉 @/lib。本文件只剩「这一页」自己的事。
import { useCallback, useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

import { Header } from '../Header'
import { Footer } from '../Footer'
import { AccountMenu } from '../AccountMenu'
import { useLang } from '../LangProvider'
import { IconLock, IconSave, IconSettings, IconTarget } from '../Icons'
import { BANNER_IMGS, Banner, Button, JobCard, gradeColor } from '../ui'
import { BROAD_SLUGS } from '@/lib/stats'   // 大类的行业顺序(镜像 etl/noc_buckets.BROADS)
import { quizToProfile, readQuiz } from '../quiz/EntryQuiz'   // 答案读写与落档(弹框本体已退役,2026-07-31 统一答题)
import { ActModal, AdvisorModal } from './Advisor'
import { eeIsDormant, eeLastDraw } from './Pnp'
import { AuthModal } from './AuthForm'
import { UpgradeModal } from './UpgradeModal'
import { PricingModal } from './PricingModal'
import { OnboardingWizard, OB_SEEN_KEY } from './OnboardingWizard'
import { useColWidths, type ColWidthSeed } from './colWidths'   // 列宽唯一控制点(刷新/筛选/拖竖线共用一套规则)
import { filterSig, URL_TO_FILTER, DIRECT_URL_KEY, type JobFilters } from './filters.shared'   // URL↔筛选映射(与 SSR 共用)
import { type TFn } from '@/lib/i18n'
import { eeDisplay, streamDisplay } from '@/lib/jobs'
import { COLS_COOKIE } from './columns.shared'
import { type ColKey, type FieldGroup, type Plan, type Dims, type JobRow, isDirect, sourceLabel } from '@/lib/jobs'
import { PROV_NAMES, mapQuery, mapsUrl, parseLoc, provName } from '@/lib/location'
import { FIELD_GROUP, COLUMNS, DEFAULT_COLS, NOWRAP_COLS, PREF_KEY, PRO_COLS, cellActionable, cellActive, cellOf, writeColsCookie } from './Table'
import { fmtLocal, fmtLocalSec } from '@/lib/time'
import { catName, colorOf, nocLocalTitle, registerCatLabels } from '@/lib/noc'
import { track } from '@/lib/track'   // #129 功能级 umami 埋点

// 读 localStorage 偏好(列/语言)用「绘制前」生效,避免 SSR 默认值闪一下再切到保存值。
// SSR 端 useLayoutEffect 无效且会告警 → 服务端退化成 useEffect。
const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect
const FREE_PLAN: Plan = { isPro: false, loggedIn: false, profileOk: false, profile: null, freeMatchCap: 0, email: null, displayName: null, avatar: null, proUntil: '' }

// 未登录价值主张横幅(E5-01):一句话+关闭,可关闭。注册/定价按钮已归组进顶栏账户区(E8-01,2026-07-06 拍板)。
// 关闭记忆走 cookie(同 COLS_COOKIE 手法)→ SSR 首帧直接渲对,不再等水合后才弹出来(用户点名);bump cookie 名可重新展示
export const BANNER_COOKIE = 'jobs_banner_v1'
// ValueBanner 已退役(#65 收尾,Frank:「不需要两个蓝条」)——建档 CTA 并进 Jobs 页头右槽;BANNER_COOKIE 留给 page.tsx 旧 cookie 读取兼容

// 升级卡片(402 / 锁定块共用;都出现在已登录上下文)—— P1 换装(⓪ 2026-07-19):CTA=统一实心 UpgradeCta
// #160 起只保留给「整块功能不可用」的少数场景;被额度拦下的内容一律改 LockedText 打码(见下)
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
  return (
    <span className="jtAcct">
      {plan.loggedIn ? (
        // 用户按钮+下拉(2026-07-16 拍板)。菜单本体 2026-08-15 抽成全站共用的 AccountMenu ——
        // 二级页头像先前是直达 /account,同一个头像两种行为(Frank 实拍),收敛成一个组件
        <AccountMenu t={t} email={email} displayName={displayName} avatar={avatar}
          isPro={plan.isPro} proUntil={proUntil} onPricing={() => setPricing(true)} />
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

const uniq = (xs: string[]) => Array.from(new Set(xs.filter(Boolean))).sort()
// ── 本地偏好画像(E9-02 推荐横幅,2026-07-17 拍板「1+3」):浏览/收藏信号存 localStorage,
// **不上传**(隐私政策口径:浏览偏好存于设备)。打开任一岗位弹窗 +1,收藏 +3;维度=省/大类/薪资档。
// 浏览画像(PREF_HIDE / readPref / recordPref / topOf)随推荐条一并退役
// (2026-07-31 Frank「不需要再瞎推荐了」)—— 没有消费者的采集就是白攒数据,连带隐私面也小一圈。

// E9-03 地区冷启动:首访无画像时用浏览器时区映射省(零依赖零上传,与画像同一隐私口径)。
// 白名单外(含 NT/YT/NU 与非加时区)不显示;Halifax→NS 为可接受近似(大西洋时区取人口主省,拍板点②)。
// export 给 page.tsx 的占位预判内联脚本(2026-07-17 用户「刷新怎么后弹出来」——横幅槽位首帧预留,反 CLS)
const EMPTY_DIMS: Dims = { provinces: [], cities: [], districts: [], nocCategories: [], sources: [], experienceLevels: [], pnpOccupations: [], pnpDraws: [], eeCategories: [], designatedEmployers: [], nocDescriptions: [], fieldSources: [], news: [] }
const PROV_CODE: Record<string, string> = Object.fromEntries(Object.entries(PROV_NAMES).map(([c, n]) => [n, c]))
export default function Jobs({ jobs: initialJobs, updatedAt: initialUpdatedAt, dims: initialDims = EMPTY_DIMS, initialCols, initialColW, plan = FREE_PLAN, totalCount, proof, initialFilters = {}, initialMatchView = false, deferFull }: { jobs: JobRow[]; updatedAt?: string; dims?: Dims; initialCols?: string[]; initialColW?: ColWidthSeed | null; plan?: Plan; initialBanner?: boolean; totalCount?: number; proof?: { named: number; lmia: number }; initialFilters?: JobFilters; initialMatchView?: boolean; deferFull?: boolean }) {
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
  // 筛选初值来自服务端(page.tsx 已按 URL 解析并据此查过库)→ 首帧下拉就是选中的那项、行就是筛选后的行,
  // 水合零差异,不再「先抖一下全部」。没参数进来 initialFilters={} = 干净板,行为与以前一致。
  const seed = (k: string) => (typeof initialFilters[k] === 'string' ? (initialFilters[k] as string) : '')
  const [q, setQ] = useState(seed('q'))
  const [directOnly, setDirectOnly] = useState(initialFilters.directOnly === true)
  const [fElig, setFElig] = useState(seed('fElig'))   // GAP1③:'ok'=排除明确不担保/须 PR 岗
  // 职业多值(2026-08-16):逗号分隔 NOC 码,从初评表「查岗位」带过来;UI 显示为职业胶囊
  const [fNoc, setFNoc] = useState(seed('fNoc'));
  const [fCountry, setFCountry] = useState(seed('fCountry')); const [fProv, setFProv] = useState(seed('fProv')); const [fCity, setFCity] = useState(seed('fCity')); const [fDistrict, setFDistrict] = useState(seed('fDistrict'))
  const [fBroad, setFBroad] = useState(seed('fBroad')); const [fMid, setFMid] = useState(seed('fMid')); const [fFine, setFFine] = useState(seed('fFine'))
  const [fTeer, setFTeer] = useState(seed('fTeer')); const [fSource, setFSource] = useState(seed('fSource')); const [fAcc, setFAcc] = useState(seed('fAcc'))
  const [fPnp, setFPnp] = useState(seed('fPnp')); const [fAip, setFAip] = useState(seed('fAip')); const [fPilot, setFPilot] = useState(seed('fPilot')); const [fStatus, setFStatus] = useState(seed('fStatus')); const [fOrigin, setFOrigin] = useState(seed('fOrigin'))
  const [fScore, setFScore] = useState(seed('fScore')); const [fSal, setFSal] = useState(seed('fSal')); const [fVs, setFVs] = useState(seed('fVs'))  // 数值预设(下拉,不手填)
  const [fEmp, setFEmp] = useState(seed('fEmp'))  // 职位类型(E6-06):full/part/gig
  // 「更多筛选」折叠恢复(2026-07-11 用户二次拍板:五行常驻太占竖向空间,恢复默认收起);
  // 开关行右侧带更新时间+字段按钮(同日「放到一行」拍板保留,只是宿主行从薪资行换成开关行)
  // 窄屏筛选抽屉(E8-03):≤640px 整个筛选区默认收起,一行「筛选」开关展开;CSS 媒体查询控制显隐,零水合差异
  const [fDrawer, setFDrawer] = useState(false)   // #59:「更多筛选」折叠开关(原窄屏抽屉退役,本 state 复用)
  // 2026-08-16:PNP/年薪 从常用一行下沉进折叠区(方案 B)→ 一并进徽标计数,否则选了却看不出来
  const foldActive = [fCity, fDistrict, fMid, fFine, fPnp, fSal, fAip, fPilot, fEmp, fVs, fElig].filter(Boolean).length + (directOnly ? 1 : 0)
  // 初始列:服务端从 cookie 解析后由 initialCols 传入 → SSR 与客户端首帧一致(零闪);无则用默认
  const [visible, setVisible] = useState<ColKey[]>(() => {
    const v = (initialCols ?? []).filter((k): k is ColKey => COLUMNS.some((c) => c.key === k))
    return v.length ? v : DEFAULT_COLS
  })
  // ── 筛选的唯一出口:一张 fState 表喂五处 —— URL 写、URL 读(兜底)、快照写、快照回放、请求参数。
  //    键=筛选键(= buildJobsWhere 的键 = /api/jobs 参数名);URL 短名的映射在 filters.shared(与 SSR 共用)。
  //    Frank 2026-08-03「右键一刷新,之前的选项也没有保持」→ 筛选进 URL:刷新能复原、链接能分享,
  //    而搜索引擎进来的干净 /jobs 依旧是干净板(没参数就没筛选,不会替陌生人预设条件)。
  const fState: Record<string, { v: string; set: (s: string) => void }> = {
    q: { v: q, set: setQ }, fNoc: { v: fNoc, set: setFNoc }, fProv: { v: fProv, set: setFProv }, fBroad: { v: fBroad, set: setFBroad },
    fMid: { v: fMid, set: setFMid }, fFine: { v: fFine, set: setFFine }, fCity: { v: fCity, set: setFCity },
    fDistrict: { v: fDistrict, set: setFDistrict }, fCountry: { v: fCountry, set: setFCountry },
    fTeer: { v: fTeer, set: setFTeer }, fSource: { v: fSource, set: setFSource }, fAcc: { v: fAcc, set: setFAcc },
    fPnp: { v: fPnp, set: setFPnp }, fAip: { v: fAip, set: setFAip }, fPilot: { v: fPilot, set: setFPilot }, fStatus: { v: fStatus, set: setFStatus },
    fOrigin: { v: fOrigin, set: setFOrigin }, fScore: { v: fScore, set: setFScore }, fSal: { v: fSal, set: setFSal },
    fVs: { v: fVs, set: setFVs }, fEmp: { v: fEmp, set: setFEmp }, fElig: { v: fElig, set: setFElig },
  }
  /** 当前非默认筛选(qv 传 dq 可用防抖后的搜索词);空对象 = 干净板 */
  const curFilters = (qv: string = q): JobFilters => {
    const f: JobFilters = {}
    for (const [k, s] of Object.entries(fState)) { const v = k === 'q' ? qv.trim() : s.v; if (v) f[k] = v }
    if (directOnly) f.directOnly = true
    return f
  }
  const applyFilters = (f: JobFilters) => {   // 快照回放/URL 兜底共用的落地口
    for (const [k, s] of Object.entries(fState)) { const v = f[k]; if (typeof v === 'string' && v) s.set(v) }
    if (f.directOnly) setDirectOnly(true)
  }
  const hydrated = useRef(false)
  const ssrSig = useRef(filterSig(initialFilters))   // SSR 已按这套筛选查过库 → 首次别再原样重打一遍 /api/jobs
  useIsoLayoutEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search)
      // 返回保筛选(2026-07-25):详情整页右上角 × 带 ?back=1 回流 → 回放快照(快照见下方写入 effect)。
      // 只在 back=1 时回放——直接访问 / 仍是干净板;回放后立刻洗掉参数,刷新不再重放(同 ?login=1 惯例)
      if (sp.get('back') === '1') {
        try {
          const s = JSON.parse(localStorage.getItem('boardFilters') || 'null')
          if (s) applyFilters(s as JobFilters)
        } catch { /* ignore */ }
        sp.delete('back')
        window.history.replaceState(null, '', window.location.pathname + (sp.toString() ? `?${sp.toString()}` : ''))
      }
      // URL 里的筛选(stats/rankings 回流、stats L2 下钻 mid、详情页小类 fine)已由服务端解析成
      // initialFilters 当了 state 初值 —— 这里再读一遍只作兜底(值相同,React 自会跳过重渲)。
      applyFilters(initialFilters)
      // E5-05 直链回流;进匹配视图默认按匹配度排(2026-07-21 Frank:横幅写「按匹配度排序」得名副其实,
      // 原默认发布时间序把非今日的高匹配全压在今日中匹配下面)
      if (sp.get('view') === 'match' && plan.loggedIn && plan.profileOk) { setMatchView(true); setSort({ key: 'match', dir: 'desc' }) }
    } catch { /* ignore */ }
    hydrated.current = true
  }, [])
  // 筛选 → URL(刷新保选项)+ localStorage 快照(返回保筛选的数据面):都只记非默认值,
  // 全默认就把参数/快照清掉,不留陈年状态。URL 只动自己管的那几个 key,别人的参数(view 等)原样留着。
  useEffect(() => {
    const snap = curFilters()
    if (hydrated.current) try {
      const u = new URL(window.location.href)
      for (const [urlKey, fKey] of Object.entries(URL_TO_FILTER)) {
        const v = snap[fKey]
        if (typeof v === 'string' && v) u.searchParams.set(urlKey, v); else u.searchParams.delete(urlKey)
      }
      if (snap.directOnly) u.searchParams.set(DIRECT_URL_KEY, '1'); else u.searchParams.delete(DIRECT_URL_KEY)
      const next = u.pathname + (u.searchParams.toString() ? '?' + u.searchParams.toString() : '') + u.hash
      if (next !== window.location.pathname + window.location.search + window.location.hash) {
        window.history.replaceState(null, '', next)
      }
    } catch { /* ignore */ }
    try {
      if (Object.keys(snap).length) localStorage.setItem('boardFilters', JSON.stringify(snap))
      else localStorage.removeItem('boardFilters')
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, fNoc, directOnly, fElig, fCountry, fProv, fCity, fDistrict, fBroad, fMid, fFine, fTeer, fSource, fAcc, fPnp, fAip, fPilot, fStatus, fOrigin, fScore, fSal, fVs, fEmp])
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
      const q = mapQuery({ field: field, job: job })
      if (q) window.open(mapsUrl(q), '_blank', 'noopener')
      return
    }
    setPopup({ group: d, srcField: field, job, title })
  }, [])
  // C1 走查拍板(2026-07-07):删两套公司弹窗——操作列「公司信息」直接开顾问公司弹窗;ActModal 只剩 JD 快看
  const [actModal, setActModal] = useState<{ kind: 'desc'; job: JobRow } | null>(null)
  // 升级入口(Pro 锁列/保存筛选 gate)统一开独立升级弹框;未登录先走注册弹框(用户定:注册与购买分离)
  const [upsell, setUpsell] = useState<false | 'lock' | 'ss' | 'login' | 'match' | 'quiz'>(false)   // match=①匹配锁(弹框带 FOMO 数字);quiz=入口三问结果页的「注册保存」
  // E11-05②:分型引导 wizard。首访自动弹(登录且无档案且没弹过);关/完成置 OB_SEEN 不再自动弹;横幅「建档」手动开忽略它
  const [wizard, setWizard] = useState(false)
  const closeWizard = () => { try { localStorage.setItem(OB_SEEN_KEY, '1') } catch { /* ignore */ } setWizard(false) }
  useEffect(() => {
    if (!plan.loggedIn || plan.profileOk) return
    try { if (localStorage.getItem(OB_SEEN_KEY)) return } catch { /* ignore */ }
    setWizard(true)
  }, [])
  // 三问弹框已退役(2026-07-31 Frank「不需要弹框答题了,统一一下答题功能」):
  // 答题只剩 /plan/* 的 SurveyJS 答题器;职位板只读答案做回显与筛选,自己不再问问题。
  // 自动弹窗(#237 的排队逻辑)随之删掉 —— 没有弹框就没有「盖住别的弹框」这回事。
  // quizToProfile(三问答案 → 档案落库)随组件提级抽到 quiz/EntryQuiz.tsx —— jobs 与 /start 同一份
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
  // 推荐条已下架(2026-07-31 Frank「我想推荐也不需要了吧,不是有我的匹配吗?不需要再瞎推荐了」):
  // 「按你最近浏览/你所在地区」是猜的,而「我的匹配」是拿用户自己给的答案算的 —— 同屏两套推荐,
  // 猜的那套只会稀释真的那套。画像采集(recordPref)随之退役,localStorage 里的旧画像不再有人读。
  const toggleSave = async (j: JobRow) => {
    if (!plan.loggedIn) { setUpsell('lock'); return }
    const key = String(j.id)
    const cur = saved[key]
    if (cur) {
      setSaved((m) => { const c = { ...m }; delete c[key]; return c })
      await fetch(`/api/saved-jobs/${cur.id}`, { method: 'DELETE', credentials: 'include' }).catch(() => {})
    } else {
      track('save-job')
      const r = await fetch('/api/saved-jobs', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job: j.id, title: j.title, company: j.company, status: 'wish' }),
      }).catch(() => null)
      const d = r ? await r.json().catch(() => null) : null
      const id = d?.doc?.id
      if (id != null) setSaved((m) => ({ ...m, [key]: { id, status: 'wish' } }))
    }
  }
  const matchRequested = initialMatchView && plan.loggedIn && plan.profileOk
  const [sort, setSort] = useState<{ key: ColKey; dir: 'asc' | 'desc' }>(matchRequested
    ? { key: 'match', dir: 'desc' }
    : { key: 'datePosted', dir: 'desc' })
  const [colOpen, setColOpen] = useState(false)
  // 我的匹配视图(E5-05,D1=B):只看命中我档案的岗,匹配度排最前;免费=每日前 N 岗匹配 + 升级卡。
  // URL ?view=match 可分享/可回退;入口三态分流(未登录/未建档 → /account 建档)。
  const [matchView, setMatchView] = useState(matchRequested)
  // 跳转页面语义(2026-07-11 用户拍板):进出匹配视图=整页跳 /?view=match / /(URL 即状态,可分享可回退;
  // 2026-07-17 根域直出后职位板=根路径)。未登录直接弹登录框(同日用户:「不要先跳转页面再弹窗」),
  // 已登录未建档才去 /account 建档
  const toggleMatchView = () => {
    if (!plan.loggedIn) {
      // 手里没有职业答案的先去 /account 建档(2026-08-04:原先送去 /plan/job 答题 —— 答题卡已摘入口,
      // 而匹配吃的就是档案里的职业/目标省,建档是保留下来的那条路);有答案的照旧弹登录
      const saved = readQuiz()
      if (!saved?.nocs?.length) { track('match-view-quiz'); window.location.href = '/account'; return }
      setUpsell('login'); return
    }
    if (!plan.profileOk) { setWizard(true); return }   // E11-05②:未建档 → 开引导 wizard(原直跳 /account)
    if (!matchView) track('match-view')
    window.location.href = matchView ? '/' : '/?view=match'
  }
  const colRef = useRef<HTMLDivElement>(null)
  // (E10-01 P3:客户端 limit 切片退役 → 服务端 page 分页,见下方 fetch effect)
  const [lang, setLangSaved, t] = useLang()   // 语言/文案:全站一处(LangProvider),初值由服务端 cookie 定
  // 大分类标签:'未分类' 复用规范 key cell.uncat(字典无 broad.未分类,否则会回退成原样输出 "broad.未分类")
  // 大类显示名同样走 catName:名字住 noc_categories(broad_en/broad_ko),
  // 分类换一版就不必再往 i18n 里手加 17×3 个键(#256 那类事故的同一个根)
  const broadLabel = (v?: string) => (v && v !== '未分类' ? catName({ t, value: v }) : t('cell.uncat'))
  const catLabel = (v?: string) => (!v || v === '未分类' ? t('cell.uncat') : catName({ t, value: v }))
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
    setVisible(next)                                          // 列集变了 → useColWidths 自己重量重分(手动宽同时作废)
  }
  const toggleCol = (key: ColKey) => saveCols(visible.includes(key) ? visible.filter((k) => k !== key) : [...visible, key])
  // match 列不进列选择器(E5-05:独立视图专属;老 cookie 里的 match 也在 shown 处剔除)
  const TOGGLABLE = COLUMNS.filter((c) => !c.always && c.key !== 'match').map((c) => c.key)
  const selectAllCols = () => saveCols(TOGGLABLE)
  const invertCols = () => saveCols(TOGGLABLE.filter((k) => !visible.includes(k)))
  const mainCols = () => saveCols(DEFAULT_COLS) // 一键只显示默认的核心列
  const shownBase = COLUMNS.filter((c) => c.key !== 'match' && (c.always || visible.includes(c.key)))
  // 匹配档不再出列(Frank 2026-07-27 看着匹配视图整列全是「高」:「这一列没有必要吧」)——
  // 这个视图本身就是「你的匹配」,再来一列逐行复读一遍「高」是零信息量;
  // 匹配仍然是**筛选与排序**维度(view=match 的 WHERE、fElig 筛选、sort=match),只是不占一列。
  // 同 2026-07-26 手机卡裸字胶囊下架那一刀的理由(没有列头的「高」说不清是什么的高)。
  const shownAll = shownBase

  // ── 列宽:全部逻辑在 ./colWidths.ts 一个文件里(Frank 2026-08-03「宽度控制放到一个地方」)。
  //    刷新 / 筛选查完 / 拖竖线 三条触发共用同一套规则:表头宽优先 → 内容宽其次 → 总宽=容器宽。
  const headRowRef = useRef<HTMLTableRowElement>(null)

  // #35 已整轮回滚(2026-07-11 用户三轮拍板互斥后收敛:宽度不变+可滑动+无小注 = 原状):
  // v1 整列隐藏+小注 → 用户否;v2 容器收口到整列边界 → 用户否(表格变窄)。维持全宽横滚,末列
  // 在视口边缘被切属滚动常态,不再干预。此教训记档:改表格布局前先给用户看效果图。
  const shown = shownAll
  // E6-09(2026-07-26 Frank「恢复可点」):命中官方具名排除清单的岗,格子要说结论、要能点开看依据
  // ——与「TEER 不够」这种泛判定不同。整表算一次 province|noc 命中集,逐行 O(1) 查。
  const blockedKeys = useMemo(() => {
    const pnp = new Set<string>(), aip = new Set<string>()
    for (const r of dims.pnpOccupations) {
      if (r.type !== 'ineligible') continue
      ;((r.program || 'PNP') === 'AIP' ? aip : pnp).add(r.province + '|' + r.noc)
    }
    return { pnp, aip }
  }, [dims.pnpOccupations])
  // 喂给 ./Table 的 cellOf 的那点上下文:每格都要、但每格算不出来的东西(译文、分层态、维度表、排除清单)。
  const cellCtx = { t, plan, eeCats: dims.eeCategories, blocked: blockedKeys, onUpsell: () => setUpsell('lock') }
  const shownKey = shown.map((c) => c.key).join(',')
  // ── 列宽唯一控制点(见 ./colWidths.ts):刷新页面 / 查完筛选 / 拖列竖线 三条触发共用一套规则。
  //    数据指纹变了就重量 —— 换列、换语言、换了这一批行(筛选/翻页)都按新内容重分;
  //    老版本只看「有没有行」,筛完「IT」还按上一批的宽度占地(Frank 2026-08-03 实拍)。
  // 操作列**不再写死宽度**(2026-08-16 Frank「操作右面空了一大截」):
  //   96→168 是 2026-08-09 三颗钮时代的数,今天这列只剩一颗「收藏」(判定入口同日撤到评估页),
  //   数字没人跟着改 —— 于是常年空着近百像素。写死的宽度就是会过期的宽度:
  //   交给量宽(表头第一、内容第二)按它**当前真实**内容分,加钮删钮都不用再记得回来改这个数。
  //   它内容恒短,规则③「余量给最长那列」也不会把空地摊给它。
  const CELL_PAD = 14       // 单元格左右内边距(6+6)+ 1px 列分隔线:量到的是纯内容宽,分宽要算上
  const dataKey = `${shownKey}|${lang}|${rows.length}|${rows[0]?.id ?? ''}|${rows[rows.length - 1]?.id ?? ''}`
  const cw = useColWidths({ keys: shown.map((c) => c.key), headRowRef, dataKey, pad: CELL_PAD, seed: initialColW })

  // ── 固定左列(发布时间/大分类/公司/职位):只有**真的横滚**时才需要(默认总宽=容器宽,压根不滚)。
  //    顺带收掉一个副作用:border-collapse 的表里 sticky 单元格的右边框 Chromium 不画 ——
  //    Frank「查询之后列竖线没了,点一下竖线才恢复」就是它(点竖线=切旧的手动宽模式,sticky 关了才回来)。
  //    现在默认不 sticky,横滚态下的竖线也改用 inset 阴影画,任何模式下都看得见。
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
  // 列宽变了必须重量:sticky 的 left 是**累计实宽**,拖列改了左侧列宽而偏移量还停在旧值,
  // 固定列就会钉在旧位置、拿不透明底色盖住右邻居(Frank 2026-08-16「怎么穿透了职位列」)。
  const colwKey = shown.map((c) => String(cw.width(c.key))).join(',')
  useIsoLayoutEffect(() => { measureSticky() }, [shownKey, cw.overflow, colwKey])  // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    window.addEventListener('resize', measureSticky)
    return () => window.removeEventListener('resize', measureSticky)
  }, [shownKey])  // eslint-disable-line react-hooks/exhaustive-deps

  // 固定列单元格:sticky + 累计 left + 不透明底色(挡住滚动内容);竖线走 inset 阴影(sticky 下 border 不画)
  const frozenStyle = (key: ColKey, bg: string, line: string): React.CSSProperties =>
    cw.overflow && frozenSet.has(key) && stickyLeft[key] != null
      ? { position: 'sticky', left: stickyLeft[key], zIndex: 3, background: bg, borderRight: 'none',
          boxShadow: `inset -1px 0 0 ${line}` + (key === lastFrozen ? ', 3px 0 5px -3px rgba(0,0,0,.18)' : '') }
      : {}
  // ── 单元格排版:跟着列宽走,不再另设最小宽(最小宽会把表撑出容器 = 横滚,Frank「不需要滚动条」)
  //    格距(7px 6px)、越界裁剪、断词规则都在 main.css 的 .jtTd —— 格子里唯一还内联的是
  //    cellOf 返回的逐格判定色与冻结列的 sticky 偏移,那两样是算出来的,不是样式。
  // 这几列的值是**短语**不是原子值(AIP「Occupation not accepted」、LMIA、资格、匹配),
  // 中文短、英文长 —— 让它们在本列内换行,别再挤隔壁。
  const WRAP_COLS = new Set<ColKey>(['aip', 'pilot', 'lmia', 'eligibility', 'match'])

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
  useEffect(() => { setPage(0) }, [q, fNoc, directOnly, fCountry, fProv, fCity, fDistrict, fBroad, fMid, fFine, fTeer, fSource, fAcc, fPnp, fAip, fPilot, fStatus, fOrigin, fScore, fSal, fVs, fEmp, fElig, sort, matchView])

  // 联动选项来自维度表(provinces/cities/districts;E10-01 P3:维度独立加载后不再从 job 行现推)。
  // 国家/TEER 下拉已删(2026-07-07 文案审计);fCountry/fTeer state 保留给已存的 saved-search 兼容
  const provOpts = useMemo(() => dims.provinces.map((p) => p.name), [dims])
  const cityOpts = useMemo(() => { const code = fProv ? PROV_CODE[fProv] : ''; return uniq(dims.cities.filter((c) => !code || c.province === code).map((c) => c.name)) }, [dims, fProv])
  const distOpts = useMemo(() => { const code = fProv ? PROV_CODE[fProv] : ''; return uniq(dims.districts.filter((d) => (!code || d.province === code) && (!fCity || d.city === fCity)).map((d) => d.name)) }, [dims, fProv, fCity])
  // 分类筛选项来自维度表(noc_categories);中/小类的英韩名也在这张表里,一并登记给 catName
  const nc = dims.nocCategories
  useMemo(() => registerCatLabels(nc), [nc])
  // 大类按行业顺序(BROAD_SLUGS = etl/noc_buckets.BROADS 的镜像),不用 uniq 的字母序 ——
  // 对中文那是按码位排的,等于乱序;清单外的值(未分类)垫底。
  const broadOpts = useMemo(() => {
    const order = new Map(BROAD_SLUGS.map(([, b], i) => [b, i]))
    return uniq(nc.map((c) => c.broad)).sort((a, b) => (order.get(a) ?? 99) - (order.get(b) ?? 99))
  }, [nc])
  const midOpts = useMemo(() => uniq(nc.filter((c) => !fBroad || c.broad === fBroad).map((c) => c.mid)), [nc, fBroad])
  const fineOpts = useMemo(() => uniq(nc.filter((c) => (!fBroad || c.broad === fBroad) && (!fMid || c.mid === fMid)).map((c) => c.fine)), [nc, fBroad, fMid])
  // 来源/状态/经验/评分下拉已下架(2026-07-16 拍板只留薪资);state 与谓词保留=URL/老保存筛选照常生效
  // 职业胶囊的显示名:走维度表里的 NOC 译名(与卡片上那条灰注同一个出口),查不到就显码本身
  const fNocLabel = useMemo(() => {
    const codes = fNoc.split(',').map((x) => x.trim()).filter(Boolean)
    if (!codes.length) return ''
    return codes
      .map((code) => nocLocalTitle({ row: dims.nocDescriptions.find((d) => d.noc === code) || null, lang }) || code)
      .join(lang === 'zh' ? '、' : ', ')
  }, [fNoc, dims, lang])
  const anyFilter = q || fNoc || directOnly || fCountry || fProv || fCity || fDistrict || fBroad || fMid || fFine || fTeer || fSource || fAcc || fPnp || fAip || fPilot || fStatus || fOrigin || fScore || fSal || fVs || fEmp || fElig
  const clearAll = () => {
    setQ(''); setFNoc(''); setDirectOnly(false); setFCountry(''); setFProv(''); setFCity(''); setFDistrict(''); setFBroad(''); setFMid(''); setFFine(''); setFTeer(''); setFSource(''); setFAcc(''); setFPnp(''); setFAip(''); setFPilot(''); setFStatus(''); setFOrigin(''); setFScore(''); setFSal(''); setFVs(''); setFEmp(''); setFElig('')
    // URL 参数不用在这儿摘:上面「筛选 → URL」那一处会把清空后的状态同步回地址栏
    // (2026-07-19 Frank「点击清除筛选,一刷新又回去了」的老补丁已并入同一出口)
  }

  // ── E10-01 P3:筛选/搜索/排序/翻页全部打 /api/jobs(服务端 WHERE+分页);rows/total 来自服务端。
  //    useDeferredValue 让搜索输入跟手(dq 变化触发重拉,滞后一帧);reqSeq 丢弃晚到的旧响应。
  const dq = useDeferredValue(q)
  const firstFetch = useRef(true)
  useEffect(() => {
    const cur = curFilters(dq)                       // 筛选参数与 URL/快照同一个出口(fState 一张表)
    const sp = new URLSearchParams()
    for (const [k, v] of Object.entries(cur)) sp.set(k, v === true ? '1' : String(v))
    if (sort.key) { sp.set('sort', sort.key); sp.set('dir', sort.dir) }
    if (matchView) sp.set('view', 'match')
    sp.set('page', String(page))
    // 首屏 page0 非匹配、且筛选与 SSR 那次完全一致 = 服务端已经给过这批行 → 跳过首次重复拉取(不闪)。
    // 无筛选时两边都是空签名,与改造前的 !anyFilter 等价。
    if (firstFetch.current) { firstFetch.current = false; if (page === 0 && !matchView && filterSig(cur) === ssrSig.current) return }
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
  }, [dq, directOnly, fCountry, fProv, fCity, fDistrict, fBroad, fMid, fFine, fTeer, fSource, fAcc, fPnp, fAip, fPilot, fStatus, fOrigin, fScore, fSal, fVs, fEmp, fElig, sort, matchView, page])

  return (
    <div className="jbPage">
      {/* 顶栏=全站统一 Header(#65 header 合一,2026-07-18 Frank 拍板;内联头退役,1320 头轨全站一致)。
          /jobs 特有件走 props:matchButton 切换态 + 完整 AccountArea(plan 下拉/弹框)。
          差异认账:未登录点「我的账户」由弹框改为 /account 302 回 /?login=1(终点同为登录框)。
          active:首页就是职位板 —— 原来不传,于是「职位」那项永远不亮(2026-08-17 Frank
          「切换到职位的时候,职位没有高亮」);板内切到「我的匹配」视图时才改标 match。 */}
      <Header lang={lang} setLang={setLangSaved} t={t} sticky loggedIn={plan.loggedIn}
        active={initialMatchView || matchView ? 'match' : 'jobs'}
        matchButton={{ active: initialMatchView || matchView, onClick: toggleMatchView }}
        accountArea={<AccountArea t={t} plan={plan} />}
        />{/* Frank 2026-07-26「搜索框怎么跑 banner 上面去了」「怎么所有页面都加了这个搜索框」:
          E8-07 C 顶栏搜索带全站退役,搜索回到筛选区第一格(banner 之下),手机整行独占 */}
      {/* 榜单/统计弹窗已退役(2026-07-11 用户拍板顶栏改跳转页面);/stats 页「看职位」?prov=&broad= 回流照旧 */}
      {/* 价值横幅退役(#65 收尾,Frank:「不需要两个蓝条」)——建档 CTA 并进下方 Jobs 页头右槽 */}
      <div className="jbMain">
        {/* 页头=Banner(#65/#66 五模块统一浅色带,职位板=蓝)。标题数字口径不变:
            库内真实总数(第 15 轮 #34)/筛选匹配态只报命中数(第 17 轮 #42);证言行(第 5 轮 #14)作 sub */}
        <Banner module="jobs" title="Jobs" images={BANNER_IMGS.jobs}
          sub={<>
            {anyFilter || matchView ? t('subtitle.hits', { n: total }) : t('subtitle.count', { n: total })}
            {/* #170(Frank 批,实测证据):这行证言在 375px 上是 nowrap+省略号 —— 后半截被直接切掉,
                也就是说「N 家雇主有外劳雇佣记录」这条**手机用户从来没看见过**,而手机是主要流量。
                横幅手机高只有 104px,硬塞挤爆 → 窄屏整条隐藏(与数字胶囊 .pbStat 同一条媒体查询),
                只留「N 个职位」;证言是说服性内容,在首屏抢不过职位数。 */}
            {proof && (proof.named > 0 || proof.lmia > 0) && <span className="pbProof">{t('subtitle.proof', { named: proof.named, lmia: proof.lmia })}</span>}
          </>}
          />
        {/* 横幅右槽「免费建档案,看每份工作对你的匹配度」CTA 已删(2026-08-02 Frank:「删掉」)。
            理由=旧漏斗残肢:它跳 /?signup=1 一个光秃秃注册框(无题无报告),而现在的获客链是
            答题 → 报告 → 落库建档(/plan/pr;实测报告来路 16 条里 12 条是首页 pr 卡直进)。
            同屏另有三个同义入口(顶栏注册钮 / 顶栏「我的匹配」/ 手机整行「我的匹配」),
            它是第四个、且全站唯一没埋点的转化入口 —— 带没带来注册无从判断,还是 #165 的病灶。 */}

        {/* 三问细带已移出职位板(2026-07-31 Frank「我觉得放在这不合适,应该放到我的档案里面」):
            答案的家是档案页 —— 职位板只管找工作,不再在列表上方常驻一条「你上次填了什么」。 */}
        <div className="jbFilters">
          {/* ═══ #59 筛选区重设计(2026-07-18 效果图过目后 Frank「可以」):5 行 label+下拉收成
              「常用一行(搜索/省/大类;PNP/年薪 08-16 下沉)+ 更多筛选折叠(激活计数徽标)」;07-07 行序拍板与
              窄屏抽屉(jtDrawerToggle)一并退役——一行+折叠对窄屏同样成立,靠 flexWrap 自然换行。
              右端=更新时间+字段钮(#56 拍板延续)。市/区、中/小类仍是省/大类的联动下级,只在折叠区出现。 ═══ */}
          <div className="jtCtl">
            <input className="jtSearch field" placeholder={t('search.placeholder')} value={q} onChange={(e) => setQ(e.target.value)} enterKeyHint="search" />
            {/* 职业胶囊已移到下方「已选」行(2026-08-16 Frank「这个已经筛选的条件不应该放到这里吧」) */}
            {/* 2026-08-16 Frank「这个没有完全国际化」:省下拉的选项一直是英文全名(筛选值就是它,深链/保存的
                筛选都靠它),中文界面看着半中半英 —— 挂上既有的 provName 显示层,**值不动**:labelOf 只管显示。
                同日续:出**界面语言的省名就够**(localeOnly),「Ontario(安大略省)」在下拉里是一行说两遍 */}
            <Sel value={fProv} onChange={(v) => { setFProv(v); setFCity(''); setFDistrict('') }} opts={provOpts} all={t('all.prov')}
              labelOf={(v) => provName({ t, code: PROV_CODE[v] || v, localeOnly: true })} />
            <Sel value={fBroad} onChange={(v) => { setFBroad(v); setFMid(''); setFFine('') }} opts={broadOpts} all={t('all.broad')} labelOf={broadLabel} />
            {/* 「PNP」「年薪」2026-08-16 下沉进折叠区(Frank「上面这一行太长了吧」,效果图 B 拍板):
                常用一行只留 搜索/省/大类 + 更多筛选;选了什么不会藏起来 —— foldActive 徽标把它们算进计数 */}
            {/* P1 换装:secondary 型(激活态浅蓝底描边蓝);高度 38 与同行下拉对齐 */}
            <Button kind="secondary" onClick={() => setFDrawer((o) => !o)}
              className={'jtBtn38 row' + (fDrawer || foldActive ? ' on' : '')}>
              {t('filter.more')}
              {foldActive > 0 && <span className="jtFoldN">{foldActive}</span>}
              <span className="jtFoldCaret">{fDrawer ? '▲' : '▼'}</span>
            </Button>
            {/* 我的匹配(2026-08-16 顶栏改「职位」后):切换落回板内 —— 它是这块板的一个视图,不是一个页面。
                桌面在这条筛选行,手机走下面那条窄屏入口条(jtOnlyNarrow),两处不同时出现 */}
            <Button kind="secondary" onClick={toggleMatchView}
              className={'jtWideOnly jtBtn38' + (matchView ? ' on bold' : '')}>
              {matchView ? t('mv.exit') : t('mv.entry')}
            </Button>
            {/* 「清除筛选」「保存此筛选」已移到下方「已选」行:它们是对**这套条件**的操作,和输入控件不同类 */}
            {/* 更新时间 + 字段(10):不是筛选,但 2026-08-16 PNP/年薪 下沉后这一行腾出了地方 ——
                Frank「这个能放到一行吗」→ 回到本行右端(marginLeft:auto 顶到最右),不再单占一条。
                #202:更新时间不进 jtHideNarrow,手机端(卡片视图)随 flexWrap 落到下方仍看得见心跳。 */}
            {updatedAt && <span className="jtUpdated">{t('updated', { t: fmtLocal(updatedAt) })}</span>}
            <div ref={colRef} className="jtHideNarrow jtColWrap">
              <Button kind="secondary" onClick={() => setColOpen((o) => !o)} className="jtBtn38 row"><IconSettings style={{ marginRight: 5 }} />{t('fields', { n: shown.length })}</Button>
              {colOpen && (
                <div className="jtColPanel">
                  <div className="jtColHead">
                    <button onClick={mainCols} className="jtColBtn main">{t('fields.main')}</button>
                    <button onClick={selectAllCols} className="jtColBtn">{t('fields.all')}</button>
                    <button onClick={invertCols} className="jtColBtn">{t('fields.invert')}</button>
                    {cw.hasManual && <button onClick={cw.reset} className="jtColBtn">{t('fields.resetW')}</button>}
                  </div>
                  {/* match 列是「我的匹配」视图专属(E5-05),勾了也不出列——不进选择器(第 2 轮 #11) */}
                  {COLUMNS.filter((c) => c.key !== 'match').map((c) => (
                    <label key={c.key} className={c.always ? 'jtColOpt fixed' : 'jtColOpt'}>
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
            <div className="jtFold">
              <div className="jtCtl">
                <span className="jtFiltLabel">{t('filter.geo')}</span>
                <Sel value={fCity} onChange={(v) => { setFCity(v); setFDistrict('') }} opts={cityOpts} all={t('all.city')} />
                <Sel value={fDistrict} onChange={setFDistrict} opts={distOpts} all={t('all.district')} />
              </div>
              <div className="jtCtl">
                <span className="jtFiltLabel">{t('filter.cat')}</span>
                <Sel value={fMid} onChange={(v) => { setFMid(v); setFFine('') }} opts={midOpts} all={t('all.mid')} labelOf={catLabel} />
                <Sel value={fFine} onChange={setFFine} opts={fineOpts} all={t('all.fine')} labelOf={catLabel} />
              </div>
              {/* gig=兼职∪casual∪seasonal(E6-06);未标注岗选类型自然不命中,与「未分类」同一诚实口径 */}
              <div className="jtCtl">
                <span className="jtFiltLabel">{t('filter.other')}</span>
                {/* PNP / 年薪:原在常用一行,2026-08-16 下沉至此(方案 B);年薪排到「对比中位」旁,两条薪资维度同处 */}
                <Sel value={fPnp} onChange={setFPnp} opts={['yes', 'no']} all={t('all.pnp')} labelOf={(v) => t('opt.' + v)} />
                <Sel value={fAip} onChange={setFAip} opts={['yes', 'no']} all={t('all.aip')} labelOf={(v) => t('opt.' + v)} />
                {/* RCIP/FCIP 试点社区(E6-11):yes=任一命中,RCIP/FCIP=指定类型 */}
                <Sel value={fPilot} onChange={setFPilot} opts={['yes', 'RCIP', 'FCIP', 'no']} all={t('all.pilot')} labelOf={(v) => (v === 'yes' || v === 'no' ? t('opt.' + v) : v)} />
                <Sel value={fEmp} onChange={setFEmp} opts={['full', 'part', 'gig']} all={t('all.emp')} labelOf={(v) => t('emp.' + v)} />
                <Sel value={fSal} onChange={setFSal} opts={['ge100', '80', '60', 'u60']} all={t('all.sal')} labelOf={(v) => t('sal.' + v)} />
                <Sel value={fVs} onChange={setFVs} opts={['above', 'above20', 'below']} all={t('all.vs')} labelOf={(v) => t('vs.' + v)} />
                <label className={`${directOnly ? 'jtCheck on' : 'jtCheck'} field`} title={t('directOnly.tip')}>
                  <input type="checkbox" checked={directOnly} onChange={(e) => setDirectOnly(e.target.checked)} />{t('directOnly')}
                </label>
                {/* GAP1③:排除 JD 明确不担保/须 PR 的岗(红旗=数据层检测;未检出=通过,非担保保证) */}
                <label className={`${fElig ? 'jtCheck on' : 'jtCheck'} field`} title={t('eligOnly.tip')}>
                  <input type="checkbox" checked={fElig === 'ok'} onChange={(e) => setFElig(e.target.checked ? 'ok' : '')} />{t('eligOnly')}
                </label>
              </div>
            </div>
          )}
          {/* ═══「已选」行(2026-08-16 效果图过目后 Frank「可以」)═══
              上面那行是**输入区**(我要找什么),这一行是**状态区**(现在框住了什么)+ 对这套条件的操作。
              先前混在一行:条件名一长就把行顶爆(「木匠」还行,「信息系统专家」直接换行,Frank 实拍)。
              规矩:**只放没有自己控件的条件** —— 省/大类的当前值在各自下拉上写着,不在这儿复读一遍
              (同屏说两遍「安大略省」是噪音)。今天归这行的只有职业(NOC)一种,将来的隐形筛选也进这里。 */}
          {anyFilter && (
            <div className="jtCtl">
              {fNoc && <span className="jtFiltLabel">{t('filter.picked')}</span>}
              {/* 职业胶囊:值是 NOC 码(精确),显示的是人话名(代码不裸奔);✕ 撤掉本条 */}
              {fNoc && (
                <span className="jtNocPill">
                  {fNocLabel}
                  <button onClick={() => setFNoc('')} aria-label={t('clear')}
                    className="jtNocX">×</button>
                </span>
              )}
              <span className="jtPickedAct">
                <button onClick={clearAll} className="jtPicked danger">{t('clear')}</button>
                {/* 保存此筛选(E5-03;D1 2026-07-19 降免费):登录即可存,免费 2/Pro 5——免费触上限才弹升级。
                    2026-08-16 Frank「保存此筛选没有必要吧」→ 留:它是「简化操作才收费」那条定价原则的落点
                    (下次一键回到这套条件),但它是对**条件**的操作,归这一行,不再占输入行的地方。 */}
                {plan.loggedIn && (
                  <button
                    onClick={async () => {
                      const name = window.prompt(t('ss.name'))
                      if (!name) return
                      const filters = { q, directOnly, fCountry, fProv, fCity, fDistrict, fBroad, fMid, fFine, fTeer, fSource, fAcc, fPnp, fAip, fPilot, fStatus, fOrigin, fScore, fSal, fVs, fEmp, fElig }
                      track('save-search')
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
                    className="jtPicked save">
                    <IconSave /> {t('ss.save')}
                  </button>
                )}
              </span>
            </div>
          )}
        </div>

        {/* dd24-#111(Frank「手机顶部加个我的匹配入口」):窄屏专属入口条——桌面顶栏本就有 matchButton,
            手机上它折进侧滑抽屉首屏不可见,注册 teaser 卖匹配入口却要拉抽屉。CSS 断点显隐(SSR 安全零闪),
            行为=既有 toggleMatchView 三态;匹配视图激活时让位给下方状态条 */}
        {!matchView && (
          <button className="jtOnlyNarrow jtMvEntry" onClick={toggleMatchView}>
            <IconTarget /> {t('mv.entry')}
          </button>
        )}
        {/* 匹配视图状态条(E5-05):说明口径 + 退出;免费限额提示(D1=B) */}
        {matchView && (
          <div className="jtMvBar">
            {/* 只报「高」(第 6 轮 #23):中匹配门槛宽、数字动辄数千,报出来像灌水,反而稀释高匹配的可信度 */}
            {/* 匹配全放开(Frank 2026-07-21):不再报「免费仅前 N」封顶——只留「今日 N 个高匹配」纯信息 */}
            <span className="jtMvText"><IconTarget /> {t('mv.on')}{matchTotals && matchTotals.high > 0 ? ` · ${t('mv.today', { h: matchTotals.high })}` : ''}</span>
            <button onClick={toggleMatchView} className="jtMvExit">{t('mv.exit')} ×</button>
          </div>
        )}
        {/* 字段选择+更新时间在筛选行右端(2026-07-11 拍板「这两个放到一行」,08-16 复核仍成立) */}
        {/* #83(Frank「点我的匹配先跳医疗再跳科技」):整表换血(第 0 页在拉)期间旧行原样挂着零提示,
            视觉像跳两次——换血中表格/卡片半透明+顶部「更新中」条,数据回来再恢复 */}
        {loading && page === 0 && (
          <div className="jtLoading">
            <span className="jtSpin" />
            {t('loading')}
          </div>
        )}
        <div className={'jtTableWrap' + (loading && page === 0 ? ' dim' : '')}>
          <table className={cw.ready ? 'jtTable fixed' : 'jtTable'} style={{ width: cw.tableWidth }}>
            {/* 列宽全部来自 useColWidths(表头宽优先→内容宽其次→和恒等于容器宽);还没量到时不下 colgroup,
                让浏览器 auto 布局顶一帧,量完(绘制前)即换成算好的像素 */}
            {cw.ready && <colgroup>{shown.map((c) => <col key={c.key} style={{ width: cw.width(c.key) }} />)}</colgroup>}
            <thead>
              <tr ref={headRowRef} className="jtHeadRow">
                {shown.map((c, idx) => {
                  const active = sort.key === c.key
                  const isLast = idx === shown.length - 1
                  const handle = (  // 列右缘竖线:拖动钉死本列宽(其余列照同一套规则重分)/ 双击该列回归自动
                    <span className="colResize" onMouseDown={(e) => cw.startResize(e, c.key)} onClick={(e) => e.stopPropagation()} onDoubleClick={(e) => { e.stopPropagation(); cw.autoFit(c.key) }} title={t('resize.tip')} />
                  )
                  if (c.key === 'actions') return (  // 操作列:普通末列,不排序
                    <th key={c.key} className="jtTh">
                      {t('col.actions')}{handle}
                    </th>
                  )
                  // 年薪列表头收短成「年薪」后,折算口径挂表头 title(悬停才出,不占版面)
                  return (
                    <th key={c.key} onClick={() => toggleSort(c.key)} title={c.key === 'salaryYr' ? t('fact.salYrNote') : t('th.tip')}
                      className={active ? 'jtTh sortable on' : 'jtTh sortable'} style={frozenStyle(c.key, '#f9fafb', '#e5e7eb')}>{/* Frank 走查#23:表头完全显示——去省略截断;#23b(2026-07-26「header 的宽度不要变」):一律不折行,
                          表头挤不下就把标签本身收短(如「年薪(折算)」→「年薪」,折算口径挂 title),不靠换行救 */}
                      {t('col.' + c.key)}<span className={active ? 'jtSortHint on' : 'jtSortHint'}>{active ? (sort.dir === 'desc' ? ' ▼' : ' ▲') : ' ↕'}</span>{handle}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {/* #99(走查):进「我的匹配」换血期,别把上一屏的默认(全「低」)行透出来压在「只显示高/中」横幅下
                  ——自相矛盾。换血中改渲骨架行,数据回来再出真行。 */}
              {matchView && loading && page === 0
                ? Array.from({ length: 8 }, (_, si) => (
                    <tr key={'sk' + si}>{shown.map((c) => <td key={c.key} className="jtSkelTd"><span className="jtSkelBar" /></td>)}</tr>
                  ))
                : rows.map((j, i) => {
                // 地点拆解与大分类配色随单元格渲染搬进 ./Table 的 cellOf(它俩只有格子在用)
                const open = (field: ColKey, title: string) => openField(field, j, title)
                return (
                  <tr key={j.id} className={i % 2 ? 'jrow alt' : 'jrow'}>
                    {shown.map((c, idx) => {
                      const k = c.key
                      const rowBg = i % 2 ? '#fcfcfd' : '#fff'
                      if (k === 'actions') return (  // 操作列:只剩收藏(2026-07-26:「移民通道」钮下架,内容归各字段)
                        <td key={k} className="jtTd">
                          <span className="jtActCell">
                            <button onClick={(e) => { e.stopPropagation(); toggleSave(j) }}
                              className={saved[String(j.id)] ? 'jtActBtn on' : 'jtActBtn'}>
                              {saved[String(j.id)] ? t('sj.saved') : t('sj.save')}
                            </button>
                            {/* 逐行判定入口 2026-08-16 Frank 拍板撤(「不应该每个岗位都加一个…按钮,
                                应该先评估,通过评估再跳到对应的工作」)—— 动线反过来:/plan/pr 评估
                                → 初评表操作列「去投递」落到岗;详情页/公司弹框的入口保留(已选中岗才判) */}
                          </span>
                        </td>
                      )
                      const { node, extra, href } = cellOf(k, j, cellCtx)
                      const act = cellActive(k, j, blockedKeys)
                      return (
                        <td key={k} className={'jtTd ' + (act ? 'jcell jcellAct act' : 'jcell')} style={{ ...extra, ...(NOWRAP_COLS.has(k) && !WRAP_COLS.has(k) ? { whiteSpace: 'nowrap' } : { whiteSpace: 'normal', overflowWrap: 'break-word' }), ...frozenStyle(k, rowBg, '#f3f4f6') }} title={typeof node === 'string' ? node : undefined} onClick={() => {
                          if (!act) return
                          // 职位格=直开职位描述(2026-07-19 Frank:「点职位也能显示职位描述」);title 顾问弹框由 JD 框标题栏「AI 顾问」钮承接(同日报障回补)
                          if (k === 'title') { setActModal({ kind: 'desc', job: j }); return }
                          // Pro 锁列(免费态数据已在服务端剥离)不开顾问弹框——没数据只会误导;锁形本身已链去 /account。match 免费额度内有值仍可开。
                          if (PRO_COLS.has(k) && !plan.isPro && !(k === 'match' && j.match)) return
                          // 大标题=单元格字符串值;元素类 cell 只有薪资列回退薪资文本,其余留空(页眉已有字段名,别拿别列的值凑)
                          open(k, typeof node === 'string' ? node : (k === 'salary' ? (j.salaryText || '') : ''))
                        }}>
                          {href
                            ? <a href={href} target="_blank" rel="noreferrer" className="link" onClick={(e) => e.stopPropagation()}>{node}</a>
                            : node}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
              {rows.length === 0 && (
                <tr><td colSpan={shown.length} className="jtEmpty">
                  {matchView ? <>{t('mv.empty')} <a href="/account" className="jtEmptyLink">{t('mv.editProfile')}</a></> : t('empty')}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
        {/* 窄屏卡片列表(E8-03 续,2026-07-07 用户拍板):≤640px 表格→卡片,CSS 双渲染零水合差异(同 E8-03 抽屉手法)。
            卡=职位 / 公司·地点 / 薪资·时间 / 信号 chips;每处可点,开对应字段顾问弹窗(与桌面单元格同一 open());
            拍板:免费限额外的岗不显示匹配位(不放锁标,卡片寸土寸金);中位/渠道/NOC 码等低频字段留给弹窗。
            2026-08-02(Frank「卡片也用 jobtable 的卡片」「以后这个定死」):版式抽到 ui/JobCard 由全站共用,
            这里只负责喂数据与交互(弹框/星标/胶囊可点),长相由组件定 —— landing 职位榜吃的是同一张卡。 */}
        <div className={'jtCards' + (loading && page === 0 ? ' dim' : '')}>
          {rows.map((j) => {
            const open = (field: ColKey, title: string) => openField(field, j, title)  // 与表格行同一签名
            // #129(Frank「卡片本身点不进去」):整卡可点=进详情页;卡内既有交互(弹框/收藏/chips)stopPropagation 保持原行为
            const stop = (fn: () => void) => (e: React.MouseEvent) => { e.stopPropagation(); fn() }
            const L = parseLoc(j)
            // #175:不可点的 chip 连 onClick 也摘(stopPropagation 会吞整卡点击=点了没反应)
            // 胶囊统一规格(08-10 Frank「所有胶囊的风格可以改成一样的吗」):几何对齐 TV_PILL
            // (12px/圆角 999/1px 边框),语义色保留;边框色按底色配同族浅一档,别再一半色块一半胶囊
            // 胶囊的配色是**语义**不是数据:可提名=琥珀、不受理=红、EE=蓝、试点=天蓝…
            // 所以传语义名,三个色值(底/字/框)在 main.css 第 14 段一处定死 —— 2026-08-18 从
            // 「调用点传裸 hex + 一张 bg→border 查表」改过来:原先同一种胶囊的三个色分散在两处。
            const chip = (tone: string, txt: string, k: ColKey, tip?: string) => (
              <span key={k} title={tip} onClick={cellActionable(k) ? stop(() => open(k, txt)) : undefined}
                className={cellActionable(k) ? `jtChip act tone-${tone}` : `jtChip tone-${tone}`}>{txt}</span>
            )
            // Frank 走查:发布当天显示 1 天 → new Date('YYYY-MM-DD') 按 UTC 午夜解析,EDT 晚上 Date.now() 已跨 UTC 次日差 1 天;改按本地午夜解析(+'T00:00:00')
            const days = j.datePosted && (j.status || 'open') !== 'closed' ? Math.max(0, Math.floor((Date.now() - new Date(j.datePosted.slice(0, 10) + 'T00:00:00').getTime()) / 86400000)) : null
            // #200(Frank「岗位名称中文翻译默认都加上」):手机卡职位名挂 NOC 官方职业名译名(界面语言;与在招职位/弹框标题同款)
            const nz = nocLocalTitle({ row: dims.nocDescriptions.find((d) => d.noc === j.noc) || null, lang })
            // 通道胶囊排(批A 追拍「每个岗位都要列 teer,pnp,ee 胶囊;aip/qc 单独列;什么都走不了就不用列」):
            // 统一门=任一通道可走(具名信号或 TEER≤3 或 QC);全走不了 → 通道胶囊整排不出。
            // E6-09(手机优先):命中官方具名清单的「走不了」也要在卡上说 —— 那是有依据的结论,不是「没信号」。
            // 2026-07-26 Frank「高 低 …没必要显示」:匹配裸字胶囊不在此列(卡上没有列头,孤零零一个「高」说不清)
            const isQc = j.province === 'QC'
            const bk = j.province + '|' + j.noc
            const pnpExcl = blockedKeys.pnp.has(bk), aipBlocked = blockedKeys.aip.has(bk)
            const anyRoute = j.pnpEligible || j.eeCategory || j.aip || j.pilot || isQc || pnpExcl || aipBlocked || (j.teer != null && j.teer <= 3)
            const eeLast = j.eeCategory ? eeLastDraw(j.eeCategory, dims.eeCategories) : ''
            const eeDorm = !!j.eeCategory && eeIsDormant(eeLast)
            const chips = [
              // #214 回滚(Frank 2026-07-26「直接改回用 teer 不行么」):卡上显示回 TEER 码,人话档名退到 title
              anyRoute && j.teer != null ? chip('gray', `TEER ${j.teer}`, 'teer', t('teer.tip', { n: j.teer, l: t('teer.' + j.teer) })) : null,
              // 批A 追拍(Frank「可提名和可省提名有什么区别」):命中具名清单显清单名(BC 医疗),通用才显「可提名」
              anyRoute && j.pnpEligible ? chip('amber', j.pnpStream ? streamDisplay({ t, label: j.pnpStream }) : t('cell.pnpSkilledProv', { p: j.province }), 'pnp')
                : anyRoute && pnpExcl ? chip('red', aipBlocked ? t('cell.blockedBoth') : t('cell.pnpExcl'), 'pnp') : null,
              anyRoute && j.eeCategory ? (eeDorm
                ? chip('gray', 'EE ' + eeDisplay({ t, label: j.eeCategory }) + t('ee.lastDraw', { d: eeLast.slice(0, 7) || '—' }), 'ee', t('ee.dormantTip', { d: eeLast.slice(0, 7) || '—' }))
                : chip('blue', 'EE ' + eeDisplay({ t, label: j.eeCategory }), 'ee')) : null,
              // Frank 2026-07-26「不符合清单 职业不受理 需要两个胶囊吗」:两条都命中排除时只出一枚「本省不受理」
              anyRoute && aipBlocked && !pnpExcl ? chip('red', t('cell.aipBlocked'), 'aip')
                : anyRoute && j.aip ? chip('orange', t('cell.aipYes'), 'aip') : null,
              // 试点社区胶囊(E6-11):值=类型缩写,社区名/口径进弹框
              anyRoute && j.pilot ? chip('sky', j.pilot, 'pilot') : null,
              anyRoute && isQc ? chip('purple', 'QC', 'province') : null,
              // 担保档下放胶囊排(08-10 Frank「这个也放到下面」):公司名旁徽章退役,与 #145 的 LMIA chip 合一 ——
              // 有档显档名(Has LMIA record 等),无档但有 LMIA 数才显数;AIP-only 三档照旧不显(AIP 胶囊已在)
              j.sponsorGrade != null && !(j.sponsorGrade === 3 && !j.lmiaPositions && j.aip)
                ? chip('indigo', t('gr.sp.' + j.sponsorGrade), 'lmia', t('gr.sponsorTip'))
                : j.lmiaPositions ? chip('teal', 'LMIA ✓' + j.lmiaPositions, 'lmia') : null,
              // GAP1③:红旗 chip —— 白投预警比正面信号更值得占位
              j.eligibilityFlag ? chip('red', t('cell.elig.' + j.eligibilityFlag), 'eligibility') : null,
              // 逐行判定入口 pill 2026-08-16 随桌面行一并撤(动线=先评估后跳岗,见上)
            ].filter(Boolean)
            return (
              <JobCard key={j.id}
                href={`/jobs/${j.id}`}
                /* Frank 走查:手机点职位名要开 JD 弹框(与桌面一致;#131 的「跳详情页」推翻)。
                   href 保留给爬虫/SEO/长按开页,tap 时 preventDefault 开弹框 */
                title={{ text: j.title, onClick: (e) => { e.preventDefault(); setActModal({ kind: 'desc', job: j }) } }}
                /* #200:职位名下挂 NOC 官方职业名译名(岗位名看不懂时靠这条;英文界面出英文官方名) */
                note={nz && nz.toLowerCase() !== (j.title || '').toLowerCase() ? nz : undefined}
                /* 点公司名=开公司弹框(2026-07-22 Frank「其他弹框都很清晰」:与职位/分类一致,不特殊化;
                   #182 手机直跳页退役——弹框里有「打开完整页」进深页);stop 保整卡进职位详情不被抢。
                   #315:补真 href(=该公司筛选页,与雇主资质卡「该雇主在招职位」同链)——左键 preventDefault
                   照旧弹框,中键/新标签/键盘/爬虫拿到真链接,<a> 不再是无 href 的假按钮 */
                company={j.company ? { text: j.company, href: `/jobs?q=${encodeURIComponent(j.company)}`, onClick: (e) => { e.preventDefault(); e.stopPropagation(); open('company', j.company) } } : undefined}
                /* 担保档徽章 08-10 下放胶囊排(见上 chips)—— 公司名行回归干净一行 */
                /* #175:薪资退出可点集合——写死的 pointer+onClick 摘除(看着能点点了没反应比不能点更糟) */
                /* 只认 salaryText,**不兜底回原文**:原来写 (salaryText || salary),于是清洗产物为空时
                   手机上会冒出 Job Bank 原话「$37.50 hourly」,而桌面是横线 —— 同一格两端两个样。
                   护栏压制的行(源头填错栏)更不能靠这条兜底复活。2026-08-05 拍板 */
                salary={j.salaryText || undefined}
                /* E8-12(Frank「手机卡片呢?」+「省和市没法分开点」):市名/省码各自可点,各开各的弹框;
                   <a href> 语义保留给爬虫/长按新开对应层级地图 */
                location={L.city ? (
                  <>
                    <a href={mapsUrl(mapQuery({ field: 'city', job: j }))} target="_blank" rel="noreferrer" onClick={(e) => { e.preventDefault(); e.stopPropagation(); open('city', L.city) }} className="jtCardLink">{L.city}</a>
                    {j.province ? <>
                      <span className="jtCardSep">, </span>
                      <a href={mapsUrl(mapQuery({ field: 'province', job: j }))} target="_blank" rel="noreferrer" onClick={(e) => { e.preventDefault(); e.stopPropagation(); open('province', L.prov) }} className="jtCardLink">{j.province}</a>
                    </> : null}
                  </>
                ) : undefined}
                date={<span suppressHydrationWarning>{(j.datePosted || '').slice(0, 10)}{days != null ? `(${days === 0 ? t('cell.today') : t('fact.daysUpVal', { n: days })})` : ''}</span>}
                /* #167⑩(Frank「卡片胶囊应该统一放到一个位置吧」):胶囊都归卡底那排,右上角只留星标——它是按钮不是胶囊。
                   #52:收藏入口手机也要有(E9-01 闭环第一环),匿名点=注册框(与桌面 toggleSave 同一逻辑) */
                action={
                  <button className={saved[String(j.id)] ? 'jtStar on' : 'jtStar'} onClick={(e) => { e.stopPropagation(); toggleSave(j) }} aria-label={saved[String(j.id)] ? t('sj.saved') : t('sj.save')}>
                    {saved[String(j.id)] ? '★' : '☆'}
                  </button>
                }
                chips={chips.length ? chips : undefined}
                /* #167⑦(Frank「这个卡片最好有个更新时间吧,年月日时分秒」):发布时间只有日期没时刻(Job Bank 原样),
                   判断不了「刚抓到还是躺了一天」;更新时间是本站每小时抓取的实际时刻,精确到秒。
                   **此处必须带标签**:一张卡上两个日期并排,值自己说不清谁是谁——#166「值自证就删标签」的那条例外 */
                footer={j.lastSeen ? <span suppressHydrationWarning>{t('col.lastSeen')} {fmtLocalSec(j.lastSeen)}</span> : undefined}
              />
            )
          })}
          {rows.length === 0 && (
            <div className="jtEmptyCards">
              {matchView ? <>{t('mv.empty')} <a href="/account" className="jtEmptyLink">{t('mv.editProfile')}</a></> : t('empty')}
            </div>
          )}
        </div>
        {/* 点击分页:不随滚动自动加载(用户拍板);按钮只报剩余条数——#42 同族,20000 载入护栏当分母像写死(2026-07-16 用户指出) */}
        <div className="jtMore">
          {rows.length === 0 ? ''
            : rows.length >= total ? t('allShown', { total })
            : <Button kind="secondary" sm disabled={loading} onClick={() => setPage((p) => p + 1)} className={loading ? 'jtMoreBtn busy' : 'jtMoreBtn'}>{loading ? '…' : t('loadMore', { n: total - rows.length })}</Button>}
        </div>
        {/* 匹配全放开(Frank 2026-07-21):匹配不再限额 → 底部「升级看全量」升级卡退役;
            升级动力改由表内 Pro 数据列(vs中位/工资中位)打码承担 */}
      </div>
      {/* footer:全站共享 Footer(2026-07-16 用户拍板统一 header/footer) */}
      <Footer t={t} maxWidth={1320} />

      {popup && <AdvisorModal group={popup.group} field={popup.srcField} job={popup.job} title={popup.title} lang={lang} plan={plan} pnpOcc={dims.pnpOccupations} pnpDraws={dims.pnpDraws} news={dims.news} eeOcc={dims.eeCategories} desigEmp={dims.designatedEmployers} nocDesc={dims.nocDescriptions} fieldSources={dims.fieldSources} onClose={() => setPopup(null)} onOpenJob={(x) => setActModal({ kind: 'desc', job: x })} />}
      {actModal && <ActModal job={actModal.job} lang={lang} plan={plan} nocDesc={dims.nocDescriptions} onClose={() => setActModal(null)} />}
      {wizard && <OnboardingWizard t={t} initial={plan.profile} onClose={closeWizard} />}
      {/* 三问弹框已删(2026-07-31 统一答题):答题只在 /plan/*,这页只读答案做回显与筛选 */}
      {upsell && (plan.loggedIn
        ? <UpgradeModal t={t} reason={upsell === 'ss' ? t('ss.pro') : upsell === 'match' ? (matchTotals && matchTotals.high > plan.freeMatchCap ? t('up.matchN', { h: matchTotals.high, n: plan.freeMatchCap }) : t('up.match', { n: plan.freeMatchCap })) : undefined} onClose={() => setUpsell(false)} />
        : <AuthModal t={t} mode={upsell === 'login' ? 'login' : 'register'} onClose={() => setUpsell(false)}
            /* E9-04b:'login' 目前只有「我的匹配」入口在用——登录成功直接落匹配视图(邮箱路径 onDone,
               Google 路径 returnTo),不再回列表让用户再点一次(Frank「点我的匹配也一样」) */
            onDone={async () => {
              // 注册成功就把本地答案落成档案(不让用户填两遍);答案来自统一存储,不再靠弹框回传
              const a0 = readQuiz()
              if (a0?.nocs?.length) { await quizToProfile({ status: a0.status, nocs: a0.nocs, provs: a0.provs }) }
              if (upsell === 'login') window.location.href = '/?view=match'
              else window.location.reload()
            }}
            returnTo={upsell === 'login' ? '/?view=match' : undefined} />)}
    </div>
  )
}

// ── 省提名清单区(点 PNP 字段时显示)────────────────────────────
// 清单是权威「事实」,来自 DB 维度表(pnp-occupations,经 props 传入),绝不让 LLM 编。
// 判定只用本岗既有字段(province/noc/teer)+ 清单比对,不在前端重算资格逻辑。
// 联动下拉:上级选了,下级选项随之收窄;当前值不在选项里也保留显示
// 宽度贴当前选中值(2026-07-17 用户拍板「不要有空白」;沿革:07-07 曾统一封顶 150 治「按最长选项撑宽」,
// 但短值如「全部省」仍剩大段空白):镜像文本按选中值占位、select 叠满其上——选短值不留空白,
// 选长值自动变宽仍封顶 150(下拉展开始终显示全文);代价=切换选中值时同行控件轻微挪位(拍板已认)
function Sel({ value, onChange, opts, all, labelOf }: { value: string; onChange: (v: string) => void; opts: string[]; all: string; labelOf?: (v: string) => string }) {
  const list = value && !opts.includes(value) ? [value, ...opts] : opts
  const shown = value ? (labelOf ? labelOf(value) : value) : all
  // select 的内在宽度=最长选项,放流内怎么都会撑满上限 → 镜像文本在流内定宽,select 绝对铺满不参与布局
  return (
    <span className="jtSel">
      {/* 2026-08-16 Frank「最后一个字都被挡住了一半」:28px 不够 —— 原生 select 左 padding 10 +
          自绘箭头区 ~20,镜像只留 28 差 2-6px,末字被箭头压半个;38 = 10+20+8 余量 */}
      <span aria-hidden className="field" style={{ display: 'block', visibility: 'hidden', paddingRight: 38, whiteSpace: 'nowrap', overflow: 'hidden', border: '1px solid transparent' }}>{shown}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="field" style={{ position: 'absolute', inset: 0, width: '100%' }}>
        <option value="">{all}</option>
        {list.map((o) => <option key={o} value={o}>{labelOf ? labelOf(o) : o}</option>)}
      </select>
    </span>
  )
}
