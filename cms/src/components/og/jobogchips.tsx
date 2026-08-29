/**
 * og 域:职位卡的徽章排(PNP-eligible / TEER n 胶囊)。自 JobOgCard 拆出 ——
 * 函数行数闸 75 行,卡体装不下这一段;空表时由 JobOgCard 整段不渲,本件不判空。
 *
 * @author Frank
 * @time 2026-08-29 16:30:00
 */
import { OG_CHIP_RADIUS, OG_JOB_CHIP_GAP, OG_JOB_CHIP_SIZE, OG_JOB_CHIP_TOP } from './constants'
import type { JobOgChipsIn } from './types'

/**
 * 徽章排。
 *
 * @param props 徽章清单(见 JobOgChipsIn 逐格注释)。
 * @returns 徽章排元素树。
 */
export function JobOgChips({ chips }: JobOgChipsIn) {
  const chipEls = []
  for (const c of chips) {
    chipEls.push(
      <div key={c}
        style={{
          display: 'flex',
          fontSize: OG_JOB_CHIP_SIZE,
          color: '#1d4ed8',
          background: '#eff6ff',
          border: '2px solid #bfdbfe',
          borderRadius: OG_CHIP_RADIUS,
          padding: '6px 22px',
        }}>{c}</div>,
    )
  }
  return (
    <div style={{ display: 'flex', gap: OG_JOB_CHIP_GAP, marginTop: OG_JOB_CHIP_TOP }}>
      {chipEls}
    </div>
  )
}
