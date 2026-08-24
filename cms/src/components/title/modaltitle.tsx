'use client'
/**
 * title 域的结构:弹框统一标题块 —— eyebrow 小字(可省)+ 17px 标题
 * (右侧给关闭钮留位)。2026-08-24 自 modal 域拆出独立成域(Frank「title.tsx 和
 * maxicon.tsx 也需要拆成域」):它是多个弹框共用的通用件,不该住在弹框壳里。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */
import { Eyebrow } from './eyebrow'
import type { ModalTitleIn } from './types'
import css from './title.module.css'

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
      <Eyebrow eyebrow={eyebrow} deep={deep} />
      <h3 className={css.title}>{title}</h3>
    </div>
  )
}
