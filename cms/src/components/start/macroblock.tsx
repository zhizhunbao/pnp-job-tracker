'use client'
/**
 * 域内小件:省份段的一个地区块(全国或一省)—— 标题(名 + 码 + 译名 + 竞争度)+ 桌面按年表
 * (通用表格序列能力:表 / 趋势、近 5 年 / 全部)+ 手机卡(站规「电脑表格手机卡片」)。
 * Frank 2026-09-06 拍板省份段 = 宏观统计(含联邦),设计稿 docs/design/把脉页省份段-20260906.md。
 *
 * @author Frank
 * @time 2026-09-06 22:00:00
 */
import { Table } from '@/components/table'
import { Updated } from '@/components/time'
import { boardGapClsOf, macroColsOf, macroRowKeyOf, macroSeriesOf } from './functions'
import { IndCards } from './indcards'
import { Sec } from './sec'
import type { MacroBlockIn, MacroRow } from './types'
import css from './start.module.css'

/**
 * 渲染一个地区块。
 *
 * @param props 取词函数、地区块与块间距开关(更新时间只在段标题出一枚,Frank 2026-09-06「多了一个更新时间」)。
 * @returns 带锚点的块。
 */
export function MacroBlock({ t, geo, gap, updatedAt }: MacroBlockIn) {
  const rows = geo.rows
  return (
    <div id={geo.anchor} className={css.subAnchor}>
      <div className={boardGapClsOf({ gap })}>
      <Sec title={geo.name} right={<Updated iso={updatedAt} t={t} />} sub>
        <div className={css.table}>
          <Table<MacroRow>
            rows={rows}
            cols={macroColsOf({ t, years: geo.years, yoyLabel: geo.yoyLabel })}
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
