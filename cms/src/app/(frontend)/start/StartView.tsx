'use client'
// L1-01 Landing 视图(/start,v3 分节版式 2026-07-30 Frank「参考 MongoDB 那类首页:分 sections,不把密集信息挤一屏」):
// 一节一事、全宽色带交替(白/灰)、大节标题大留白;内容仍是 v2 拍板的真数块(B 骨架 + A 抽选表),只换排布节奏。
// 每块都是**既有事实源的投影 + 入口**(架构 v2 判定式:通向 L2/L3,永不死路),不是裸数据橱窗:
//   今日日更大数字(→职位板)/ 抽选表(pnp_draws,与 /pathways 同源)/ 职业行情卡(与 /api/quiz?top 同一 DAL →/occupations)/
//   政策动态(news →/news)/ 全宽 CTA 带收束回评估主按钮。
// 红线:数字全库内真数,查不到整节不渲;通道名映射不到显官方原文,前端不编翻译。
import { useMemo, useState } from 'react'

import { eeDisplay, eeKeyDisplay, makeT, drawStreamNote } from '../jobs/i18n'
import { useLang } from '../LangProvider'
import { SiteHeader } from '../SiteHeader'
import { SiteFooter } from '../SiteFooter'
import { MarketChart, useMarketStats } from '../stats/charts'
import { shortOcc } from '../quiz/EntryQuiz'
import { JobCard } from '../ui/JobCard'
import { BANNER_IMGS, PageBanner, Tag, UI } from '../ui/primitives'
import { track } from '@/lib/track'

// 「决策引擎目标卡」网格 2026-08-04 摘除(Frank 拍板:答题卡功能摘入口、保留路由)——
// /plan/* 仍可直达,但 landing 不再挂任何入口。占位卡(选城市/学校/专业)随该节一并撤:
// 整节只剩「即将上线」虚线卡=空壳,按站规「空了就整块不渲」处理,不编内容填充。

export type HomeStats = {
  total: number | null; named: number | null; lmia: number | null
  provinces: number | null; cities: number | null; dli: number | null
  occupations: number | null; aipEmployers: number | null
  draws: { date: string; province: string; stream: string; label: string; score: number | null; invitations: number | null }[]
  daily: { date: string; n: number; eligible: number } | null
  news: { date: string; region: string; title: string; slug: string }[]
  latestJobs: { id: number | string; title: string; company: string; city: string; province: string; salaryText: string; pnp: boolean; ee: string; aip: boolean; date: string; noc: string }[]
  checkedAt: string
}

const num = (n: number) => n.toLocaleString('en-CA')
// 日期带年(2026-08-02 Frank「08-02 加上年份啊」):月日单出在跨年边界读不出是今年还是去年,
// 而这页的日期(发帖日/抽选日/公告日)是要拿来判断新鲜度的
const ymd = (iso: string) => (iso || '').slice(0, 10)

