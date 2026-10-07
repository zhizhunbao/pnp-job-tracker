'use client'
/**
 * pane 域的选择器竖排:搜索框、已选一行(tag 桶 TagRow)、定高区(Pane)自上而下,块与块隔一道固定间距;在宿主竖排里吃满多出来的高、
 * 许比内容矮(定高区缩到剩下的高,白卡不出竖条)。Pane 的 belowTags 让出的高 = TagRow 的占位高 + 这一道间距,两个数同住
 * pane.module.css(.stack 与 .belowTags)。左栏宽(--rail-w)是各题自己的事,由调用方递类叠在竖排上、往下继承给 tabs 桶 RailTabs。
 * 2026-10-05 立(访客第 2 题 majors 桶 MajorPicker 与第 3 题 quiz 桶 OccRail 的竖排外层逐格相同 —— 同一形态两份,
 * 改了一边的间距另一边的让高就错;收进通用桶一处出,样式自 majors.module.css 的 .picker 与 quiz.module.css 的 .rail 迁来)。
 *
 * @author Frank
 * @time 2026-10-05 15:20:00
 */
import { stackClsOf } from './functions'
import type { PaneStackIn } from './types'

/**
 * 选择器竖排。
 *
 * @param props 调用方的左栏宽类与竖排里的几块(见 PaneStackIn 逐格注释)。
 * @returns 竖排外层。
 */
export function PaneStack({ railCls, children }: PaneStackIn) {
  return <div className={stackClsOf(railCls)}>{children}</div>
}
