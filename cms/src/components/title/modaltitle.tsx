'use client'
/**
 * title 域的弹框标题变体:17px 标题,右侧给弹框关闭钮留位。
 * 2026-08-24 自 modal 域拆出;同日眉题(eyebrow)撤编 —— 它 2026-08-03 Frank
 * 拍板「不用标 AI 工具」后全站零消费,是死代码(git 里可找回)。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */
import type { ModalTitleIn } from './types'
import css from './title.module.css'

/**
 * 弹框标题块。
 *
 * @param props 标题内容。
 * @returns 标题块。
 */
export function ModalTitle({ title }: ModalTitleIn) {
  return (
    <div className={css.titleWrap}>
      <h3 className={css.title}>{title}</h3>
    </div>
  )
}
