'use client'
/**
 * chip 域的结构:筛选药丸(可点)—— 默认 / 选中 / 强调红三态。
 * 与 Tag 的分界:Chip 是可点的筛选,Tag 说「这是什么状态」不可点。
 * 2026-08-24 自 ui/Chip.tsx 按组件域形制迁入(样式迁 module.css,
 * chipStyle 留 functions 当过渡导出)。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */
import { chipClsOf } from './functions'
import type { ChipIn } from './types'

/**
 * 筛选药丸(样式在 chip.module.css,chipStyle 过渡导出的镜像值在 constants)。
 *
 * @param props 态开关/点击/提示/文字。
 * @returns 药丸按钮。
 */
export function Chip({ active = false, hot = false, onClick, title, children }: ChipIn) {
  return <button className={chipClsOf({ active, hot })} onClick={onClick} title={title}>{children}</button>
}
