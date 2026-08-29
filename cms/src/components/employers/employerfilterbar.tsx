'use client'
/**
 * 雇主板的筛选区:常用一行(搜索 / 口径 / 省 / 制度)+「更多筛选」折叠钮(带激活计数
 * 徽标)+「清空」+ 名录抓取日 —— 职位板同一套形态(站规 jobtable-is-the-standard)。
 * 制度下拉只在名录口径下出:在招口径的数据来自本站职位库,没有「制度」这个维度。
 * 2026-08-27 换装批自 Employers.tsx 的筛选段提出成文件。
 *
 * @author Frank
 * @time 2026-08-27 23:30:00
 */
import { EMP_PROGRAMS } from '@/lib/employers'
import { Button } from '@/components/button'
import { Search } from '@/components/search'
import { Select } from '@/components/select'
import {
  BTN_SECONDARY, CARET_DOWN, CARET_UP, MODE_DESIGNATED, MODE_OPTS, SEARCH_SIZE, SEL_SIZE, TEXT_NONE,
} from './constants'
import { EmployerDrawer } from './employerdrawer'
import { anyFilterOf, clearBtnClsOf, foldActiveOf, makeModeLabel, makeProvLabel, moreBtnClsOf } from './functions'
import type { EmployerPanelIn } from './types'
import css from './employers.module.css'

/**
 * 雇主板筛选区。
 *
 * @param props 整机面板(它只读不写)。
 * @returns 常用一行与折叠抽屉。
 */
export function EmployerFilterBar({ p }: EmployerPanelIn) {
  const fold = foldActiveOf({ f: p.f })
  let caret = CARET_DOWN
  if (p.drawer) {
    caret = CARET_UP
  }
  return (
    <div className={css.filtCol}>
      <div className={css.filtRow}>
        <Search value={p.qDraft} onChange={p.onQDraft} placeholder={p.t('de.qPh')} size={SEARCH_SIZE} />
        <Select size={SEL_SIZE} tap
          value={p.f.mode}
          onChange={p.onMode}
          opts={MODE_OPTS}
          all={p.t('de.mode')}
          labelOf={makeModeLabel({ t: p.t })} />
        <Select size={SEL_SIZE} tap
          value={p.f.prov}
          onChange={p.onProv}
          opts={p.data.facets.provs}
          all={p.t('all.prov')}
          labelOf={makeProvLabel({ t: p.t })} />
        {p.f.mode === MODE_DESIGNATED && (
          <Select size={SEL_SIZE} tap
            value={p.f.program}
            onChange={p.onProgram}
            opts={EMP_PROGRAMS}
            all={p.t('de.allProgram')} />
        )}
        <Button kind={BTN_SECONDARY}
          className={moreBtnClsOf({ active: p.drawer || fold > 0 })}
          onClick={p.onDrawer}>
          {p.t('filter.more')}
          {fold > 0 && <span className={css.moreBadge}>{fold}</span>}
          <span className={css.caret}>{caret}</span>
        </Button>
        {anyFilterOf({ f: p.f }) && (
          <Button kind={BTN_SECONDARY} className={clearBtnClsOf()} onClick={p.onClear}>
            {p.t('clear')}
          </Button>
        )}
        {p.data.fetched !== TEXT_NONE && (
          <span className={css.fetched}>{p.t('dir.occ.fetched', { d: p.data.fetched })}</span>
        )}
      </div>
      {p.drawer && <EmployerDrawer p={p} />}
    </div>
  )
}
