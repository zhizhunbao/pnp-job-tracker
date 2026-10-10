'use client'
/**
 * 访客向导第四题「你现在在哪个省?」:十省选择格子(chip 桶 ChipTile 的格子形;主字省全名,灰字小注省码),
 * 手机两列、电脑三列;「加拿大境外」殿后占满整行,带地球图标、不带小注。单选,点了亮、不自动往下走。
 * 2026-10-04 访客四题改版立(原第四题是借首访向导单选行的十一枚胶囊)。
 * 同日收口:「加拿大境外」照效果图图标在左、单行高(chip 桶的 wide 改横排,本域不写选项样式);点选手柄借 profile 桶的 makeOptPick。
 * 2026-10-05 Frank「加拿大境外怎么是长条的」:不再占满整行,改成与省同款的格子接在爱德华王子岛后面(图标在上);
 * chip 桶的 wide 随之没有用处、删。
 * 2026-10-09「我的档案」批(Frank「所在地 需不需要 选城市」→「可以」):选了省,格子下面出城市区(GateCities,选填);选境外不出。
 *
 * @author Frank
 * @time 2026-10-04 02:10:00
 */
import { ChipTile } from '@/components/chip'
import { cssOf } from '@/components/css'
import { IconGlobe } from '@/components/icons'
import { makeOptPick } from '@/components/profile'
import { GATE_ABROAD_KEY, GATE_PROV_OPTS, PROV_ABROAD } from './constants'
import { GateCities } from './gatecities'
import type { GatePartIn } from './types'
import css from './gate.module.css'

/**
 * 所在省题的格子。
 *
 * @param props 访客向导整机与取词函数(见 GatePartIn 逐格注释)。
 * @returns 十省格子 + 「加拿大境外」(同款格子,殿后)。
 */
export function GateProvs({ g, t }: GatePartIn) {
  const tiles = []
  for (const o of GATE_PROV_OPTS) {
    tiles.push(
      <ChipTile key={o.value}
        sub={o.value}
        active={g.provActive === o.value}
        onClick={makeOptPick({ value: o.value, onPick: g.onProv })}>
        {t(o.key)}
      </ChipTile>,
    )
  }
  return (
    <>
      <div className={cssOf(css.grid)}>
        {tiles}
        <ChipTile icon={<IconGlobe />}
          active={g.provActive === PROV_ABROAD}
          onClick={makeOptPick({ value: PROV_ABROAD, onPick: g.onProv })}>
          {t(GATE_ABROAD_KEY)}
        </ChipTile>
      </div>
      <GateCities g={g} t={t} />
    </>
  )
}
