'use client'
/**
 * 域内小件:S5 近期抽选表(省 PNP + 联邦 EE 最近几期,冷解读一列)+ 「门槛」弹框
 * (2026-09-13 Frank「点门槛 应该弹框吧 不应该跳页面吧」:机器 useRulesModal 住这里,行里只带手柄)。
 * 2026-09-04 重构时撤成一行链接,Frank 走查「这个 table 还是要保留的」当即回归 —— 政策动态段不回
 * (/news 承载),标题行右槽照全站表的形:左 Top N 右更新时间。
 * 2026-11-05 Frank「把脉页面 把所有的 更新时间,都放到 banner 右下角吧」:标题行右槽的更新时间撤,整页一枚挂 banner 右下角。
 * 2026-08-28 换装批自 Pulse.tsx 提出成文件。
 * 2026-09-30 展示行改走 useDrawRows(内容没变同一份):原先每次渲染现洗一份,滚动一重渲染翻页就回第 1 页。
 * 2026-11-05 Frank「通道名加链接再删」:操作列(官方页 / 门槛)撤,通道名本身链官方页;门槛弹框整套随之退役。
 *
 * @author Frank
 * @time 2026-08-28 14:20:00
 */
import { ID_DRAWS, PH_LAZY } from './constants'
import { drawsOrEmpty } from './functions'
import { useDrawRows } from './hooks'
import { Band } from './band'
import { DrawBoard } from './drawboard'
import { Placeholder } from './placeholder'
import { Sec } from './sec'
import type { DrawsSectionIn } from './types'
import css from './start.module.css'

/**
 * 渲染近期抽选表。
 *
 * @param props 抽选行与 Top N 档。
 * @returns 一条色带;没有抽选行则 null。
 */
export function DrawsSection({ t, tEn, lang, draws }: DrawsSectionIn) {
  const rows = useDrawRows({ rows: drawsOrEmpty(draws), t, tEn, lang })
  if (draws != null && draws.length === 0) {
    return null
  }
  return (
    <Band id={ID_DRAWS}>
      <Sec title={t('pulse.s5')}>
        {draws == null && <Placeholder size={PH_LAZY} />}
        {draws != null && (
          <div className={css.panel}>
            <DrawBoard t={t} rows={rows} />
          </div>
        )}
      </Sec>
    </Band>
  )
}
