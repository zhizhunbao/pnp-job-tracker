// E8-07:职位页动态 og 分享图(1200×630)——链接贴进微信/小红书/TG 出卡片图,模板一次写好两万岗零手工。
// 文案全走英文/数字(职位名/公司/城市本就是英文),避免 ImageResponse 内嵌 CJK 字体的体积与兼容问题。
import { ImageResponse } from 'next/og'
import { getPayload } from 'payload'
import config from '@/payload.config'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'Job posting on Offer2PR'

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let r: any = null
  try {
    const payload = await getPayload({ config: await config })
    const pool = (payload.db as any).pool
    const res = await pool.query(
      `SELECT j.title, c.name AS company, j.city, j.province, j.salary_text, j.salary, j.pnp_eligible, j.teer FROM jobs j
       LEFT JOIN companies c ON c.id = j.company_id WHERE j.id = $1 LIMIT 1`, [Number(id)])
    r = res.rows[0] || null
  } catch { /* 查库失败 → 兜底品牌图 */ }

  const title = (r?.title || 'Canadian jobs with immigration signals').slice(0, 90)
  const loc = r ? [r.city, r.province].filter(Boolean).join(', ') : ''
  const salary = r?.salary_text || r?.salary || ''
  const chips = r ? [r.pnp_eligible ? 'PNP-eligible' : '', r.teer != null ? `TEER ${r.teer}` : ''].filter(Boolean) : []
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#ffffff', padding: 64, fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 34, fontWeight: 700, color: '#2563eb', display: 'flex' }}>🍁 Offer2PR</div>
          <div style={{ fontSize: 22, color: '#9ca3af', display: 'flex' }}>offer2pr.com</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center' }}>
          <div style={{ fontSize: 58, fontWeight: 700, color: '#111827', lineHeight: 1.2, display: 'flex' }}>{title}</div>
          {r?.company ? <div style={{ fontSize: 34, color: '#374151', marginTop: 18, display: 'flex' }}>{String(r.company).slice(0, 60)}</div> : null}
          <div style={{ display: 'flex', gap: 24, marginTop: 14 }}>
            {loc ? <div style={{ fontSize: 28, color: '#6b7280', display: 'flex' }}>{loc}</div> : null}
            {salary ? <div style={{ fontSize: 28, color: '#15803d', display: 'flex' }}>{String(salary).slice(0, 40)}</div> : null}
          </div>
          {chips.length ? (
            <div style={{ display: 'flex', gap: 12, marginTop: 22 }}>
              {chips.map((c) => (
                <div key={c} style={{ display: 'flex', fontSize: 24, color: '#1d4ed8', background: '#eff6ff', border: '2px solid #bfdbfe', borderRadius: 999, padding: '6px 22px' }}>{c}</div>
              ))}
            </div>
          ) : null}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #e5e7eb', paddingTop: 22 }}>
          <div style={{ fontSize: 24, color: '#6b7280', display: 'flex' }}>Daily-updated job board · PNP / EE / wage signals</div>
          <div style={{ fontSize: 24, color: '#2563eb', display: 'flex' }}>offer2pr.com/jobs/{id}</div>
        </div>
      </div>
    ),
    size,
  )
}
