'use client'
/**
 * 域内小件:未建档时匹配那一格的引导链(点它去建档,匹配才算得出来)。
 * 2026-08-28 换装批自 Table.tsx 的 cellOf 提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 19:15:06
 */
import { LinkButton } from '@/components/button'
import { cssOf } from '@/components/css'
import { ARROW_RIGHT, SPACE, URL_ACCOUNT } from './constants'
import type { NeedProfileCellIn } from './types'
import css from './jobs.module.css'

/**
 * 渲染建档引导。
 *
 * @param props 引导文案。
 * @returns 一条蓝链。
 */
export function NeedProfileCell({ text }: NeedProfileCellIn) {
  return (
    <LinkButton href={URL_ACCOUNT} className={cssOf(css.needProfile)}>{text}{SPACE}{ARROW_RIGHT}</LinkButton>
  )
}
