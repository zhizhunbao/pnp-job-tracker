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
import { useMemo, useState } from 'react'

import { eeKeyDisplay, makeT, drawStreamNote, streamDisplay, type TFn } from '../jobs/i18n'
import { useLang } from '../LangProvider'
import { SiteHeader } from '../SiteHeader'
import { SiteFooter } from '../SiteFooter'
import { MarketChart, useMarketStats } from '../stats/charts'
import { CaliberLine } from '../stats/ui'
import { PROVS, PROV_NAME, type OccRow, type ProvExtra, type SrcRow, type StatRow } from '../stats/shared'
import { shortOcc } from '../quiz/EntryQuiz'
import { JobCard } from '../ui/JobCard'
import { DataTable, type DTCol } from '../ui/DataTable'
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
  news: { date: string; region: string; title: string; slug: string }[]
  provExtra: Record<string, ProvExtra>            // S4 省卡:IRCC 体量 + 难度档
  srcs: SrcRow[]                                  // 页尾口径行出处
  provPreset: string                              // S4 预选省(档案省;匿名为空 → 默认 ON。禁 IP 定位)
  checkedAt: string
}

const num = (n: number) => n.toLocaleString('en-CA')
const signed = (n: number) => (n > 0 ? '+' : n < 0 ? '-' : '') + num(Math.abs(n))
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
const occLocal = (o: OccRow, lang: string) => {
  const s = lang === 'zh' ? (o.titleZhShort || o.titleZh) : lang === 'ko' ? o.titleKo : ''
  return shortOcc(s || o.titleEn || o.noc)
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
function OccBoard({ rows, t, lang }: { rows: OccRow[]; t: TFn; lang: string }) {
  const hasMom = rows.some((o) => o.mom14d != null)
  // 无清单省(ON/QC/NB/NL)每行命中都是 0 —— 那是政策事实不是职业信号,整列不出(#203 同族:不留满屏误导性 0%)
  const hasHit = rows.some((o) => (o.namedJobs ?? 0) > 0)
  const hit = (o: OccRow) => (o.openJobs && o.namedJobs != null ? Math.round((o.namedJobs / o.openJobs) * 100) : null)
  const gap = (o: OccRow) => (o.medianWageAnnual && o.medianSalaryAnnual != null
    ? Math.round(((o.medianSalaryAnnual - o.medianWageAnnual) / o.medianWageAnnual) * 100) : null)
  const momColor = (v: number) => (v < 0 ? UI.danger : v > 0 ? UI.ok : UI.text2)
  // 判决语=模板填槽(i18n 三语),数字来自 mom14d;没有 mom14d 就没有判决,不编
  const verdict = (o: OccRow) => {
    const v = o.mom14d
    if (v == null) return null
    const key = v <= -0.5 ? 'pulse.v.dive' : v < -0.05 ? 'pulse.v.shrink' : v > 0.05 ? 'pulse.v.grow' : 'pulse.v.flat'
    // Frank 2026-08-06「劳工没有 PR 通道的,不要选这些职位」:TEER 4/5 且不在任何省清单 = 走提名基本无门,
    // 判决语点破(中介爱推的「好找工作」陷阱岗,涨的时候更要点)——纯事实陈述,不说死「无通道」(AIP/RNIP 等另论)
    const noPr = (o.teer ?? 0) >= 4 && !(o.namedJobs && o.namedJobs > 0)
    return { text: t(key, { n: pctSigned(v) }) + (noPr ? t('pulse.v.nopr') : ''), color: momColor(v) }
  }
  const momCell = (o: OccRow) => (o.mom14d == null ? null
    : <span style={{ color: momColor(o.mom14d), fontWeight: 700, whiteSpace: 'nowrap' }}>{pctSigned(o.mom14d)}</span>)

  const cols: DTCol<OccRow>[] = [
    {
      key: 'occ', label: t('pulse.col.occ'), sort: (o) => occMain(o),
      // maxWidth 罩一层:官方 NOC 名很长(「Financial auditors and accountants」),不封顶的话
      // nowrap 单元格会把整张表撑宽 → 容器横滚(站规:表格永不横滚)。封顶后超长名走省略号,全名挂 title
      render: (o) => (
        <div style={{ maxWidth: 280 }}>
          <a href={`/?q=${o.noc}`} onClick={() => track('pulse_occ_click')}
            style={{ color: UI.primary, textDecoration: 'none', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            title={occMain(o)}>{occMain(o)}</a>
          {occNote(o, lang)
            ? <span style={{ display: 'block', fontSize: 11.5, color: UI.text3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{occNote(o, lang)}</span>
            : null}
        </div>
      ),
    },
    { key: 'open', label: t('pulse.col.open'), nowrap: true, sort: (o) => o.openJobs, render: (o) => <>{o.openJobs != null ? num(o.openJobs) : '—'}</> },
    ...(hasMom ? [{
      key: 'mom', label: t('pulse.col.mom'), nowrap: true, thTip: t('pulse.col.mom.tip'),
      sort: (o: OccRow) => o.mom14d, render: (o: OccRow) => <>{momCell(o) ?? '—'}</>,
    }] : []),
    ...(hasHit ? [{
      key: 'hit', label: t('pulse.col.hit'), nowrap: true,
      sort: (o: OccRow) => hit(o), render: (o: OccRow) => <>{hit(o) != null ? `${hit(o)}%` : '—'}</>,
    }] : []),
    { key: 'gap', label: t('pulse.col.gap'), nowrap: true, sort: (o) => gap(o), render: (o) => <>{gap(o) != null ? `${signed(gap(o) as number)}%` : '—'}</> },
    // 判决列不加 nowrap:它是这行里最长的一段,窄桌面宁可让它折一行,也不让整张表横滚
    ...(hasMom ? [{
      key: 'verdict', label: t('pulse.col.verdict'),
      render: (o: OccRow) => { const v = verdict(o); return <span style={{ color: v?.color }}>{v?.text ?? '—'}</span> },
    }] : []),
  ]

  return (
    <>
      <div className="plTable"><DataTable<OccRow> rows={rows} cols={cols} rowKey={(o) => o.noc} /></div>
      {/* ≤900 卡片:左列身份(职业名/命中率)、右列数字(新发环比)——与职位板同一张 JobCard。
          薪资偏离只留桌面表:375 上两个百分数并排(环比 -42% / 偏离 -12%)谁是谁得猜,
          而卡片寸土寸金(JobCard 自带的规矩)—— 宁可少一个数,不给会读错的数 */}
      <div className="plCards">
        {rows.map((o) => {
          const v = verdict(o)
          const h = hit(o)
          return (
            <JobCard key={o.noc} href={`/?q=${o.noc}`}
              title={{ text: occMain(o), href: `/?q=${o.noc}` }}
              note={occNote(o, lang) || undefined}
              company={o.openJobs != null ? { text: `${t('pulse.col.open')} ${num(o.openJobs)}` } : undefined}
              salary={momCell(o) ?? undefined}
              location={hasHit && h != null ? `${t('pulse.col.hit')} ${h}%` : undefined}
              chips={v ? <span style={{ fontSize: 12, fontWeight: 600, color: v.color }}>{v.text}</span> : undefined} />
          )
        })}
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
  const [chartOpen, setChartOpen] = useState(false)     // S4 主图默认收起(它是补充证据,不是首屏主角)
  const [copied, setCopied] = useState(false)

  // ── 全国行(province='all';E13-02 若改出 'ALL' 大写也吃得下,不因大小写掉数据)──
  const natOcc = useMemo(() => (market === null ? null : market.occ.filter((o) => isAllProv(o.province))), [market])

  // S1 动态判决标题:全国榜里新发环比最难看的那个职业,模板填槽(不逐职业手写)。
  // 无 mom14d(列没落库)→ 回退静态标题,页面照常。
  const headline = useMemo(() => {
    if (!natOcc) return ''
    const cand = natOcc.filter((o) => (o.openJobs ?? 0) >= MAIN_MIN_OPEN && o.mom14d != null)
    if (!cand.length) return ''
    const worst = cand.reduce((a, b) => ((b.mom14d as number) < (a.mom14d as number) ? b : a))
    const v = worst.mom14d as number
    const occ = occLocal(worst, lang)
    return v < -0.005 ? t('pulse.h1.down', { occ, n: pctSigned(v) })
      : v > 0.005 ? t('pulse.h1.up', { occ, n: pctSigned(v) })
        : t('pulse.h1.flat', { occ })
  }, [natOcc, lang, t])

  // S1 三脉象卡(契约 v3):近 14 天新发(主数字 + 环比副行)/ 平均在架天数 / PNP 命中率。
  // 逐卡 null 守卫 —— 缺数的卡整张不出。净值卡(在架存量差)本批**不做**:
  // 7-25 起验尸排水清了 2.7 万死帖,存量下跌是数据清洗不是市场收缩,上线=撒谎(后置 E13-04)。
  const pulseCards = useMemo(() => {
    const out: { label: string; v: string; sub?: string; subColor?: string; tip: string; href: string; color: string }[] = []
    // Frank 2026-08-06「还有就是整个加拿大的就业体量」:体量卡打头(与职位板 proof 同源同口径)
    if (stats.total) {
      out.push({ label: t('pulse.card.total'), v: num(stats.total), tip: t('pulse.card.total.tip'), href: '/', color: UI.text })
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
          subColor: mom == null ? undefined : mom < 0 ? UI.danger : mom > 0 ? UI.ok : UI.text2,
          tip: t('pulse.card.new14.tip'), href: '/', color: UI.text,
        })
      }
      // 在架天数按在架量加权(职业间直接平均会让 3 个岗的小职业和 3000 个岗的大职业等权)
      const w = natOcc.filter((o) => o.avgDaysOpen != null && (o.openJobs ?? 0) > 0)
      if (w.length) {
        const days = w.reduce((a, o) => a + (o.avgDaysOpen as number) * (o.openJobs as number), 0) / w.reduce((a, o) => a + (o.openJobs as number), 0)
        out.push({ label: t('pulse.card.days'), v: t('pulse.unit.days', { n: Math.round(days) }), tip: t('pulse.card.days.tip'), href: '/', color: UI.text })
      }
    }
    if (stats.total && stats.named != null) {
      out.push({ label: t('pulse.card.pnp'), v: `${((stats.named / stats.total) * 100).toFixed(1)}%`, tip: t('pulse.card.pnp.tip'), href: '/?pnp=yes', color: UI.primaryDeep })
    }
    return out
  }, [natOcc, stats.total, stats.named, t])

  // S2/S3:pulse_score 排序的两头各 10 行。列没落库(pulseScore 全 null)→ 两榜整块不渲染。
  const boards = useMemo(() => {
    if (!natOcc) return null
    const pool = natOcc.filter((o) => (o.openJobs ?? 0) >= MAIN_MIN_OPEN && o.pulseScore != null && o.mom14d != null)
    if (!pool.length) return { down: [], up: [] }
    const byPulse = [...pool].sort((a, b) => (a.pulseScore as number) - (b.pulseScore as number))
    const down = byPulse.slice(0, 10)
    const up = byPulse.slice(Math.max(10, byPulse.length - 10)).reverse()   // 行数不足 20 时两榜不重叠
    return { down, up }
  }, [natOcc])

  // ── S4 省份照妖镜 ──
  const provRows = useMemo(() => (market?.rows ?? []).filter((r) => r.broad === 'all' && (r.mid === 'all' || !r.mid)), [market])
  const provStat: StatRow | undefined = useMemo(() => provRows.find((r) => r.province === prov), [provRows, prov])
  const provOcc = useMemo(() => {
    if (!market) return null
    const rows = market.occ.filter((o) => o.province === prov && (o.openJobs ?? 0) >= PROV_MIN_OPEN)
    const hasPulse = rows.some((o) => o.pulseScore != null)
    // 有脉象分按脉象分,没有就按在架量(降级:少两列,不假造分数)
    const sorted = hasPulse
      ? [...rows].filter((o) => o.pulseScore != null).sort((a, b) => (b.pulseScore as number) - (a.pulseScore as number))
      : [...rows].sort((a, b) => (b.openJobs ?? 0) - (a.openJobs ?? 0))
    return sorted.slice(0, 20)
  }, [market, prov])
  const provName = PROV_NAME[prov] || prov

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
  const noteS: React.CSSProperties = { fontSize: 12, color: UI.text3, margin: '0 0 12px' }
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
        .plHero.plBand{padding:16px 0 0}
        .plBtn{display:block;border-radius:8px;padding:12px 20px;font-size:14px;font-weight:600;text-align:center;cursor:pointer;text-decoration:none;border:none;font-family:inherit}
        /* S1 三脉象卡:375 三列等宽(数字与标签各占一行,不横滚不截字) */
        .plNums{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px}
        .plNums a{min-width:0;overflow:hidden;background:${UI.card};border:1px solid ${UI.border};border-radius:10px;padding:10px 12px;text-decoration:none;color:inherit}
        .plNums b{display:block;font-size:20px;line-height:1.25;font-weight:700}
        .plNums span{display:block;font-size:11.5px;color:${UI.text2};white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .plNums i{display:block;font-size:11.5px;font-style:normal;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
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
          .plHero.plBand{padding:16px 0 0}
          .plNums b{font-size:26px}
          .plTable{display:block}.plCards{display:none}
          .plDrawTable{display:table}.plDrawCards{display:none}
          .plBtn{padding:13px 28px;font-size:15px}
          .plCta{flex-direction:row;align-items:center}
          .plCta .plBtn{flex:0 0 auto;padding:12px 28px}
        }`}</style>
      <SiteHeader lang={lang} setLang={setLangSaved} t={t} active="start" />
      <main style={{ flex: '1 0 auto' }}>

        {/* ── S1 判决区:动态冷脸标题(模板填槽)+ 三脉象卡 ────────────────────────── */}
        <div className="plBand plHero">
          <PageShell pad="0 1.25rem">
            {/* Frank 2026-08-06:副题「难听,但没骗你」删——调性靠数字自己立,不用口号(解释类文案默认删) */}
            <PageBanner module="home" tall title={headline || t('home.title')} images={BANNER_IMGS.home} />
            {pulseCards.length > 0 && (
              <div className="plNums">
                {pulseCards.map((c) => (
                  <a key={c.label} href={c.href} title={c.tip} className="cardHover" onClick={() => track('pulse_card_click')}>
                    <b style={{ color: c.color }}>{c.v}</b>
                    <span>{c.label}</span>
                    {c.sub ? <i style={{ color: c.subColor }}>{c.sub}</i> : null}
                  </a>
                ))}
              </div>
            )}
          </PageShell>
        </div>

        {/* ── S2 劝退榜 + S3 真香榜:红绿紧邻强对比,同一白带内上下相接 ─────────────
            pulse_score 列未落库 → boards.down/up 为空 → 两榜整块不渲染(绝不拿存量榜顶包) */}
        {boards && (boards.down.length > 0 || boards.up.length > 0) && (
          <Band bg="#fff">
            {boards.down.length > 0 && (
              <div style={{ borderLeft: `4px solid ${UI.danger}`, paddingLeft: 14 }}>
                {/* Frank 2026-08-06:大红标题太吓人 —— 标题回正常深色,红色只留左色条与数据本身(环比/判决);
                    注释行去黑话(「脉象分」用户读不懂),门槛与排序口径挪 title tooltip */}
                <h2 style={secH} title={t('pulse.board.tip')}>{t('pulse.s2')}</h2>
                <p style={noteS}>{t('pulse.s2.note')}</p>
                <OccBoard rows={boards.down} t={t} lang={lang} />
              </div>
            )}
            {boards.up.length > 0 && (
              <div style={{ borderLeft: `4px solid ${UI.ok}`, paddingLeft: 14, marginTop: 28 }}>
                <h2 style={secH} title={t('pulse.board.tip')}>{t('pulse.s3')}</h2>
                <p style={noteS}>{t('pulse.s3.note')}</p>
                <OccBoard rows={boards.up} t={t} lang={lang} />
              </div>
            )}
          </Band>
        )}

        {/* ── S4 省份照妖镜:省标签切换(档案省预选/匿名默认 ON,禁 IP 定位)+ 该省职业榜 +
            省提名通道标签 + 省卡(难度档 + IRCC 体量)作切换入口 + 折叠的分布主图 ────────── */}
        <Band>
          <h2 style={secH}>{t('pulse.s4')}
            <span style={hmRight}><a href={`/stats/${prov.toLowerCase()}`} style={moreA}>{t('pulse.s4.drill', { prov: provName })}</a></span>
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '4px 0 8px' }}>
            {PROVS.map((p) => <Chip key={p} active={p === prov} onClick={() => setProv(p)} title={PROV_NAME[p]}>{p}</Chip>)}
          </div>
          {/* 该省提名通道(与 /stats 省页同源 stream_labels);无清单的省整行不出,不写「暂无」 */}
          {provStat?.streamLabels ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, margin: '0 0 10px', fontSize: 12.5, color: UI.text2 }}>
              <span style={{ whiteSpace: 'nowrap' }}>{t('pulse.s4.streams')}</span>
              {provStat.streamLabels.split('、').map((s) => <Tag key={s} variant="warn">{streamDisplay(t, s)}</Tag>)}
            </div>
          ) : null}
          <h3 style={{ fontSize: 15, margin: '10px 0 4px', fontWeight: 700 }}>{t('pulse.s4.rank', { prov: provName })}</h3>
          <p style={noteS}>{t('pulse.s4.note')}</p>
          {provOcc === null
            ? <div style={{ background: UI.card, border: `1px solid ${UI.border}`, borderRadius: 12, height: 320 }} />
            : provOcc.length > 0
              ? <OccBoard rows={provOcc} t={t} lang={lang} />
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
          {/* 分布主图折叠进本区(默认收起):它是补充证据,展开才拉图库(echarts 懒加载照旧) */}
          {market !== null && market.occ.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <button onClick={() => { setChartOpen((o) => !o); track('pulse_chart_toggle') }}
                style={{ border: `1px solid ${UI.border}`, background: '#fff', borderRadius: 8, padding: '7px 14px', fontSize: 12.5, color: '#374151', cursor: 'pointer', fontFamily: 'inherit' }}>
                {t(chartOpen ? 'pulse.chart.hide' : 'pulse.chart.show')}
              </button>
              {chartOpen && (
                <div style={{ marginTop: 10 }}>
                  <MarketChart occ={market.occ} city={market.city} rows={market.rows} t={t} lang={lang} channels={market.channels} />
                </div>
              )}
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
                      <th style={th}>{t('home.dr.score')}</th><th style={th}>{t('home.dr.inv')}</th><th style={th}>{t('pulse.col.verdict')}</th>
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
                      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</span>
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

        {/* ── S7 订阅与分享:订阅走既有周报开关(账户页 saved-jobs 节),分享用平台原生能力 ── */}
        <Band>
          <div className="plCta">
            <span style={{ flex: 1 }}>
              <span style={{ fontSize: 17, fontWeight: 700, color: UI.text, display: 'block', marginBottom: 4 }}>{t('pulse.s7.t')}</span>
              <span style={{ fontSize: 13, color: UI.text2 }}>{t('pulse.s7.s')}</span>
            </span>
            <a className="plBtn" style={{ background: UI.primary, color: '#fff' }} href="/account?sec=sjobs" onClick={() => track('pulse_subscribe')}>{t('pulse.s7.sub')}</a>
            <button className="plBtn" style={{ background: '#fff', color: '#374151', border: `1px solid ${UI.border}` }}
              onClick={() => {
                track('pulse_share')
                const url = window.location.href
                // 原生分享优先(手机),桌面退剪贴板;两条都不可用就什么也不做(不弹自造分享面板)
                const nav = navigator as Navigator & { share?: (d: { title: string; url: string }) => Promise<void> }
                if (nav.share) { void nav.share({ title: document.title, url }).catch(() => {}); return }
                void navigator.clipboard?.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) }).catch(() => {})
              }}>{copied ? t('pulse.s7.copied') : t('pulse.s7.share')}</button>
          </div>
          {/* 口径说明留页尾(溯源是人设凭据,E13-00 §1 拍板 6) */}
          <CaliberLine t={t} srcs={stats.srcs} fetched={provRows[0]?.fetched || stats.checkedAt || ''} />
        </Band>
      </main>
      <SiteFooter t={t} />
    </div>
  )
}
