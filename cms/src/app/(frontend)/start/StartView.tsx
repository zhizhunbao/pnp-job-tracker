'use client'
// E13-03 把脉首页视图(/start)——「开始规划 + 榜单 + 地区统计」三合一。
// 规格 = docs/implementation/E13-把脉首页/00_总设计与口径.md §4 的 S1-S7,一区一事、全宽色带交替:
//   S1 判决区(动态冷脸标题 + 三脉象卡)/ S2 劝退榜 / S3 真香榜 / S4 省份照妖镜 /
//   S5 抽选尺子(抽选表 + 冷解读 + 政策动态)/ S6 职位板入口 / S7 订阅与分享。
// 信条:**「难听,但没骗你」——调性激进,数据保守,每个数字可溯源**。
// 三条硬红线,改这文件前先读:
//   ① 判决语一律「模板 + 库内数字填槽」(三语进 jobs/i18n),LLM 不参与下结论;
//   ② E13-02 的派生列(mom14d/avgDaysOpen/pulseScore)**可能还没落库** —— 值为 null 时
//      该卡/该行/该榜**整块不渲染**,绝不显示 0 或 NaN,页面退化成「现有数据撑得住的版本」;
//      变化量口径按契约 v3 一律用**近 14 天新发环比 mom14d**:30 天窗卡在抓取爬坡期(假涨)、
//      下架/净流失卡在排水期(虚高),两者的数字与措辞都不上前端(同入 E13-04);
//   ③ 每行可溯源:职业名点开落到按该 NOC 筛过的职位板(/?q=<noc>),省卡下钻落 /stats/[prov]。
// SSR 瘦身手法守住:职业大表(occ ~3400 行)不进 HTML,挂载后拉 /api/market-stats(与旧版同一端点)。
import { useEffect, useMemo, useState } from 'react'

import { eeKeyDisplay, makeT, drawStreamNote, streamDisplay, type TFn } from '../jobs/i18n'
import { useLang } from '../LangProvider'
import { SiteHeader } from '../SiteHeader'
import { SiteFooter } from '../SiteFooter'
import { MarketChart, useMarketStats } from '../stats/charts'
import { PROVS, PROV_NAME, type OccRow, type ProvExtra, type StatRow } from '../stats/shared'
import { shortOcc } from '../quiz/EntryQuiz'
import { JobCard } from '../ui/JobCard'
import { DataTable, DTPager, type DTCol } from '../ui/DataTable'
import { BANNER_IMGS, Chip, PageBanner, PageShell, Tag, UI } from '../ui/primitives'
import { track } from '@/lib/track'

// 抽选行 + 冷解读三标量(近 12 期同通道的期数/最低/最高,服务端算好,见 start/page.tsx)
export type PulseDraw = {
  date: string; province: string; stream: string; label: string
  score: number | null; invitations: number | null
  histN: number | null; histMin: number | null; histMax: number | null
}

export type HomeStats = {
  total: number | null; named: number | null      // S1 命中率证据(与职位板 proof 同源)
  draws: PulseDraw[]
  news: { date: string; region: string; title: string; titleZh?: string; slug: string }[]
  provExtra: Record<string, ProvExtra>            // S4 省卡:IRCC 体量 + 难度档
  provPreset: string                              // S4 预选省(档案省;匿名为空 → 默认 ON。禁 IP 定位)
  checkedAt: string
}

const num = (n: number) => n.toLocaleString('en-CA')
// 环比(mom14d 是比值:近 14 天新发 ÷ 前 14 天新发 − 1)→ 百分数;不做四舍五入以外的加工
const pctSigned = (ratio: number) => `${ratio > 0 ? '+' : ratio < 0 ? '-' : ''}${Math.abs(Math.round(ratio * 100))}%`
const ymd = (iso: string) => (iso || '').slice(0, 10)
const isAllProv = (p: string) => (p || '').toLowerCase() === 'all'

// 职业名三态(人话名主文案 + 代码/译名灰注,站规):
//   列表主文案 = NOC 官方英文名(引用依据),灰注 = 界面语言译名;标题里则直接用界面语言的人话名。
const occMain = (o: OccRow) => o.titleEn || o.titleZh || o.noc
const occNote = (o: OccRow, lang: string) => {
  const s = lang === 'zh' ? (o.titleZhShort || o.titleZh) : lang === 'ko' ? o.titleKo : ''
  return s ? shortOcc(s) : ''
}
// 样本门槛(设计 §3):全国榜在架 ≥30,省级 ≥10 —— 不足不进榜,禁上榜噪音
const NAT_MIN_OPEN = 30   // 省级榜门槛(S4)沿用
// Frank 2026-08-06「谁会关心中小学教师助理」「主要打主流的、中介推的职业」:
// 头条与全国红绿榜一律只收大盘职业(在架 ≥100)——冷门岗数学上再差也进不了受众视野,不值得占版面
const MAIN_MIN_OPEN = 100
const PROV_MIN_OPEN = 10

// 难度档药丸配色(与 JobsTable DIFF_TAG / 原 /stats 索引页省卡同值)
const DIFF_COLORS: Record<string, { bg: string; fg: string; bd: string }> = {
  easy: { bg: '#dcfce7', fg: '#166534', bd: '#bbf7d0' },
  mid: { bg: '#fef9c3', fg: '#854d0e', bd: '#fde68a' },
  tight: { bg: '#fee2e2', fg: '#b91c1c', bd: '#fecaca' },
}
const SHORT_PROV: Record<string, string> = { NL: 'Newfoundland' }   // 卡上用通行短名,悬停仍显全名

