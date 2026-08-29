/**
 * I 批遗留收口(#114):站级 og 分享图 1200×630(无页面级 og 时的全站兜底;职位页有自己的动态版)。
 * 版面尺寸(画布、字号、边距、圆角)2026-08-29 形制批下沉 components/start 的 constants
 * —— 站级图说的是整站,就业把脉桶就是根页面域。
 *
 * @author Frank
 * @time 2026-07-20 14:25:54
 */
import { ImageResponse } from 'next/og'
import {
  OG_BOLD, OG_BRAND_SIZE, OG_CHIP_GAP, OG_CHIP_RADIUS, OG_CHIP_SIZE, OG_CHIP_TOP, OG_DOMAIN_SIZE,
  OG_DOMAIN_TOP, OG_H, OG_TAGLINE_SIZE, OG_TAGLINE_TOP, OG_W,
} from '@/components/start'

export const size = { width: OG_W, height: OG_H }
export const contentType = 'image/png'
export const alt = 'Offer2PR — Canadian jobs with immigration signals'

export default async function Image() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: 'linear-gradient(120deg, #eff6ff, #ffffff)', fontFamily: 'sans-serif' }}>
        <div style={{ fontSize: OG_BRAND_SIZE, fontWeight: OG_BOLD, color: '#2563eb', display: 'flex' }}>🍁 Offer2PR</div>
        <div style={{ fontSize: OG_TAGLINE_SIZE, color: '#374151', marginTop: OG_TAGLINE_TOP, display: 'flex' }}>Canadian jobs with immigration signals</div>
        <div style={{ display: 'flex', gap: OG_CHIP_GAP, marginTop: OG_CHIP_TOP }}>
          {['PNP streams', 'EE categories', 'Wage vs median', 'Daily updates'].map((c) => (
            <div key={c} style={{ display: 'flex', fontSize: OG_CHIP_SIZE, color: '#1d4ed8', background: '#ffffff', border: '2px solid #bfdbfe', borderRadius: OG_CHIP_RADIUS, padding: '8px 26px' }}>{c}</div>
          ))}
        </div>
        <div style={{ fontSize: OG_DOMAIN_SIZE, color: '#9ca3af', marginTop: OG_DOMAIN_TOP, display: 'flex' }}>offer2pr.com</div>
      </div>
    ),
    size,
  )
}
