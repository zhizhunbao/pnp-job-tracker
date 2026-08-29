'use client'
/**
 * tabs 域的主结构:通用选项卡(2026-08-12 Frank「还是需要一个通用的选项卡组件,
 * 不能用按钮代替」)。**不是一排按钮**:按钮是「点了发生一件事」,选项卡是
 * 「同一块内容的多个面,当前在哪一面」—— 语义、键盘行为、无障碍角色都不一样:
 *   · role=tablist / role=tab / aria-selected / aria-controls,读屏能报「第 2 项,共 4 项」;
 *   · 键盘 ← → Home End 切换(机器在 functions 的 makeTabKeys),Tab 键只落在当前选中项上;
 *   · 下划线态而非胶囊态 —— 与全站既有的胶囊(筛选、状态标)区分开;
 *   · 窄屏横向可滚动,永不换行(换行的选项卡会把下面的内容顶得跳来跳去)。
 * 2026-08-24 自 ui/Tabs.tsx 按组件域形制迁入(样式迁 module.css)。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */
import { Button } from '@/components/button'
import { ID_PANEL_SEG, ID_PREFIX_DEFAULT, ID_SEP, PLAIN_BTN_KIND, ROLE_TAB, ROLE_TABLIST } from './constants'
import { makeTabClick } from './functions'
import { useTabKeys } from './hooks'
import type { TabsIn } from './types'
import css from './tabs.module.css'

/**
 * 选项卡条。
 *
 * @param props 页签清单/当前值/切换回调/无障碍名/id 前缀。
 * @returns 选项卡条。
 */
export function Tabs({ items, value, onChange, ariaLabel, idPrefix = ID_PREFIX_DEFAULT }: TabsIn) {
  const keys = useTabKeys({ items, value, onChange })
  const btns = []
  for (const it of items) {
    const on = it.key === value
    const setRef = keys.refOf(it.key)
    const click = makeTabClick({ onChange, key: it.key })
    let cls = css.tab
    let badgeCls = css.badge
    let tabIndex = -1
    if (on) {
      cls = `${css.tab} ${css.on}`
      badgeCls = `${css.badge} ${css.badgeOn}`
      tabIndex = 0
    }
    let badge = null
    if (it.badge != null && it.badge !== '') {
      badge = <span className={badgeCls}>{it.badge}</span>
    }
    btns.push(
      <Button key={it.key}
        kind={PLAIN_BTN_KIND}
        btnRef={setRef}
        role={ROLE_TAB}
        id={`${idPrefix}${ID_SEP}${it.key}`}
        ariaSelected={on}
        ariaControls={`${idPrefix}${ID_SEP}${ID_PANEL_SEG}${ID_SEP}${it.key}`}
        tabIndex={tabIndex}
        onClick={click}
        onKeyDown={keys.onKey}
        className={cls}>
        {it.label}
        {badge}
      </Button>,
    )
  }

  return (
    <div role={ROLE_TABLIST} aria-label={ariaLabel} className={css.tablist}>
      {btns}
    </div>
  )
}
