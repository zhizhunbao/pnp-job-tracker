'use client'
/**
 * 域内小件:题型菜单 —— 口语 / 写作 / 阅读 / 听力四栏,19 型全列(Frank 2026-09-03「人家这都带个分类」),
 * 每型带占分权重灰注;有题的是真链接胶囊(当前型亮起),还没接的灰字「整理中」不可点。
 * 手机四栏叠成一列。
 *
 * @author Frank
 * @time 2026-09-03 12:00:00
 */
import { Chip } from '@/components/chip'
import { listHrefOf, sectionLabelOf, sectionsOf, typeNameOf, weightTextOf } from './functions'
import type { PteTypeChipsIn } from './types'
import css from './pte.module.css'

/**
 * 渲染四栏题型菜单。
 *
 * @param props 题型维度、当前题型、界面语言与取词函数。
 * @returns 四栏。
 */
export function PteTypeChips({ types, type, lang, t }: PteTypeChipsIn) {
  const cols = []
  for (const sec of sectionsOf({ types })) {
    const items = []
    for (const x of sec.types) {
      const name = typeNameOf({ type: x, lang })
      const w = weightTextOf({ weight: x.weight })
      if (x.count > 0) {
        items.push(
          <div key={x.code} className={css.typeItem}>
            <Chip href={listHrefOf({ type: x.code })} active={x.code === type}>{name}</Chip>
            <span className={css.typeW}>{w}</span>
          </div>,
        )
      } else {
        items.push(
          <div key={x.code} className={css.typeItem}>
            <span className={css.typeSoon}>{name}</span>
            <span className={css.typeW}>{w}</span>
            <span className={css.typeW}>{t('pte.soon')}</span>
          </div>,
        )
      }
    }
    cols.push(
      <div key={sec.section} className={css.secCol}>
        <div className={css.secHead}>{sectionLabelOf({ t, section: sec.section })}</div>
        {items}
      </div>,
    )
  }
  return <div className={css.secCols}>{cols}</div>
}
