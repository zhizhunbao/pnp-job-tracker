/**
 * og 域:站点通用分享卡的版式(1200×630;无页面级 og 时的全站兜底图)。
 * 2026-08-29 自 app/(frontend)/opengraph-image.tsx 迁入成域件 —— 壳里只剩
 * `new ImageResponse(<SiteOgCard />, size)` 一行;版式值逐字未改,常量换 OG_SITE_* 新名。
 * 不带 `'use client'`,也不 import next/og(ImageResponse 归壳)—— 本件只是元素树。
 *
 * @author Frank
 * @time 2026-08-29 16:30:00
 */
import {
  OG_BOLD, OG_CHIP_RADIUS, OG_SITE_BRAND_SIZE, OG_SITE_CHIP_GAP, OG_SITE_CHIP_SIZE, OG_SITE_CHIP_TOP,
  OG_SITE_DOMAIN_SIZE, OG_SITE_DOMAIN_TOP, OG_SITE_TAGLINE_SIZE, OG_SITE_TAGLINE_TOP,
} from './constants'

/**
 * 站点通用分享卡(品牌 + 标语 + 四枚卖点胶囊 + 域名)。
 *
 * @returns 卡片元素树(壳裹进 ImageResponse)。
 */
export function SiteOgCard() {
  const chipEls = []
  for (const c of ['PNP streams', 'EE categories', 'Wage vs median', 'Daily updates']) {
    chipEls.push(
      <div key={c}
        style={{
          display: 'flex',
          fontSize: OG_SITE_CHIP_SIZE,
          color: '#1d4ed8',
          background: '#ffffff',
          border: '2px solid #bfdbfe',
          borderRadius: OG_CHIP_RADIUS,
          padding: '8px 26px',
        }}>{c}</div>,
    )
  }
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(120deg, #eff6ff, #ffffff)',
        fontFamily: 'sans-serif',
      }}>
      <div style={{ fontSize: OG_SITE_BRAND_SIZE, fontWeight: OG_BOLD, color: '#2563eb', display: 'flex' }}>
        🍁 Offer2PR
      </div>
      <div
        style={{ fontSize: OG_SITE_TAGLINE_SIZE, color: '#374151', marginTop: OG_SITE_TAGLINE_TOP, display: 'flex' }}>
        Canadian jobs with immigration signals
      </div>
      <div style={{ display: 'flex', gap: OG_SITE_CHIP_GAP, marginTop: OG_SITE_CHIP_TOP }}>
        {chipEls}
      </div>
      <div style={{ fontSize: OG_SITE_DOMAIN_SIZE, color: '#9ca3af', marginTop: OG_SITE_DOMAIN_TOP, display: 'flex' }}>
        offer2pr.com
      </div>
    </div>
  )
}
