'use client'
// 榜单视图(E5-02):纯渲染(计算在 ETL);三语壳;岗位行链官方原帖,公司行链官网。
// RankingTable = 内容单一来源(E8-02):页面版与 /jobs 榜单弹窗共用,不许 fork。
import { streamDisplay, eeDisplay, type TFn } from '@/lib/i18n'
import { useLang } from '../LangProvider'
import { Header } from '../Header'
import { Footer } from '../Footer'
import { BANNER_IMGS, Card, CardAction, CardKV, Banner } from '../ui'
import { JobCard } from '../ui'
import { Table } from '../ui'
import { IconChart } from '../Icons'
import { BROAD_SLUGS, slugToBroad } from '@/lib/stats'

export type RankRow = {
  rank: number; kind: string; externalId: string
  title: string; company: string; city: string; province: string
  noc: string; teer: number | null; score: number | null
  salaryText: string; salaryAnnual: number | null
  pnpStream: string; eeCategory: string; datePosted: string
  applyUrl: string; officialUrl: string
  openJobs: number | null; namedJobs: number | null; avgScore: number | null
  lmiaPositions: number | null; lmiaQuarter: string  // #21(第 17 轮):第一排序键上榜可见
}

// ── E8-08 #121 手机域卡(按逻辑拆):公司榜卡 / 职位榜卡——#排名进标题行,数字语义色与桌面列一致 ──
function RankCompanyCard({ r, t, showNamed }: { r: RankRow; t: TFn; showNamed: boolean }) {
  return (
    <Card>
      <div style={{ fontSize: 14.5, fontWeight: 600 }}>
        <span style={{ color: '#9ca3af', fontWeight: 400 }}>#{r.rank}</span>{' '}
        {r.officialUrl ? <a href={r.officialUrl} target="_blank" rel="noreferrer" style={{ color: '#2563eb', textDecoration: 'none' }}>{r.company}</a> : r.company}
      </div>
      {r.province ? <div style={{ fontSize: 12.5, color: '#6b7280', marginTop: 2 }}>{r.province}</div> : null}
      <CardKV items={[
        { k: t('rank.col.lmia'), v: r.lmiaPositions ? <span style={{ fontWeight: 600, color: '#15803d' }}>{r.lmiaPositions}</span> : <span style={{ color: '#9ca3af' }}>—</span> },
        ...(r.lmiaQuarter ? [{ k: t('dir.col.quarter'), v: <span style={{ color: '#9ca3af' }}>{r.lmiaQuarter}</span> }] : []),
        ...(showNamed ? [{ k: t('rank.col.namedJobs'), v: <span style={{ fontWeight: 600, color: '#b45309' }}>{r.namedJobs}</span> }] : []),
        { k: t('rank.col.openJobs'), v: r.openJobs ?? '—' },
        { k: t('rank.col.avgScore'), v: r.avgScore ?? '—' },
      ]} />
      <CardAction><a href={`/?q=${encodeURIComponent(r.company)}`} style={{ color: '#2563eb', textDecoration: 'none' }}>{t('rank.viewJobs')}</a></CardAction>
    </Card>
  )
}
// 2026-08-11(Frank「都改成一套」):榜单职位卡原本自己拼了一张(Card+CardKV 的 KV 网格)——
// 同一个岗在职位板和榜单上长两个样。改吃 ui/JobCard(全站唯一那张职位卡,08-02 拍板)。
// 槽位映射:#排名 → action(标题行右上),移民价值分 → footer(带标签,裸数字没上下文=#200 教训)。
function RankJobCard({ r, t }: { r: RankRow; t: TFn }) {
  return (
    <JobCard
      title={{ text: r.title, href: r.applyUrl || undefined, target: r.applyUrl ? '_blank' : undefined }}
      action={<span style={{ color: '#9ca3af', fontSize: 12.5 }}>#{r.rank}</span>}
      company={r.company ? { text: r.company } : undefined}
      salary={r.salaryText || undefined}
      location={[r.city, r.province].filter(Boolean).join(', ') || undefined}
      date={(r.datePosted || '').slice(0, 10) || undefined}
      // #215(第 26 轮体检续):标签原用 col.score(=「通道」),值却是旧 0-100 分 —— 名实不符,换回榜单口径名
      footer={r.score != null ? `${t('rank.col.score')} ${r.score}` : undefined}
    />
  )
}

/** 更新时间 + 口径说明 + 榜单表(页面/弹窗共用;壳与标题由宿主渲) */
export function RankingTable({ slug, items, t }: { slug: string; items: RankRow[]; t: TFn }) {
  const isCompany = slug === 'sponsor-likely'
  // 第 2 轮 #7 核查:LMIA 强雇主与省提名清单命中长期不重叠(全库 436 命中岗,30 强全 0)——
  // 整列 0 像坏数据,全零时藏列;哪天数据重叠了自动恢复,排序键不受影响(ETL 侧)。
  const showNamed = isCompany && items.some((i) => (i.namedJobs ?? 0) > 0)
  // 「更新于」= 榜内最新发布日(第 11 轮 #30),但**不超过今天**(第 12 轮 #32:帖面日期是 ET 时区
  // 可到「明天」,「更新于未来」损口径可信度)——用浏览者本地日期封顶
  // #218(第 28 轮体检:生产 console React #418 文本不一致,本地 dev 复现不出):
  // 这行在**服务端(Render 跑 UTC)和浏览器(用户本地时区)各算一次** —— UTC 已过午夜而用户还在前一天时,
  // 两端渲染出的日期不同 → hydration 文本不匹配。数据本身就是 ET 口径(帖面日期),索性两端都按 ET 算。
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Toronto' })  // en-CA = YYYY-MM-DD
  const maxPosted = items.reduce((m, i) => (i.datePosted && i.datePosted > m ? i.datePosted : m), '').slice(0, 10)
  const updated = (maxPosted && maxPosted < today ? maxPosted : today)
  return (
    <>
      <div style={{ fontSize: 12.5, color: '#9ca3af', margin: '6px 0 4px' }}>{t('rank.updated', { d: updated })}</div>
      {/* #198(Frank「删掉」周榜口径注):note 为空则整行不渲(空键=已删) */}
      {(() => { const nk = slug.startsWith('daily-top') ? 'rank.note.daily-top' : 'rank.note.' + slug; const nv = t(nk); return nv && nv !== nk ? <div style={{ fontSize: 12.5, color: '#6b7280', marginBottom: 16 }}>{nv}</div> : null })()}
      {/* 组件统一 P2 余批(#110):换公共 Table;E8-08 #121:≤640 换域卡(CSS 双渲染) */}
      <div className="tcCards">
        {items.map((r) => isCompany ? <RankCompanyCard key={r.rank} r={r} t={t} showNamed={showNamed} /> : <RankJobCard key={r.rank} r={r} t={t} />)}
      </div>
      <div className="tcTableWrap">
      {isCompany ? (
        <Table<RankRow> rows={items} rowKey={(r) => String(r.rank)} cols={[
          { key: 'rank', label: '#', nowrap: true, sort: (r) => r.rank, render: (r) => <span style={{ color: '#9ca3af' }}>{r.rank}</span> },
          // #199(Frank「多余的跳转都删掉」):公司名 ↗ 官网外链撤,纯文字
          { key: 'company', label: t('rank.col.company'), sort: (r) => r.company.toLowerCase(), render: (r) => <span style={{ fontWeight: 600 }}>{r.company}</span> },
          // #48(第 18 轮):跨省雇主(如加拿大军队)province 为空,裸空像渲染缺陷 → 占位「—」
          { key: 'prov', label: t('col.province'), nowrap: true, sort: (r) => r.province || null, render: (r) => r.province || <span style={{ color: '#9ca3af' }}>—</span> },
          // #21:第一排序键(近两年 LMIA 技能股获批职位数)上榜可见;最近获批季度独立灰行
          { key: 'lmia', label: t('rank.col.lmia'), nowrap: true, sort: (r) => r.lmiaPositions ?? null, render: (r) => r.lmiaPositions
            ? <><span style={{ fontWeight: 600, color: '#15803d' }}>{r.lmiaPositions}</span>{r.lmiaQuarter && <div style={{ color: '#9ca3af', fontSize: 11.5 }}>{r.lmiaQuarter}</div>}</>
            : <span style={{ color: '#9ca3af' }}>—</span> },
          ...(showNamed ? [{ key: 'named', label: t('rank.col.namedJobs'), sort: (r: RankRow) => r.namedJobs ?? null, render: (r: RankRow) => <span style={{ fontWeight: 600, color: '#b45309' }}>{r.namedJobs}</span> }] : []),
          { key: 'open', label: t('rank.col.openJobs'), sort: (r) => r.openJobs ?? null, render: (r) => <>{r.openJobs}</> },
          { key: 'avg', label: t('rank.col.avgScore'), sort: (r) => r.avgScore ?? null, render: (r) => <>{r.avgScore ?? '—'}</> },
          { key: 'go', label: '', nowrap: true, render: (r) => <a href={`/?q=${encodeURIComponent(r.company)}`} style={{ color: '#2563eb', textDecoration: 'none', fontSize: 12.5 }}>{t('rank.viewJobs')}</a> },
        ]} />
      ) : (
        <Table<RankRow> rows={items} rowKey={(r) => String(r.rank)} cols={[
          { key: 'rank', label: '#', nowrap: true, sort: (r) => r.rank, render: (r) => <span style={{ color: '#9ca3af' }}>{r.rank}</span> },
          { key: 'title', label: t('col.title'), sort: (r) => r.title.toLowerCase(), render: (r) => <span style={{ fontWeight: 600, display: 'inline-block', maxWidth: 320 }}>{r.applyUrl ? <a href={r.applyUrl} target="_blank" rel="noreferrer" style={{ color: '#2563eb', textDecoration: 'none' }}>{r.title}</a> : r.title}</span> },
          { key: 'company', label: t('col.company'), sort: (r) => r.company.toLowerCase(), render: (r) => <>{r.company}</> },
          { key: 'city', label: t('col.city'), nowrap: true, sort: (r) => r.city || null, render: (r) => <>{[r.city, r.province].filter(Boolean).join(', ')}</> },
          { key: 'salary', label: t('col.salary'), nowrap: true, sort: (r) => r.salaryAnnual ?? null, render: (r) => <span style={{ color: '#15803d' }}>{r.salaryText || '—'}</span> },
          // #199(Frank「拆成两列」):PNP/EE 合并列拆为 PNP、EE 两列(与主表列名同源)
          { key: 'pnp', label: t('col.pnp'), render: (r) => r.pnpStream ? <span style={{ fontSize: 12 }}>{streamDisplay(t, r.pnpStream)}</span> : <span style={{ color: '#9ca3af' }}>—</span> },
          { key: 'ee', label: t('col.ee'), render: (r) => r.eeCategory ? <span style={{ fontSize: 12 }}>{eeDisplay(t, r.eeCategory)}</span> : <span style={{ color: '#9ca3af' }}>—</span> },
          // #199(Frank「这个通道没人知道什么意思」):此列实为 0-100 移民价值分(非 1-5 通道档),relabel「移民价值分」
          { key: 'score', label: t('rank.col.score'), sort: (r) => r.score ?? null, render: (r) => <span style={{ fontWeight: 600 }}>{r.score ?? '—'}</span> },
          { key: 'date', label: t('col.datePosted'), nowrap: true, sort: (r) => r.datePosted || null, render: (r) => <span style={{ color: '#9ca3af', fontSize: 12.5 }}>{(r.datePosted || '').slice(0, 10)}</span> },
        ]} />
      )}
      </div>
    </>
  )
}

// 每日分类榜(E9-02):slug 段 → 大类 zh。slug 表只有一份(lib/stats 的 BROAD_SLUGS,
// 它自己镜像 etl/noc_buckets.SLUGS),这里不再抄一遍。
const rankTitle = (t: TFn, slug: string): string => {
  if (!slug.startsWith('daily-top')) return t('rank.title.' + slug)
  const zh = slugToBroad(slug.replace('daily-top-', ''))
  return t('rank.title.daily-top') + (zh ? '　' + t('broad.' + zh) : '')
}

export function Ranking({ slug, items, slugs = [] }: { slug: string; items: RankRow[]; slugs?: string[] }) {
  const [lang, setLangSaved, t] = useLang()   // 语言/文案:全站一处(LangProvider),初值由服务端 cookie 定
  // 有数据的榜单清单(导航与 banner 数字块共用)
  // B2:sponsor-likely 摘出榜单 tab(路由 301 → /employers?sort=skilled,担保雇主页承接)
  const boards = ['daily-top', ...BROAD_SLUGS.map(([s]) => `daily-top-${s}`), 'weekly-top']
    .filter((x) => x === slug || slugs.includes(x) || x === 'weekly-top')

  return (
    <div style={{ background: '#f9fafb', minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif', color: '#1f2937' }}>
      {/* 顶栏换全站共享 Header(2026-07-11 用户指出子页 header 与 /jobs 样式不一致) */}
      <Header lang={lang} setLang={setLangSaved} t={t} active="rank" />

      {/* #67 宽度统一:1100 → 1320 与头轨/职位板同宽 */}
      <div style={{ maxWidth: 1320, width: '100%', boxSizing: 'border-box', margin: '1rem auto 2rem', padding: '0 1.25rem' }}>
        {/* 页头=Banner(#65 五模块统一浅色带,榜单=金) */}
        <Banner module="rank" icon={<IconChart />} title={rankTitle(t, slug)} images={BANNER_IMGS.rank}
          sub={t('rank.bnSub')} stats={[{ v: boards.length, label: t('rank.bnBoards') }, { v: items.length, label: t('rank.bnRows') }]} />
        {/* 榜单导航(E9-02 分类榜矩阵):只列当前有数据的榜;当前榜加粗黑。
            #61(2026-07-19 Frank 拍板「就是那个意思」):从页底挪到页头下方——导航是切换入口不是脚注 */}
        {/* #300(第 38 轮):40 → 44 触控靶站规下限 */}
        <style>{'@media (max-width:640px){.rkTabs a,.rkTabs span{min-height:44px;display:inline-flex;align-items:center}}'}</style>
        <div className="rkTabs" style={{ margin: '0 0 12px', fontSize: 12.5, display: 'flex', flexWrap: 'wrap', gap: '6px 14px' }}>
          {/* #210(第 26 轮):当前榜原来也是链到自己的 <a>(点不动的链接,同 #205 页签)→ 当前榜=span。
              与页头同名不算废话:这是「你在哪一榜」的定位,删了反而不知道站在哪 */}
          {boards
            .map((x) => (x === slug
              ? <span key={x} style={{ color: '#111827', fontWeight: 700, whiteSpace: 'nowrap' }}>{rankTitle(t, x)}</span>
              : <a key={x} href={`/rankings/${x}`} style={{ color: '#2563eb', textDecoration: 'none', whiteSpace: 'nowrap' }}>{rankTitle(t, x)}</a>
            ))}
        </div>
        <RankingTable slug={slug} items={items} t={t} />
      </div>
      <Footer t={t} />
    </div>
  )
}
