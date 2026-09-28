'use client'
/**
 * 窗口图标钮(关闭 / 重新翻译 / 打开落地页 —— 几颗一样大才叫一排;值是本域 .iconBtn 一份)。
 * 2026-09-28 并壳时立:原先 Modal 的关闭钮与 advisor 浮层壳的三颗窗口钮各写各的类,并成这一件。
 *
 * @author Frank
 * @time 2026-09-28 04:40:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { PLAIN_BTN_KIND } from './constants'
import type { ModalBtnIn } from './types'
import css from './modal.module.css'

/**
 * 渲染窗口图标钮。
 *
 * @param props 读屏名、悬停提示、点击动作或链接与图标。
 * @returns 钮。
 */
export function ModalBtn({ aria, tip, onClick, href, target, children }: ModalBtnIn) {
  return (
    <Button kind={PLAIN_BTN_KIND} onClick={onClick} href={href} target={target} title={tip} ariaLabel={aria}
      className={cssOf(css.iconBtn)}>
      {children}
    </Button>
  )
}
