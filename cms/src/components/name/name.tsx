'use client'
/**
 * 名字两行(2026-10-09 N 批,Frank「这部分组件能不能全站统一」「而且这些英文应该是可以点击的」「按这种为模版」):
 * 英文原名在上,界面语译名灰字在下(英文界面或没译名只出一行);职位名、公司名点了开弹框(普通左键)、Ctrl 点新标签开整页,
 * 城市、省份点了新标签开 Google 地图(Frank「城市 和 省份 点击 跳 google 地图啊」),没给链接就是黑字不可点。
 * 只给 onOpen 不给链接 = 只开框没有整页(池键公司;N6 补)。
 * 全站名字两行只此一个实现(通用形态单一出口);表格格子、胶囊、下拉按 10-08 规定保留中文短名,不走它。
 *
 * @author Frank
 * @time 2026-10-09 06:40:00
 */
import { LinkButton } from '@/components/button'
import { LINK_CLS, TARGET_BLANK, TEXT_NONE } from './constants'
import { makeNameClick } from './functions'
import type { NameIn } from './types'
import css from './name.module.css'

/**
 * 名字两行。
 *
 * @param props 英文、译名、链接与点了做什么。
 * @returns 两行(或一行)。
 */
export function Name({ en, sub, href, onOpen }: NameIn) {
  return (
    <span className={css.name}>
      {href == null && onOpen == null && <span className={css.en}>{en}</span>}
      {href == null && onOpen != null && (
        <LinkButton onClick={makeNameClick(onOpen)} className={LINK_CLS}>{en}</LinkButton>
      )}
      {href != null && onOpen != null && (
        <LinkButton href={href} onClick={makeNameClick(onOpen)} className={LINK_CLS}>{en}</LinkButton>
      )}
      {href != null && onOpen == null && (
        <LinkButton href={href} target={TARGET_BLANK} className={LINK_CLS}>{en}</LinkButton>
      )}
      {sub !== TEXT_NONE && <span className={css.sub}>{sub}</span>}
    </span>
  )
}
