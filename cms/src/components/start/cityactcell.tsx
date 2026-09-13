'use client'
/**
 * 域内小件:城市表操作格 —— 一枚「看岗位」钮落职位板按城市筛(2026-09-12 Frank
 * 「省份和城市也需要 这个 看岗位的功能吧」,照雇主板操作列 EmpActCell 的形;
 * 城市只有一钮 —— 城市没有「看公司」一说)。2026-09-12 Frank「这些都加一个 查岗位的 操作列,并加 最低时薪 和 中位时薪」:
 * 行业 / 试点 / AIP 三组表同用这一枚,入参收窄成四格 CityActRow;jobsHref 是 TEXT_NONE 的行
 * (对不上城的试点社区)不出钮 —— 落到空职位板比不出更糟。
 *
 * @author Frank
 * @time 2026-09-12 01:50:00
 */
import { LinkButton } from '@/components/button'
import { NEW_TAB, TEXT_NONE } from './constants'
import type { CityActRow } from './types'
import css from './start.module.css'

/**
 * 渲染城市表的操作格。
 *
 * @param r 一行。
 * @returns 一枚看岗位钮。
 */
export function CityActCell(r: CityActRow) {
  if (r.jobsHref === TEXT_NONE) {
    return null
  }
  return (
    <span className={css.acts}>
      <LinkButton href={r.jobsHref} onClick={r.onOpen} className={r.actBtnCls} target={NEW_TAB}>
        {r.actText}
      </LinkButton>
    </span>
  )
}
