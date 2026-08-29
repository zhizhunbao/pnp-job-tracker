'use client'
/**
 * 域内小件:一条官方资源一张可点卡(整卡跳官方页,新开页不抢本站这一屏)。
 * 卡片自有的 hover 已退役 → 全站 cardHover 规范类(hover统一-20260731,值相同零视觉变化),
 * 类名预算在 functions 的 tileClsOf。
 * 2026-08-28 换装批自 Resources.tsx 提出成文件;裸 <a> 改经 button 族的 LinkButton
 * (rel="noreferrer" 由它一处补)。
 *
 * @author Frank
 * @time 2026-08-28 12:39:03
 */
import { LinkButton } from '@/components/button'
import { LINK_TARGET_BLANK } from './constants'
import { tileClsOf } from './functions'
import type { ResCardIn } from './types'
import css from './resources.module.css'

/**
 * 渲染一条资源卡:官方原名 + 这条资源拿来干什么。
 *
 * @param props 界面语言与这一条资源。
 * @returns 整卡链接。
 */
export function ResCard({ lang, item }: ResCardIn) {
  return (
    <LinkButton href={item.url} target={LINK_TARGET_BLANK} className={tileClsOf()}>
      <div className={css.tileHead}>
        <span className={css.tileName}>{item.name}</span>
      </div>
      <div className={css.tileUse}>{item.use[lang]}</div>
    </LinkButton>
  )
}
