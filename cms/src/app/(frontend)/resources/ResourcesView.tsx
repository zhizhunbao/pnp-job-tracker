'use client'
// 官方资源导航(E4-05):hao123 式导航——顶部搜索框 + 每条一卡的密集网格,按分类分区。
// curated 常量(非 ETL);红线=宁缺毋滥,失效宁可不列。链接=可点卡片(整卡跳官方页)。
import { useEffect, useMemo, useState } from 'react'
import { makeT, LANG_KEY, type Lang } from '../jobs/i18n'
import { SiteHeader } from '../SiteHeader'
import { SiteFooter } from '../SiteFooter'
import { PageBanner } from '../ui/primitives'
import { RES } from './data'

export function ResourcesView() {
  const [lang, setLang] = useState<Lang>('zh')
  const [q, setQ] = useState('')
  useEffect(() => { try { const l = localStorage.getItem(LANG_KEY) as Lang | null; if (l === 'zh' || l === 'en' || l === 'ko') setLang(l) } catch { /* ignore */ } }, [])
  const setLangSaved = (l: Lang) => { try { localStorage.setItem(LANG_KEY, l) } catch { /* ignore */ } ; setLang(l) }
  const t = useMemo(() => makeT(lang), [lang])

  const ql = q.trim().toLowerCase()
  const groups = useMemo(() => RES.map((g) => ({
    cat: g.cat,
    items: ql ? g.items.filter((it) => it.name.toLowerCase().includes(ql) || Object.values(it.use).some((u) => u.toLowerCase().includes(ql))) : g.items,
  })).filter((g) => g.items.length), [ql])

  const tile: React.CSSProperties = {
    display: 'block', textDecoration: 'none', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10,
    padding: '10px 12px', transition: 'border-color .12s, background .12s', minWidth: 0,
  }
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f9fafb' }}>
      <style>{'.resTile:hover{border-color:#bfdbfe !important;background:#f8faff !important}'}</style>
      <SiteHeader lang={lang} setLang={setLangSaved} t={t} />
      <div style={{ maxWidth: 1320, margin: '0 auto', padding: '1rem 1.25rem 1.5rem', width: '100%', boxSizing: 'border-box', flex: '1 0 auto' }}>
        <PageBanner module="pathways" title={t('res.title')} sub={t('res.sub')} />

        {/* 顶部搜索框(Frank「上面带一个文本框搜索」) */}
        <div style={{ margin: '14px 0' }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('res.search')} enterKeyHint="search"
            style={{ width: '100%', boxSizing: 'border-box', height: 42, padding: '0 14px', border: '1px solid #d1d5db', borderRadius: 10, fontSize: 14.5, color: '#1f2937', background: '#fff' }} />
        </div>

        {groups.length === 0 ? (
          <p style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center', padding: '24px 0' }}>{t('res.empty')}</p>
        ) : groups.map((g) => (
          <section key={g.cat} style={{ marginBottom: 18 }}>
            <h2 style={{ fontSize: 14.5, fontWeight: 600, color: '#374151', margin: '0 0 8px' }}>{t('res.cat.' + g.cat)}</h2>
            {/* 每条一卡的密集网格(hao123 式) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(100%,220px),1fr))', gap: 10 }}>
              {g.items.map((it) => (
                <a key={it.url} href={it.url} target="_blank" rel="noreferrer" className="resTile" style={tile}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5, color: '#1f2937', fontWeight: 500 }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{it.name}</span>
                    <span style={{ marginLeft: 'auto', flexShrink: 0, color: '#9ca3af', fontSize: 11 }}>↗</span>
                  </div>
                  <div style={{ fontSize: 11.5, color: '#9ca3af', lineHeight: 1.4, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.use[lang]}</div>
                </a>
              ))}
            </div>
          </section>
        ))}

        <p style={{ fontSize: 11.5, color: '#9ca3af', lineHeight: 1.6, marginTop: 8 }}>{t('res.note')}</p>
      </div>
      <SiteFooter t={t} maxWidth={1320} />
    </div>
  )
}
