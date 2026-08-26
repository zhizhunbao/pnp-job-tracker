/**
 * icons 域的形状:手画图标的 props 契约与 lucide 包装件的类型。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */

// eslint-disable-next-line local/no-import-in-leaf -- 图标 props 的形状由 lucide 库定(SVG 全属性面),本域抄不得也不该抄;特批牌形态,同 stripe/types
import type { LucideProps } from 'lucide-react'

/**
 * lucide 图标组件(库定死的形状,本域起个本地名 —— 签名里不出现外部类型)。
 */
export type LucideIcon = React.ComponentType<LucideProps>

/**
 * 包装后的图标组件:调用点可覆写任何 lucide 属性(size/color/className…),
 * 不传就吃本域的默认(1em 跟随字号 + 基线下沉 + aria-hidden)。
 */
export type IconFn = (p: LucideProps) => React.ReactElement

/**
 * MaxIcon 的 props。
 */
export type MaxIconIn = {
  /**
   * 是否全屏态(定两态图标取哪个:放大/还原)。
   */
  maximized: boolean
}
