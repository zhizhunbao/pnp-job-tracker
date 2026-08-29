'use client'
/**
 * 域内小件:一个分类分区 —— 小标题 + 每条一卡的密集网格(hao123 式)。
 * 2026-08-28 换装批自 Resources.tsx 提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 12:39:03
 */
import { catKeyOf } from './functions'
import { ResCard } from './rescard'
import type { ResCategoryIn } from './types'
import css from './resources.module.css'

/**
 * 渲染一个分区。
 *
 * @param props 取词函数、界面语言与这个分区。
 * @returns 分区(标题 + 网格)。
 */
export function ResCategory({ t, lang, group }: ResCategoryIn) {
  const cards = []
  for (const item of group.items) {
    cards.push(<ResCard key={item.url} lang={lang} item={item} />)
  }
  return (
    <section className={css.section}>
      <h2 className={css.catTitle}>{t(catKeyOf({ cat: group.cat }))}</h2>
      <div className={css.grid}>{cards}</div>
    </section>
  )
}
