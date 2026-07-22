'use client'
// E8-09 B 件:公司详情页客户端视图 —— 单栏内容骨架(头部→公司评分→公司简介→在招职位)。
// 三条铁律(E8-09 §1):一页一域(只讲这家公司)、一条信息一个家、Pro 位零(公司页全事实层免费)。
// 组件全部复用 JobsTable 的 export(CompanyGradesView / CompanyBriefCards / CompanyAiSection 同源,零回归);
// 数据全走 props(服务端 companies 行)→ 进 SSR HTML,利于 SEO;无缓存简介才客户端懒查(CompanyAiSection)。
import { useEffect, useState } from 'react'

import { makeT, LANG_KEY, LANGS, type Lang, type TFn } from '../../jobs/i18n'
import { provName, CompanyGradesView, CompanyBriefCards, CompanyAiSection } from '../../jobs/JobsTable'
import type { CompanyDetail, SimilarEmployer } from '@/lib/jobsSql'
import { SiteHeader } from '../../SiteHeader'
import { SiteFooter } from '../../SiteFooter'
import { Notice, PageShell } from '../../ui/primitives'

const sec: React.CSSProperties = { border: '1px solid #e5e7eb', borderRadius: 12, background: '#fff', padding: '12px 16px', marginBottom: 14 }
const secHead: React.CSSProperties = { fontSize: 13.5, fontWeight: 700, color: '#111827', marginBottom: 6 }
const aLink: React.CSSProperties = { color: '#2563eb', textDecoration: 'none' }
const chip: React.CSSProperties = { display: 'inline-block', fontSize: 11.5, padding: '2px 9px', borderRadius: 999, border: '1px solid #e5e7eb', background: '#fafafa', color: '#4b5563', whiteSpace: 'nowrap' }
const chipBlue: React.CSSProperties = { ...chip, background: '#eff6ff', borderColor: '#bfdbfe', color: '#1d4ed8' }
// 通道档色阶(与列表「通道」列同源;此处仅在招岗小注用)
const chColor = (g: number | null) => (g == null ? '#9ca3af' : g >= 5 ? '#166534' : g >= 4 ? '#15803d' : g >= 3 ? '#374151' : g >= 2 ? '#b45309' : '#9ca3af')

