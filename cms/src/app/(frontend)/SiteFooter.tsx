'use client'
// 全站共享页脚(2026-07-16 用户拍板「所有页面都应该用同一个 header 和 footer」):
// 从 /jobs 内联 footer 抽出,免责 + 法务四链 + 版权,窄屏自动换行。与 SiteHeader 配对使用。
import type { TFn } from './jobs/i18n'

export function SiteFooter({ t, maxWidth = 1100 }: { t: TFn; maxWidth?: number }) {
  return (
    <footer style={{ borderTop: '1px solid #e5e7eb', background: '#fafafa', flexShrink: 0, marginTop: 'auto' }}>
      <div style={{ maxWidth, margin: '0 auto', padding: '16px 1.25rem', display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between', alignItems: 'center', color: '#9ca3af', fontSize: 12.5 }}>
        <span>{t('foot.disclaimer')}</span>
        <span style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <a href="/legal/disclaimer" style={{ color: '#6b7280' }}>{t('foot.disclaimerLink')}</a>
          <a href="/legal/privacy" style={{ color: '#6b7280' }}>{t('foot.privacy')}</a>
          <a href="/legal/terms" style={{ color: '#6b7280' }}>{t('foot.terms')}</a>
          <a href="/about" style={{ color: '#6b7280' }}>{t('foot.about')}</a>
          <span style={{ whiteSpace: 'nowrap' }}>© 2026 PNP Job Tracker</span>
        </span>
      </div>
    </footer>
  )
}
