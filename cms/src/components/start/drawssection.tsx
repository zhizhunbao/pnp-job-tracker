'use client'
/**
 * 域内小件:S5 近期抽选表(省 PNP + 联邦 EE 最近几期,冷解读一列)。
 * 2026-09-04 重构时撤成一行链接,Frank 走查「这个 table 还是要保留的」当即回归 —— 政策动态段不回
 * (/news 承载),标题行右槽照全站表的形:左 Top N 右更新时间。
 * 2026-08-28 换装批自 Pulse.tsx 提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 14:20:00
 */
import { ID_DRAWS } from './constants'
import { toDrawCellRows } from './functions'
import { Band } from './band'
import { DrawBoard } from './drawboard'
import { Updated } from '@/components/time'
import { Sec } from './sec'
import type { DrawsSectionIn } from './types'
import css from './start.module.css'

/**
 * 渲染近期抽选表。
 *
 * @param props 抽选行、Top N 档与更新时刻。
 * @returns 一条色带;没有抽选行则 null。
 */
export function DrawsSection({ t, tEn, lang, updatedAt, draws }: DrawsSectionIn) {
  if (draws.length === 0) {
    return null
  }
  const rows = toDrawCellRows({ rows: draws, t, tEn, lang })
  return (
    <Band id={ID_DRAWS}>
      <Sec title={t('pulse.s5')} right={<Updated iso={updatedAt} t={t} />}>
        <div className={css.panel}>
          <DrawBoard t={t} rows={rows} />
        </div>
      </Sec>
    </Band>
  )
}
