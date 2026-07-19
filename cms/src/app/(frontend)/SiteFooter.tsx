'use client'
// 全站共享页脚(2026-07-16 用户拍板「所有页面都应该用同一个 header 和 footer」):
// 从 /jobs 内联 footer 抽出,免责 + 法务四链 + 版权,窄屏自动换行。与 SiteHeader 配对使用。
import type { TFn } from './jobs/i18n'

export function SiteFooter({ t, maxWidth = 1100 }: { t: TFn; maxWidth?: number }) {
  // #79(2026-07-19 Frank「footer 太长自动换行了」):免责压短+改两行式——上行=链接导航,下行=免责+©,
  // 不再靠 flexWrap 意外折行;资料库三链(名录/清单/时间线)去留随二级导航提案(见 mockups/二级导航与banner-提案)
  return (
    <footer style={{ borderTop: '1px solid #e5e7eb', background: '#fafafa', flexShrink: 0, marginTop: 'auto' }}>
      <div style={{ maxWidth, margin: '0 auto', padding: '12px 1.25rem', color: '#9ca3af', fontSize: 12.5 }}>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center', marginBottom: 6 }}>
          <a href="/employers" style={{ color: '#6b7280' }}>{t('dir.title')}</a>
          <a href="/occupations" style={{ color: '#6b7280' }}>{t('dir.occ.title')}</a>
          <a href="/timeline" style={{ color: '#6b7280' }}>{t('tl.title')}</a>
          <span style={{ width: 1, height: 12, background: '#e5e7eb' }} />
          <a href="/legal/disclaimer" style={{ color: '#6b7280' }}>{t('foot.disclaimerLink')}</a>
          <a href="/legal/privacy" style={{ color: '#6b7280' }}>{t('foot.privacy')}</a>
          <a href="/legal/terms" style={{ color: '#6b7280' }}>{t('foot.terms')}</a>
          <a href="/about" style={{ color: '#6b7280' }}>{t('foot.about')}</a>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <span>{t('foot.disclaimer')}</span>
          <span style={{ whiteSpace: 'nowrap' }}>© 2026 Offer2PR</span>
        </div>
      </div>
    </footer>
  )
}
