'use client'
/**
 * verdict 域的结构:申请人条件格(2026-08-13 Frank:「按不同的省份划分不同的问题,
 * 改成 tab 切换」)。共用题(基础 8 项 + 学历/经验/语言/年龄等全省通用的分值题)平铺在上;
 * 省专属题按省分组进真选项卡。摘要卡与带岗态判定卡②共用本组件 ——
 * 同一种东西一个长相。
 * 本件只挑分支:四种摆法(平铺 / 分组 / 指定省 / 共用题加省页签)各交给一件小件,
 * 网格本身在 ConditionTiles 一处定形。
 * 2026-08-28 换装批自 ConditionGrid.tsx 整体重写成小写件形制:
 * 内联样式与 <style> 注入逐格迁 verdict.module.css、筛选与取类进 functions.ts、
 * 省页签选中项进 hooks.ts、裸 <button> 改经 button 族。
 *
 * @author Frank
 * @time 2026-08-28 17:55:00
 */
import { ConditionGroups } from './conditiongroups'
import { ConditionProvs } from './conditionprovs'
import { ConditionTiles } from './conditiontiles'
import { ONLY_PROV, ONLY_SHARED, TEXT_NONE } from './constants'
import { groupNamesOf, provCodesOf, provRowsOf, sharedRowsOf } from './functions'
import { useConditionTabs } from './hooks'
import type { ConditionGridIn } from './types'

/**
 * 渲染申请人条件格。
 *
 * @param props 条件行、省显示名、点格手柄与三个摆法开关(逐格注释见 ConditionGridIn)。
 * @returns 条件格;这一摆法下一格都没有时不渲染。
 */
export function ConditionGrid({
  rows, provLabel, onTile, ariaLabel, idPrefix, only, province = TEXT_NONE, flat = false,
}: ConditionGridIn) {
  const shared = sharedRowsOf({ rows })
  const provs = provCodesOf({ rows })
  const tabs = useConditionTabs({ provs })
  const groups = groupNamesOf({ rows: shared, only })
  const withProvs = only !== ONLY_SHARED && provs.length > 0
  if (flat) {
    if (rows.length === 0) {
      return null
    }
    return <ConditionTiles rows={rows} onTile={onTile} />
  }
  if (groups.length > 0) {
    return (
      <>
        <ConditionGroups groups={groups} rows={shared} onTile={onTile} />
        {withProvs && (
          <ConditionProvs provs={provs}
            rows={rows}
            provLabel={provLabel}
            ariaLabel={ariaLabel}
            idPrefix={idPrefix}
            active={tabs.active}
            onChange={tabs.onChange}
            onTile={onTile} />
        )}
      </>
    )
  }
  if (province !== TEXT_NONE) {
    const mine = provRowsOf({ rows, prov: province })
    if (mine.length === 0) {
      return null
    }
    return <ConditionTiles rows={mine} onTile={onTile} />
  }
  return (
    <>
      {only !== ONLY_PROV && <ConditionTiles rows={shared} onTile={onTile} />}
      {withProvs && (
        <ConditionProvs provs={provs}
          rows={rows}
          provLabel={provLabel}
          ariaLabel={ariaLabel}
          idPrefix={idPrefix}
          active={tabs.active}
          onChange={tabs.onChange}
          onTile={onTile} />
      )}
    </>
  )
}