// 全宽色带 + PageShell 内轨(全站统一 1320 正文轨)
function Band({ bg, children }: { bg?: string; children: React.ReactNode }) {
  return <div className="plBand" style={{ background: bg }}><PageShell pad="0 1.25rem">{children}</PageShell></div>
}

// 条数下拉:抽选表与政策动态共用一把(数据 SSR 已多取,前端只切片)
function TopN({ v, on, max }: { v: number; on: (n: number) => void; max: number }) {
  const opts = [10, 20, 50].filter((n, i) => i === 0 || n <= Math.max(max, 10))
  if (opts.length < 2) return null
  return (
    <select value={v} onChange={(e) => on(Number(e.target.value))}
      style={{ height: 30, border: `1px solid ${UI.border}`, borderRadius: 8, background: '#fff', fontSize: 12.5, color: '#374151', padding: '0 6px' }}>
      {opts.map((n) => <option key={n} value={n}>Top {n}</option>)}
    </select>
  )
}

// ── 职业榜(S2/S3/S4 共用一套形态)────────────────────────────────
// 桌面 DataTable(全站公共表件,百分比自适应不横滚)/ ≤900 JobCard 列表(全站唯一那张卡)。
// 变化量口径 = **近 14 天新发环比 mom14d**(契约 v3):下架信号与 30 天窗都不可靠 →
// 净流失类数字与措辞一律不上前端,判决语只说「14 天新发在萎缩/腰斩」这类拿新发数就能对账的话,
// 且文案里必须带窗口(不许只写「环比」让人当成月环比)。
// mom14d 缺列/全 null 时:环比列与判决列**整列不出**(降级成在架/命中率/薪资偏离能撑的版本),
// 绝不拿 0 顶包;单行缺值显「—」。
function OccBoard({ rows, t, lang, nocProvs, showProvs = true, pageSize = 10 }: { rows: OccRow[]; t: TFn; lang: string; nocProvs: Map<string, string[]>; showProvs?: boolean; pageSize?: number }) {
  const hasMom = rows.some((o) => o.mom14d != null)
  // E13-05:榜 A(showProvs=false)专用列——真口径可提名省份(pnp_provs,含排除式省/雇主担保类,
  // 与「紧缺清单省份」列语义不同、互斥出现)。列还没落库(全行 null/undefined)时整列不渲染。
  const hasPnpProvs = rows.some((o) => o.pnpProvs != null)
  const pnpProvsCell = (o: OccRow) => {
    const s = o.pnpProvs ?? ''
    if (!s) return <span style={{ color: UI.text3 }}>—</span>
    const arr = s.split('、')
    return arr.length <= 4
      ? <span style={{ color: '#b45309', fontWeight: 600 }}>{s}</span>
      : <span title={s} style={{ color: '#b45309', fontWeight: 600 }}>{t('pulse.provs.n', { n: arr.length })}</span>
  }
  // 手机卡片列表的页态(桌面表格的页态在 DataTable 里,俩视图同刻只显示一个,各翻各的)
  const [page, setPage] = useState(0)
  useEffect(() => { setPage(0) }, [rows])
  const maxPage = Math.max(1, Math.ceil(rows.length / pageSize))
  const p = Math.min(page, maxPage - 1)
  const totalNote = t('pulse.total', { n: rows.length })
  // Frank 08-06「在某些省份能不能提名,直接告诉用户,百分比谁能看懂」:占比列撤,
  // 换「可提名省份」直陈(来源=该职业各省清单命中的在架岗);空+TEER 4/5 = 原通道预警合并进本列
  const provsOf = (o: OccRow) => nocProvs.get(o.noc) ?? []
  const momColor = (v: number) => (v < 0 ? UI.danger : v > 0 ? UI.ok : UI.text2)
  // 判决列 08-06 深夜删(Frank:「环比百分比用户一看就明白,还用再说一遍萎缩?」)——判决只活在 S1 头条。
  // 「无」不再分红灰(Frank:「大部分人不可能卷 CRS 分也不可能再学法语」——无清单对受众=只剩不现实的路,
  //  这层含义由三榜分层本身表达,tooltip 说透即可)
  const provsCell = (o: OccRow) => {
    const ps = provsOf(o)
    if (ps.length) return <span style={{ color: '#b45309', fontWeight: 600 }}>{ps.join('、')}</span>
    return <span title={t('pulse.provs.none.tip')} style={{ color: UI.text3 }}>{t('pulse.provs.none')}</span>
  }
  const momCell = (o: OccRow) => (o.mom14d == null ? null
    : <span style={{ color: momColor(o.mom14d), fontWeight: 700, whiteSpace: 'nowrap' }}>{pctSigned(o.mom14d)}</span>)

  const cols: DTCol<OccRow>[] = [
    {
      key: 'occ', label: t('pulse.col.occ'), sort: (o) => occMain(o),
      // Frank 08-06「职业名字要显示完整,右面有很多空间」:不截断不省略,长名自然折行
      // (数字列全 nowrap,表格仍不会横滚;折行只发生在主列自己的宽度里)
      // 灰注行 = 界面语言译名 + NOC 代码(Frank 08-06「NOC 代码也要显示」;间距分隔,禁「·」杂糅)
      render: (o) => (
        <div>
          <a href={`/?q=${o.noc}`} onClick={() => track('pulse_occ_click')}
            style={{ color: UI.primary, textDecoration: 'none', display: 'block' }}>{occMain(o)}</a>
          <span style={{ display: 'flex', gap: 10, fontSize: 11.5, color: UI.text3 }}>
            {occNote(o, lang) ? <span>{occNote(o, lang)}</span> : null}
            <span style={{ whiteSpace: 'nowrap' }}>NOC {o.noc}</span>
          </span>
        </div>
      ),
    },
    // TEER 列(Frank 08-06 拍板加):无清单职业还剩什么路,先看 TEER——0-3 有联邦 EE,4-5 没有
    // 单元格直接写「TEER 2」(Frank 08-06:裸数字像个数据值,带前缀自明)
    { key: 'teer', label: t('pulse.col.teer'), nowrap: true, thTip: t('pulse.col.teer.tip'),
      sort: (o) => o.teer, render: (o) => <>{o.teer != null ? `TEER ${o.teer}` : '—'}</> },
    { key: 'open', label: t('pulse.col.open'), nowrap: true, sort: (o) => o.openJobs, render: (o) => <>{o.openJobs != null ? num(o.openJobs) : '—'}</> },
    ...(hasMom ? [{
      key: 'mom', label: t('pulse.col.mom'), nowrap: true, thTip: t('pulse.col.mom.tip'),
      sort: (o: OccRow) => o.mom14d, render: (o: OccRow) => <>{momCell(o) ?? '—'}</>,
    }] : []),
    ...(showProvs ? [{
      key: 'provs', label: t('pulse.col.provs'), nowrap: true, thTip: t('pulse.col.provs.tip'),
      sort: (o: OccRow) => provsOf(o).length,
      render: (o: OccRow) => provsCell(o),
    }] : hasPnpProvs ? [{
      key: 'pnpProvs', label: t('pulse.col.pnpProvs'), nowrap: true, thTip: t('pulse.col.pnpProvs.tip'),
      sort: (o: OccRow) => (o.pnpProvs ? o.pnpProvs.split('、').length : 0),
      render: (o: OccRow) => pnpProvsCell(o),
    }] : []),
    // 薪资列(Frank 08-06 二改「不如换成薪资区间」):ESDC 官方薪资区间年化(低-高)主显,
    // 帖面中位年薪降级进单元格 title(小样本护栏沿用:salaryN<5 不带中位)
    { key: 'sal', label: t('pulse.col.range'), nowrap: true, thTip: t('pulse.col.range.tip'),
      sort: (o) => o.wageHighAnnual,
      render: (o) => {
        const med = o.medianSalaryAnnual != null && (o.salaryN ?? 0) >= 5
          ? `${t('pulse.col.sal')} $${Math.round(o.medianSalaryAnnual / 1000)}K` : undefined
        return o.wageLowAnnual != null && o.wageHighAnnual != null
          ? <span title={med}>{`$${Math.round(o.wageLowAnnual / 1000)}K–$${Math.round(o.wageHighAnnual / 1000)}K`}</span>
          : <>—</>
      } },
  ]

  return (
    <>
      <div className="plTable"><DataTable<OccRow> rows={rows} cols={cols} rowKey={(o) => o.noc} pageSize={pageSize} footerNote={totalNote} /></div>
      {/* ≤900 卡片:左列身份(职业名/可提名省份)、右列数字(新发环比)——与职位板同一张 JobCard。
          薪资偏离只留桌面表:375 上两个百分数并排谁是谁得猜 —— 宁可少一个数,不给会读错的数 */}
      <div className="plCards">
        {rows.slice(p * pageSize, (p + 1) * pageSize).map((o) => {
          const ps = provsOf(o)
          return (
            <JobCard key={o.noc} href={`/?q=${o.noc}`}
              title={{ text: occMain(o), href: `/?q=${o.noc}` }}
              note={[occNote(o, lang), `NOC ${o.noc}`].filter(Boolean).join('  ') || undefined}
              company={o.openJobs != null ? { text: `${t('pulse.col.open')} ${num(o.openJobs)}` } : undefined}
              salary={momCell(o) ?? undefined}
              location={showProvs ? `${t('pulse.col.provs')} ${ps.length ? ps.join('、') : t('pulse.provs.none')}` : undefined} />
          )
        })}
        <div style={{ padding: '2px 2px 0' }}>
          <DTPager page={p} max={maxPage} note={totalNote} onPage={setPage} />
        </div>
      </div>
    </>
  )
}

