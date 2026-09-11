'use client'
/**
 * 域内小件:省份段的一张指标表块(2026-09-09 起一指标一表,行 = 全国 + 九省;原「一地区一块」形随省块视图撤)——
 * 子标题 + 桌面按年表(通用表格序列能力:表 / 趋势、近 5 年 / 近 10 年)+ 手机卡(站规「电脑表格手机卡片」)。
 * Frank 2026-09-06 拍板省份段 = 宏观统计(含联邦),设计稿 docs/design/把脉页省份段-20260906.md。
 *
 * @author Frank
 * @time 2026-09-06 22:00:00
 */
import { Table } from '@/components/table'
import { TEXT_NONE } from './constants'
import { macroColsOf, macroRowKeyOf, macroSeriesOf, macroWrapClsOf } from './functions'
import { IndCards } from './indcards'
import { Sec } from './sec'
import type { MacroBlockIn, MacroRow } from './types'
import css from './start.module.css'

/**
 * 渲染一个地区块。
 *
 * @param props 取词函数、地区块与块间距开关(更新时间只出一枚,Frank 2026-09-06「多了一个更新时间」;
 *   2026-09-10 Frank「时间要贴在表格上面」「左边 title 也要紧贴表格」:标题行左标题右时间,整行贴表卡 4px,
 *   公式行(只竞争表)夹在中间也只留 4px;同日评估批按 09-06 那句收回段首一枚 —— 值全段相同,
 *   每表一枚 = 重复十几次,块里不再挂)。
 * @returns 带锚点的块。
 */
export function MacroBlock({ t, geo, gap }: MacroBlockIn) {
  const rows = geo.rows
  return (
    <div id={geo.anchor} className={css.subAnchor}>
      <div className={macroWrapClsOf({ gap })}>
      <Sec title={geo.name} sub>
        {geo.formula !== TEXT_NONE && <p className={css.formula}>{geo.formula}</p>}
        <div className={css.table}>
          <Table<MacroRow>
            rows={rows}
            cols={macroColsOf({
              t,
              years: geo.years,
              yoyLabel: geo.yoyLabel,
              keyLabel: geo.keyLabel,
              yearNotes: geo.yearNotes,
              recLabel: geo.recLabel,
            })}
            rowKey={macroRowKeyOf}
            series={macroSeriesOf({ t, geo })} />
        </div>
        <div className={css.cards}>
          <IndCards t={t} geo={geo} rows={rows} />
        </div>
      </Sec>
      </div>
    </div>
  )
}
