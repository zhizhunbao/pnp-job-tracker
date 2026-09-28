'use client'
/**
 * 窗口钮排:调用方给的额外钮 + 关闭钮(几颗一样大才叫一排)。窗口形排在标题栏里,普通弹框浮在白卡右上角;
 * 整排不起拖动(data-nodrag —— 2026-09-28 并壳前两个浮层一个拦一个不拦,并壳后一律拦)。
 * 2026-09-28 并壳时自 Modal 的动作排段与 advisor 浮层壳的窗口钮段合成一件。
 *
 * @author Frank
 * @time 2026-09-28 04:40:00
 */
import { IconX } from '@/components/icons'
import { CLOSE_ARIA } from './constants'
import { actsClsOf, stopClick } from './functions'
import { ModalBtn } from './modalbtn'
import type { ModalActsIn } from './types'

/**
 * 渲染窗口钮排。
 *
 * @param props 额外钮、关闭回调与排在哪。
 * @returns 钮排。
 */
export function ModalActs({ actions, onClose, bar }: ModalActsIn) {
  return (
    <div className={actsClsOf(bar)} onClick={stopClick} data-nodrag>
      {actions}
      <ModalBtn aria={CLOSE_ARIA} onClick={onClose}><IconX /></ModalBtn>
    </div>
  )
}
