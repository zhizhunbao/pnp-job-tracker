'use client'
// 公司:AI 检索简介、四维评分、在招岗位、相似雇主、公司弹框。
// 与 /companies/[slug] 详情页**同源**——CompanyBody 两边共用,弹框只是把它套进浮层。
// 「担保 None=无记录 ≠ 不担保」是这里的语义红线(灰句写明),别把没数据说成负判定。
import { useEffect, useState } from 'react'

import { IconCompass, IconMap } from '../Icons'
import { PILL_BTN, gradeColor, link } from '../ui'
import { FG_K, FG_N, FG_V, FLAT_BODY, FLAT_HEAD, FLAT_SEC, FactGrid, FactRow, MODAL_CARD, MODAL_CARD_HEAD } from './Facts'
import { JD_ZH_LINE, JdAdvisorSection, isJdNone } from './Jd'
import { SponsorLeadCard } from './Pnp'
import { TvEntryCard } from './TripleVerdictModal'
import { makeT, type Lang, type TFn } from './i18n'
import type { CoGradeDetail, JobRow, Plan } from './types'
import type { CompanyDetail, SimilarEmployer } from '@/lib/jobsSql'   // E8-11 B1:公司域同源数据形状(type-only,不拉服务端码)
import { mapsUrl, provName } from '@/lib/location'
import { track } from '@/lib/track'

