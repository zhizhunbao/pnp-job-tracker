'use client'
/**
 * 分型单选行(E11-04):档案表单的第一问,零打字单选;可不选,点同一项 = 取消
 * (取消逻辑在 functions 的 makeStatusPick 工厂里)。档表在 constants 的 STATUS_TABS。
 * 2026-08-27 换装批自 ProfileForm.tsx 的内联 chips 段提出成文件。
 *
 * @author Frank
 * @time 2026-08-27 22:00:00
 */
import { Chip } from '@/components/chip'
import { STATUS_TABS } from './constants'
import { makeStatusPick } from './functions'
import type { StatusRowIn } from './types'
import css from './profile.module.css'

/**
 * 分型的一排 chips。
 *
 * @param props 现值、落格与取词函数(见 StatusRowIn 逐格注释)。
 * @returns 一排分型 chips。
 */
export function StatusRow({ status, setStatus, t }: StatusRowIn) {
  const chips = []
  for (const s of STATUS_TABS) {
    chips.push(
      <Chip key={s.slug} onClick={makeStatusPick({ slug: s.slug, status, setStatus })} active={status === s.slug}>
        {t(s.key)}
      </Chip>,
    )
  }
  return <div className={css.chipsRow}>{chips}</div>
}
