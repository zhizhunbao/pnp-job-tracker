'use client'
// E8-11 B1(Frank「以弹框为准,一个来源」):公司详情页=壳(面包屑/H1/JSON-LD 由 page.tsx)+ CompanyBody 同源骨架。
// 骨架与公司弹框同一组件同一份 CompanyDetail(改一处两边生效);排版随弹框换 JD 扁平——
// 原「一节一卡」多卡壳退役,整页一张白卡容器(#187「先只改弹框」的另一半在此收口)。
// 三条铁律(E8-09 §1)不变:一页一域、一条信息一个家、公司页全事实层免费。
import { useEffect, useState } from 'react'

import { makeT, LANG_KEY, LANGS, type Lang } from '../../jobs/i18n'
import { CompanyBody, provName } from '../../jobs/JobsTable'
import type { CompanyDetail, SimilarEmployer } from '@/lib/jobsSql'
import { SiteHeader } from '../../SiteHeader'
import { SiteFooter } from '../../SiteFooter'
import { Notice, PageShell } from '../../ui/primitives'

const aLink: React.CSSProperties = { color: '#2563eb', textDecoration: 'none' }

export default function CompanyDetailView({ company, similar = [], loggedIn }: { company: CompanyDetail; similar?: SimilarEmployer[]; loggedIn: boolean }) {
  const [lang, setLangState] = useState<Lang>('zh')
  useEffect(() => {
    try { const s = localStorage.getItem(LANG_KEY); if (s && LANGS.some((l) => l.code === s)) setLangState(s as Lang) } catch { /* ignore */ }
  }, [])
  const setLang = (l: Lang) => { setLangState(l); try { localStorage.setItem(LANG_KEY, l) } catch { /* ignore */ } }
  const t = makeT(lang)
  const alias = lang === 'zh' ? company.aliasZh : lang === 'ko' ? company.aliasKo : ''   // #151 口径:界面语言译名作灰注,英文界面不出
  const provFull = company.province ? provName(t, company.province) : ''

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f9fafb' }}>
      <SiteHeader lang={lang} setLang={setLang} t={t} loggedIn={loggedIn} />
      <PageShell pad="14px 1.25rem 32px">
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          {/* 面包屑:职位板 › 省 › 公司(「公司」无独立索引页,不做死链;省作可点筛选) */}
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8, lineHeight: 1.7 }}>
            <a href="/" style={aLink}>{t('detail.crumbHome')}</a>
            {provFull ? <> › <a href={`/?prov=${encodeURIComponent(company.province)}`} style={aLink}>{provFull}</a></> : null}
            <> › <span style={{ color: '#374151' }}>{t('co.crumb')}</span></>
          </div>

          {/* #200(Frank「还分卡片,类似类别」):CompanyBody 各段改回卡片 → 详情页不再套外层白卡(禁卡套卡);
              H1 单独一张头卡,下面 CompanyBody 卡片自铺(与弹框同源) */}
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, background: '#fff', padding: '14px 16px', marginBottom: 14 }}>
            <h1 style={{ margin: 0, fontSize: 22, lineHeight: 1.35, color: '#111827' }}>
              {company.name}{alias ? <span style={{ color: '#9ca3af', fontSize: 15, fontWeight: 400 }}>　{alias}</span> : null}
            </h1>
          </div>
          <CompanyBody company={company} similar={similar} t={t} lang={lang} />

          {!company.jobs.length ? <Notice kind="info">{t('co.notFound')}</Notice> : null}

          <div style={{ marginTop: 8, fontSize: 12.5 }}><a href="/" style={aLink}>← {t('detail.back')}</a></div>
        </div>
      </PageShell>
      <SiteFooter t={t} />
    </div>
  )
}
