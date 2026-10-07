'use client'
/**
 * 访客向导专业题的一列专业行(热门那一列、展开的专业类、只装一个专业的那一张、搜索结果共用):chip 桶的一行选项 ChipLine,
 * 名字按界面语言挑(英文取数据层短名,没译成回退英文),选中主色 + 勾;搜索结果把检索词那一截标主色。
 * 2026-10-05 照掌上高考改版立,替掉 GateMajorPills(一排大号胶囊 + 占位;热门与结果原先都是胶囊)。
 * 2026-10-05 自 gate 桶迁入(原 gate/gatemajorlines.tsx 的 GateMajorLines,改名 MajorLines);同日多选:
 * 选中的码换成清单(在清单里的都亮),选满时没选的行灰着点不动(ChipLine 的点不动档,判定见 functions 的 isMajorOff)。
 *
 * @author Frank
 * @time 2026-10-05 11:20:00
 */
import { ChipLine } from '@/components/chip'
import { isMajorOff, majorNameOf } from './functions'
import type { MajorLinesIn } from './types'

/**
 * 一列专业行。
 *
 * @param props 这一列的专业、要标的检索词、选中的码、界面语言码与点选手柄工厂(见 MajorLinesIn 逐格注释)。
 * @returns 一列行(无外壳,装它的卡 / 结果区给)。
 */
export function MajorLines({ rows, mark, codes, lang, pickOf }: MajorLinesIn) {
  const lines = []
  for (const row of rows) {
    lines.push(
      <ChipLine key={row.code} label={majorNameOf({ row, lang })} mark={mark} active={codes.includes(row.code)}
        disabled={isMajorOff({ codes, code: row.code })} onClick={pickOf(row)} />,
    )
  }
  return <>{lines}</>
}
