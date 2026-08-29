'use client'
/**
 * 雇主板的「更多筛选」折叠抽屉:地区(社区/城市)与职业两行。这两格放在折叠里而不是
 * 常用一行,是因为它们的选项**跟着省与制度收窄** —— 没先选省时摆出来只会是一长串
 * 跨省选项(职位板同一套折叠形态)。
 * 2026-08-27 换装批自 Employers.tsx 的抽屉段提出成文件。
 *
 * @author Frank
 * @time 2026-08-27 23:30:00
 */
import { Select } from '@/components/select'
import { SEL_SIZE } from './constants'
import { makeNocLabel } from './functions'
import type { EmployerPanelIn } from './types'
import css from './employers.module.css'

/**
 * 「更多筛选」抽屉。
 *
 * @param props 整机面板(它只读不写)。
 * @returns 地区与职业两行下拉。
 */
export function EmployerDrawer({ p }: EmployerPanelIn) {
  return (
    <div className={css.drawer}>
      <div className={css.filtRow}>
        <span className={css.filtLabel}>{p.t('de.fGeo')}</span>
        <Select size={SEL_SIZE} tap
          value={p.f.city}
          onChange={p.onCity}
          opts={p.data.facets.cities}
          all={p.t('de.allCity')} />
      </div>
      <div className={css.filtRow}>
        <span className={css.filtLabel}>{p.t('de.fOcc')}</span>
        <Select size={SEL_SIZE} tap
          value={p.f.noc}
          onChange={p.onNoc}
          opts={p.data.facets.nocs}
          all={p.t('de.allNoc')}
          labelOf={makeNocLabel({ titles: p.data.nocTitles, lang: p.lang })} />
      </div>
    </div>
  )
}
