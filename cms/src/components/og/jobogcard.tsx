/**
 * og 域:职位分享卡的版式(1200×630;每岗一张,标题/公司/薪资/徽章现烤)。
 * 2026-08-29 自 app/(frontend)/jobs/[id]/opengraph-image.tsx 迁入成域件 —— 壳里只剩
 * 取数一行 + `new ImageResponse(<JobOgCard …/>, size)`;版式值逐字未改,常量换 OG_JOB_* 新名。
 * 截断长度(标题 90/公司 60/薪资 40)是版面尺寸的事,留在本件;取数与值级清洗在
 * lib/jobs 的 loadJobOg/toJobOgFact。不 import next/og(ImageResponse 归壳)。
 * 可选段(公司/地点/薪资)先 if 装进元素变量再拼(组件域禁三目);徽章排在 JobOgChips
 * (函数行数闸 75 行,卡体装不下)。
 *
 * @author Frank
 * @time 2026-08-29 16:30:00
 */
import {
  OG_BOLD, OG_JOB_BRAND_GAP, OG_JOB_BRAND_SIZE, OG_JOB_COMPANY_LEN, OG_JOB_COMPANY_SIZE, OG_JOB_COMPANY_TOP,
  OG_JOB_DOMAIN_SIZE, OG_JOB_FOOT_SIZE, OG_JOB_FOOT_TOP, OG_JOB_META_GAP, OG_JOB_META_SIZE, OG_JOB_META_TOP,
  OG_JOB_PAD, OG_JOB_SALARY_LEN, OG_JOB_TITLE_LEN, OG_JOB_TITLE_LH, OG_JOB_TITLE_SIZE,
} from './constants'
import { JobOgChips } from './jobogchips'
import type { JobOgCardIn } from './types'

/**
 * 职位分享卡(品牌行 + 标题/公司/地点薪资/徽章 + 页脚)。
 *
 * @param props 洗净格与岗位号(见 JobOgCardIn 逐格注释)。
 * @returns 卡片元素树(壳裹进 ImageResponse)。
 */
export function JobOgCard({ og, id }: JobOgCardIn) {
  let companyEl = null
  if (og.company != null) {
    companyEl = (
      <div style={{ fontSize: OG_JOB_COMPANY_SIZE, color: '#374151', marginTop: OG_JOB_COMPANY_TOP, display: 'flex' }}>
        {og.company.slice(0, OG_JOB_COMPANY_LEN)}
      </div>
    )
  }
  let locEl = null
  if (og.loc !== '') {
    locEl = <div style={{ fontSize: OG_JOB_META_SIZE, color: '#6b7280', display: 'flex' }}>{og.loc}</div>
  }
  let salaryEl = null
  if (og.salary !== '') {
    salaryEl = (
      <div style={{ fontSize: OG_JOB_META_SIZE, color: '#15803d', display: 'flex' }}>
        {og.salary.slice(0, OG_JOB_SALARY_LEN)}
      </div>
    )
  }
  let chipsEl = null
  if (og.chips.length > 0) {
    chipsEl = <JobOgChips chips={og.chips} />
  }
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: '#ffffff',
        padding: OG_JOB_PAD,
        fontFamily: 'sans-serif',
      }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: OG_JOB_BRAND_GAP }}>
        <div style={{ fontSize: OG_JOB_BRAND_SIZE, fontWeight: OG_BOLD, color: '#2563eb', display: 'flex' }}>
          🍁 Offer2PR
        </div>
        <div style={{ fontSize: OG_JOB_DOMAIN_SIZE, color: '#9ca3af', display: 'flex' }}>offer2pr.com</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center' }}>
        <div
          style={{
            fontSize: OG_JOB_TITLE_SIZE,
            fontWeight: OG_BOLD,
            color: '#111827',
            lineHeight: OG_JOB_TITLE_LH,
            display: 'flex',
          }}>
          {og.title.slice(0, OG_JOB_TITLE_LEN)}
        </div>
        {companyEl}
        <div style={{ display: 'flex', gap: OG_JOB_META_GAP, marginTop: OG_JOB_META_TOP }}>
          {locEl}
          {salaryEl}
        </div>
        {chipsEl}
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          borderTop: '2px solid #e5e7eb',
          paddingTop: OG_JOB_FOOT_TOP,
        }}>
        <div style={{ fontSize: OG_JOB_FOOT_SIZE, color: '#6b7280', display: 'flex' }}>
          Daily-updated job board · PNP / EE / wage signals
        </div>
        <div style={{ fontSize: OG_JOB_FOOT_SIZE, color: '#2563eb', display: 'flex' }}>offer2pr.com/jobs/{id}</div>
      </div>
    </div>
  )
}
