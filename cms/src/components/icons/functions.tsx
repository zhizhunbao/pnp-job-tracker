'use client'
/**
 * icons 域的图标工厂:把一枚 lucide 图标包成本站规格的组件。
 * 它产 JSX 所以住 .tsx —— 但它不是组件(不进 JSX 树,是造组件的机器),
 * 名字按七词表的 make* 位。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */
import type { LucideProps } from 'lucide-react'

import { ICON_SIZE } from './constants'
import type { IconFn, LucideIcon } from './types'
import css from './icons.module.css'

/**
 * 造一枚本站规格的图标组件:size=1em 跟随字号、基线微下沉、aria-hidden
 * (图标一律装饰性 —— 语义由它旁边的文字或钮的 aria-label 承担)。
 * 调用点传的属性压过默认(如给个 className 换色)——
 * 包装件 Icon 里默认在前、调用方属性在后(后者压前者),
 * 入参 p 是 lucide 属性(库定死的形状)。
 *
 * @param C lucide 图标组件。
 * @returns 包装后的图标组件。
 */
export function makeIcon(C: LucideIcon): IconFn {
  function Icon(p: LucideProps): React.ReactElement {
    return <C size={ICON_SIZE} className={css.icon} aria-hidden {...p} />
  }
  return Icon
}
