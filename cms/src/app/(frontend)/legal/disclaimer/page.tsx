'use client'
// 免责声明占位页(E4-01):合规四件套(E4-02)出全文前的短版。页脚与 AI 弹框都链到这里。
import { useEffect, useState } from 'react'
import { makeT, LANG_KEY, type Lang } from '../../jobs/i18n'

export default function DisclaimerPage() {
  const [lang, setLang] = useState<Lang>('zh')
  useEffect(() => { const s = localStorage.getItem(LANG_KEY) as Lang | null; if (s) setLang(s) }, [])
  const t = makeT(lang)

  return (
    <div style={{ background: '#f9fafb', minHeight: '100vh', fontFamily: 'system-ui, sans-serif', color: '#1f2937' }}>
      <header style={{ background: '#fff', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ maxWidth: 1320, margin: '0 auto', padding: '10px 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <a href="/jobs" style={{ fontSize: 17, fontWeight: 700, color: '#111827', textDecoration: 'none' }}>🍁 PNP Job Tracker</a>
          <a href="/jobs" style={{ fontSize: 12.5, color: '#6b7280', textDecoration: 'none' }}>{t('acct.back')}</a>
        </div>
      </header>
      <div style={{ maxWidth: 680, margin: '3rem auto', padding: '1.75rem', border: '1px solid #e5e7eb', borderRadius: 10, background: '#fff' }}>
        <h1 style={{ fontSize: 20, margin: '0 0 14px' }}>⚖️ {t('legal.title')}</h1>
        <p style={{ fontSize: 14, lineHeight: 1.9, margin: 0 }}>{t('legal.body')}</p>
        <p style={{ fontSize: 12.5, color: '#9ca3af', marginTop: 16 }}>{t('legal.wip')}</p>
      </div>
    </div>
  )
}
