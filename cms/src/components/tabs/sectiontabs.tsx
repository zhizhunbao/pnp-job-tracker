'use client'
/**
 * tabs 域的模块二级 tab 条(2026-07-19 Frank 批「二级模块统一样式」):
 * 模块页 banner 正下方那条(如 移民动态:最新公告|时间线),圆角上沿,
 * 当前页高亮模块色。#205:当前页签 = span 不是 a(看着像链接点不动是 bug)。
 * 2026-08-24 自 ui/Tabs.tsx 拆出;模块色 prop 实查只有两档 → color 撤编成
 * tone="teal" 变体类,零 style。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */
import type { SectionTabsIn } from './types'
import { LinkButton } from '@/components/button'
import css from './tabs.module.css'

/**
 * 二级 tab 条;当前页渲 span(不可点),其余渲 <a>(要被爬到)。
 *
 * @param props 页签清单与模块色档。
 * @returns 二级 tab 条。
 */
export function SectionTabs({ tabs, tone = null }: SectionTabsIn) {
  let barCls = css.secTabs
  if (tone != null) {
    barCls = `${css.secTabs} ${css.teal}`
  }
  const items = []
  for (const tb of tabs) {
    if (tb.active) {
      items.push(
        <span key={tb.href} className={`${css.secTab} ${css.secOn}`}>{tb.label}</span>,
      )
    } else {
      items.push(
        <LinkButton key={tb.href} href={tb.href} className={`${css.secTab} tapPad`}>{tb.label}</LinkButton>,
      )
    }
  }
  return <div className={barCls}>{items}</div>
}
