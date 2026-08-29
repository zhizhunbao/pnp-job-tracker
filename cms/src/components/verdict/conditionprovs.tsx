'use client'
/**
 * verdict 域的结构:省专属题的真选项卡(2026-08-13 Frank:「按不同的省份划分不同的问题,
 * 改成 tab 切换」)。页签角标 = 该省还没答几题;面板不卸载(TabPanel 的 active 只切显隐)——
 * 面板里挂着答案存本地 state 的部件时,卸载一次答案就没了。
 * 2026-08-28 换装批自 ConditionGrid.tsx 里逐字重复两遍的页签块收成一件。
 *
 * @author Frank
 * @time 2026-08-28 17:55:00
 */
import { TabPanel, Tabs } from '@/components/tabs'
import { ConditionTiles } from './conditiontiles'
import { provRowsOf, tabItemsOf } from './functions'
import type { ConditionProvsIn } from './types'
import css from './verdict.module.css'

/**
 * 渲染省页签与各省面板。
 *
 * @param props 省码、条件行、页签身份与两只手柄(逐格注释见 ConditionProvsIn)。
 * @returns 页签条与各省的格子。
 */
export function ConditionProvs({
  provs, rows, provLabel, ariaLabel, idPrefix, active, onChange, onTile,
}: ConditionProvsIn) {
  const panels = []
  for (const prov of provs) {
    panels.push(
      <TabPanel key={prov} tabKey={prov} active={prov === active} idPrefix={idPrefix}>
        <ConditionTiles rows={provRowsOf({ rows, prov })} onTile={onTile} />
      </TabPanel>,
    )
  }
  return (
    <>
      <div className={css.cgTabs}>
        <Tabs ariaLabel={ariaLabel}
          idPrefix={idPrefix}
          value={active}
          onChange={onChange}
          items={tabItemsOf({ provs, rows, provLabel })} />
      </div>
      {panels}
    </>
  )
}
