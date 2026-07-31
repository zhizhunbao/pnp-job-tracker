'use client'
// 全站共享页脚(2026-07-16 用户拍板「所有页面都应该用同一个 header 和 footer」):
// 从 /jobs 内联 footer 抽出,免责 + 法务四链 + 版权,窄屏自动换行。与 SiteHeader 配对使用。
import type { TFn } from './jobs/i18n'

// 默认轨 1100→1320(2026-07-30):加了「数据来源」后 1100 装不下一行;头轨本就统一 1320(Frank「每个页面宽度一样」),页脚跟齐
export function SiteFooter({ t, maxWidth = 1320 }: { t: TFn; maxWidth?: number }) {
  // #79 免责已压短;资料库三链收进顶栏「资料库 ▾」(2026-07-19 Frank 批方案 A)→ 页脚回单行:免责+法务+©
  return (
    <footer style={{ borderTop: '1px solid #e5e7eb', background: '#fafafa', flexShrink: 0, marginTop: 'auto' }}>
      {/* #212(第 26 轮体检续):手机端法务四链高 19px 点不中 —— tapPad 只扩可点范围,版式不动 */}
      <div style={{ maxWidth, margin: '0 auto', padding: '14px 1.25rem', display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between', alignItems: 'center', color: '#9ca3af', fontSize: 12.5 }}>
        {/* L1-01(2026-07-30 Frank 拍板):「数据来源」并入页脚全站生效(合规四件套之一),不在各页内重复写;
            同日改稿「footer 不要换行」——不另起一行,与免责同行全角空格分隔(subtitle.proof 先例) */}
        <span>{t('foot.disclaimer')}　{t('foot.sources')}</span>
        <span className="sfLinks" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <a href="/legal/disclaimer" className="tapPad" style={{ color: '#6b7280', textDecoration: 'none' }}>{t('foot.disclaimerLink')}</a>
          <a href="/legal/privacy" className="tapPad" style={{ color: '#6b7280', textDecoration: 'none' }}>{t('foot.privacy')}</a>
          <a href="/legal/terms" className="tapPad" style={{ color: '#6b7280', textDecoration: 'none' }}>{t('foot.terms')}</a>
          <a href="/about" className="tapPad" style={{ color: '#6b7280', textDecoration: 'none' }}>{t('foot.about')}</a>
          <span style={{ whiteSpace: 'nowrap' }}>© 2026 Offer2PR</span>
        </span>
      </div>
    </footer>
  )
}
