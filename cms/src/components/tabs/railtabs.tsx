'use client'
/**
 * tabs 域的竖排左栏:左边一列页签、右边一块面板,各自上下滚(2026-10-05 访客第 2 题照掌上高考立 ——
 * Frank「参考掌上高考啊」:左栏大类,第一项热门,右边是这一类的专业类)。
 * 和横排 Tabs 是同一种东西(同一块内容的多个面),所以同一套语义:tablist(竖排,aria-orientation)/ tab / tabpanel,
 * 上下键相邻循环、Home / End 跳两端,Tab 键只落在当前项上;面板只有一块(内容跟着当前项换),所有页签 aria-controls 指它。
 * 长相照掌上高考:左栏浅灰底,每项 52px 等高、一行;当前项浅主色底 + 主色字 + 左侧 3px 主色竖条(字重不变,切换不跳)。
 * 左栏宽由调用方在外层用 CSS 变量 --rail-w 定(文字长短跟语言走,本件不猜),没给按 88px。
 * 2026-10-05 访客第 3 题也用这副两栏(Frank「也改成左右 两部分吗?」「改啊」):面板自带白卡浮在灰底上那一圈内衬(原住第 2 题
 * majors 桶包在面板里的一层,两题同一副长相,收进本件);左栏一项放不下一行时在词间折到第二行(职业大类英文名长;等高不变)。
 *
 * @author Frank
 * @time 2026-10-05 10:30:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import {
  ID_PANEL_SEG, ID_SEP, ORIENT_VERTICAL, PLAIN_BTN_KIND, ROLE_TAB, ROLE_TABLIST, ROLE_TABPANEL,
} from './constants'
import { makeTabClick } from './functions'
import { useTabKeys } from './hooks'
import type { RailTabsIn } from './types'
import css from './tabs.module.css'

/**
 * 竖排左栏 + 面板。
 *
 * @param props 左栏各项、当前值、切换回调、无障碍名、id 前缀与面板内容(见 RailTabsIn 逐格注释)。
 * @returns 两栏。
 */
export function RailTabs({ items, value, onChange, ariaLabel, idPrefix, children }: RailTabsIn) {
  const keys = useTabKeys({ items, value, onChange, vertical: true })
  const panelId = `${idPrefix}${ID_SEP}${ID_PANEL_SEG}`
  const tabs = []
  for (const it of items) {
    const on = it.key === value
    let cls = cssOf(css.railTab)
    let tabIndex = -1
    if (on) {
      cls = `${cssOf(css.railTab)} ${cssOf(css.railOn)}`
      tabIndex = 0
    }
    tabs.push(
      <Button key={it.key}
        kind={PLAIN_BTN_KIND}
        btnRef={keys.refOf(it.key)}
        role={ROLE_TAB}
        id={`${idPrefix}${ID_SEP}${it.key}`}
        ariaSelected={on}
        ariaControls={panelId}
        tabIndex={tabIndex}
        onClick={makeTabClick({ onChange, key: it.key })}
        onKeyDown={keys.onKey}
        className={cls}>
        {it.label}
      </Button>,
    )
  }
  return (
    <div className={cssOf(css.rail)}>
      <div role={ROLE_TABLIST} aria-orientation={ORIENT_VERTICAL} aria-label={ariaLabel}
        className={cssOf(css.railList)}>
        {tabs}
      </div>
      <div role={ROLE_TABPANEL} id={panelId} aria-labelledby={`${idPrefix}${ID_SEP}${value}`}
        className={cssOf(css.railPanel)}>
        {children}
      </div>
    </div>
  )
}
