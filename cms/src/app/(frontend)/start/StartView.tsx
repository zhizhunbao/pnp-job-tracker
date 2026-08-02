'use client'
// L1-01 Landing 视图(/start,v3 分节版式 2026-07-30 Frank「参考 MongoDB 那类首页:分 sections,不把密集信息挤一屏」):
// 一节一事、全宽色带交替(白/灰)、大节标题大留白;内容仍是 v2 拍板的真数块(B 骨架 + A 抽选表),只换排布节奏。
// 每块都是**既有事实源的投影 + 入口**(架构 v2 判定式:通向 L2/L3,永不死路),不是裸数据橱窗:
//   今日日更大数字(→职位板)/ 抽选表(pnp_draws,与 /pathways 同源)/ 职业行情卡(与 /api/quiz?top 同一 DAL →/occupations)/
//   政策动态(news →/news)/ 全宽 CTA 带收束回评估主按钮。
// 红线:数字全库内真数,查不到整节不渲;通道名映射不到显官方原文,前端不编翻译。
import { useEffect, useMemo, useState } from 'react'

import { eeKeyDisplay, initialLang, makeT, LANG_KEY, type Lang, drawStreamNote } from '../jobs/i18n'
import { SiteHeader } from '../SiteHeader'
import { SiteFooter } from '../SiteFooter'
import { MarketChart, useMarketStats } from '../stats/charts'
import { shortOcc } from '../quiz/EntryQuiz'
import { BANNER_IMGS, PageBanner, Tag, UI } from '../ui/primitives'
import { track } from '@/lib/track'

// 有自己的题库与报告的目标卡 → 进两态答题页;加一张卡=加一行(与 lib/decisions 同一个加卡口径)
const PLAN_CARDS: Record<string, string> = { pr: '/plan/pr', jobs: '/plan/job', career: '/plan/career', prov: '/plan/province' }

export type HomeStats = {
  total: number | null; named: number | null; lmia: number | null
  provinces: number | null; cities: number | null; dli: number | null
  occupations: number | null; aipEmployers: number | null
  draws: { date: string; province: string; stream: string; label: string; score: number | null; invitations: number | null }[]
  daily: { date: string; n: number; eligible: number } | null
  news: { date: string; region: string; title: string; slug: string }[]
  latestJobs: { id: number | string; title: string; company: string; city: string; province: string; salaryText: string; pnp: boolean; date: string; noc: string }[]
  checkedAt: string
}

const num = (n: number) => n.toLocaleString('en-CA')
const mmdd = (iso: string) => (iso || '').slice(5, 10)

// 全宽色带 + 1320 内轨(MongoDB 式分节;带色只用既有 token:白 / 页底灰,蓝 tint 只给 CTA 带)
function Band({ bg, children }: { bg?: string; children: React.ReactNode }) {
  return (
    <div className="hmBand" style={{ background: bg }}>
      <div style={{ maxWidth: 1320, margin: '0 auto', padding: '0 1.25rem', boxSizing: 'border-box' }}>{children}</div>
    </div>
  )
}

// 条数下拉:三处共用一把(职位榜/抽选表/政策动态),样式与全站表单件同源,避免各写各的
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

