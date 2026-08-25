'use client'
/**
 * card 域的白卡壳(E8-08 #121,2026-07-20 Frank「按逻辑拆」拍板):纯样式原子零逻辑,
 * 手机卡片 = 每域自己的组件用这几块拼(组合复用样式,不合并逻辑)。
 * 白卡壳是**全站唯一一份**描边+圆角+白底(2026-08-11 Frank「都改成一套」),
 * 壳的真身 `.card` 在 main.css 全局层(6 处消费页直写),本组件叠自己的密度类。
 * 2026-08-24 自 ui/Card.tsx 按组件域形制迁入(一个 tsx 一个组件,六件各归各文件)。
 *
 * style 白名单:padding 各页密度不同走过渡口,消费页形制化后收。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */
import { CARD_CLS } from './constants'
import type { CardIn } from './types'
import css from './card.module.css'

/**
 * 白卡壳(全局 .card 壳 + 本域默认密度)。
 *
 * @param props 微调与内容。
 * @returns 白卡。
 */
export function Card({ style, children }: CardIn) {
  return (
    // eslint-disable-next-line react/forbid-dom-props -- 各页密度不同的 padding 过渡口(见文件头)
    <div className={`${CARD_CLS} ${css.pad}`} style={style}>{children}</div>
  )
}
