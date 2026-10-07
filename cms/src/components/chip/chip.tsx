'use client'
/**
 * chip 域的结构:筛选药丸(可点)—— 默认 / 选中 / 强调红三态。
 * 与 Tag 的分界:Chip 是可点的筛选,Tag 说「这是什么状态」不可点。
 * 2026-08-24 自 ui/Chip.tsx 按组件域形制迁入(样式迁 module.css,
 * chipStyle 留 functions 当过渡导出)。
 * 2026-10-04 选中态挂 aria-pressed(访客四题改版收口:读屏报得出选没选;<a> 形态不挂,见 Button)。
 * 2026-10-05 props 的大号档 lg 撤(再没有 <Chip lg> 的消费者,见 types.ts 的 ChipIn 头注);给 chipClsOf 照旧递 lg: false。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */
import { Button } from '@/components/button'
import { PLAIN_BTN_KIND } from './constants'
import { chipClsOf } from './functions'
import type { ChipIn } from './types'

/**
 * 筛选药丸(样式在 chip.module.css,chipStyle 过渡导出的镜像值在 constants)。
 *
 * @param props 态开关/点击/提示/文字。
 * @returns 药丸按钮。
 */
export function Chip({ active = false, hot = false, onClick, href, title, className, children }: ChipIn) {
  let extra: string | null = null
  if (className != null) {
    extra = className
  }
  return (
    <Button kind={PLAIN_BTN_KIND}
      className={chipClsOf({ active, hot, lg: false, extra })}
      pressed={active}
      onClick={onClick}
      href={href}
      title={title}>{children}</Button>
  )
}
