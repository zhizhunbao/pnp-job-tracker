'use client'
/**
 * 域内小件:地区筛选药丸行(「全部」+ 本页真有条目的地区)。
 * 「只看重要」那枚已删(Frank 2026-07-18「这个去掉」)。
 * 2026-08-27 换装批自 News.tsx 提出成文件。
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
