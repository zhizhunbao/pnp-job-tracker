'use client'
/**
 * 域内小件:正文的一段(英文原文 + 段对段贴在它下面的对照译文)。
 * 译文由编号协议保证与原文段对段对齐(缺号 = 拒收),按序配对安全;超长稿只翻前段,
 * 尾段只显英文 —— 那一格给 null,整条译文行不渲。
 * 2026-09-30 小标题段(数据层挂的「## / ###」标记)渲成 h2 / h3,译文段跟着原文段走,标记一并剥掉。
 * 2026-08-27 换装批自 News.tsx 提出成文件。
 *
 * @author Frank
 * @time 2026-08-27 23:30:00
 */
import { HEAD_H2, HEAD_H3, HEAD_NONE } from './constants'
import { headLevelOf, unmarkOf } from './functions'
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
  const level = headLevelOf({ text })
  const plain = unmarkOf({ text })
  return (
    <div className={css.para}>
      {level === HEAD_NONE && <p><LineBreaks text={plain} /></p>}
      {level === HEAD_H2 && <h2 className={css.head2}>{plain}</h2>}
      {level === HEAD_H3 && <h3 className={css.head3}>{plain}</h3>}
      {trans != null && (
        <p className={css.trans}><LineBreaks text={unmarkOf({ text: trans })} /></p>
      )}
    </div>
  )
}
