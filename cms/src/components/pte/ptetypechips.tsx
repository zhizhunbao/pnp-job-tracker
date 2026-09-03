'use client'
/**
 * 域内小件:题型胶囊一行 —— 只列有题的型(按栏序 → 考试序),当前型亮起。
 * 19 型全列的四栏菜单 2026-09-03 晚撤回(Frank「怎么那么多整理中,题型不应该是放到 header hover
 * 才显示的二级标题吗」→ 全量题型归顶栏下拉,页面只留有货的)。
 *
 * @author Frank
 * @time 2026-09-03 12:00:00
 */
import { Chip } from '@/components/chip'
import { listHrefOf, sectionsOf, typeNameOf } from './functions'
import type { PteTypeChipsIn } from './types'
import css from './pte.module.css'

/**
 * 渲染题型胶囊一行。
 *
 * @param props 题型维度、当前题型、界面语言与取词函数。
 * @returns 一行胶囊。
 */
export function PteTypeChips({ types, type, lang }: PteTypeChipsIn) {
  const chips = []
  for (const sec of sectionsOf({ types })) {
    for (const x of sec.types) {
      if (x.count === 0) {
        continue
      }
      chips.push(
        <Chip key={x.code} href={listHrefOf({ type: x.code })} active={x.code === type}>
          {typeNameOf({ type: x, lang })}
        </Chip>,
      )
    }
  }
  return <div className={css.chips}>{chips}</div>
}
