'use client'
/**
 * 法务正文的一节:节标题 + 若干段落。2026-08-27 换装批自 Legal.tsx 拆出成件 ——
 * 原先「节 → 段 → 邮箱切片」三层循环嵌在同一个组件里,拆成三个文件后
 * 每层各自只有一层循环(一个 tsx 一个渲染 function)。
 *
 * @author Frank
 * @time 2026-08-27 23:08:05
 */
import { LegalParagraph } from './legalparagraph'
import type { LegalSectionIn } from './types'
import css from './legal.module.css'

/**
 * 正文一节。
 *
 * @param props 这一节的标题与段落(逐格注释见 LegalSectionIn)。
 * @returns 一节。
 */
export function LegalSection({ section }: LegalSectionIn) {
  const paragraphs = []
  for (const [k, text] of section.body.entries()) {
    paragraphs.push(<LegalParagraph key={k} text={text} />)
  }
  return (
    <section className={css.section}>
      <h2 className={css.h2}>{section.h}</h2>
      {paragraphs}
    </section>
  )
}
