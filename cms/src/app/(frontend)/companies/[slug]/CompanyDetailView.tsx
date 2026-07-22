'use client'
// E8-09 B 件:公司详情页客户端视图 —— 单栏内容骨架(头部→公司评分→公司简介→在招职位)。
// 三条铁律(E8-09 §1):一页一域(只讲这家公司)、一条信息一个家、Pro 位零(公司页全事实层免费)。
// 组件全部复用 JobsTable 的 export(CompanyGradesView / CompanyBriefCards / CompanyAiSection 同源,零回归);
// 数据全走 props(服务端 companies 行)→ 进 SSR HTML,利于 SEO;无缓存简介才客户端懒查(CompanyAiSection)。
import { useEffect, useState } from 'react'

import { makeT, LANG_KEY, LANGS, type Lang } from '../../jobs/i18n'
import { provName, CompanyGradesView, CompanyBriefCards, CompanyAiSection } from '../../jobs/JobsTable'
import type { CompanyDetail } from '@/lib/jobsSql'
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

export default function CompanyDetailView({ company, loggedIn }: { company: CompanyDetail; loggedIn: boolean }) {
  const [lang, setLangState] = useState<Lang>('zh')
  useEffect(() => {
    try { const s = localStorage.getItem(LANG_KEY); if (s && LANGS.some((l) => l.code === s)) setLangState(s as Lang) } catch { /* ignore */ }
  }, [])
  const setLang = (l: Lang) => { setLangState(l); try { localStorage.setItem(LANG_KEY, l) } catch { /* ignore */ } }
  const t = makeT(lang)
  const alias = lang === 'zh' ? company.aliasZh : lang === 'ko' ? company.aliasKo : ''   // #151 口径:界面语言译名作灰注,英文界面不出
  const provFull = company.province ? provName(t, company.province) : ''
  const day = (s: string) => (s || '').slice(0, 10)

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

          {/* ② 公司评分:服务端 score_detail 直读(零额度,公司页全免费);CompanyGradesView 与弹框同源 */}
          {company.scoreDetail ? (
            <div style={sec}>
              <div style={secHead}>{t('co.grades')}</div>
              <CompanyGradesView detail={company.scoreDetail} t={t} />
            </div>
          ) : null}

          {/* ③ 公司简介(一条信息一个家:三者互斥,名录简介优先→AI 缓存简介→客户端懒查) */}
          {company.description ? (
            <div style={sec}>
              <div style={secHead}>{t('fact.coIntro')}</div>
              <div style={{ fontSize: 12.5, color: '#4b5563', whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{company.description}</div>
            </div>
          ) : company.aiBrief
            ? <CompanyBriefCards brief={company.aiBrief} website={company.aiWebsite} fetched={company.aiFetched} t={t} />
            : <CompanyAiSection company={company.name} t={t} />}

          {/* ④ 在招职位:职位名→职位详情页;城市+通道档灰注;>30 只提总数 */}
          {company.jobs.length ? (
            <div style={sec}>
              <div style={secHead}>{t('co.openJobs')} ({company.openCount})</div>
              {company.jobs.map((j) => (
                <div key={j.id} style={{ fontSize: 13, padding: '4px 0', borderTop: '0.5px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
                  <a href={`/jobs/${j.id}`} style={{ ...aLink, minWidth: 0 }}>{j.title}</a>
                  <span style={{ color: '#9ca3af', fontSize: 11.5, whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {j.city ? <span>{j.city}</span> : null}
                    {j.gradeChannel != null ? <span style={{ color: chColor(j.gradeChannel), marginLeft: 8 }}>{t('gr.ch.' + j.gradeChannel)}</span> : null}
                  </span>
                </div>
              ))}
              {company.openCount > company.jobs.length ? (
                <div style={{ marginTop: 8 }}><a href={`/?q=${encodeURIComponent(company.name)}`} style={{ ...aLink, fontSize: 12.5 }}>{t('act.showAll', { n: company.openCount - company.jobs.length })}</a></div>
              ) : null}
            </div>
          ) : (
            <Notice kind="info">{t('co.notFound')}</Notice>
          )}

          <div style={{ marginTop: 8, fontSize: 12.5 }}><a href="/" style={aLink}>← {t('detail.back')}</a></div>
        </div>
      </PageShell>
      <SiteFooter t={t} />
    </div>
  )
}
