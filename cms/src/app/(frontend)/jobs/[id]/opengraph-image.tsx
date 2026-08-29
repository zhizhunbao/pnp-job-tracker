/**
 * E8-07:职位页动态 og 分享图(1200×630)——链接贴进微信/小红书/TG 出卡片图,模板一次写好两万岗零手工。
 * 文案全走英文/数字(职位名/公司/城市本就是英文),避免 ImageResponse 内嵌 CJK 字体的体积与兼容问题。
 * SQL 文本全在 `@/lib/db` 的 SQL 里,本文件只管取数与组装;
 * 版面尺寸(画布、字号、边距、圆角、截断长度)2026-08-29 形制批全数下沉 components/jobs 的 constants。
 *
 * @author Frank
 * @time 2026-07-20 14:25:54
 */
import { ImageResponse } from 'next/og'
import { getPayload } from 'payload'
import config from '@/payload.config'
import {
  OG_BOLD, OG_BRAND_GAP, OG_BRAND_SIZE, OG_CHIP_GAP, OG_CHIP_RADIUS, OG_CHIP_SIZE, OG_CHIP_TOP,
  OG_COMPANY_LEN, OG_COMPANY_SIZE, OG_COMPANY_TOP, OG_DOMAIN_SIZE, OG_FOOT_SIZE, OG_FOOT_TOP, OG_H,
  OG_META_GAP, OG_META_SIZE, OG_META_TOP, OG_PAD, OG_SALARY_LEN, OG_TITLE_LEN, OG_TITLE_LH,
  OG_TITLE_SIZE, OG_W,
} from '@/components/jobs'
import { SQL } from '@/lib/db'
import { dbOf } from '@/lib/db/server'

export const size = { width: OG_W, height: OG_H }
export const contentType = 'image/png'
export const alt = 'Job posting on Offer2PR'

/**
 * `SQL.JOB_OG_BY_ID` 回来的那一行 —— 列名即库列名,全格可空(LEFT JOIN 的公司名、
 * 未抽到薪资的岗都会是 NULL)。2026-08-27 lint 还账批把原来的 `any` 换成本形状,
 * 取值表达式一个字没动。
 */
type JobOgDbRow = {
  /**
   * 职位名。
   */
  title: string | null

  /**
   * 公司名(LEFT JOIN,查无公司是 NULL)。
   */
  company: string | null

  /**
   * 城市。
   */
  city: string | null

  /**
   * 省码。
   */
  province: string | null

  /**
   * 薪资原文(抽不到是 NULL)。
   */
  salary_text: string | null

  /**
   * 薪资归一值(pg 的 numeric 回来可能是串)。
   */
  salary: string | number | null

  /**
   * 粗筛的省提名信号。
   */
  pnp_eligible: boolean | null

  /**
   * TEER 档(未分类是 NULL)。
   */
  teer: number | null
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let r: JobOgDbRow | null = null
  try {
    const payload = await getPayload({ config: await config })
    const pool = dbOf(payload)
    const res = await pool.query(
      SQL.JOB_OG_BY_ID, [Number(id)])
    r = res.rows[0] || null
  } catch {
    /**
     * 查库失败 → 兜底品牌图。
     */
  }

  const title = (r?.title || 'Canadian jobs with immigration signals').slice(0, OG_TITLE_LEN)
  const loc = r ? [r.city, r.province].filter(Boolean).join(', ') : ''
  const salary = r?.salary_text || r?.salary || ''
  const chips = r ? [r.pnp_eligible ? 'PNP-eligible' : '', r.teer != null ? `TEER ${r.teer}` : ''].filter(Boolean) : []
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#ffffff', padding: OG_PAD, fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: OG_BRAND_GAP }}>
          <div style={{ fontSize: OG_BRAND_SIZE, fontWeight: OG_BOLD, color: '#2563eb', display: 'flex' }}>🍁 Offer2PR</div>
          <div style={{ fontSize: OG_DOMAIN_SIZE, color: '#9ca3af', display: 'flex' }}>offer2pr.com</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center' }}>
          <div style={{ fontSize: OG_TITLE_SIZE, fontWeight: OG_BOLD, color: '#111827', lineHeight: OG_TITLE_LH, display: 'flex' }}>{title}</div>
          {r?.company ? <div style={{ fontSize: OG_COMPANY_SIZE, color: '#374151', marginTop: OG_COMPANY_TOP, display: 'flex' }}>{String(r.company).slice(0, OG_COMPANY_LEN)}</div> : null}
          <div style={{ display: 'flex', gap: OG_META_GAP, marginTop: OG_META_TOP }}>
            {loc ? <div style={{ fontSize: OG_META_SIZE, color: '#6b7280', display: 'flex' }}>{loc}</div> : null}
            {salary ? <div style={{ fontSize: OG_META_SIZE, color: '#15803d', display: 'flex' }}>{String(salary).slice(0, OG_SALARY_LEN)}</div> : null}
          </div>
          {chips.length ? (
            <div style={{ display: 'flex', gap: OG_CHIP_GAP, marginTop: OG_CHIP_TOP }}>
              {chips.map((c) => (
                <div key={c} style={{ display: 'flex', fontSize: OG_CHIP_SIZE, color: '#1d4ed8', background: '#eff6ff', border: '2px solid #bfdbfe', borderRadius: OG_CHIP_RADIUS, padding: '6px 22px' }}>{c}</div>
              ))}
            </div>
          ) : null}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #e5e7eb', paddingTop: OG_FOOT_TOP }}>
          <div style={{ fontSize: OG_FOOT_SIZE, color: '#6b7280', display: 'flex' }}>Daily-updated job board · PNP / EE / wage signals</div>
          <div style={{ fontSize: OG_FOOT_SIZE, color: '#2563eb', display: 'flex' }}>offer2pr.com/jobs/{id}</div>
        </div>
      </div>
    ),
    size,
  )
}