export function StartView({ stats }: { stats: HomeStats }) {
  const [lang, setLangSaved, t] = useLang()
  // 主图四份数据(occ 含 E13-03 派生列)挂载后拉;null=加载中 → 依赖它的区渲占位高度,不出空壳
  const market = useMarketStats()
  const [drawsN, setDrawsN] = useState(10)
  const [newsN, setNewsN] = useState(10)
  const [prov, setProv] = useState(stats.provPreset || 'ON')

  // ── 全国行(province='all';E13-02 若改出 'ALL' 大写也吃得下,不因大小写掉数据)──
  const natOcc = useMemo(() => (market === null ? null : market.occ.filter((o) => isAllProv(o.province))), [market])
  // NOC → 可提名省份清单(该职业哪些省的清单命中在架岗;省行 namedJobs>0 即算)——
  // Frank 08-06「直接告诉用户哪些省能提名,百分比谁能看懂」,S2/S3/S4 榜共用
  const nocProvs = useMemo(() => {
    const m = new Map<string, string[]>()
    if (market) for (const o of market.occ) {
      if (isAllProv(o.province) || !(o.namedJobs && o.namedJobs > 0)) continue
      const arr = m.get(o.noc) ?? []
      arr.push(o.province); m.set(o.noc, arr)
    }
    return m
  }, [market])

  // 三榜分层(Frank 08-06 深夜拍板,口径 08-06 二改):判据 = **省具名紧缺清单命中**(namedJobs),
  // ≠「有无 PNP 通道」——排除式省(AB;ON 改制后全职业可)和雇主担保类通用通道不进 namedJobs
  // (Chefs 教训:榜A原名「无省提名通道」=撒谎),榜题/tooltip 一律说「紧缺清单」:
  //   A 不在任何省紧缺清单,按在架量排(中介推得最凶的先看到)
  //   B 清单在列 && 环比 < -5%,跌得狠的在前
  //   C 清单在列 && 环比 > +5%,涨得猛的在前
  // AIP 维度职业级现库没有(occ 表无 aip 计数)→ Board A 暂按 PNP 清单口径,ETL 加列后升级「PNP+AIP 双无」
  const boards = useMemo(() => {
    if (!natOcc) return null
    const pool = natOcc.filter((o) => (o.openJobs ?? 0) >= MAIN_MIN_OPEN)
    const hasPath = (o: OccRow) => (nocProvs.get(o.noc)?.length ?? 0) > 0
    // top-10 截断撤(Frank 08-06「应该有分页,有总数」)——全量给 OccBoard,分页在表内
    const noPath = pool.filter((o) => !hasPath(o)).sort((a, b) => (b.openJobs ?? 0) - (a.openJobs ?? 0))
    const withPath = pool.filter((o) => hasPath(o) && o.mom14d != null)
    const cooling = withPath.filter((o) => (o.mom14d as number) < -0.05).sort((a, b) => (a.mom14d as number) - (b.mom14d as number))
    const heating = withPath.filter((o) => (o.mom14d as number) > 0.05).sort((a, b) => (b.mom14d as number) - (a.mom14d as number))
    return { noPath, cooling, heating }
  }, [natOcc, nocProvs])

  // S1 三脉象卡(契约 v3):近 14 天新发(主数字 + 环比副行)/ 平均在架天数 / PNP 命中率。
  // 逐卡 null 守卫 —— 缺数的卡整张不出。净值卡(在架存量差)本批**不做**:
  // 7-25 起验尸排水清了 2.7 万死帖,存量下跌是数据清洗不是市场收缩,上线=撒谎(后置 E13-04)。
  const pulseCards = useMemo(() => {
    const out: { label: string; v: string; sub?: string; subUp?: boolean; subDown?: boolean; tip: string; href: string; ph?: boolean }[] = []
    // Frank 2026-08-06「还有就是整个加拿大的就业体量」:体量卡打头(与职位板 proof 同源同口径)
    if (stats.total) {
      out.push({ label: t('pulse.card.total'), v: num(stats.total), tip: t('pulse.card.total.tip'), href: '/' })
    }
    // 市场数据还在拉(挂载后才到)→ 两张骨架占位卡压住格子,避免 2→4 张的水合跳变
    // (Frank 08-06「刷新时卡片闪烁」);拉完确实缺数的卡仍整张不出(契约 v3),那是稳态不是闪烁
    if (natOcc === null) {
      out.push({ label: 'new14', v: '', tip: '', href: '', ph: true }, { label: 'days', v: '', tip: '', href: '', ph: true })
    }
    if (natOcc) {
      const news = natOcc.map((o) => o.new14d).filter((v): v is number => v != null)
      if (news.length) {
        const total = news.reduce((a, b) => a + b, 0)
        // 全国环比 = 两个窗各自求和后相除(不是逐职业环比再平均——小职业会把均值带跑);
        // 分母列缺/为 0 就只出主数字,不出副行
        const prevRows = natOcc.filter((o) => o.new14d != null && o.new14dPrev != null)
        const prev = prevRows.reduce((a, o) => a + (o.new14dPrev as number), 0)
        const cur = prevRows.reduce((a, o) => a + (o.new14d as number), 0)
        const mom = prev > 0 ? cur / prev - 1 : null
        out.push({
          label: t('pulse.card.new14'), v: num(total),
          sub: mom == null ? undefined : t('pulse.card.mom14', { n: pctSigned(mom) }),
          subUp: mom != null && mom > 0, subDown: mom != null && mom < 0,
          tip: t('pulse.card.new14.tip'), href: '/',
        })
      }
      // 在架天数按在架量加权(职业间直接平均会让 3 个岗的小职业和 3000 个岗的大职业等权)
      const w = natOcc.filter((o) => o.avgDaysOpen != null && (o.openJobs ?? 0) > 0)
      if (w.length) {
        const days = w.reduce((a, o) => a + (o.avgDaysOpen as number) * (o.openJobs as number), 0) / w.reduce((a, o) => a + (o.openJobs as number), 0)
        out.push({ label: t('pulse.card.days'), v: t('pulse.unit.days', { n: Math.round(days) }), tip: t('pulse.card.days.tip'), href: '/' })
      }
    }
    if (stats.total && stats.named != null) {
      out.push({ label: t('pulse.card.pnp'), v: num(stats.named), tip: t('pulse.card.pnp.tip'), href: '/?pnp=yes' })
    }
    return out
  }, [natOcc, stats.total, stats.named, t])

  // ── S4 省份照妖镜 ──
  const provRows = useMemo(() => (market?.rows ?? []).filter((r) => r.broad === 'all' && (r.mid === 'all' || !r.mid)), [market])
  const provStat: StatRow | undefined = useMemo(() => provRows.find((r) => r.province === prov), [provRows, prov])
  const provOcc = useMemo(() => {
    if (!market) return null
    const rows = prov === 'ALL'
      ? market.occ.filter((o) => isAllProv(o.province) && (o.openJobs ?? 0) >= NAT_MIN_OPEN)
      : market.occ.filter((o) => o.province === prov && (o.openJobs ?? 0) >= PROV_MIN_OPEN)
    // Frank 08-06「命中率 0 还排第一?」:省级小样本里 pulse 的动量分被小基数环比打爆
    // (SK 收银员 7→19 = +171% 骑上榜首)——省榜回归**体量榜**(按在架量,「该省职业真榜」本义),
    // 环比/占比/判决当信息列;pulse 排序只留全国降温/升温榜(有 ≥100 门槛守着)
    return [...rows].sort((a, b) => (b.openJobs ?? 0) - (a.openJobs ?? 0))
  }, [market, prov])

  // ── S5 抽选行显示(与旧版同口径):官方英文名主文案 + 界面语言译名灰注 ──
  const tEn = useMemo(() => makeT('en'), [])
  const drawMain = (r: PulseDraw) => (r.province === 'FED' ? eeKeyDisplay(tEn, r.label) : (r.stream || r.label))
  const drawNote = (r: PulseDraw) => {
    if (lang === 'en') return ''
    if (r.province !== 'FED') return drawStreamNote(r.stream || '', lang)
    const zh = eeKeyDisplay(t, r.label)
    return zh === drawMain(r) ? '' : zh
  }
  // 冷解读:当期分数线 vs 近 12 期同通道区间(服务端算好的三标量填槽)。样本不足 → 不出这句
  const drawVerdict = (r: PulseDraw) =>
    (r.histN != null && r.histMin != null && r.histMax != null
      ? t('pulse.dr.note', { n: r.histN, min: num(r.histMin), max: num(r.histMax) }) : '')

  const secH: React.CSSProperties = { margin: '0 0 6px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10, rowGap: 8, flexWrap: 'wrap', color: UI.text }
  // 节标题挂口径 tooltip(说明句不上台面,悬停看;Frank 08-06 不要下划线记号,只留 title)
  const tipHead: React.CSSProperties = { cursor: 'help' }
  const moreA: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: UI.primary, textDecoration: 'none', whiteSpace: 'nowrap' }
  const hmRight: React.CSSProperties = { marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }
  const th: React.CSSProperties = { fontSize: 11.5, color: UI.text3, fontWeight: 600, textAlign: 'left', padding: '9px 12px', borderBottom: `1px solid ${UI.hairline}`, background: '#fafafa' }
  const td: React.CSSProperties = { padding: '9px 12px', borderBottom: `1px solid ${UI.hairline}`, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
  const kv = (label: React.ReactNode, val: React.ReactNode) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{label}</span>
      <span style={{ color: '#111827', whiteSpace: 'nowrap', flexShrink: 0 }}>{val}</span>
    </div>
  )

  return (
    <div style={{ background: UI.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif', color: '#1f2937' }}>
      <style>{`
        .plBand{padding:36px 0}
        .plBand h2{font-size:20px}
        .plHero.plBand{padding:16px 0 26px}
        .plBtn{display:block;border-radius:8px;padding:12px 20px;font-size:14px;font-weight:600;text-align:center;cursor:pointer;text-decoration:none;border:none;font-family:inherit}
        /* S1 四脉象卡:banner 下方白卡(毛玻璃合并版 Frank 打回「放下来」),手机 2×2、桌面一行四等分 */
        /* 卡内容居中(Frank 08-06「都缩在左上角」),数字主、标签副;标签虚线=有悬停口径 */
        .plNums{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:16px}
        .plNums a{min-width:0;overflow:hidden;background:${UI.card};border:1px solid ${UI.border};border-radius:12px;padding:16px 12px;text-decoration:none;color:inherit;display:flex;flex-direction:column;align-items:center;gap:4px;text-align:center;justify-content:center}
        .plNums b{font-size:24px;line-height:1.15;font-weight:800;font-variant-numeric:tabular-nums;color:${UI.text}}
        .plNums span{max-width:100%;font-size:12px;color:${UI.text2};white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .plNums i{max-width:100%;font-size:12px;font-style:normal;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        /* 榜单:桌面表格 / 手机卡片,两套 DOM 各渲各的(站规「电脑用表格 手机用卡片」) */
        .plTable{display:none}
        .plCards{display:flex;flex-direction:column;gap:8px}
        .plDrawTable{display:none}
        .plDrawCards{display:flex;flex-direction:column}
        .plProvCards{display:grid;grid-template-columns:repeat(auto-fill, minmax(min(100%, 250px), 1fr));gap:10px;margin:12px 0 0}
        .plProvCards button{text-align:left;font-family:inherit;cursor:pointer}
        .plCta{display:flex;flex-direction:column;gap:12px}
        @media (min-width:900px){
          .plBand{padding:56px 0}
          .plBand h2{font-size:24px}
          .plHero.plBand{padding:16px 0 26px}
          .plNums{grid-template-columns:repeat(4,1fr);gap:10px}
          .plNums a{padding:22px 14px}
          .plNums b{font-size:32px}
          .plNums span,.plNums i{font-size:12.5px}
          .plTable{display:block}.plCards{display:none}
          .plDrawTable{display:table}.plDrawCards{display:none}
          .plBtn{padding:13px 28px;font-size:15px}
          .plCta{flex-direction:row;align-items:center}
          .plCta .plBtn{flex:0 0 auto;padding:12px 28px}
        }`}</style>
      <SiteHeader lang={lang} setLang={setLangSaved} t={t} active="start" />
      <main style={{ flex: '1 0 auto' }}>

        {/* ── S1 判决区:动态冷脸标题 + 四脉象卡(banner 下方——毛玻璃合并版试过一轮,
            Frank 08-06「还是放下来吧」;副题口号已删,调性靠数字自己立) ── */}
        <div className="plBand plHero">
          <PageShell pad="0 1.25rem">
            <PageBanner module="home" tall title={t('home.title')} images={BANNER_IMGS.home} />
            {pulseCards.length > 0 && (
              <div className="plNums">
                {pulseCards.map((c) => (c.ph
                  ? <div key={c.label} style={{ background: UI.card, border: `1px solid ${UI.border}`, borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '16px 12px' }}>
                    <span style={{ width: 72, height: 20, borderRadius: 6, background: '#f1f3f5' }} />
                    <span style={{ width: 96, height: 12, borderRadius: 6, background: '#f1f3f5' }} />
                  </div>
                  : <a key={c.label} href={c.href} title={c.tip} className="cardHover" onClick={() => track('pulse_card_click')}>
                    <b>{c.v}</b>
                    <span>{c.label}</span>
                    {c.sub ? <i style={{ color: c.subUp ? UI.ok : c.subDown ? UI.danger : UI.text2 }}>{c.sub}</i> : null}
                  </a>
                ))}
              </div>
            )}
          </PageShell>
        </div>

        {/* ── S2 三榜分层(按用户决策顺序):先排除(无通道)→ 有通道但在降温 → 有通道且在升温。
            数据没就绪 → 整块不渲染(绝不拿存量榜顶包);无大竖线、标题深色(08-06 版式拍板) */}
        {boards && (boards.noPath.length > 0 || boards.cooling.length > 0 || boards.heating.length > 0) && (
          <Band bg="#fff">
            {/* 口径说明降级进标题 tooltip(Frank 08-06「应该是 tooltips 不要直接显示出来」),
                虚线下划线=可悬停记号,与表头 thTip 同形态 */}
            {boards.noPath.length > 0 && (
              <div>
                <h2 style={{ ...secH, margin: '0 0 10px' }}><span title={t('pulse.b1.note')} style={tipHead}>{t('pulse.b1')}</span></h2>
                <OccBoard rows={boards.noPath} t={t} lang={lang} nocProvs={nocProvs} showProvs={false} />
              </div>
            )}
            {boards.cooling.length > 0 && (
              <div style={{ marginTop: 28 }}>
                <h2 style={{ ...secH, margin: '0 0 10px' }}><span title={t('pulse.b2.note')} style={tipHead}>{t('pulse.b2')}</span></h2>
                <OccBoard rows={boards.cooling} t={t} lang={lang} nocProvs={nocProvs} />
              </div>
            )}
            {boards.heating.length > 0 && (
              <div style={{ marginTop: 28 }}>
                <h2 style={{ ...secH, margin: '0 0 10px' }}><span title={t('pulse.b3.note')} style={tipHead}>{t('pulse.b3')}</span></h2>
                <OccBoard rows={boards.heating} t={t} lang={lang} nocProvs={nocProvs} />
              </div>
            )}
          </Band>
        )}

        {/* ── S4 省份照妖镜:省标签切换(档案省预选/匿名默认 ON,禁 IP 定位)+ 该省职业榜 +
            省提名通道标签 + 省卡(难度档 + IRCC 体量)作切换入口 + 折叠的分布主图 ────────── */}
        <Band>
          {/* 「看完整统计」下钻链接删(Frank 08-06:省页与首页重复,/stats/[prov] 同批退役) */}
          <h2 style={secH}>{t('pulse.s4')}</h2>
          {/* 全国档打头(Frank 08-06「全国 省份 城市 都需要」;职业×城市粒度现库没有,ETL 侧排下一批,不瞎猜) */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '4px 0 8px' }}>
            <Chip active={prov === 'ALL'} onClick={() => setProv('ALL')}>{t('pulse.s4.all')}</Chip>
            {/* 省 chips 用全名(Frank 08-06;#146 站规:英文在前,中韩括注译名;NL 用通行短名) */}
            {PROVS.map((p) => {
              const en = SHORT_PROV[p] || PROV_NAME[p] || p
              const loc = lang === 'en' ? '' : t('pr.' + p)
              return <Chip key={p} active={p === prov} onClick={() => setProv(p)} title={PROV_NAME[p]}>{loc ? `${en}(${loc})` : en}</Chip>
            })}
          </div>
          {/* 该省提名通道(与 /stats 省页同源 stream_labels);无清单的省整行不出,不写「暂无」 */}
          {provStat?.streamLabels ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, margin: '0 0 10px', fontSize: 12.5, color: UI.text2 }}>
              <span style={{ whiteSpace: 'nowrap' }}>{t('pulse.s4.streams')}</span>
              {provStat.streamLabels.split('、').map((s) => <Tag key={s} variant="warn">{streamDisplay(t, s)}</Tag>)}
            </div>
          ) : null}
          {provOcc === null
            ? <div style={{ background: UI.card, border: `1px solid ${UI.border}`, borderRadius: 12, height: 320 }} />
            : provOcc.length > 0
              ? <OccBoard rows={provOcc} t={t} lang={lang} nocProvs={nocProvs} />
              : null}
          {/* 省卡=切换入口(点卡换省,不跳页;下钻链接在节头)。缺 IRCC 数的格显「—」而非 0 */}
          {provRows.length > 0 && (
            <div className="plProvCards">
              {provRows.map((r) => {
                const ex = stats.provExtra[r.province]
                const work = (ex?.info?.tfwp?.n ?? 0) + (ex?.info?.imp?.n ?? 0)
                const tier = ex?.tier && DIFF_COLORS[ex.tier] ? ex.tier : null
                const on = r.province === prov
                return (
                  <button key={r.province} onClick={() => setProv(r.province)} className="cardHover"
                    style={{ background: on ? '#eff6ff' : '#fff', border: `1px solid ${on ? '#bfdbfe' : UI.border}`, borderRadius: 12, padding: '12px 14px', color: '#1f2937' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                      <span title={PROV_NAME[r.province] || r.province} style={{ fontWeight: 700, fontSize: 14.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{SHORT_PROV[r.province] || PROV_NAME[r.province] || r.province}</span>
                      <span style={{ color: UI.text3, fontWeight: 400, fontSize: 12.5, flexShrink: 0 }}>{r.province}</span>
                      {tier ? <span style={{ marginLeft: 'auto', flexShrink: 0, whiteSpace: 'nowrap', fontSize: 11, fontWeight: 600, padding: '1px 8px', borderRadius: 999, background: DIFF_COLORS[tier].bg, color: DIFF_COLORS[tier].fg, border: `1px solid ${DIFF_COLORS[tier].bd}` }}>{t('diff.' + tier)}</span> : null}
                    </div>
                    <div style={{ fontSize: 12.5, color: UI.text2, marginTop: 6, lineHeight: 1.9 }}>
                      {kv(t('stats.openJobs'), <strong>{r.openJobs != null ? num(r.openJobs) : '—'}</strong>)}
                      {kv(t('stats.named'), r.namedJobs
                        ? <span style={{ color: UI.warn, fontWeight: 600 }}>{num(r.namedJobs)}</span>
                        : <span title={t('stats.noList.tip')} style={{ color: UI.text3 }}>{t('stats.noList')}</span>)}
                      {kv(t('stats.cardWork'), work ? num(work) : '—')}
                      {kv(t('stats.cardStudy'), ex?.info?.study?.n ? num(ex.info.study.n) : '—')}
                      {kv(t('stats.cardPr'), ex?.info?.pnpPr?.n ? num(ex.info.pnpPr.n)
                        : r.province === 'QC' ? <span title={t('stats.naQc.tip')} style={{ color: UI.text3 }}>{t('stats.naQc')}</span> : '—')}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
          {/* 分布主图常驻(Frank 08-06「柱状图带拖动的找回来/最重要的」;7-28 也骂过图被藏——不再折叠) */}
          {market !== null && market.occ.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <MarketChart occ={market.occ} city={market.city} rows={market.rows} t={t} lang={lang} channels={market.channels} />
            </div>
          )}
        </Band>

        {/* ── S5 抽选尺子:抽选表(每期配冷解读)+ 政策动态合并一区 ────────────────── */}
        {(stats.draws.length > 0 || stats.news.length > 0) && (
          <Band bg="#fff">
            {stats.draws.length > 0 && (
              <>
                <h2 style={secH}>{t('pulse.s5')}
                  <span style={hmRight}>
                    <TopN v={drawsN} on={setDrawsN} max={stats.draws.length} />
                    <a href="/pathways" style={moreA}>{t('pw.entry')}</a>
                  </span></h2>
                <div style={{ background: UI.card, border: `1px solid ${UI.border}`, borderRadius: 12, overflow: 'hidden' }}>
                  <table className="plDrawTable" style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: 13 }}>
                    {/* 百分比固定布局永不横滚;冷解读吃最宽一列(它是这张表的结论) */}
                    <colgroup><col style={{ width: '12%' }} /><col style={{ width: '8%' }} /><col style={{ width: '22%' }} /><col style={{ width: '10%' }} /><col style={{ width: '10%' }} /><col style={{ width: '38%' }} /></colgroup>
                    <thead><tr>
                      <th style={th}>{t('home.dr.date')}</th><th style={th}>{t('home.dr.prog')}</th><th style={th}>{t('home.dr.stream')}</th>
                      <th style={th}>{t('home.dr.score')}</th><th style={th}>{t('home.dr.inv')}</th><th style={th}>{t('pulse.dr.read')}</th>
                    </tr></thead>
                    <tbody>
                      {stats.draws.slice(0, drawsN).map((r, i) => {
                        const last = i === Math.min(drawsN, stats.draws.length) - 1
                        const base = { ...td, ...(last && { borderBottom: 'none' }) }
                        return (
                          <tr key={i}>
                            <td style={base}>{ymd(r.date)}</td>
                            <td style={base}><Tag>{r.province === 'FED' ? 'EE' : r.province}</Tag></td>
                            <td style={{ ...base, whiteSpace: 'normal' }} title={drawMain(r)}>
                              <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{drawMain(r)}</span>
                              {drawNote(r) ? <span style={{ display: 'block', fontSize: 11.5, color: UI.text3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{drawNote(r)}</span> : null}
                            </td>
                            <td style={base}>{r.score != null ? num(r.score) : '—'}</td>
                            <td style={base}>{r.invitations != null ? num(r.invitations) : '—'}</td>
                            {/* 冷解读:样本不足(同通道 <4 期有分)就整格留空,不编一句话 */}
                            <td style={{ ...base, color: UI.text2 }} title={drawVerdict(r)}>{drawVerdict(r)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  <div className="plDrawCards">
                    {stats.draws.slice(0, drawsN).map((r, i) => (
                      <div key={i} style={{ padding: '12px 14px', borderBottom: i === Math.min(drawsN, stats.draws.length) - 1 ? 'none' : `1px solid ${UI.hairline}` }}>
                        <div style={{ fontSize: 14.5, fontWeight: 600, lineHeight: 1.35 }}>{drawMain(r)}</div>
                        {drawNote(r) ? <div style={{ fontSize: 11.5, color: UI.text3, lineHeight: 1.4 }}>{drawNote(r)}</div> : null}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                          <Tag>{r.province === 'FED' ? 'EE' : r.province}</Tag>
                          <span style={{ fontSize: 12, color: UI.text3 }}>{ymd(r.date)}</span>
                          <span style={{ marginLeft: 'auto', fontSize: 12, color: UI.text2, whiteSpace: 'nowrap' }}>
                            {t('home.dr.score')}<span style={{ color: UI.text, fontSize: 13.5, marginLeft: 6 }}>{r.score != null ? num(r.score) : '—'}</span>
                          </span>
                          <span style={{ fontSize: 12, color: UI.text2, whiteSpace: 'nowrap' }}>
                            {t('home.dr.inv')}<span style={{ color: UI.text, fontSize: 13.5, marginLeft: 6 }}>{r.invitations != null ? num(r.invitations) : '—'}</span>
                          </span>
                        </div>
                        {drawVerdict(r) ? <div style={{ fontSize: 12, color: UI.text2, marginTop: 4 }}>{drawVerdict(r)}</div> : null}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
            {stats.news.length > 0 && (
              <div style={{ marginTop: 28 }}>
                <h3 style={{ fontSize: 15, margin: '0 0 8px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>{t('home.policy')}
                  <span style={hmRight}>
                    <TopN v={newsN} on={setNewsN} max={stats.news.length} />
                    <a href="/news" style={moreA}>{t('home.pulse.all')}</a>
                  </span></h3>
                <div style={{ background: UI.card, border: `1px solid ${UI.border}`, borderRadius: 12, overflow: 'hidden' }}>
                  {stats.news.slice(0, newsN).map((r, i) => (
                    <a key={r.slug || i} href={r.slug ? `/news/${r.slug}` : '/news'} className="rowHover"
                      style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '12px 14px', borderTop: i ? `1px solid ${UI.hairline}` : 'none', fontSize: 13, textDecoration: 'none', color: 'inherit' }}>
                      <span style={{ color: UI.text3, fontSize: 12, whiteSpace: 'nowrap' }}>{ymd(r.date)}</span>
                      <Tag>{r.region === 'federal' ? 'IRCC' : (r.region || '').toUpperCase()}</Tag>
                      {/* 中文界面下英文标题带中文灰注(E13-06,titleZh 由 ETL 本地翻译;没译文只出原题) */}
                      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                        <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</span>
                        {lang === 'zh' && r.titleZh
                          ? <span style={{ display: 'block', fontSize: 11.5, color: UI.text3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.titleZh}</span>
                          : null}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </Band>
        )}

        {/* ── S6 职位板入口(文案承接判决)────────────────────────────────────── */}
        <div className="plBand" style={{ background: 'linear-gradient(100deg,#eff6ff,#dbeafe)' }}>
          <PageShell pad="0 1.25rem">
            <div className="plCta">
              <span style={{ flex: 1 }}>
                <span style={{ fontSize: 17, fontWeight: 700, color: UI.primaryDeep, display: 'block', marginBottom: 4 }}>{t('pulse.s6.t')}</span>
                <span style={{ fontSize: 13, color: UI.text2 }}>{t('pulse.s6.s')}</span>
              </span>
              <a className="plBtn" style={{ background: UI.primary, color: '#fff' }} href="/" onClick={() => track('landing_cta_browse')}>{t('home.ctaBrowse')}</a>
            </div>
          </PageShell>
        </div>

        {/* S7 订阅/分享区与页尾口径说明 2026-08-06 Frank 拍板都删(半空色带只挂一个折叠钮=版面噪音) */}
      </main>
      <SiteFooter t={t} />
    </div>
  )
}
