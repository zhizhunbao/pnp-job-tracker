// I 批遗留收口(#114):站级 og 分享图 1200×630(无页面级 og 时的全站兜底;职位页有自己的动态版)。
import { ImageResponse } from 'next/og'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'Offer2PR — Canadian jobs with immigration signals'

export default async function Image() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: 'linear-gradient(120deg, #eff6ff, #ffffff)', fontFamily: 'sans-serif' }}>
        <div style={{ fontSize: 84, fontWeight: 700, color: '#2563eb', display: 'flex' }}>🍁 Offer2PR</div>
        <div style={{ fontSize: 36, color: '#374151', marginTop: 24, display: 'flex' }}>Canadian jobs with immigration signals</div>
        <div style={{ display: 'flex', gap: 16, marginTop: 34 }}>
          {['PNP streams', 'EE categories', 'Wage vs median', 'Daily updates'].map((c) => (
            <div key={c} style={{ display: 'flex', fontSize: 26, color: '#1d4ed8', background: '#ffffff', border: '2px solid #bfdbfe', borderRadius: 999, padding: '8px 26px' }}>{c}</div>
          ))}
        </div>
        <div style={{ fontSize: 28, color: '#9ca3af', marginTop: 40, display: 'flex' }}>offer2pr.com</div>
      </div>
    ),
    size,
  )
}
