'use client'
/**
 * 身份题的格子(2026-10-13 Frank「我的档案回答完了,自动在下面出一个 section 列出我的通道」:档案加题):
 * 六个身份一格一个(同所在省题的格子),单选,点了直接进下一题。
 *
 * @author Frank
 * @time 2026-10-13 02:00:00
 */
import { ChipTile } from '@/components/chip'
import { cssOf } from '@/components/css'
import { makeOptPick } from '@/components/profile'
import { FIT_WHOS, K_WHO_HEAD } from './constants'
import type { GatePartIn } from './types'
import css from './gate.module.css'

/**
 * 身份题的格子。
 *
 * @param props 访客向导整机与取词函数(见 GatePartIn 逐格注释)。
 * @returns 六格。
 */
export function GateWho({ g, t }: GatePartIn) {
  const tiles = []
  for (const w of FIT_WHOS) {
    tiles.push(
      <ChipTile key={w}
        active={g.edit.who === w}
        onClick={makeOptPick({ value: w, onPick: g.edit.onWho })}>
        {t(K_WHO_HEAD + w)}
      </ChipTile>,
    )
  }
  return <div className={cssOf(css.grid)}>{tiles}</div>
}
