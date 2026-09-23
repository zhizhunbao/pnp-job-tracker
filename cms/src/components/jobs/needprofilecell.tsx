'use client'
/**
 * 域内小件:未建档时匹配那一格的引导链(点它去建档,匹配才算得出来)。
 * 2026-08-28 换装批自 Table.tsx 的 cellOf 提出成文件。
 * 2026-09-23 账户页撤了移民档案节:链 /account 改成钮,点了就地开档案向导(没登录先弹登录框)。
 *
 * @author Frank
 * @time 2026-08-28 19:15:06
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { ARROW_RIGHT, BTN_GHOST, SPACE } from './constants'
import type { NeedProfileCellIn } from './types'
import css from './jobs.module.css'

/**
 * 渲染建档引导。
 *
 * @param props 引导文案。
 * @returns 一条蓝链。
 */
export function NeedProfileCell({ text, onOpen }: NeedProfileCellIn) {
  return (
    <Button kind={BTN_GHOST} onClick={onOpen} className={cssOf(css.needProfile)}>{text}{SPACE}{ARROW_RIGHT}</Button>
  )
}
