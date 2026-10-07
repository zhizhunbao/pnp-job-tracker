'use client'
/**
 * chip 域的一行选项(2026-10-05 访客第 2 题照掌上高考立 —— 热门那一列、展开的专业类、搜索结果都是它):
 * 一行一个,整行可点;选中主色字 + 右侧勾,挂 aria-pressed;检索词命中的那一截标主色(markPartsOf 切三截)。
 * 与 Chip(筛选药丸)、ChipTile(选择格)同属「可点的选项」,住同一个桶;行与行之间的细线归本件(装它的卡不管)。
 * 同日多一档点不动(访客第 2 题多选,选满 3 个时没选的行灰着、点不动;原生 disabled,读屏报不可用):本桶出,不在业务桶另写灰行。
 * 同日多一格灰字小注 sub(访客第 3 题两个职业显示名相同时挂官方英文名区分,摆在名字下面;不给就不出):本桶出,不在业务桶另写小注行。
 *
 * @author Frank
 * @time 2026-10-05 10:50:00
 */
import { Button } from '@/components/button'
import { IconCheck } from '@/components/icons'
import { PLAIN_BTN_KIND } from './constants'
import { lineClsOf, markPartsOf } from './functions'
import type { ChipLineIn } from './types'
import css from './chip.module.css'

/**
 * 一行选项。
 *
 * @param props 文字、要标主色的检索词、选中、点不动、灰字小注与点击(见 ChipLineIn 逐格注释)。
 * @returns 选项行按钮。
 */
export function ChipLine({ label, mark, active, disabled, sub, onClick }: ChipLineIn) {
  const parts = markPartsOf({ label, mark })
  return (
    <Button kind={PLAIN_BTN_KIND}
      className={lineClsOf({ active, off: disabled })}
      pressed={active}
      disabled={disabled}
      onClick={onClick}>
      <span className={css.lineText}>
        {parts.pre}
        {parts.hit !== '' && <span className={css.lineMark}>{parts.hit}</span>}
        {parts.post}
        {sub != null && sub !== '' && <span className={css.lineSub}>{sub}</span>}
      </span>
      {active && <span className={css.lineCheck}><IconCheck /></span>}
    </Button>
  )
}
