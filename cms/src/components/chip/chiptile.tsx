'use client'
/**
 * chip 域的结构:大号选择格 —— 图标格(图标在上)与整宽大卡(图标在左、字更大)两形,选中右上角挂勾。
 * 2026-10-04 付费闭环访客四题改版首例(Frank「现在这个 UI 看着问题太简陋了」「参考一下其他网站」):
 * 选项少的题用大卡(照智联选身份),选项多的用格子(照 Airbnb 房型格、BOSS 城市灰块);
 * 与 Chip(筛选药丸)同属「可点的选项」,住同一个桶,不另开。
 * 同日收口:选中态挂 aria-pressed(读屏报得出选没选;可访问性不上砧板);占满整行的格子改横排(见 chip.module.css 的 .wide)。
 * 2026-10-05 占满整行那一档(wide)删(Frank「加拿大境外怎么是长条的」;它是唯一的用户)。
 *
 * @author Frank
 * @time 2026-10-04 02:30:00
 */
import { Button } from '@/components/button'
import { IconCheck } from '@/components/icons'
import { PLAIN_BTN_KIND, TILE_CARD } from './constants'
import { tileClsOf } from './functions'
import type { ChipTileIn } from './types'
import css from './chip.module.css'

/**
 * 大号选择格。
 *
 * @param props 选中、图标、灰字小注、形态、点击与主文字(见 ChipTileIn 逐格注释)。
 * @returns 选择格按钮。
 */
export function ChipTile({ active = false, icon, sub, shape, onClick, children }: ChipTileIn) {
  return (
    <Button kind={PLAIN_BTN_KIND}
      className={tileClsOf({ active, card: shape === TILE_CARD })}
      pressed={active}
      onClick={onClick}>
      {icon != null && <span className={css.tileIcon}>{icon}</span>}
      <span className={css.tileBody}>
        <span className={css.tileLabel}>{children}</span>
        {sub != null && <span className={css.tileSub}>{sub}</span>}
      </span>
      {active && <span className={css.tileCheck}><IconCheck /></span>}
    </Button>
  )
}
