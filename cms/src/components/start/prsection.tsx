'use client'
/**
 * 域内小件:PR 段 —— 每个地区一张小表(全国打头 + 九省;行 = PR 获批 / 其中省提名,列 = 年 + 同比)。
 * 2026-09-10 Frank 三连拍成段:「这个还是拆成每个省一个表好一些吧」「pr 是不是单独列一个大项」
 * 「pr 拆成和省一个级别的」—— 自省份段拆出,与省份平级,二级导航子项 = 全国 + 九省。
 * 段标题一枚更新时间(2026-09-11 Frank「这个更新时间要紧贴在表格上面,说了多少遍」:改成每表
 * 标题行右侧一枚,段首不挂),子块形制照省份段(MacroBlock)。
 *
 * @author Frank
 * @time 2026-09-10 22:00:00
 */
import { ID_PR_BAND, PH_PROV } from './constants'
import { Band } from './band'
import { MacroBlock } from './macroblock'
import { Placeholder } from './placeholder'
import { Sec } from './sec'
import type { PrSectionIn } from './types'

/**
 * 渲染 PR 段。
 *
 * @param props 取词函数、更新时刻与每地区小表。
 * @returns 一条色带;一张表都没有时给 null。
 */
export function PrSection({ t, updatedAt, prGeos, loading }: PrSectionIn) {
  if (prGeos.length === 0 && loading === false) {
    return null
  }
  const blocks = []
  let gap = false
  for (const g of prGeos) {
    blocks.push(<MacroBlock key={g.code} t={t} geo={g} updatedAt={updatedAt} gap={gap} />)
    gap = true
  }
  return (
    <Band id={ID_PR_BAND}>
      <Sec title={t('pulse.spr')}>
        {loading && <Placeholder size={PH_PROV} />}
        {blocks}
      </Sec>
    </Band>
  )
}
