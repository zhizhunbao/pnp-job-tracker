'use client'
/**
 * 目标省多选行(§3.4):chips 多选,再点取消(makeProvToggle 工厂)。
 * #58 零黑话:chip 显示省全名(三语),值仍存两字码 —— 码与键的对照在
 * constants 的 PROV_TABS(QC 走自己的体系,不进目标省)。
 * 2026-08-27 换装批自 ProfileForm.tsx 的内联 chips 段提出成文件。
 *
 * @author Frank
 * @time 2026-08-27 22:00:00
 */
import { Chip } from '@/components/chip'
import { PROV_TABS } from './constants'
import { makeProvToggle } from './functions'
import type { ProvRowIn } from './types'
import css from './profile.module.css'

/**
 * 目标省的一排 chips。
 *
 * @param props 现清单、落格与取词函数(见 ProvRowIn 逐格注释)。
 * @returns 一排省 chips。
 */
export function ProvRow({ provs, setProvs, t }: ProvRowIn) {
  const chips = []
  for (const p of PROV_TABS) {
    chips.push(
      <Chip key={p.prov} onClick={makeProvToggle({ prov: p.prov, provs, setProvs })} active={provs.includes(p.prov)}>
        {t(p.key)}
      </Chip>,
    )
  }
  return <div className={css.chipsRow}>{chips}</div>
}
