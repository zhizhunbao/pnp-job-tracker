'use client'
/**
 * 域内小件:正文的一段(英文原文 + 段对段贴在它下面的对照译文)。
 * 译文由编号协议保证与原文段对段对齐(缺号 = 拒收),按序配对安全;超长稿只翻前段,
 * 尾段只显英文 —— 那一格给 null,整条译文行不渲。
 * 2026-08-27 换装批自 News.tsx 提出成文件。
 *
 * @author Frank
 * @time 2026-08-27 23:30:00
 */
import { LineBreaks } from './linebreaks'
import type { NewsParaIn } from './types'
import css from './news.module.css'

/**
 * 渲染正文的一段。
 *
 * @param props 原文这一段与它的对照译文。
 * @returns 一段(原文 + 可能的译文)。
 */
export function NewsPara({ text, trans }: NewsParaIn) {
  return (
    <div className={css.para}>
      <p><LineBreaks text={text} /></p>
      {trans != null && (
        <p className={css.trans}><LineBreaks text={trans} /></p>
      )}
    </div>
  )
}
