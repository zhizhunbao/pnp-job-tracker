'use client'
/**
 * modal 域的标题块结构:eyebrow 小字(可省)+ 17px 标题(右侧给关闭钮留位)。
 * 一个 tsx 一个组件(2026-08-24 Frank 拍板),从 modal.tsx 拆出。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */
import { eyebrowClsOf } from './functions'
import type { ModalTitleIn } from './types'
import css from './modal.module.css'

/**
 * 弹框标题块。
 *
 * @param props eyebrow/深色档/标题。
 * @returns 标题块。
 */
export function ModalTitle({
  eyebrow,
  deep = false,
  title,
}: ModalTitleIn) {
  return (
    <div className={css.titleWrap}>
      {eyebrow ? <div className={eyebrowClsOf(deep)}>{eyebrow}</div> : null}
      <h3 className={css.title}>{title}</h3>
    </div>
  )
}