// #158:公司简介三节([WHAT]/[BASE]/[SIZE])。K 公司懒探索(2026-07-19 Frank 批):首开自动调查
// (命中缓存秒回);查不到/掉线整块消失不留孤儿。
// 2026-07-21 Frank「公司弹框参考类别重新设计」:嵌套小盒退役 → 每节一卡带题(与分类弹框同规范);
// 信息出处 URL 列表撤(同日「去掉 source 链接」);AI 检索声明=卡组上方一行灰注。
const CO_SECS: [string, string][] = [['WHAT', 'co.f.what'], ['BASE', 'co.f.base'], ['SIZE', 'co.f.size'], ['FOUNDED', 'co.f.founded'], ['NOTE', 'co.f.note']]
// 公司 AI 检索简介渲染(纯展示,#181 抽出):弹框(fetch 后)与公司详情页(服务端 ai_brief)共用。
// 五节标记切卡;存量散文(无标记)整段一卡;缺项不占卡;检索声明+官网小注。brief 空=null。
const coParseSecs = (s: string): Record<string, string> => {
  const parts = s.split(/\[(WHAT|BASE|SIZE|FOUNDED|NOTE)\]/)
  const secs: Record<string, string> = {}
  for (let i = 1; i + 1 <= parts.length - 1; i += 2) secs[parts[i]] = (parts[i + 1] || '').trim()
  return secs
}
// flat=公司弹框扁平(#186 Frank「先别用卡片」,无卡框);默认 false=公司详情页仍用 MODAL_CARD。
// bare(#197 Frank「合并」):只出简介内容体(不带自己的标题/AI声明/外壳/官网),供合并进「公司」块;声明由调用方在顶部渲。
export function CompanyBriefCards({ brief, website, fetched, t, trans, flat, sources, bare, skipBase }: { brief: string; website: string; fetched: string; t: TFn; trans?: string; flat?: boolean; sources?: string[]; bare?: boolean; skipBase?: boolean }) {
  // #191(Frank「懒查的原文我需要保留显示出来吧」):AI 检索简介的「原文」=检索来源网页(ai_sources 一直在存,
  // 7-21 撤的只是裸 URL 平铺)。对齐 JD「看原文」的收纳法:声明行挂「看来源 ▾」折叠钮,点开一行一条,默认不脏版面。
  const [showSrc, setShowSrc] = useState(false)
  if (!brief) return null
  const wrap: React.CSSProperties = flat ? FLAT_SEC : MODAL_CARD
  const head: React.CSSProperties = flat ? FLAT_HEAD : MODAL_CARD_HEAD
  const srcList = (sources || []).filter((u) => /^https?:\/\//i.test(u))
  {/* 检索日期=空格灰注(W 规矩禁「·」杂糅,与剩余次数注同款) */}
  const attribution = (
    <div style={{ margin: '2px 0 8px', fontSize: 11.5, color: '#9ca3af' }}>
      ✨ {t('fact.aiIntro')}{fetched ? <span style={{ marginLeft: 8 }}>{fetched}</span> : null}
      {srcList.length ? (
        <button onClick={() => setShowSrc((v) => !v)} style={{ border: 'none', background: 'none', padding: 0, marginLeft: 8, color: '#2563eb', cursor: 'pointer', fontSize: 11.5, fontWeight: 600 }}>{showSrc ? t('fact.aiSrcHide') : t('fact.aiSrc')}</button>
      ) : null}
      {showSrc ? srcList.map((u) => (
        <div key={u} style={{ overflowWrap: 'anywhere', marginTop: 2 }}><a href={u} target="_blank" rel="noreferrer" style={{ color: '#6b7280', textDecoration: 'none' }}>{u}</a></div>
      )) : null}
    </div>
  )
  const site = website ? (
    <div style={{ marginTop: 6, ...(flat ? FLAT_BODY : {}) }}>
      <a href={website} target="_blank" rel="noreferrer" style={{ ...link, fontSize: 12.5, overflowWrap: 'anywhere' }}>{website}</a>
      <span style={{ marginLeft: 6, color: '#9ca3af', fontSize: 11 }}>{t('fact.aiSite')}</span>
    </div>
  ) : null
  // 中文对照(#185 Frank「点了才在下面显示中文」):英文段下挂译文段(蓝条,与 JD 逐句对照同规范);同文不渲
  const tSecs = trans ? coParseSecs(trans) : null
  const zhBlock = (m: string, en: string) => {
    const z = tSecs?.[m]?.trim()
    return z && !isJdNone(z) && z !== en ? <div style={{ ...JD_ZH_LINE, marginTop: 3, fontSize: 12.5 }}>{z}</div> : null
  }
  // #188:flat=对齐 JD 整理版——节内小标题走 JD 次级头样式(粗体 #374151 不缩进),正文缩进 14
  const secHead: React.CSSProperties = flat ? { fontWeight: 700, color: '#374151' } : { fontWeight: 700, color: '#111827', fontSize: 13 }
  const secBody: React.CSSProperties = flat ? FLAT_BODY : { fontSize: 12.5, color: '#4b5563', lineHeight: 1.7, marginTop: 1 }
  // 内容体(bare 复用):存量散文(无标记)整段;否则五节各带加粗小标题
  const isProse = !/\[(WHAT|BASE|SIZE|FOUNDED|NOTE)\]/.test(brief)
  const secs = coParseSecs(brief)
  const has = (m: string) => !isJdNone(secs[m])
  const zProse = trans?.trim()
  const bodyNode = isProse ? (
    <div style={{ ...secBody, whiteSpace: 'pre-wrap' }}>
      {brief}
      {zProse && zProse !== brief.trim() ? <div style={{ ...JD_ZH_LINE, marginTop: 3, fontSize: 12.5, whiteSpace: 'pre-wrap' }}>{zProse}</div> : null}
    </div>
  ) : (
    <>
      {CO_SECS.map(([m, key]) => {
        if (!has(m)) return null   // 缺项不占行(宁可留空)
        if (skipBase && m === 'BASE') return null   // #199:数据库有精确地址时,AI「所在地」让位不重复
        return (
          <div key={m} style={{ marginBottom: flat ? 2 : 8 }}>
            <div style={secHead}>{t(key)}</div>
            <div style={secBody}>
              {secs[m].trim()}
              {zhBlock(m, secs[m].trim())}
            </div>
          </div>
        )
      })}
    </>
  )
  // bare(#197):只出内容体,合并进「公司」块(标题/AI声明/官网由调用方处理)
  if (bare) return bodyNode
  return (
    <div style={wrap}>
      <div style={head}>{t('fact.coIntro')}</div>
      {attribution}
      {bodyNode}
      {site}
    </div>
  )
}

// #158 K 公司懒探索(2026-07-19 Frank 批):弹框侧 fetch 包装——首开自动调查(命中缓存秒回);
// 查不到/掉线整块消失不留孤儿;渲染委托 CompanyBriefCards(与公司详情页同源)。
export function CompanyAiSection({ company, t, showTrans, lang, flat, bare, skipBase }: { company: string; t: TFn; showTrans?: boolean; lang?: Lang; flat?: boolean; bare?: boolean; skipBase?: boolean }) {
  const [d, setD] = useState<undefined | null | { brief: string; website: string; sources: string[]; fetched: string }>(undefined)
  const [trans, setTrans] = useState<string | null>(null)
  const [showSrc, setShowSrc] = useState(false)   // 看来源折叠(新查/懒查路径也要有,Frank 2026-07-24 报「新的 AI 调查看来源没了」)
  useEffect(() => {
    let dead = false
    setD(undefined); setTrans(null)
    fetch('/api/companyinfo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: company }) })
      .then((r) => (r.ok && r.status === 200 ? r.json() : null))
      .then((x) => { if (!dead) setD(x && x.brief ? x : null) })
      .catch(() => { if (!dead) setD(null) })
    return () => { dead = true }
  }, [company])
  // 中文对照(#185):showTrans 打开且未翻过 → 拉 co-translate(懒翻,拿到存一份切换零延迟)
  useEffect(() => {
    if (!showTrans || trans != null || !d || lang === 'en' || !lang) return
    let dead = false
    fetch('/api/co-translate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: company, lang }) })
      .then((r) => r.json().catch(() => null))
      .then((x) => { if (!dead && x?.ok && x.text) setTrans(x.text) })
      .catch(() => {})
    return () => { dead = true }
  }, [showTrans, trans, d, lang, company])
  if (d === null) return null
  if (d === undefined) return <div style={{ margin: '2px 0 12px', fontSize: 12.5, color: '#9ca3af' }}>✨ {t('fact.aiWorking')}</div>
  // bare(#197):懒查命中在合并「公司」块内出——顶部 body 无缓存无法预挂声明,故在此处紧贴内容渲一行 AI 声明(仍守披露红线)
  if (bare) return (
    <>
      <div style={{ margin: '2px 0 6px', fontSize: 11.5, color: '#9ca3af' }}>✨ {t('fact.aiIntro')}{d.fetched ? <span style={{ marginLeft: 8 }}>{d.fetched}</span> : null}
        {(d.sources || []).filter((u) => /^https?:\/\//i.test(u)).length ? <button onClick={() => setShowSrc((v) => !v)} style={{ border: 'none', background: 'none', padding: 0, marginLeft: 8, color: '#2563eb', cursor: 'pointer', fontSize: 11.5, fontWeight: 600 }}>{showSrc ? t('fact.aiSrcHide') : t('fact.aiSrc')}</button> : null}
        {showSrc ? (d.sources || []).filter((u) => /^https?:\/\//i.test(u)).map((u) => <div key={u} style={{ overflowWrap: 'anywhere', marginTop: 2 }}><a href={u} target="_blank" rel="noreferrer" style={{ color: '#6b7280', textDecoration: 'none' }}>{u}</a></div>) : null}
      </div>
      <CompanyBriefCards brief={d.brief} website={d.website} fetched={d.fetched} t={t} trans={showTrans && trans ? trans : undefined} flat={flat} sources={d.sources} bare skipBase={skipBase} />
    </>
  )
  return <CompanyBriefCards brief={d.brief} website={d.website} fetched={d.fetched} t={t} trans={showTrans && trans ? trans : undefined} flat={flat} sources={d.sources} />
}

// 公司评分四维渲染(纯展示,#181 抽出):弹框(fetch 后)与公司详情页(服务端 score_detail)共用。
// 档名彩字+依据灰句(#133 无数字口径);担保 None=无记录≠不担保(语义红线,灰句说明);detail 空=null。
export function CompanyGradesView({ detail, t, hideSponsor }: { detail: CoGradeDetail; t: TFn; hideSponsor?: boolean }) {
  if (!detail) return null
  const gname = (g: number, name: string) => <b style={{ color: gradeColor(g) }}>{name}</b>
  // #190(Frank「很多冗余 titles,改成 bullets」):#186 的「每维一个加粗小标题」退役 →
  // 一维一行 bullet「维名: 档名 依据」,与 JD 整理版 bullet 同款(竖向密度减半,维名进行内不再抢层级)
  // Frank 2026-07-26「没有拆成多个列的先拆,每列左对齐」:原来一维一行 bullet
  //「担保: 常年担保 共 12 份,其中技能类 4,最近 2026Q2」——三个事实揉在一句里,四维之间也对不齐。
  // 改三列(维名 | 档名 | 依据)跨行对齐,与站内其他卡同规格(FactGrid)。
  const row = (label: string, tier: React.ReactNode, evidence?: React.ReactNode) => [
    <span key={label + 'k'} style={FG_K}>{label}</span>,
    <span key={label + 'v'}>{tier}</span>,
    <span key={label + 'e'} style={FG_N}>{evidence}</span>,
  ]
  const sp = detail.sponsor, act = detail.active, sal = detail.salary, fm = detail.fame
  const fameParts = fm ? [fm.v?.wiki ? t('gr.co.fm.wiki') : '', fm.v?.provs >= 2 ? t('gr.co.fm.provs', { n: fm.v.provs }) : '', fm.v?.open ? t(fm.v.open === 1 ? 'gr.co.fm.open1' : 'gr.co.fm.open', { n: fm.v.open }) : ''].filter(Boolean) : []
  return (
    <>
      {/* 字号/行高/色显式定在 ul(不靠继承):(frontend)/main.css 的 body 白字 18px 会吃掉裸继承的 li
          (公司详情页实测中招;弹框有 13px 包裹层侥幸没事)——组件自带底座,两处上下文同渲 */}
      <div style={{ fontSize: 13, color: '#374151' }}>
        <FactGrid cols={3}>
          {/* hideSponsor:公司详情页把担保维让给独立「担保记录」详情卡,速览卡不再列(不重复,#182) */}
          {hideSponsor ? [] : sp ? row(t('gr.dim.coSponsor'), gname(sp.g, t(sp.v?.total ? 'gr.sp.' + sp.g : 'gr.sp.aip')), sp.v?.total ? t('gr.co.sp.d', { total: sp.v.total, n: sp.v.skilled ?? 0, q: sp.v.q || '—' }) : t('gr.co.sp.aip'))
            : row(t('gr.dim.coSponsor'), <span style={{ color: '#9ca3af' }}>{t('gr.co.sp.na')}</span>)}
          {act ? row(t('gr.dim.coActive'), gname(act.g, t('gr.act.' + act.g)), t((act.v?.open ?? 0) === 1 ? 'gr.co.act.d1' : 'gr.co.act.d', { open: act.v?.open ?? 0, n: act.v?.new30 ?? 0 })) : []}
          {sal ? row(t('gr.dim.coSalary'), gname(sal.g, t('gr.sal.' + sal.g)), t('gr.co.sal.d', { pct: sal.v >= 0 ? `+${sal.v}` : String(sal.v) }))
            : row(t('gr.dim.coSalary'), <span style={{ color: '#9ca3af' }}>{t('gr.noData')}</span>)}
          {fm ? row(t('gr.dim.coFame'), gname(fm.g, t('gr.fm.' + fm.g)), fameParts.length ? fameParts.join('、') : undefined) : []}
        </FactGrid>
      </div>
      {/* #192(Frank):免责灰注(互不加权/非资格认定/我的匹配)从公司块摘除;fact.scoreNote 仍在通道卡用 */}
    </>
  )
}

// ── E8-11 B1(Frank「以弹框为准,一个来源」):公司域唯一骨架 CompanyBody ──
// 弹框(CompanyPanel)与 /companies/[slug] 页面渲同一组件、吃同一份 CompanyDetail(免额度,与页面同口径)。
// 排版=JD 扁平基准(FLAT_*);顺序循 #192:身份→担保→简介→在招→相似→雇主信号(判断殿后)。
// 红线:分类/职位弹框不碰(Frank「这两个现在做的我很满意」)。
// 通道/担保档色阶(与列表「通道」列同源;从 Company 收编)
const chColor = (g: number | null) => (g == null ? '#9ca3af' : g >= 5 ? '#166534' : g >= 4 ? '#15803d' : g >= 3 ? '#374151' : g >= 2 ? '#b45309' : '#9ca3af')
// LMIA 股别串解析(「High Wage 58 · Low Wage 1008」→ 逐股;技能股=High Wage/GTS/PR,match.ts 口径,前端只展示不判定)
function parseCoStreams(streams: string, t: TFn): { label: string; count: string; skilled: boolean }[] {
  if (!streams) return []
  return streams.split(/[·•]/).map((p) => p.trim()).filter(Boolean).map((p) => {
    const m = p.match(/^(.+?)\s+([\d,]+)$/)
    const rawName = m ? m[1].trim() : p
    const count = m ? m[2] : ''
    const low = rawName.toLowerCase()
    if (/high wage/.test(low)) return { label: t('co.spStream.high'), count, skilled: true }
    if (/global talent/.test(low)) return { label: t('co.spStream.gts'), count, skilled: true }
    if (/\bpr\b|permanent/.test(low)) return { label: t('co.spStream.pr'), count, skilled: true }
    if (/low wage/.test(low)) return { label: t('co.spStream.low'), count, skilled: false }
    if (/agricultur/.test(low)) return { label: t('co.spStream.agri'), count, skilled: false }
    return { label: rawName, count, skilled: false }
  })
}
// 政府/公共机构判定(Frank 2026-07-24):强信号名称关键词,宁可漏标不错标(私企含 Commission 等不误伤)。
const GOV_RE = /\b(government|gouvernement|ministry|minist[eè]re|public service|city of|town of|municipalit|regional municipalit|health authority|crown corporation|department of|conseil scolaire|commission scolaire)\b/i
export function isGovCompany(name?: string) { return !!name && GOV_RE.test(name) }

// 了解公司章行:政府机构章 + 知名章(可点跳维基)。弹框挂基本信息题旁,详情页挂 body 顶(名下)。行业中文已删(Frank)。
export function CompanyTopInfo({ company, t }: { company: CompanyDetail; t: TFn }) {
  const gov = isGovCompany(company.name)
  if (!(company.wikiUrl || gov)) return null
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', margin: '0 0 10px' }}>
      {gov ? <span style={{ fontSize: 11, color: '#15803d', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 999, padding: '2px 9px', whiteSpace: 'nowrap' }}>{t('co.gov')}</span> : null}
      {/* 知名章=可点跳维基(Frank「有 wiki 把 wiki 加进来」;button 样式非裸链,循 #106) */}
      {company.wikiUrl ? <a href={company.wikiUrl} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: '#1d4ed8', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 999, padding: '2px 9px', whiteSpace: 'nowrap', textDecoration: 'none' }}>{t('co.wellKnown')} ↗</a> : null}
    </div>
  )
}

/** 卡片内职位列表的**唯一行形态**(2026-08-11 抽出):左=岗名蓝链 + 灰字小注,右=薪资 + 城市。
 *  原本只长在公司弹框「在招职位」里;详情页下架岗的「相关职位」要同一副皮,于是抽成组件两处共用
 *  ——照 JobBody「一骨架两处」先例。样式逐像素照搬,公司弹框零视觉变化。 */
export function JobMiniRow({ id, title, sub, salaryText, city, onOpen, target }: {
  id: number; title: string; sub?: string; salaryText?: string; city?: string
  onOpen?: () => void      // 传了=弹框内叠开 JD 弹框;不传=纯链接跳详情页
  target?: string
}) {
  return (
    <div style={{ padding: '4px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
      <span style={{ minWidth: 0 }}>
        {onOpen
          ? <button onClick={onOpen} style={{ border: 'none', background: 'none', padding: 0, font: 'inherit', cursor: 'pointer', textAlign: 'left', color: '#2563eb' }}>{title}</button>
          : <a href={`/jobs/${id}`} target={target} rel="noreferrer" style={{ ...link, fontSize: 13 }}>{title}</a>}
        {sub ? <div style={{ fontSize: 11.5, color: '#9ca3af', marginTop: 1, lineHeight: 1.5 }}>{sub}</div> : null}
      </span>
      <span style={{ fontSize: 11.5, whiteSpace: 'nowrap', flexShrink: 0, textAlign: 'right' }}>
        {salaryText ? <div style={{ color: '#15803d', fontWeight: 700, fontSize: 12.5 }}>{salaryText}</div> : null}
        {/* #200(Frank「技能岗显示有什么意义」):裸通道档标签撤(无表头没上下文);通道信号在主表「通道」列/职位弹框 */}
        <div style={{ color: '#9ca3af' }}>{city ? <span>{city}</span> : null}</div>
      </span>
    </div>
  )
}


export function CompanyBody({ company, similar, t, lang, showTrans, hideTopInfo, onOpenJob, resolveJob, afterSponsor }: {
  company: CompanyDetail; similar: SimilarEmployer[]; t: TFn; lang: Lang; showTrans?: boolean; hideTopInfo?: boolean
  onOpenJob?: (j: JobRow) => void   // 弹框内点职位=叠开 JD 弹框;页面不传=纯链接
  resolveJob?: (id: number) => JobRow | undefined   // 弹框把已载入行喂回来(JD 弹框要整 JobRow)
  afterSponsor?: React.ReactNode    // #287 批D:担保卡后的插槽(公司弹框挂判定卡入口)
}) {
  // 中文对照:缓存简介(aiBrief 直渲)也可懒翻——与 CompanyAiSection 内的懒翻同款,拿到存一份切换零延迟
  const [trans, setTrans] = useState<string | null>(null)
  const [showSrc, setShowSrc] = useState(false)   // #197:AI 看来源折叠(声明挪到顶部,折叠钮随之上移)
  const [allJobs, setAllJobs] = useState(false)   // #198:在招职位内联展开(首显 8,展开其余=原地不跳转)
  const hasDesc = !!company.description && company.description.length >= 120   // 阈值统一 120(原弹框 200 退役)
  useEffect(() => {
    if (!showTrans || trans != null || hasDesc || !company.aiBrief || lang === 'en') return
    let dead = false
    fetch('/api/co-translate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: company.name, lang }) })
      .then((r) => r.json().catch(() => null))
      .then((x) => { if (!dead && x?.ok && x.text) setTrans(x.text) })
      .catch(() => {})
    return () => { dead = true }
  }, [showTrans, trans, hasDesc, company.aiBrief, company.name, lang])
  const provFull = company.province ? provName(t, company.province) : ''
  const addr = company.address || provFull
  const aip = !!company.scoreDetail?.sponsor?.v?.aip
  const showSponsor = (company.lmiaPositions ?? 0) > 0 || aip
  const streams = parseCoStreams(company.lmiaStreams, t)
  // 结论彩条(co.spConc*)2026-08-09 Frank「不要解释文字」整条撤:数据行自己说话,技术类信号由「技术类」标签承担
  const nocLocal = (j: CompanyDetail['jobs'][number]) => ((lang === 'zh' ? j.nocTitleZh : lang === 'ko' ? j.nocTitleKo : '') || j.nocTitle)
  const extTarget = onOpenJob ? '_blank' : undefined   // 弹框内跳页新开(别关掉弹框);页面同标签
  // #197(Frank「这两部分合并」+「AI 声明放按钮下」):身份(官网/地址/行业)与公司简介合成一块「公司」;
  // AI 检索声明从简介块内提到 body 顶部(弹框里即按钮行下);缓存 AI 五节路径才有声明,名录厚简介=抓取自官网另注。
  const briefCached = !hasDesc && !!company.aiBrief   // 缓存 AI 五节(名录厚简介优先,互斥)
  const briefSecs = briefCached ? coParseSecs(company.aiBrief) : null
  const hasBase = !!briefSecs && !isJdNone(briefSecs.BASE)   // AI 有「所在地」(市级)
  // #199(Frank「有精确地址就优先显数据库的」):DB 有精确地址(带街号/邮编)→ 显 DB 地址、AI 所在地让位;
  // DB 只有省级则让位 AI 市级所在地;地址可点跳 Google Map(与主表地点格同源 mapsUrl)。
  const hasRealAddr = !!company.address
  const showAddrRow = hasRealAddr || !hasBase
  const skipBase = hasRealAddr   // DB 精确地址在,AI 所在地不再重复
  const srcList = (company.aiSources || []).filter((u) => /^https?:\/\//i.test(u))
  const hasId = company.website || addr || company.industry || company.sectors || company.wikiUrl
  // #200:AI 检索声明(缓存路径才出)——从卡片上方浮注挪进「公司」卡内、接在简介内容前(卡片化后浮注显孤)
  const aiNote = briefCached ? (
    <div style={{ margin: '8px 0 4px', fontSize: 11.5, color: '#9ca3af' }}>
      ✨ {t('fact.aiIntro')}{company.aiFetched ? <span style={{ marginLeft: 8 }}>{company.aiFetched}</span> : null}
      {srcList.length ? <button onClick={() => setShowSrc((v) => !v)} style={{ border: 'none', background: 'none', padding: 0, marginLeft: 8, color: '#2563eb', cursor: 'pointer', fontSize: 11.5, fontWeight: 600 }}>{showSrc ? t('fact.aiSrcHide') : t('fact.aiSrc')}</button> : null}
      {showSrc ? srcList.map((u) => <div key={u} style={{ overflowWrap: 'anywhere', marginTop: 2 }}><a href={u} target="_blank" rel="noreferrer" style={{ color: '#6b7280', textDecoration: 'none' }}>{u}</a></div>) : null}
    </div>
  ) : null
  return (
    <div style={{ fontSize: 13, lineHeight: 1.75, color: '#374151' }}>
      {/* §7 了解公司行(中文行业+知名章):详情页挂 body 顶(名下);弹框由 CompanyPanel 挂到按钮上面 → hideTopInfo */}
      {!hideTopInfo ? <CompanyTopInfo company={company} t={t} /> : null}
      {/* 基本信息卡(#197 合并):身份(官网/地址)+ 简介同卡;标题「基本信息」与在招/担保卡同款(Frank 2026-07-24) */}
      {(hasId || hasDesc || briefCached || company.name) && (
        <div style={MODAL_CARD}>
          <div style={MODAL_CARD_HEAD}>{t('co.basic')}
            {hideTopInfo && isGovCompany(company.name) ? <span style={{ marginLeft: 8, fontWeight: 400, fontSize: 11, color: '#15803d', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 999, padding: '2px 9px', whiteSpace: 'nowrap' }}>{t('co.gov')}</span> : null}
            {hideTopInfo && company.wikiUrl ? <a href={company.wikiUrl} target="_blank" rel="noreferrer" style={{ marginLeft: 8, fontWeight: 400, fontSize: 11, color: '#1d4ed8', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 999, padding: '2px 9px', whiteSpace: 'nowrap', textDecoration: 'none' }}>{t('co.wellKnown')} ↗</a> : null}</div>
          <div>
            {/* 公司名称(Frank 2026-07-24「一直显示方便用户看」):一律显示——有中文别名显别名,否则显原名(标题会截断长名,这行给全名) */}
            <FactRow k={t('co.name')}>{(lang === 'zh' ? company.aliasZh : lang === 'ko' ? company.aliasKo : '') || company.name}</FactRow>
            {company.website ? <FactRow k={t('act.site')}><a href={company.website} target="_blank" rel="noreferrer" style={{ ...link, fontSize: 12.5, overflowWrap: 'anywhere' }}>{company.website}</a></FactRow> : null}
            {showAddrRow && addr ? <FactRow k={t('act.addr')}><a href={mapsUrl(addr)} target="_blank" rel="noreferrer" style={{ ...link, fontSize: 12.5 }}><IconMap /> {addr}</a></FactRow> : null}
            {/* 行业/知名已上提到 §7 了解行(名下),此处不再重复 */}
            {company.website && company.websiteSource === 'searched' ? <div style={{ marginTop: 4, fontSize: 11.5, color: '#9ca3af', lineHeight: 1.5 }}>{t('fact.siteSearched')}</div> : null}
          </div>
          {/* 身份与简介间分隔线(Frank 2026-07-23 效果图「中间横线可以」) */}
          {hasId && (hasDesc || briefCached || company.name) ? <div style={{ borderTop: '1px solid #f3f4f6', margin: '10px 0 8px' }} /> : null}
          {/* 简介内容接在身份下(同卡;标题/声明不再另起):名录厚简介>缓存 AI 五节>懒查,三者互斥 */}
          {aiNote}
          {hasDesc ? (
            <div style={{ marginTop: 8 }}>
              <div style={{ whiteSpace: 'pre-wrap' }}>{company.description}</div>
              <div style={{ marginTop: 4, fontSize: 11.5, color: '#9ca3af' }}>{t('fact.coIntroSrc')}</div>
            </div>
          ) : briefCached ? (
            <div><CompanyBriefCards brief={company.aiBrief} website={company.aiWebsite} fetched={company.aiFetched} t={t} bare skipBase={skipBase} sources={company.aiSources} trans={showTrans && trans ? trans : undefined} /></div>
          ) : company.name ? (
            <div style={{ marginTop: 8 }}><CompanyAiSection company={company.name} t={t} showTrans={showTrans} lang={lang} bare skipBase={skipBase} /></div>
          ) : null}
        </div>
      )}
      {/* 担保记录深块(#184 收编;#197 移到合并块之后;有记录/AIP 才出) */}
      {showSponsor && (
        <div style={MODAL_CARD}>
          {/* #200(Frank「这个废话不用加」):担保记录副标题(历史事实,非能担保判定)撤——彩底结论句已含参考限度 */}
          <div style={MODAL_CARD_HEAD}>{t('gr.dim.coSponsor')}</div>
          <div>
            {/* Frank 2026-07-26「没拆列的先拆」:最近获批原来把「季度 + 份数」揉在一格,现拆成三列跨行对齐 */}
            <FactGrid cols={3}>
              {streams.flatMap((s, i) => [
                <span key={i + 'k'} style={{ color: s.skilled ? '#15803d' : '#9ca3af' }}>{s.label}{s.skilled ? <span style={{ fontSize: 10.5, marginLeft: 4 }}>{t('co.spSkilledTag')}</span> : null}</span>,
                <span key={i + 'v'} style={{ ...FG_V, fontWeight: s.skilled ? 600 : 400 }}>{s.count}</span>,
                <span key={i + 'n'} />,
              ])}
              {company.lmiaLastQuarter ? [
                <span key="qk" style={FG_K}>{t('co.spQuarter')}</span>,
                <span key="qv" style={FG_V}>{company.lmiaLastQuarter}</span>,
                <span key="qn" style={FG_N}>{t('co.spBatchN', { n: company.lmiaLmias ?? '—' })}</span>,
              ] : []}
            </FactGrid>
            {/* #286 获批职业拆分(Frank 08-08「有哪些岗也不知道」):近两年窗口与上方获批数同口径;
                数据没灌时整块不出(容缺自激活);Top 6 逐行,余量并一行,职业名走界面语言、无名渲裸码。
                不用 FactGrid:它的 max-content 名列遇英文长职业名会把数值列挤出 375 屏(效果图实撞)——
                名列 minmax(0,1fr) 可折行(禁截断→折行,#268 同判),数值列恒右 */}
            {(company.lmiaNocs?.length ?? 0) > 0 && (() => {
              const rows = company.lmiaNocs!
              const top = rows.slice(0, 6)
              const rest = rows.slice(6)
              const restN = rest.reduce((s, r) => s + r.positions, 0)
              const nm = (r: NonNullable<CompanyDetail['lmiaNocs']>[number]) => ((lang === 'zh' ? r.titleZh : lang === 'ko' ? r.titleKo : '') || r.title)
              return (
                <>
                  <div style={{ borderTop: '1px solid #f3f4f6', margin: '10px 0 6px' }} />
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>{t('co.spNocs')}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) max-content', columnGap: 14, rowGap: 3, alignItems: 'baseline', fontSize: 13 }}>
                    {top.flatMap((r) => [
                      <span key={r.noc + 'k'} style={{ overflowWrap: 'anywhere' }}>{nm(r) || r.noc}{nm(r) ? <span style={{ color: '#9ca3af', fontSize: 10.5, marginLeft: 6, whiteSpace: 'nowrap' }}>{r.noc}</span> : null}</span>,
                      <span key={r.noc + 'v'} style={{ ...FG_V, textAlign: 'right' }}>{r.positions}</span>,
                    ])}
                    {rest.length ? [
                      <span key="rk" style={{ color: '#9ca3af' }}>{t('co.spNocRest', { n: rest.length })}</span>,
                      <span key="rv" style={{ ...FG_V, color: '#9ca3af', fontWeight: 400, textAlign: 'right' }}>{restN}</span>,
                    ] : []}
                  </div>
                </>
              )
            })()}
            {/* #200 来源行撤;结论彩条 08-09 随「不要解释文字」拍板撤(见上) */}
          </div>
        </div>
      )}
      {/* #287 批D:判定卡入口槽(担保卡后;只有公司弹框传,/companies/[slug] 页面无 job 语境不传) */}
      {afterSponsor}
      {/* ④ 在招职位(富行=NOC 对照+薪资+通道档,#184 口径;弹框内点职位叠开 JD 弹框) */}
      {company.jobs.length ? (
        <div style={MODAL_CARD}>
          <div style={MODAL_CARD_HEAD}>{t('co.openJobs')} ({company.openCount})</div>
          <div>
            {(allJobs ? company.jobs : company.jobs.slice(0, 8)).map((j) => {
              const r = resolveJob?.(j.id)
              const nl = nocLocal(j)
              return (
                <JobMiniRow key={j.id} id={j.id} title={j.title}
                  /* #200(Frank「岗位名称中文翻译默认都加上」):#196 的藏译名撤——岗位名 NOC 译名默认显示
                     (短、就是职业名、一直有用;与职位弹框标题/详情页 H1 同款);简介/JD 正文翻译仍留给「显示中文对照」 */
                  sub={nl && nl.toLowerCase() !== j.title.toLowerCase() ? nl : ''}
                  salaryText={j.salaryText} city={j.city}
                  onOpen={r && onOpenJob ? () => onOpenJob(r) : undefined} target={extTarget} />
              )
            })}
            {/* #198(Frank「这个展开不要跳转」):原「展开其余 N 个」跳搜索页退役 → 原地展开已载入职位;
                载入上限 50,超出部分(极少)才回退跳板搜索全部 */}
            {!allJobs && company.jobs.length > 8 ? (
              <button onClick={() => setAllJobs(true)} style={{ border: 'none', background: 'none', padding: '2px 0', fontSize: 12.5, color: '#2563eb', cursor: 'pointer' }}>{t('act.showAll', { n: company.jobs.length - 8 })}</button>
            ) : allJobs && company.openCount > company.jobs.length ? (
              <div style={{ marginTop: 4 }}><a href={`/?q=${encodeURIComponent(company.name)}`} target={extTarget} rel="noreferrer" style={{ ...link, fontSize: 12.5 }}>{t('act.showAllBoard', { n: company.openCount - company.jobs.length })}</a></div>
            ) : null}
          </div>
        </div>
      ) : null}
      {/* ⑤ 相似雇主(同省同行业按担保档;弹框白赚) */}
      {similar.length ? (
        <div style={MODAL_CARD}>
          <div style={MODAL_CARD_HEAD}>{t('co.similar')}<span style={{ fontWeight: 400, color: '#9ca3af', fontSize: 11.5, marginLeft: 8 }}>{t('co.similarSub')}</span></div>
          <div>
            {similar.map((e) => (
              <div key={e.slug} style={{ fontSize: 13, padding: '2px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
                <a href={`/companies/${e.slug}`} target={extTarget} rel="noreferrer" style={{ ...link, minWidth: 0 }}>{e.name}</a>
                <span style={{ fontSize: 11.5, whiteSpace: 'nowrap', flexShrink: 0, color: '#9ca3af' }}>
                  {e.sponsorGrade != null ? <span style={{ color: chColor(e.sponsorGrade) }}>{t('gr.sp.' + e.sponsorGrade)}</span> : null}
                  {e.openCount ? <span style={{ marginLeft: 8 }}>{t('co.openJobs')} {e.openCount}</span> : null}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {/* ⑥ 雇主信号(#192 殿后;担保维让给上方深块 hideSponsor,不重复) */}
      {company.scoreDetail ? (
        <div style={MODAL_CARD}>
          <div style={MODAL_CARD_HEAD}>{t('co.grades')}</div>
          <div><CompanyGradesView detail={company.scoreDetail} t={t} hideSponsor={showSponsor} /></div>
        </div>
      ) : null}
    </div>
  )
}

// 公司弹框(E8-11 B1 重写):三钮壳(#185 对照/AI 速读/完整页)+ /api/company 同源取数 + CompanyBody 同源骨架。
// job 行字段拼凑与 scoredetail/companyinfo 双 fetch 退役;数据与 /companies/[slug] 页面完全同一份(免额度)。
export function CompanyPanel({ job, jobs, lang, plan, onOpenJob }: { job: JobRow; jobs: JobRow[]; lang: Lang; plan: Plan; onOpenJob?: (j: JobRow) => void }) {
  const t = makeT(lang)
  const [showTrans, setShowTrans] = useState(false)
  const [aiOn, setAiOn] = useState(false)
  const [d, setD] = useState<undefined | null | { company: CompanyDetail; similar: SimilarEmployer[] }>(undefined)
  useEffect(() => {
    let dead = false
    setD(undefined)
    fetch('/api/company', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jobId: job.id }) })
      .then((r) => (r.ok ? r.json() : null))
      .then((x) => { if (!dead) setD(x && x.company ? x : null) })
      .catch(() => { if (!dead) setD(null) })
    return () => { dead = true }
  }, [job])
  const co = d && typeof d === 'object' ? d.company : null
  // 中文对照钮出现条件(#196 放宽):AI 简介可翻 或 在招职位有 zh/ko NOC 译名可显——
  // 原先只认 AI 简介,导致「名录厚简介 + 在招译名」的公司没钮,译名却无条件冒出来。
  const aiPath = !!co && !(co.description && co.description.length >= 120)
  const hasZhJobs = !!co && lang !== 'en' && co.jobs.some((j) => {
    const z = lang === 'zh' ? j.nocTitleZh : j.nocTitleKo
    return !!z && z.toLowerCase() !== j.title.toLowerCase()
  })
  const canTrans = lang !== 'en' && (aiPath || hasZhJobs)
  const slug = job.companySlug || co?.slug || ''
  return (
    <>
      {/* 行业行已挪到弹框页眉(名下副标,Frank「改成职位这种」);知名章在基本信息卡题旁 */}
      <div style={{ display: 'flex', gap: 8, margin: '2px 0 12px', flexWrap: 'wrap' }}>
        {canTrans ? (
          <button onClick={() => setShowTrans((v) => !v)} style={{ ...PILL_BTN, ...(showTrans ? { background: '#eff6ff', borderColor: '#bfdbfe', color: '#1d4ed8' } : {}) }}>{showTrans ? t('cat.hideZh') : t('cat.showZh')}</button>
        ) : null}
        <button onClick={() => { if (!aiOn) track('ai-read-cat'); setAiOn((v) => !v) }} style={{ ...PILL_BTN, ...(aiOn ? { background: '#eff6ff', borderColor: '#bfdbfe', color: '#1d4ed8' } : {}) }}><IconCompass /> {t('cat.aiRead')} {aiOn ? '▾' : '▸'}</button>
        {slug ? <a href={`/companies/${slug}`} target="_blank" rel="noreferrer" style={{ ...PILL_BTN, textDecoration: 'none', display: 'inline-block' }}>{t('detail.openFull')} ↗</a> : null}
      </div>
      {/* AI 速读(点了才出,置顶;coRead=公司级接地速读,不联网不凭名字编)——弹框壳独有,页面不带 */}
      {aiOn && (
        <div style={{ ...MODAL_CARD, fontSize: 13, lineHeight: 1.75, color: '#374151' }}>
          <JdAdvisorSection job={job} lang={lang} plan={plan} title={t('cat.aiRead')} field="coRead" />
        </div>
      )}
      {d === undefined ? <p style={{ margin: 0, fontSize: 13, color: '#9ca3af' }}>{t('act.loadingText')}</p>
        : d === null ? <p style={{ margin: 0, fontSize: 13, color: '#9ca3af' }}>{t('advisor.unavail')}</p>
        : <CompanyBody company={d.company} similar={d.similar} t={t} lang={lang} showTrans={showTrans} hideTopInfo
            onOpenJob={onOpenJob} resolveJob={(id) => jobs.find((x) => Number(x.id) === id)}
            afterSponsor={<TvEntryCard t={t} onOpen={() => { track('tv-entry', { kind: 'company' }); window.location.assign(`/plan/pr?job=${job.id}`) }} />} />}
      {/* B1 雇主线:公司弹框只渲职业链接(凭证/在招职位上面的卡已有,再出=重复) */}
      <SponsorLeadCard job={job} t={t} src="company" />
    </>
  )
}
