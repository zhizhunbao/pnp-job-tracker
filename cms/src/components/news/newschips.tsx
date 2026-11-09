'use client'
/**
 * 域内小件:地区筛选药丸行(「全部」+ 本页真有条目的地区)。
 * 「只看重要」那枚已删(Frank 2026-07-18「这个去掉」)。
 * 2026-08-27 换装批自 News.tsx 提出成文件。
 * 2026-09-03 Frank「所有的 table 和可以更新数据的地方,右上角都应该有一个更新时间」:
 * 这一行是列表区正上方唯一那一行,行尾挂 Updated(time 桶,自带 margin-left:auto 顶右)。
 * 2026-10-10 Updated 挪进 Banner 右下角(Frank「这个更新时间放到 banner 右下角」),本行只剩药丸。
 *
 * @author Frank
 * @time 2026-08-27 23:30:00
 */
import { Chip } from '@/components/chip'
import { TEXT_NONE } from './constants'
import { chipClsOf, chipsClsOf, regionLabelOf } from './functions'
import type { NewsChipsIn } from './types'

/**
 * 渲染地区筛选行。
 *
 * @param props 取词函数、可选地区、当前筛选与两只手柄。
 * @returns 药丸行。
 */
export function NewsChips({ t, regions, region, onAll, pickOf }: NewsChipsIn) {
  const chips = []
  for (const code of regions) {
    chips.push(
      <Chip key={code} className={chipClsOf()} onClick={pickOf(code)} active={region === code}>
        {regionLabelOf({ t, region: code })}
      </Chip>,
    )
  }
  return (
    <div className={chipsClsOf()}>
      <Chip className={chipClsOf()} onClick={onAll} active={region === TEXT_NONE}>{t('chart.all')}</Chip>
      {chips}
    </div>
  )
}
