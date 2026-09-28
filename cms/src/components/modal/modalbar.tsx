'use client'
/**
 * 窗口形弹框的标题栏:左块(ModalHead)+ 窗口钮排;整条是拖动手柄(按钮、译名行豁免)。
 * 2026-09-16 Frank「右边的按钮部分和左边的中文翻译放到一行」「工作内容和上面的整体就没有分割了」「公司的也对照改一下」:
 * 译名行折到标题与窗口钮下方占满整宽,切换控件右端与正文右缘对齐;标题栏底下一条分隔线再进正文。
 * 2026-09-28 并壳时自 advisor 的浮层壳(FloatPanel 的标题栏段)迁入。
 *
 * @author Frank
 * @time 2026-09-28 04:40:00
 */
import { barClsOf } from './functions'
import { ModalActs } from './modalacts'
import type { ModalBarIn } from './types'

/**
 * 渲染标题栏。
 *
 * @param props 左块、额外窗口钮、关闭回调、拖动起手与窄屏态。
 * @returns 标题栏。
 */
export function ModalBar({ head, actions, onClose, onDown, narrow }: ModalBarIn) {
  return (
    <div onPointerDown={onDown} className={barClsOf({ narrow })}>
      {head}
      <ModalActs actions={actions} onClose={onClose} bar />
    </div>
  )
}
