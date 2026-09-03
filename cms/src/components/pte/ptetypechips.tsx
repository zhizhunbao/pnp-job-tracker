'use client'
/**
 * 域内小件:题型胶囊按栏分行(口语 / 写作 / 阅读 / 听力;Frank 2026-09-03「题型应该听说读写分开来」),
 * 一页一型的真链接,当前型亮起;人话名主文案,缩写不上胶囊。
 *
 * @author Frank
 * @time 2026-09-03 12:00:00
 */
import { Chip } from '@/components/chip'
import { listHrefOf, sectionLabelOf, sectionsOf, typeNameOf } from './functions'
import type { PteTypeChipsIn } from './types'
import css from './pte.module.css'

/**
 * 渲染题型胶囊(一栏一行)。
 *
 * @param props 题型维度、当前题型、界面语言与取词函数。
 * @returns 几行胶囊。
 */
export function PteTypeChips({ types, type, lang, t }: PteTypeChipsIn) {
  const rows = []
  for (const sec of sectionsOf({ types })) {
    const chips = []
    for (const x of sec.types) {
      chips.push(
        <Chip key={x.code} href={listHrefOf({ type: x.code })} active={x.code === type}>
          {typeNameOf({ type: x, lang })}
        </Chip>,
      )
    }
    rows.push(
      <div key={sec.section} className={css.secRow}>
        <span className={css.secLabel}>{sectionLabelOf({ t, section: sec.section })}</span>
        <div className={css.chips}>{chips}</div>
      </div>,
    )
  }
  return <div className={css.secRows}>{rows}</div>
}
