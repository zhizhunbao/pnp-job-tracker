'use client'
// 法务页共享外壳(E4-02):四件套(免责/隐私/条款/关于)共用。内容各页自带三语字典(章节数组),
// i18n.ts 只管 UI 壳 —— 法务长文不进全局字典。文案为模板级自拟,不构成法律意见(收入后请专业审阅,backlog)。
import { useEffect, useState } from 'react'
import { makeT, LANG_KEY, type Lang } from '../jobs/i18n'
import { SiteHeader } from '../SiteHeader'
import { SiteFooter } from '../SiteFooter'

// 公开支持邮箱(删号/异议下架/退款申请都走它):正式域名定了换 env 即可
export const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'wangsansi9527@gmail.com'

export type LegalDoc = { title: string; updated: string; sections: { h: string; body: string[] }[] }

export function LegalShell({ docs, icon }: { docs: Record<Lang, LegalDoc>; icon?: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>('zh')
  useEffect(() => { const s = localStorage.getItem(LANG_KEY) as Lang | null; if (s) setLang(s) }, [])
  const t = makeT(lang)
  const doc = docs[lang]
  const setLangSaved = (l: Lang) => { try { localStorage.setItem(LANG_KEY, l) } catch { /* ignore */ } ; setLang(l) }

  return (
    <div style={{ background: '#f9fafb', minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif', color: '#1f2937' }}>
      {/* 全站共享顶栏/页脚(2026-07-16 用户拍板统一 header/footer) */}
      <SiteHeader lang={lang} setLang={setLangSaved} t={t} />
      <div style={{ maxWidth: 720, margin: '2.5rem auto', padding: '1.75rem 2rem', border: '1px solid #e5e7eb', borderRadius: 10, background: '#fff' }}>
        <h1 style={{ fontSize: 21, margin: '0 0 4px' }}>{icon}{icon ? ' ' : null}{doc.title}</h1>
        <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 18 }}>{doc.updated}</div>
        {doc.sections.map((s, i) => (
          <section key={i} style={{ marginBottom: 18 }}>
            <h2 style={{ fontSize: 15.5, margin: '0 0 6px', color: '#111827' }}>{s.h}</h2>
            {s.body.map((p, j) => (
              <p key={j} style={{ fontSize: 13.5, lineHeight: 1.85, margin: '0 0 6px', color: '#374151' }}>
                {p.split('{email}').map((seg, k, arr) => k < arr.length - 1
                  ? <span key={k}>{seg}<a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: '#2563eb', textDecoration: 'none' }}>{SUPPORT_EMAIL}</a></span>
                  : <span key={k}>{seg}</span>)}
              </p>
            ))}
          </section>
        ))}
      </div>
      <SiteFooter t={t} />
    </div>
  )
}