// 全宽色带 + 1320 内轨(MongoDB 式分节;带色只用既有 token:白 / 页底灰,蓝 tint 只给 CTA 带)
function Band({ bg, className, children }: { bg?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={'hmBand' + (className ? ' ' + className : '')} style={{ background: bg }}>
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
  const [lang, setLangSaved, t] = useLang()   // 语言/文案:全站一处(LangProvider),初值由服务端 cookie 定

  // 老三问弹框 2026-07-31 在 landing 全下架;目标卡与主 CTA 2026-08-04 一并摘除(见文件头注释)——
  // 这页现在只剩「数据事实 + 进职位板」,不再往答题卡送人。
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

  const pills = [
    stats.total != null ? { v: num(stats.total), label: t('home.st.jobs') } : null,
    stats.aipEmployers != null ? { v: num(stats.aipEmployers), label: t('home.st.aip') } : null,
    stats.dli != null ? { v: String(stats.dli), label: t('home.st.dli') } : null,
  ].filter(Boolean) as { v: string; label: string }[]

  // 抽选行显示:省轮 stream 是官方英文原文 + 中文灰注;联邦轮(province=FED)的 label 是 cat_key,
  // 原先直接出**中文**类别名 —— 同一张表里两种长相(Frank 2026-08-02「只有中文名的改成 上面英文下面中文翻译统一风格」)。
  // 改成一律「英文官方名主文案 + 译名灰注」:主文案拿英文 t 取,灰注拿界面语言 t 取;映射不到就原样回退,不编译文。
  const tEn = useMemo(() => makeT('en'), [])
  const drawMain = (r: HomeStats['draws'][number]) =>
    r.province === 'FED' ? eeKeyDisplay(tEn, r.label) : (r.stream || r.label)
  const drawNote = (r: HomeStats['draws'][number]) => {
    if (lang === 'en') return ''
    if (r.province !== 'FED') return drawStreamNote(r.stream || '', lang)
    const zh = eeKeyDisplay(t, r.label)
    return zh === drawMain(r) ? '' : zh   // 映射不到时中英同字,不重复出一遍
  }

  // flexWrap:375 职位榜三 tab + Top N 挤不进一行(2026-07-31 实拍标题折行、tab 截断)→ 控件整组下折,不压缩不截字
  // 节头分左右两部分(2026-08-02 Frank 看过居中版后拍板「还是要像以前一样分左右两部分 不要居中」):
  // 左=标题与控件,右=「全部职位」顶到最右(marginLeft:auto)。居中版在 375 上把这个链接挤到第二行
  // 单独一行,看着像按钮而不是出口 —— 实拍抓到后撤回
  const secH: React.CSSProperties = { margin: '0 0 18px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10, rowGap: 8, flexWrap: 'wrap', color: UI.text }
  const moreA: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: UI.primary, textDecoration: 'none', whiteSpace: 'nowrap' }
  // 右组(2026-08-02 Frank「top 下拉框放到右边」+「top 10 和 全部职位放一行」):
  // Top N 与链接**包成一个元素**再顶右 —— 各自散着挂时,375 上折行会把它俩拆到两行去;
  // 包起来后整组一起折,永远同一行。auto 也只能给这一个包(两个元素各写 auto 会平分空隙,右组散成两段)
  const hmRight: React.CSSProperties = { marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }
  const th: React.CSSProperties = { fontSize: 11.5, color: UI.text3, fontWeight: 600, textAlign: 'left', padding: '9px 12px', borderBottom: `1px solid ${UI.hairline}`, background: '#fafafa' }
  // 榜单(grid 行)的表头:与抽选表 th 同一套灰底小字,只是走 grid 不走 table —— 列宽仍由 .hmJobRow/.hmOccRow 定
  const headS: React.CSSProperties = { ...th, padding: '9px 14px' }
  const td: React.CSSProperties = { padding: '9px 12px', borderBottom: `1px solid ${UI.hairline}`, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
  const numCell: React.CSSProperties = { textAlign: 'right' }

  return (
    <div style={{ background: UI.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif', color: '#1f2937' }}>
      {/* 分节版式(v3):.hmBand 全宽色带,节内 1320 轨;节纵距 40/72px,节标题 20/24px —— 一节一事不挤屏 */}
      <style>{`
        .hmBand{padding:40px 0}
        /* 矮内容节收紧带高(2026-08-03 Frank「这个 title 不应该贴到上边吗」):节距 72/72 是给
           整屏内容定的,今日日更只有一行数字(130px)—— 撑在 273px 的带子里,标题看着浮在带中间。
           只收这一节,其余节的节奏不动。 */
        .hmBand.hmTight{padding:28px 0}
        .hmBand h2{font-size:20px}
        .hmHero.hmBand{padding:16px 0 0}
        .hmBtn{display:block;border-radius:8px;padding:12px 20px;font-size:14px;font-weight:600;text-align:center;cursor:pointer;text-decoration:none;border:none;font-family:inherit}
        /* 三个数字 = 三张卡(原目标卡节同款长相,该节 2026-08-04 已摘)。
           前两版都错在「裸文字铺灰底」:先是居中(标题在左轨,两条轴打架,右边空 400+px),
           改成等宽分列后又变成三段文字隔着 380px 各自漂,读不成一组
           —— 2026-08-03 Frank 两次实拍打回。这一页所有内容都住在白卡/表格里,
           这节没有容器才是根因,不是留白多少的事。列数随数字个数自适应(eligible/total 可能不渲)。 */
        .hmNums{display:grid;grid-template-columns:1fr 1fr;gap:10px}
        .hmNums b{display:block;font-size:28px;line-height:1.15;font-weight:700}
        .hmCtaBand{display:flex;flex-direction:column;gap:12px}
        /* 榜单:桌面表格 / 手机卡片,两套 DOM 各渲各的(站规「电脑用表格 手机用卡片」)。
           手机卡片走 ui/JobCard(全站唯一那张,与职位板同源)——**这里的 .hmJobRow/.hmOccRow 只管桌面**,
           它们全在 .hmListTable 里,而 .hmListTable 手机端 display:none,所以不必再写断点。 */
        .hmListTable{display:none}
        .hmCards{display:flex;flex-direction:column;gap:8px}
        @media (min-width:900px){ .hmListTable{display:block}.hmCards{display:none} }
        /* 网格定列(2026-07-31 Frank「对齐也比较好吧」)——胶囊、地点、薪资各归各列,不随标题长短漂;
           **译名单独一列**(2026-08-01 队列①:原先紧跟英文名后,位置随英文长短漂)。
           序号列 20px:行里是裸数字,# 只作表头列标(Frank「rank 为什么要带 # 这个符号」)。
           通道列 170px:EE/AIP 进来后要三枚胶囊并排(原 46px 只放得下 PNP 一枚)。 */
        .hmJobRow,.hmOccRow{display:grid;gap:12px;padding:12px 14px;font-size:13.5px;text-decoration:none;color:inherit;align-items:baseline}
        .hmJobRow{grid-template-columns:20px minmax(0,1.1fr) minmax(0,0.8fr) minmax(0,0.9fr) minmax(0,170px) minmax(0,150px) 130px;
          grid-template-areas:"rank title note co pnp loc pay"}
        .hmOccRow{grid-template-columns:20px minmax(0,1fr) minmax(0,0.7fr) 110px minmax(0,150px) 130px;
          grid-template-areas:"rank title note open elig pay"}
        .hmRank{grid-area:rank}.hmTitle{grid-area:title}.hmNote{grid-area:note}.hmPay{grid-area:pay}
        .hmJobRow .hmPnp{grid-area:pnp;display:flex;gap:6px;flex-wrap:wrap}
        .hmJobRow .hmJobCo{grid-area:co}.hmJobRow .hmJobLoc{grid-area:loc}
        .hmOccRow .hmOccOpen{grid-area:open}.hmOccRow .hmOccElig{grid-area:elig}
        /* 职位名/职业名蓝字表示可点、**不加粗**(Frank 2026-08-02):蓝色已说明是入口,再加粗是同一件事说两遍 */
        .hmTitle{color:#2563eb;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .hmNote{font-size:12px}.hmNote:empty{display:none}
        .hmJobLoc,.hmOccOpen,.hmPay{font-size:12.5px;text-align:right}
        /* 表头(2026-08-02 Frank「这个也是需要加一个表头吧」):复用同一 grid 类 → 与数据行天然同列,
           改列宽只改一处;单元格不吃数据行那套色/字号,统一回灰底小字 */
        .hmHead .hmTitle,.hmHead .hmNote,.hmHead .hmJobCo,.hmHead .hmPay,.hmHead .hmJobLoc,.hmHead .hmOccOpen{font-size:11.5px;font-weight:600;color:inherit}
        /* 抽选块照职位板的范式(2026-07-31 Frank「电脑用表格 手机用卡片」):
           五列表格在 375 上通道列只剩 ~100px,通道名一律省略号 —— 手机换成一岗一卡,通道名完整可换行 */
        .hmDrawTable{display:none}
        .hmDrawCards{display:flex;flex-direction:column}
        @media (min-width:900px){ .hmDrawTable{display:table}.hmDrawCards{display:none} }
        @media (min-width:900px){
          .hmBand{padding:72px 0}
          .hmBand.hmTight{padding:40px 0}
          .hmBand h2{font-size:24px}
          .hmHero.hmBand{padding:16px 0 0}
          .hmBtn{padding:13px 28px;font-size:15px}
          .hmNums{grid-template-columns:repeat(auto-fit,minmax(0,1fr));gap:12px}
          .hmNums b{font-size:40px}
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

        {/* ② 决策引擎目标卡节:2026-08-04 摘除(见文件头注释) */}

        {/* ③ 今日日更(灰带,大数字;点数字进职位板)
            节头与其余各节同规:左上角一个光标题,不挂日期灰注(2026-08-03 Frank「不需要日期」——
            全页九个节头只有这一个挂过,而节名已经说了是「今日」,日期是同一件事说两遍)。
            大数字原本居中(「那是这节的焦点排布」)—— 同日实拍推翻:标题在左轨、数字群居中,
            桌面右侧空 400+px,读起来像没排完。改回与标题同轨的等宽分列(排布规则见 .hmNums) */}
        {stats.daily && (
          <Band bg="#fff" className="hmTight">
            <h2 style={secH}>{t('home.daily')}</h2>
            <div className="hmNums">
              {([
                [num(stats.daily.n), t('home.daily.new'), UI.primaryDeep],
                stats.daily.eligible > 0 ? [num(stats.daily.eligible), t('home.daily.elig'), UI.ok] : null,
                stats.total != null ? [num(stats.total), t('home.daily.total'), UI.text] : null,
              ].filter(Boolean) as [string, string, string][]).map(([v, label, color]) => (
                <a key={label} href="/" className="cardHover"
                  style={{ display: 'block', minWidth: 0, background: UI.card, border: `1px solid ${UI.border}`, borderRadius: 10, padding: '14px 16px', textDecoration: 'none', color: 'inherit' }}>
                  <b style={{ color }}>{v}</b>
                  <span style={{ fontSize: 12.5, color: UI.text2 }}>{label}</span>
                </a>
              ))}
            </div>
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
              <span style={hmRight}>
                <select value={jobsN} onChange={(e) => setJobsN(Number(e.target.value))}
                  style={{ height: 30, border: `1px solid ${UI.border}`, borderRadius: 8, background: '#fff', fontSize: 12.5, color: '#374151', padding: '0 6px' }}>
                  <option value={10}>Top 10</option><option value={20}>Top 20</option><option value={50}>Top 50</option>
                </select>
                <a href="/" style={moreA} onClick={() => track('landing_goal_jobs')}>{t('home.jobs.all')}</a>
              </span></h2>
            {/* 桌面=表格、手机=卡片(站规「电脑用表格 手机用卡片」),两套 DOM 各渲各的:
                卡片的行序与字段取舍本来就与表格不同,硬用同一份 DOM 会两头将就(此前实测:
                卡片要的发布日期挤不进七列表格,表格要的名次在卡上是重复)。
                卡片一律用 ui/JobCard —— 全站唯一那张,与职位板同源(2026-08-02 Frank「以后这个定死」)。 */}
            <div className="hmListTable" style={{ background: UI.card, border: `1px solid ${UI.border}`, borderRadius: 12, overflow: 'hidden' }}>
              {/* 译名列表头留空 —— 它是上一列名字的中文注,英文界面本就没内容,不给空列硬编标签 */}
              {jobsTab !== 'new' ? (
                <div className="hmOccRow hmHead" style={headS}>
                  <span className="hmRank">#</span>
                  <span className="hmTitle">{t('quiz.step2')}</span>
                  <span className="hmNote" />
                  <span className="hmOccOpen">{t('stats.openJobs')}</span>
                  <span className="hmOccElig">{t('stats.named')}</span>
                  <span className="hmPay">{t('col.salaryYr')}</span>
                </div>
              ) : (
                <div className="hmJobRow hmHead" style={headS}>
                  <span className="hmRank">#</span>
                  <span className="hmTitle">{t('col.title')}</span>
                  <span className="hmNote" />
                  <span className="hmJobCo">{t('col.company')}</span>
                  <span className="hmPnp">{t('col.score')}</span>
                  <span className="hmJobLoc">{t('col.city')}</span>
                  <span className="hmPay">{t('col.salary')}</span>
                </div>
              )}
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
                      <span className="hmRank" style={{ fontSize: 12.5, fontWeight: 700, color: i < 3 ? UI.primary : UI.text3 }}>{i + 1}</span>
                      <span className="hmTitle" title={main} style={{ minWidth: 0 }}>{main}</span>
                      {/* 译名自己一列:跟着列走,不再随英文名长短漂(2026-08-01 Frank 队列①) */}
                      <span className="hmNote" title={note} style={{ color: UI.text3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{note ? shortOcc(note) : ''}</span>
                      <span className="hmOccOpen" style={{ color: UI.text2, whiteSpace: 'nowrap' }}>{o.openJobs != null ? t('quiz.openN', { n: o.openJobs.toLocaleString('en-CA') }) : ''}</span>
                      <span className="hmOccElig" style={{ color: UI.ok, fontSize: 12.5, whiteSpace: 'nowrap', textAlign: 'right' }}>{o.namedJobs ? t('quiz.eligN', { n: o.namedJobs.toLocaleString('en-CA') }) : ''}</span>
                      {/* 薪资=ESDC 官方低–高位区间(Frank 2026-07-31「改成范围」;口径同中位:岗位加权取中位);
                          区间列未灌到(部署时序)回退「中位 $NK」,再不行留空 —— 宁可留空不瞎猜 */}
                      <span className="hmPay" title={t('home.jobs.rangeTip')} style={{ whiteSpace: 'nowrap' }}>
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
                  <span className="hmRank" style={{ fontSize: 12.5, fontWeight: 700, color: i < 3 ? UI.primary : UI.text3 }}>{i + 1}</span>
                  <span className="hmTitle" title={j.title} style={{ minWidth: 0 }}>{j.title}</span>
                  <span className="hmNote" title={note} style={{ color: UI.text3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{note ? shortOcc(note) : ''}</span>
                  <span className="hmJobCo" style={{ color: UI.text2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{j.company}</span>
                  {/* 通道胶囊排(Frank 2026-08-02「除了 pnp 能走 ee aip 的胶囊也加上」):三个正向信号并列。
                      职位板卡上还有「本省不受理」「久未抽选」等否定态,那要排除清单 + 抽选历史两份数据,
                      landing 不带这两份 —— 这里只报「能走」,不报「走不了」(宁可不说,不说错) */}
                  <span className="hmPnp">
                    {j.pnp ? <Tag variant="ok">PNP</Tag> : null}
                    {j.ee ? <Tag variant="region">{'EE ' + eeDisplay(t, j.ee)}</Tag> : null}
                    {j.aip ? <Tag variant="warn">AIP</Tag> : null}
                  </span>
                  <span className="hmJobLoc" style={{ color: UI.text2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{j.city ? `${j.city}, ${j.province}` : j.province}</span>
                  <span className="hmPay" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{j.salaryText}</span>
                </a>
                )
              })}
            </div>
            {/* 手机卡片列表:与职位板同一张 JobCard。landing 整卡只有一个去处(职位详情/按 NOC 筛),
                所以不传逐字段 onClick —— 组件里不可点的字段自动渲成纯文本,不假装成入口 */}
            <div className="hmCards">
              {jobsTab !== 'new' ? (
                occList === null
                  ? <div style={{ height: 92 * jobsN }} />
                  : occList.slice(0, jobsN).map((o) => {
                    const main = o.titleEn || o.titleZh || o.noc
                    const note = lang === 'zh' ? (o.titleZhShort || o.titleZh) : lang === 'ko' ? o.titleKo : ''
                    const pay = o.wageLowAnnual != null && o.wageHighAnnual != null
                      ? `$${Math.round(o.wageLowAnnual / 1000)}K–$${Math.round(o.wageHighAnnual / 1000)}K`
                      : o.medianWageAnnual != null ? t('home.jobs.med', { v: '$' + Math.round(o.medianWageAnnual / 1000) + 'K' }) : ''
                    return (
                      <JobCard key={o.noc} href={`/?q=${o.noc}`} title={{ text: main }}
                        note={note ? shortOcc(note) : undefined}
                        company={o.openJobs != null ? { text: t('quiz.openN', { n: o.openJobs.toLocaleString('en-CA') }) } : undefined}
                        salary={pay || undefined} />
                    )
                  })
              ) : stats.latestJobs.slice(0, jobsN).map((j) => {
                const note = nocNote(j.noc)
                const chips = [
                  j.pnp ? <Tag key="pnp" variant="ok">PNP</Tag> : null,
                  j.ee ? <Tag key="ee" variant="region">{'EE ' + eeDisplay(t, j.ee)}</Tag> : null,
                  j.aip ? <Tag key="aip" variant="warn">AIP</Tag> : null,
                ].filter(Boolean)
                return (
                  <JobCard key={j.id} href={`/jobs/${j.id}`} title={{ text: j.title }}
                    note={note ? shortOcc(note) : undefined}
                    company={j.company ? { text: j.company } : undefined}
                    salary={j.salaryText || undefined}
                    location={j.city ? `${j.city}, ${j.province}` : j.province}
                    date={ymd(j.date)}
                    chips={chips.length ? chips : undefined} />
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
                <span style={hmRight}>
                  <TopN v={drawsN} on={setDrawsN} max={stats.draws.length} />
                  <a href="/pathways" style={moreA}>{t('pw.entry')}</a>
                </span></h2>
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
                          <td style={{ ...td, ...(last && { borderBottom: 'none' }) }}>{ymd(r.date)}</td>
                          <td style={{ ...td, ...(last && { borderBottom: 'none' }) }}><Tag>{r.province === 'FED' ? 'EE' : r.province}</Tag></td>
                          {/* 通道名双语(队列⑤):官方英文名为主,译名灰字第二行 —— 加一列会把已经很窄的
                              通道列再切一半,长名字全成省略号;英文界面无第二行(国际化口径) */}
                          <td style={{ ...td, ...(last && { borderBottom: 'none' }), whiteSpace: 'normal' }} title={drawMain(r)}>
                            <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{drawMain(r)}</span>
                            {drawNote(r) ? (
                              <span style={{ display: 'block', fontSize: 11.5, color: UI.text3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{drawNote(r)}</span>
                            ) : null}
                          </td>
                          <td style={{ ...td, ...numCell, ...(last && { borderBottom: 'none' }) }}>{r.score != null ? num(r.score) : '—'}</td>
                          <td style={{ ...td, ...numCell, ...(last && { borderBottom: 'none' }) }}>{r.invitations != null ? num(r.invitations) : '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {/* 手机卡片:与职位榜/职业榜卡同一范式(左信息右数字,详见 .hmJobRow 那段注释)——
                    行1 左 省胶囊+日期、右 分数线与邀请;行2 通道名整行(不截、可折);行3 译名灰注(空则不占行)。
                    两个数字同挂行1 右侧:英文界面没有译名,行3 一空,邀请数就孤零零吊在下面白一行(实拍抓到) */}
                <div className="hmDrawCards">
                  {stats.draws.slice(0, drawsN).map((r, i) => (
                    <div key={i} style={{ padding: '12px 14px', borderBottom: i === Math.min(drawsN, stats.draws.length) - 1 ? 'none' : `1px solid ${UI.hairline}` }}>
                      {/* 通道名与职位卡主名同字号(14.5/600),但**不上蓝**:抽选行不可点,蓝色会假装成链接 */}
                      <div style={{ fontSize: 14.5, fontWeight: 600, lineHeight: 1.35 }}>{drawMain(r)}</div>
                      {/* 译名紧跟通道名下面(与职位/职业卡同序:名 → 译名 → 信息行) */}
                      {drawNote(r) ? (
                        <div style={{ fontSize: 11.5, color: UI.text3, lineHeight: 1.4 }}>{drawNote(r)}</div>
                      ) : null}
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
            {/* 这节没有 Top N,右组只有链接一个 —— 仍走同一个包,不另写一套 */}
            <h2 style={secH}>{t('mkt.title')}<span style={hmRight}><a href="/stats" style={moreA}>{t('home.stats.more')}</a></span></h2>
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
                <span style={hmRight}>
                  <TopN v={newsN} on={setNewsN} max={stats.news.length} />
                  <a href="/news" style={moreA}>{t('home.pulse.all')}</a>
                </span></h2>
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
          </Band>
        )}

        {/* ⑦ 全宽 CTA 带:数据节收束回主按钮(架构 v2 判定式——数据是证据,行动是评估) */}
        <div className="hmBand" style={{ background: 'linear-gradient(100deg,#eff6ff,#dbeafe)' }}>
          <div className="hmCtaBand" style={{ maxWidth: 1320, margin: '0 auto', padding: '0 1.25rem', boxSizing: 'border-box' }}>
            <span style={{ flex: 1 }}>
              <span style={{ fontSize: 17, fontWeight: 700, color: UI.primaryDeep, display: 'block', marginBottom: 4 }}>{t('home.cta2.t')}</span>
              <span style={{ fontSize: 13, color: UI.text2 }}>{t('home.cta2.s')}</span>
            </span>
            {/* 按钮从 hero 挪到这(2026-07-30 Frank「这两个按钮放到最下面」)。
                主按钮(→ /plan/pr,埋点 landing_cta_quiz)2026-08-04 摘除:答题卡摘入口、保留路由。
                只剩「进职位板」一个去处,带文案随之改准(不再写「答几道题」) */}
            <a className="hmBtn" style={{ background: UI.primary, color: '#fff' }}
              href="/" onClick={() => track('landing_cta_browse')}>{t('home.ctaBrowse')}</a>
          </div>
        </div>
      </main>
      {/* 免责与数据来源都在页脚(全站同一条),页内不再重复写 */}
      <SiteFooter t={t} />

    </div>
  )
}