export function StartView({ stats }: { stats: HomeStats }) {
  const [lang, setLang] = useState<Lang>('zh')
  useEffect(() => { setLang(initialLang()) }, [])
  const setLangSaved = (l: Lang) => { try { localStorage.setItem(LANG_KEY, l) } catch { /* ignore */ } ; setLang(l) }
  const t = useMemo(() => makeT(lang), [lang])

  // 老三问弹框 2026-07-31 在 landing 全下架(Frank「现在只有拿 PR 有题,其他还是老的弹框 → 先都关掉」):
  // 有 builder 的卡进答题页,其余先回深链等各自 builder;主 CTA 直接进 /plan/pr。
  // 加一张卡 = 加一行(同 lib/decisions 的加卡即加一行)。
  // 主图四份数据挂载后拉 /api/market-stats(SSR 瘦身:occ ~3400 行不再进 HTML);null=加载中渲占位高度
  const market = useMarketStats()
  // 职位榜控件:最新=逐岗(服务端 50 条);高薪/最多=职业级(2026-07-31 两次拍板:「最多」加榜、
  // 「高薪要的是职业薪资排名,不是具体某些职位——top50 全是医生帖,程序员排在哪」),
  // 数据吃 useMarketStats 已到手的 occ 全国行,零新请求
  const [jobsTab, setJobsTab] = useState<'new' | 'paid' | 'most'>('new')
  const [jobsN, setJobsN] = useState(10)
  // 条数下拉(2026-08-01 Frank 队列③④):抽选表与政策动态各一个,SSR 已多取,前端只切片
  const [drawsN, setDrawsN] = useState(10)
  const [newsN, setNewsN] = useState(10)
  const occTop = useMemo(() => market === null ? null : market.occ.filter((o) => o.province === 'all'), [market])
  // 高薪=ESDC 中位年薪降序;在招 <5 的职业不上榜(与主图 minJobs 同拍板:1 个岗的职业没有统计意义)
  const occList = useMemo(() => {
    if (!occTop) return null
    if (jobsTab !== 'paid') return occTop   // 最多榜:SQL 已按在招量降序
    return occTop.filter((o) => (o.openJobs ?? 0) >= 5 && o.medianWageAnnual != null)
      .sort((a, b) => (b.medianWageAnnual as number) - (a.medianWageAnnual as number))
  }, [occTop, jobsTab])
  // NOC → 职业译名查表(中/韩榜行灰注用):market.occ 已在手,零新请求;英文界面/查不到 → 无注
  const nocNote = useMemo(() => {
    if (!occTop || lang === 'en') return () => ''
    const m = new Map(occTop.map((o) => [o.noc, lang === 'zh' ? (o.titleZhShort || o.titleZh) : o.titleKo]))
    return (noc: string) => m.get(noc) || ''
  }, [occTop, lang])

  // 决策引擎七个出口:上面 4 个有 builder 能出报告,下面 3 个占位(即将上线)。
  // 2×2 + 3-col 两层网格;占位卡虚线框,不给假入口。加一张卡=加一行。
  const activeGoals = [
    { key: 'pr', hint: t('home.g.pr.n') },
    { key: 'jobs', hint: t('home.g.jobs.n') },
    { key: 'prov', hint: t('home.g.prov.n') },
    { key: 'career', hint: t('home.g.career.n') },
  ]
  const upcomingGoals = [
    { key: 'city' },
    { key: 'school' },
    { key: 'major' },
  ]

  const pills = [
    stats.total != null ? { v: num(stats.total), label: t('home.st.jobs') } : null,
    stats.aipEmployers != null ? { v: num(stats.aipEmployers), label: t('home.st.aip') } : null,
    stats.dli != null ? { v: String(stats.dli), label: t('home.st.dli') } : null,
  ].filter(Boolean) as { v: string; label: string }[]

  // 抽选行显示:FED=联邦轮(tag EE,label 是 cat_key 走 eeKeyDisplay);省轮 stream 官方原文,映射不到不编译文
  const drawStream = (r: HomeStats['draws'][number]) =>
    r.province === 'FED' ? eeKeyDisplay(t, r.label) : (r.stream || r.label)

  const tileNm: React.CSSProperties = { fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }
  const tileHint: React.CSSProperties = { marginTop: 2, fontSize: 12, color: UI.text2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }
  // flexWrap:375 职位榜三 tab + Top N 挤不进一行(2026-07-31 实拍标题折行、tab 截断)→ 控件整组下折,不压缩不截字
  const secH: React.CSSProperties = { margin: '0 0 18px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10, rowGap: 8, flexWrap: 'wrap', color: UI.text }
  const moreA: React.CSSProperties = { marginLeft: 'auto', fontSize: 13, fontWeight: 600, color: UI.primary, textDecoration: 'none', whiteSpace: 'nowrap' }
  const th: React.CSSProperties = { fontSize: 11.5, color: UI.text3, fontWeight: 600, textAlign: 'left', padding: '9px 12px', borderBottom: `1px solid ${UI.hairline}`, background: '#fafafa' }
  const td: React.CSSProperties = { padding: '9px 12px', borderBottom: `1px solid ${UI.hairline}`, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
  const numCell: React.CSSProperties = { textAlign: 'right' }

  return (
    <div style={{ background: UI.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif', color: '#1f2937' }}>
      {/* 分节版式(v3):.hmBand 全宽色带,节内 1320 轨;节纵距 40/72px,节标题 20/24px —— 一节一事不挤屏 */}
      <style>{`
        .hmBand{padding:40px 0}
        .hmBand h2{font-size:20px}
        .hmHero.hmBand{padding:16px 0 0}
        .hmBtn{display:block;border-radius:8px;padding:12px 20px;font-size:14px;font-weight:600;text-align:center;cursor:pointer;text-decoration:none;border:none;font-family:inherit}
        .hmGrid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
        .hmGrid3{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px}
        .hmNums{display:flex;gap:28px;flex-wrap:wrap;justify-content:center;text-align:center}
        .hmNums b{display:block;font-size:32px;line-height:1.15;font-weight:700}
        .hmCtaBand{display:flex;flex-direction:column;gap:12px}
        /* 职位榜/职业榜行:网格定列(2026-07-31 Frank「对齐也比较好吧」)——PNP 标签、地点、薪资各归各列,
           不再随标题长短漂;**译名单独一列**(2026-08-01 Frank 队列①:原先紧跟英文名后,位置随英文长短漂)。
           手机改卡片(队列②,与抽选块同手法):同一份 DOM 用命名区域重排 —— 名次+标题一行、译名一行、
           标签与地点薪资一行;不复制标记,断点只换 grid-template。 */
        .hmJobRow,.hmOccRow{display:grid;gap:4px 10px;padding:12px 14px;font-size:13.5px;text-decoration:none;color:inherit;align-items:baseline}
        .hmJobRow{grid-template-columns:26px minmax(0,1fr) auto;
          grid-template-areas:"rank title title" ". note note" ". meta pay"}
        .hmOccRow{grid-template-columns:26px minmax(0,1fr) auto;
          grid-template-areas:"rank title title" ". note note" ". meta pay"}
        .hmRank{grid-area:rank}.hmTitle{grid-area:title}.hmNote{grid-area:note}
        .hmPnp,.hmOccOpen{grid-area:meta}.hmPay{grid-area:pay}
        .hmJobCo,.hmJobLoc,.hmOccElig{display:none}
        /* 手机上译名那行是灰注,空的时候不占行高 */
        .hmNote:empty{display:none}
        /* 抽选块照职位板的范式(2026-07-31 Frank「电脑用表格 手机用卡片」):
           五列表格在 375 上通道列只剩 ~100px,通道名一律省略号 —— 手机换成一岗一卡,通道名完整可换行 */
        .hmDrawTable{display:none}
        .hmDrawCards{display:flex;flex-direction:column}
        @media (min-width:900px){ .hmDrawTable{display:table}.hmDrawCards{display:none} }
        @media (min-width:900px){
          /* 桌面:一行到底,译名占**自己的一列**(名次/英文名/译名/公司/PNP/地点/薪资) */
          .hmJobRow{grid-template-columns:26px minmax(0,1.1fr) minmax(0,0.8fr) minmax(0,0.9fr) 46px minmax(0,150px) 130px;gap:12px;
            grid-template-areas:"rank title note co pnp loc pay"}
          /* 职业榜(2026-07-31 两轮拍板):名字形态与职位行同构;名列吃满剩余、数字列定宽靠右 */
          .hmOccRow{grid-template-columns:26px minmax(0,1fr) minmax(0,0.7fr) 110px minmax(0,150px) 130px;gap:12px;
            grid-template-areas:"rank title note open elig pay"}
          /* 桌面必须逐个重挂区域名:base 里 .hmPnp 挂的是手机的 meta,桌面模板里没有 meta 这个名字 →
             它会被丢进隐式行,PNP 标签就单独掉到第二行(实拍抓到) */
          .hmJobRow .hmPnp{grid-area:pnp}
          .hmJobRow .hmJobCo{grid-area:co}.hmJobRow .hmJobLoc{grid-area:loc}
          .hmOccRow .hmOccOpen{grid-area:open}.hmOccRow .hmOccElig{grid-area:elig}
          .hmJobCo,.hmJobLoc{display:block}.hmOccElig{display:block}
          .hmNote{text-align:left}
        }
        @media (min-width:900px){
          .hmBand{padding:72px 0}
          .hmBand h2{font-size:24px}
          .hmHero.hmBand{padding:16px 0 0}
          .hmBtn{padding:13px 28px;font-size:15px}
          .hmGrid{gap:12px}
          .hmGrid3{grid-template-columns:repeat(3,1fr);gap:12px;margin-top:12px}
          .hmNums{gap:64px}
          .hmNums b{font-size:44px}
          .hmCtaBand{flex-direction:row;align-items:center}
          .hmCtaBand .hmBtn{flex:0 0 auto;padding:12px 28px}
        }`}</style>
      <SiteHeader lang={lang} setLang={setLangSaved} t={t} active="start" />
      <main style={{ flex: '1 0 auto' }}>

        {/* ① Hero:PageBanner 图版(home 档 200/150)。双按钮 2026-07-30 Frank 拍板挪到页底 CTA 带 */}
        <div className="hmBand hmHero">
          <div style={{ maxWidth: 1320, margin: '0 auto', padding: '0 1.25rem', boxSizing: 'border-box' }}>
            <PageBanner module="home" tall title={t('home.title')} images={BANNER_IMGS.home} stats={pills} />
          </div>
        </div>

        {/* ② 决策引擎七个出口(白带):上 4 活卡 2×2 + 下 3 占位 3-col */}
        <Band bg="#fff">
          <h2 style={secH}>{t('home.goals')}</h2>
          <div className="hmGrid">
            {activeGoals.map((g) => (
              <a key={g.key} href={PLAN_CARDS[g.key]} className="cardHover" onClick={() => track(`landing_goal_${g.key}`)}
                style={{ display: 'block', minWidth: 0, background: UI.card, border: `1px solid ${UI.border}`, borderRadius: 10, padding: '14px 16px', textDecoration: 'none', color: 'inherit' }}>
                <div style={tileNm}>{t(`home.g.${g.key}`)}</div>
                <div style={tileHint}>{g.hint}</div>
              </a>
            ))}
          </div>
          <div className="hmGrid3">
            {upcomingGoals.map((g) => (
              <span key={g.key} style={{ display: 'block', minWidth: 0, background: UI.hairline, border: `1px dashed ${UI.border}`, borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ ...tileNm, color: UI.text3 }}>{t(`home.g.${g.key}`)}</div>
                <div style={{ ...tileHint, color: UI.text3 }}>{t('home.g.soon')}</div>
              </span>
            ))}
          </div>
        </Band>

        {/* ③ 今日日更(灰带,居中大数字;点数字进职位板) */}
        {stats.daily && (
          <Band>
            <h2 style={{ ...secH, justifyContent: 'center', marginBottom: 6 }}>{t('home.daily')}</h2>
            <div style={{ textAlign: 'center', fontSize: 12.5, color: UI.text3, marginBottom: 22 }}>{mmdd(stats.daily.date)}</div>
            <a href="/" style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
              <div className="hmNums">
                <span><b style={{ color: UI.primaryDeep }}>{num(stats.daily.n)}</b><span style={{ fontSize: 12.5, color: UI.text2 }}>{t('home.daily.new')}</span></span>
                {stats.daily.eligible > 0 && <span><b style={{ color: UI.ok }}>{num(stats.daily.eligible)}</b><span style={{ fontSize: 12.5, color: UI.text2 }}>{t('home.daily.elig')}</span></span>}
                {stats.total != null && <span><b style={{ color: UI.text }}>{num(stats.total)}</b><span style={{ fontSize: 12.5, color: UI.text2 }}>{t('home.daily.total')}</span></span>}
              </div>
            </a>
          </Band>
        )}

        {/* ④ 职位榜(白带,Frank「单独 section 展示 job」+「老外喜欢排名」+ 2026-07-31「加个最多」):
            最新榜=fetchJobRows 发布序,高薪榜=fetchJobsPage 年薪序,最多榜=职业×在招量(market.occ 投影);
            行首挂名次,职位行点详情页、职业行点职位板按 NOC 筛;Top 10/20/50 三榜通用 */}
        {stats.latestJobs.length > 0 && (
          <Band bg="#fff">
            <h2 style={secH}>{t('home.jobs')}
              <span style={{ display: 'inline-flex', border: `1px solid ${UI.border}`, borderRadius: 8, overflow: 'hidden' }}>
                {/* 高薪/最多都是职业级(吃 occ):market 拉完确认没数据才收起这两钮(查不到不上假入口) */}
                {([['new', t('home.jobs.new')], ...(occTop === null || occTop.length ? [['paid', t('home.jobs.paid')], ['most', t('home.jobs.most')]] : [])] as ['new' | 'paid' | 'most', string][]).map(([k, lb]) => (
                  <button key={k} onClick={() => setJobsTab(k)}
                    style={{ border: 'none', padding: '5px 12px', fontSize: 12.5, cursor: 'pointer',
                      background: jobsTab === k ? '#eff6ff' : '#fff', color: jobsTab === k ? '#1d4ed8' : '#374151', fontWeight: jobsTab === k ? 600 : 400 }}>{lb}</button>
                ))}
              </span>
              <select value={jobsN} onChange={(e) => setJobsN(Number(e.target.value))}
                style={{ height: 30, border: `1px solid ${UI.border}`, borderRadius: 8, background: '#fff', fontSize: 12.5, color: '#374151', padding: '0 6px' }}>
                <option value={10}>Top 10</option><option value={20}>Top 20</option><option value={50}>Top 50</option>
              </select>
              <a href="/" style={moreA} onClick={() => track('landing_goal_jobs')}>{t('home.jobs.all')}</a></h2>
            <div style={{ background: UI.card, border: `1px solid ${UI.border}`, borderRadius: 12, overflow: 'hidden' }}>
              {jobsTab !== 'new' ? (
                // 职业级榜(高薪=薪资序/最多=在招序):行点进职位板按该 NOC 筛(与三问深链同口径)
                occList === null
                  ? <div style={{ height: 45 * jobsN }} />
                  : occList.slice(0, jobsN).map((o, i) => {
                    // 与职位行同一形态:英文官方名做主文案 + 中/韩译名灰注(Frank「为什么长得不一样」)
                    const main = o.titleEn || o.titleZh || o.noc
                    const note = lang === 'zh' ? (o.titleZhShort || o.titleZh) : lang === 'ko' ? o.titleKo : ''
                    return (
                    <a key={o.noc} href={`/?q=${o.noc}`} className="hmOccRow rowHover" style={{ borderTop: i ? `1px solid ${UI.hairline}` : 'none' }}>
                      <span className="hmRank" style={{ fontSize: 12.5, fontWeight: 700, color: i < 3 ? UI.primary : UI.text3 }}>#{i + 1}</span>
                      <span className="hmTitle" title={main} style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{main}</span>
                      {/* 译名自己一列:跟着列走,不再随英文名长短漂(2026-08-01 Frank 队列①) */}
                      <span className="hmNote" title={note} style={{ color: UI.text3, fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{note ? shortOcc(note) : ''}</span>
                      <span className="hmOccOpen" style={{ color: UI.text2, fontSize: 12.5, whiteSpace: 'nowrap', textAlign: 'right' }}>{o.openJobs != null ? t('quiz.openN', { n: o.openJobs.toLocaleString('en-CA') }) : ''}</span>
                      <span className="hmOccElig" style={{ color: UI.ok, fontSize: 12.5, whiteSpace: 'nowrap', textAlign: 'right' }}>{o.namedJobs ? t('quiz.eligN', { n: o.namedJobs.toLocaleString('en-CA') }) : ''}</span>
                      {/* 薪资=ESDC 官方低–高位区间(Frank 2026-07-31「改成范围」;口径同中位:岗位加权取中位);
                          区间列未灌到(部署时序)回退「中位 $NK」,再不行留空 —— 宁可留空不瞎猜 */}
                      <span className="hmPay" title={t('home.jobs.rangeTip')} style={{ color: UI.text, fontSize: 12.5, whiteSpace: 'nowrap', textAlign: 'right' }}>
                        {o.wageLowAnnual != null && o.wageHighAnnual != null
                          ? `$${Math.round(o.wageLowAnnual / 1000)}K–$${Math.round(o.wageHighAnnual / 1000)}K`
                          : o.medianWageAnnual != null ? t('home.jobs.med', { v: '$' + Math.round(o.medianWageAnnual / 1000) + 'K' }) : ''}
                      </span>
                    </a>
                    )
                  })
              ) : stats.latestJobs.slice(0, jobsN).map((j, i) => {
                // 帖子标题是逐帖英文原文,无逐帖译名 —— 中/韩界面挂 NOC 职业译名灰注(人话名+灰字小注站规)
                const note = nocNote(j.noc)
                return (
                <a key={j.id} href={`/jobs/${j.id}`} className="hmJobRow rowHover" style={{ borderTop: i ? `1px solid ${UI.hairline}` : 'none' }}>
                  <span className="hmRank" style={{ fontSize: 12.5, fontWeight: 700, color: i < 3 ? UI.primary : UI.text3 }}>#{i + 1}</span>
                  <span className="hmTitle" title={j.title} style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{j.title}</span>
                  <span className="hmNote" title={note} style={{ color: UI.text3, fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{note ? shortOcc(note) : ''}</span>
                  <span className="hmJobCo" style={{ color: UI.text2, fontSize: 12.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{j.company}</span>
                  <span className="hmPnp">{j.pnp && <Tag variant="ok">PNP</Tag>}</span>
                  <span className="hmJobLoc" style={{ color: UI.text2, fontSize: 12.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'right' }}>{j.city ? `${j.city}, ${j.province}` : j.province}</span>
                  <span className="hmPay" style={{ color: UI.text, fontSize: 12.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'right' }}>{j.salaryText}</span>
                </a>
                )
              })}
            </div>
          </Band>
        )}

        {/* ⑤ 最近抽选(灰带,A 表;窄轨撤,与各节同走 1320) */}
        {stats.draws.length > 0 && (
          <Band>
            <div>
              <h2 style={secH}>{t('home.draws')}
                <TopN v={drawsN} on={setDrawsN} max={stats.draws.length} />
                <a href="/pathways" style={moreA}>{t('pw.entry')}</a></h2>
              {/* 与 /pathways 抽选事实块同源(pnp_draws),这里是轻量投影;百分比固定布局永不横滚(站规) */}
              <div style={{ background: UI.card, border: `1px solid ${UI.border}`, borderRadius: 12, overflow: 'hidden' }}>
                <table className="hmDrawTable" style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: 13 }}>
                  {/* 列宽按 375 实测定:日期/项目/分数线/邀请必须完整(数字不许截),通道列吃剩余宽度做省略 */}
                  <colgroup><col style={{ width: '19%' }} /><col style={{ width: '17%' }} /><col style={{ width: '28%' }} /><col style={{ width: '18%' }} /><col style={{ width: '18%' }} /></colgroup>
                  <thead><tr>
                    <th style={th}>{t('home.dr.date')}</th><th style={th}>{t('home.dr.prog')}</th><th style={th}>{t('home.dr.stream')}</th>
                    <th style={{ ...th, ...numCell }}>{t('home.dr.score')}</th><th style={{ ...th, ...numCell }}>{t('home.dr.inv')}</th>
                  </tr></thead>
                  <tbody>
                    {stats.draws.slice(0, drawsN).map((r, i) => {
                      const last = i === Math.min(drawsN, stats.draws.length) - 1
                      return (
                        <tr key={i}>
                          <td style={{ ...td, ...(last && { borderBottom: 'none' }) }}>{mmdd(r.date)}</td>
                          <td style={{ ...td, ...(last && { borderBottom: 'none' }) }}><Tag>{r.province === 'FED' ? 'EE' : r.province}</Tag></td>
                          {/* 通道名双语(队列⑤):官方英文名为主,译名灰字第二行 —— 加一列会把已经很窄的
                              通道列再切一半,长名字全成省略号;英文界面无第二行(国际化口径) */}
                          <td style={{ ...td, ...(last && { borderBottom: 'none' }), whiteSpace: 'normal' }} title={drawStream(r)}>
                            <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{drawStream(r)}</span>
                            {drawStreamNote(r.stream || '', lang) ? (
                              <span style={{ display: 'block', fontSize: 11.5, color: UI.text3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{drawStreamNote(r.stream || '', lang)}</span>
                            ) : null}
                          </td>
                          <td style={{ ...td, ...numCell, ...(last && { borderBottom: 'none' }) }}>{r.score != null ? num(r.score) : '—'}</td>
                          <td style={{ ...td, ...numCell, ...(last && { borderBottom: 'none' }) }}>{r.invitations != null ? num(r.invitations) : '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {/* 手机卡片:日期与项目一行、通道名整行(不截)、两个数字各归各列右对齐 */}
                <div className="hmDrawCards">
                  {stats.draws.slice(0, drawsN).map((r, i) => (
                    <div key={i} style={{ padding: '11px 14px', borderBottom: i === Math.min(drawsN, stats.draws.length) - 1 ? 'none' : `1px solid ${UI.hairline}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                        <Tag>{r.province === 'FED' ? 'EE' : r.province}</Tag>
                        <span style={{ fontSize: 12, color: UI.text3 }}>{mmdd(r.date)}</span>
                      </div>
                      <div style={{ fontSize: 13.5, lineHeight: 1.5 }}>{drawStream(r)}</div>
                      {drawStreamNote(r.stream || '', lang) ? (
                        <div style={{ fontSize: 12, color: UI.text3, lineHeight: 1.5 }}>{drawStreamNote(r.stream || '', lang)}</div>
                      ) : null}
                      <div style={{ height: 6 }} />
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 12.5, color: UI.text2 }}>
                        <span>{t('home.dr.score')}<b style={{ color: UI.text, marginLeft: 6, fontSize: 13.5 }}>{r.score != null ? num(r.score) : '—'}</b></span>
                        <span>{t('home.dr.inv')}<b style={{ color: UI.text, marginLeft: 6, fontSize: 13.5 }}>{r.invitations != null ? num(r.invitations) : '—'}</b></span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Band>
        )}

        {/* ⑤ 在招职位分布主图(灰带,1320 全轨与各节同宽):/stats 主图整块投影
            (同一 MarketChart 组件、同一 /api/market-stats 数据,单一真相源;echarts 懒加载)。
            数据挂载后 useMarketStats 后台拉:加载中渲固定高占位(不渲空壳控件、375 不跳版),
            拉完为空(缺表/查询挂)整节撤 —— 与 SSR 时代「查不到整节不渲」同一红线。
            v2 的「热门职业行情」横滑卡节撤(2026-07-30 自检):与主图默认职业轴同批职业同一排序,
            两节讲同一件事 —— 按 Frank「不同 section 显示不同的信息」原则,留超集(主图带筛选/下钻)。 */}
        {(market === null || market.occ.length > 0) && (
          <Band>
            <h2 style={secH}>{t('mkt.title')}<a href="/stats" style={moreA}>{t('home.stats.more')}</a></h2>
            {market === null
              ? <div style={{ background: UI.card, border: `1px solid ${UI.border}`, borderRadius: 12, height: 560 }} />
              : <MarketChart occ={market.occ} city={market.city} rows={market.rows} t={t} lang={lang} channels={market.channels} />}
          </Band>
        )}

        {/* ⑥ 政策动态(白带;窄轨撤,与各节同走 1320) */}
        {stats.news.length > 0 && (
          <Band bg="#fff">
            <div>
              <h2 style={secH}>{t('home.policy')}
                <TopN v={newsN} on={setNewsN} max={stats.news.length} />
                <a href="/news" style={moreA}>{t('home.pulse.all')}</a></h2>
              <div style={{ background: UI.card, border: `1px solid ${UI.border}`, borderRadius: 12, overflow: 'hidden' }}>
                {stats.news.slice(0, newsN).map((r, i) => (
                  <a key={r.slug || i} href={r.slug ? `/news/${r.slug}` : '/news'} className="rowHover"
                    style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '12px 14px', borderTop: i ? `1px solid ${UI.hairline}` : 'none', fontSize: 13, textDecoration: 'none', color: 'inherit' }}>
                    <span style={{ color: UI.text3, fontSize: 12, whiteSpace: 'nowrap' }}>{mmdd(r.date)}</span>
                    <Tag>{r.region === 'federal' ? 'IRCC' : (r.region || '').toUpperCase()}</Tag>
                    <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</span>
                  </a>
                ))}
              </div>
            </div>
          </Band>
        )}

        {/* ⑦ 全宽 CTA 带:数据节收束回主按钮(架构 v2 判定式——数据是证据,行动是评估) */}
        <div className="hmBand" style={{ background: 'linear-gradient(100deg,#eff6ff,#dbeafe)' }}>
          <div className="hmCtaBand" style={{ maxWidth: 1320, margin: '0 auto', padding: '0 1.25rem', boxSizing: 'border-box' }}>
            <span style={{ flex: 1 }}>
              <span style={{ fontSize: 17, fontWeight: 700, color: UI.primaryDeep, display: 'block', marginBottom: 4 }}>{t('home.cta2.t')}</span>
              <span style={{ fontSize: 13, color: UI.text2 }}>{t('home.cta2.s')}</span>
            </span>
            {/* 双按钮从 hero 挪到这(2026-07-30 Frank「这两个按钮放到最下面」):主=评估,次=进职位板。
                主按钮原先拉三问弹框,2026-07-31 改直接进 /plan/pr —— 站内唯一真有题、真出报告的地方 */}
            <a className="hmBtn" style={{ background: UI.primary, color: '#fff' }}
              href="/plan/pr" onClick={() => track('landing_cta_quiz', { pos: 'bottom' })}>{t('home.ctaQuiz')}</a>
            <a className="hmBtn" style={{ background: UI.card, color: UI.primary, border: `1px solid ${UI.border}` }}
              href="/" onClick={() => track('landing_cta_browse')}>{t('home.ctaBrowse')}</a>
          </div>
        </div>
      </main>
      {/* 免责与数据来源都在页脚(全站同一条),页内不再重复写 */}
      <SiteFooter t={t} />

    </div>
  )
}
