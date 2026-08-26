'use client'
/**
 * tabs 域的面板壳:把 aria 对应关系钉死,消费端不必自己拼 id。
 * hidden 而不是不渲染:面板里挂着**答案存组件本地 state** 的部件时,卸载一次答案就没了
 * (08-12 分值卡弹窗化那次的坑)。消费端按需决定要不要真卸载。
 * 2026-08-24 自 ui/Tabs.tsx 拆出(一个 tsx 一个组件)。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */
import { cssOf } from '@/components/css'
import { CLS_NONE, ID_PANEL_SEG, ID_PREFIX_DEFAULT, ID_SEP, ROLE_TABPANEL } from './constants'
import type { TabPanelIn } from './types'
import css from './tabs.module.css'

/**
 * 面板壳;非当前面 hidden + display:none 双保险(有的全局样式会把 display 定回去)。
 *
 * @param props 页签键/是否当前面/id 前缀/内容。
 * @returns 面板。
 */
export function TabPanel({ tabKey, active, idPrefix = ID_PREFIX_DEFAULT, children }: TabPanelIn) {
  let cls = CLS_NONE
  if (active === false) {
    cls = cssOf(css.off)
  }
  return (
    <div role={ROLE_TABPANEL}
      id={`${idPrefix}${ID_SEP}${ID_PANEL_SEG}${ID_SEP}${tabKey}`}
      aria-labelledby={`${idPrefix}${ID_SEP}${tabKey}`}
      hidden={active === false}
      className={cls}>
      {children}
    </div>
  )
}