// LMIA 股别串解析(「High Wage 58 · Low Wage 1008 · Primary Agriculture 13」→ 逐股 {label,count,skilled})。
// 技能股=High Wage/Global Talent/PR-only(match.ts 口径),前端只展示不判定。
function parseStreams(streams: string, t: TFn): { label: string; count: string; skilled: boolean }[] {
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

export default function CompanyDetailView({ company, similar = [], loggedIn }: { company: CompanyDetail; similar?: SimilarEmployer[]; loggedIn: boolean }) {
  const [lang, setLangState] = useState<Lang>('zh')
  useEffect(() => {
    try { const s = localStorage.getItem(LANG_KEY); if (s && LANGS.some((l) => l.code === s)) setLangState(s as Lang) } catch { /* ignore */ }
  }, [])
  const setLang = (l: Lang) => { setLangState(l); try { localStorage.setItem(LANG_KEY, l) } catch { /* ignore */ } }
  const t = makeT(lang)
  const alias = lang === 'zh' ? company.aliasZh : lang === 'ko' ? company.aliasKo : ''   // #151 口径:界面语言译名作灰注,英文界面不出
  const provFull = company.province ? provName(t, company.province) : ''
  const nocLocal = (j: CompanyDetail['jobs'][number]) => (lang === 'zh' ? j.nocTitleZh : lang === 'ko' ? j.nocTitleKo : '') || j.nocTitle   // 工作名对照:界面语言 NOC 译名,缺则英文官方名
  const streams = parseStreams(company.lmiaStreams, t)
  const aip = !!company.scoreDetail?.sponsor?.v?.aip
  const showSponsorCard = (company.lmiaPositions ?? 0) > 0 || aip
  const conc = (company.lmiaSkilled ?? 0) > 0 ? { key: 'co.spConcYes', bg: '#f0fdf4', fg: '#15803d' }
    : (company.lmiaPositions ?? 0) > 0 ? { key: 'co.spConcLow', bg: '#fffbeb', fg: '#b45309' }
    : { key: 'co.spConcAip', bg: '#f0fdf4', fg: '#15803d' }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f9fafb' }}>
      <SiteHeader lang={lang} setLang={setLang} t={t} loggedIn={loggedIn} />
      <PageShell pad="14px 1.25rem 32px">
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          {/* 面包屑:职位板 › 公司名(「公司」无独立索引页,不做死链;省作可点筛选) */}
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8, lineHeight: 1.7 }}>
            <a href="/" style={aLink}>{t('detail.crumbHome')}</a>
            {provFull ? <> › <a href={`/?prov=${encodeURIComponent(company.province)}`} style={aLink}>{provFull}</a></> : null}
            <> › <span style={{ color: '#374151' }}>{t('co.crumb')}</span></>
          </div>

          {/* ① 头部:身份,不放数值 */}
          <div style={{ ...sec, paddingBottom: 12 }}>
            <h1 style={{ margin: '0 0 6px', fontSize: 22, lineHeight: 1.35, color: '#111827' }}>
              {company.name}{alias ? <span style={{ color: '#9ca3af', fontSize: 15, fontWeight: 400 }}>　{alias}</span> : null}
            </h1>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              {company.industry ? <span style={chipBlue}>{company.industry}</span> : null}
              {company.wikiUrl ? <a href={company.wikiUrl} target="_blank" rel="noreferrer" style={{ ...chip, color: '#1d4ed8', textDecoration: 'none' }}>{t('co.wellKnown')} ↗</a> : null}
              {company.website ? <a href={company.website} target="_blank" rel="noreferrer" style={{ ...aLink, fontSize: 12.5, overflowWrap: 'anywhere' }}>{company.website} ↗</a> : null}
            </div>
            {(company.address || provFull) ? <div style={{ marginTop: 6, fontSize: 12.5, color: '#6b7280' }}>{company.address || provFull}</div> : null}
          </div>

          {/* ③ 担保记录(深化=护城河,参照 job 页 PNP/EE 深块):股别拆解 + 最近获批 + 人话结论 + 来源。
              数据全来自 ESDC/IRCC 现成列(lmia_streams/lmia_positions_skilled),零编造;只在有记录/AIP 时出。 */}
          {showSponsorCard ? (
            <div style={sec}>
              <div style={secHead}>{t('gr.dim.coSponsor')}<span style={{ fontWeight: 400, color: '#9ca3af', fontSize: 11.5, marginLeft: 8 }}>{t('co.spSub')}</span></div>
              {streams.map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, padding: '3px 0', fontSize: 13, alignItems: 'baseline' }}>
                  <span style={{ minWidth: 96, color: s.skilled ? '#15803d' : '#9ca3af', flexShrink: 0 }}>{s.label}{s.skilled ? <span style={{ fontSize: 10.5, marginLeft: 4 }}>{t('co.spSkilledTag')}</span> : null}</span>
                  <span style={{ flex: 1, color: '#374151', fontWeight: s.skilled ? 600 : 400 }}>{s.count}</span>
                </div>
              ))}
              {company.lmiaLastQuarter ? (
                <div style={{ display: 'flex', gap: 10, padding: '3px 0', fontSize: 13, alignItems: 'baseline' }}>
                  <span style={{ minWidth: 96, color: '#9ca3af', flexShrink: 0 }}>{t('co.spQuarter')}</span>
                  <span style={{ flex: 1, color: '#374151' }}>{t('co.spBatch', { q: company.lmiaLastQuarter, n: company.lmiaLmias ?? '—' })}</span>
                </div>
              ) : null}
              <div style={{ fontSize: 12, color: conc.fg, background: conc.bg, borderRadius: 8, padding: '6px 10px', margin: '8px 0 0', lineHeight: 1.55 }}>{t(conc.key)}</div>
              <div style={{ fontSize: 11, color: '#9ca3af', margin: '6px 0 0' }}>{t('co.spSource')}</div>
            </div>
          ) : null}

          {/* ③ 公司简介(一条信息一个家:三者互斥。名录简介够厚才优先,太薄=网站导航语→让位 AI 五节;
              再无则客户端懒查。阈值 120 与弹框 needAi 同口径) */}
          {company.description && company.description.length >= 120 ? (
            <div style={sec}>
              <div style={secHead}>{t('fact.coIntro')}</div>
              <div style={{ fontSize: 12.5, color: '#4b5563', whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{company.description}</div>
            </div>
          ) : company.aiBrief
            ? <CompanyBriefCards brief={company.aiBrief} website={company.aiWebsite} fetched={company.aiFetched} t={t} sources={company.aiSources} />
            : <CompanyAiSection company={company.name} t={t} />}

          {/* ⑤ 在招职位:职位名 + NOC 中文对照(治「工作名看不懂」)+ 薪资 + 通道档;>30 只提总数 */}
          {company.jobs.length ? (
            <div style={sec}>
              <div style={secHead}>{t('co.openJobs')} ({company.openCount})</div>
              {company.jobs.map((j) => {
                const nl = nocLocal(j)
                return (
                  <div key={j.id} style={{ padding: '6px 0', borderTop: '0.5px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
                    <span style={{ minWidth: 0 }}>
                      <a href={`/jobs/${j.id}`} style={{ ...aLink, fontSize: 13 }}>{j.title}</a>
                      {/* 工作名对照:雇主原始岗名下挂 NOC 官方职业名(界面语言译名),看不懂原岗名时靠这条 */}
                      {nl && nl.toLowerCase() !== j.title.toLowerCase() ? <div style={{ fontSize: 11.5, color: '#9ca3af', marginTop: 1 }}>{nl}</div> : null}
                    </span>
                    <span style={{ fontSize: 11.5, whiteSpace: 'nowrap', flexShrink: 0, textAlign: 'right' }}>
                      {j.salaryText ? <div style={{ color: '#15803d', fontWeight: 700, fontSize: 12.5 }}>{j.salaryText}</div> : null}
                      <div style={{ color: '#9ca3af' }}>
                        {j.city ? <span>{j.city}</span> : null}
                        {j.gradeChannel != null ? <span style={{ color: chColor(j.gradeChannel), marginLeft: 8 }}>{t('gr.ch.' + j.gradeChannel)}</span> : null}
                      </div>
                    </span>
                  </div>
                )
              })}
              {company.openCount > company.jobs.length ? (
                <div style={{ marginTop: 8 }}><a href={`/?q=${encodeURIComponent(company.name)}`} style={{ ...aLink, fontSize: 12.5 }}>{t('act.showAll', { n: company.openCount - company.jobs.length })}</a></div>
              ) : null}
            </div>
          ) : (
            <Notice kind="info">{t('co.notFound')}</Notice>
          )}

          {/* ⑥ 相似雇主(参照 job 页相关职位):同省同行业,按担保档降序;SEO 内链 + 横向比较 */}
          {similar.length ? (
            <div style={sec}>
              <div style={secHead}>{t('co.similar')}<span style={{ fontWeight: 400, color: '#9ca3af', fontSize: 11.5, marginLeft: 8 }}>{t('co.similarSub')}</span></div>
              {similar.map((e) => (
                <div key={e.slug} style={{ fontSize: 13, padding: '4px 0', borderTop: '0.5px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
                  <a href={`/companies/${e.slug}`} style={{ ...aLink, minWidth: 0 }}>{e.name}</a>
                  <span style={{ fontSize: 11.5, whiteSpace: 'nowrap', flexShrink: 0, color: '#9ca3af' }}>
                    {e.sponsorGrade != null ? <span style={{ color: chColor(e.sponsorGrade) }}>{t('gr.sp.' + e.sponsorGrade)}</span> : null}
                    {e.openCount ? <span style={{ marginLeft: 8 }}>{t('co.openJobs')} {e.openCount}</span> : null}
                  </span>
                </div>
              ))}
            </div>
          ) : null}

          {/* ⑦ 雇主信号(#192 Frank:放到最下+改名):服务端 score_detail 直读(零额度,公司页全免费);
              担保维让给上方担保详情卡(hideSponsor,不重复);与弹框同序=判断类内容殿后 */}
          {company.scoreDetail ? (
            <div style={sec}>
              <div style={secHead}>{t('co.grades')}</div>
              <CompanyGradesView detail={company.scoreDetail} t={t} hideSponsor={showSponsorCard} />
            </div>
          ) : null}

          <div style={{ marginTop: 8, fontSize: 12.5 }}><a href="/" style={aLink}>← {t('detail.back')}</a></div>
        </div>
      </PageShell>
      <SiteFooter t={t} />
    </div>
  )
}
