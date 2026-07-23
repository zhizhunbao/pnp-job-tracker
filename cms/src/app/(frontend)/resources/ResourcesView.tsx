'use client'
// 官方资源导航(E4-05):把散落全站的官方来源链接归拢到一页,分类整理。
// curated 常量(非 ETL);红线=宁缺毋滥,失效宁可不列(各省 PNP 页改版频繁)。
// 链接以「按钮样式」呈现(Frank 2026-07-23「不能有跳转链接,可以有跳转按钮」)。
import { useEffect, useMemo, useState } from 'react'
import { makeT, LANG_KEY, type Lang } from '../jobs/i18n'
import { SiteHeader } from '../SiteHeader'
import { SiteFooter } from '../SiteFooter'
import { PageBanner } from '../ui/primitives'
import { RES } from './data'

export function ResourcesView() {
  const [lang, setLang] = useState<Lang>('zh')
  useEffect(() => { try { const l = localStorage.getItem(LANG_KEY) as Lang | null; if (l === 'zh' || l === 'en' || l === 'ko') setLang(l) } catch { /* ignore */ } }, [])
  const setLangSaved = (l: Lang) => { try { localStorage.setItem(LANG_KEY, l) } catch { /* ignore */ } ; setLang(l) }
  const t = useMemo(() => makeT(lang), [lang])

  const goBtn: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0, fontSize: 12, color: '#374151',
    background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 8, padding: '5px 11px', textDecoration: 'none',
  }
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f9fafb' }}>
      <SiteHeader lang={lang} setLang={setLangSaved} t={t} />
      <div style={{ maxWidth: 1320, margin: '0 auto', padding: '1rem 1.25rem 1.5rem', width: '100%', boxSizing: 'border-box', flex: '1 0 auto' }}>
        <PageBanner module="pathways" title={t('res.title')} sub={t('res.sub')} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,420px),1fr))', gap: 14, marginTop: 14 }}>
          {RES.map((g) => (
            <section key={g.cat} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '14px 16px' }}>
              <h2 style={{ fontSize: 15, fontWeight: 600, color: '#111827', margin: '0 0 10px' }}>{t('res.cat.' + g.cat)}</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {g.items.map((it) => (
                  <div key={it.url} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, justifyContent: 'space-between' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, color: '#1f2937', fontWeight: 500 }}>{it.name}</div>
                      <div style={{ fontSize: 12, color: '#9ca3af', lineHeight: 1.5, marginTop: 1 }}>{it.use[lang]}</div>
                    </div>
                    <a href={it.url} target="_blank" rel="noreferrer" style={goBtn}>{t('res.go')} ↗</a>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
        <p style={{ fontSize: 11.5, color: '#9ca3af', lineHeight: 1.6, marginTop: 16 }}>{t('res.note')}</p>
      </div>
      <SiteFooter t={t} maxWidth={1320} />
    </div>
  )
}
