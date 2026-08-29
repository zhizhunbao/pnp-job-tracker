'use client'
/**
 * 域内小件:详情页正文全文(逐段原文 + 对照译文),外加译文段落多于原文时的
 * 尾部兜底 —— 多出来的那几段照渲,不吞。
 * 2026-08-27 换装批自 News.tsx 提出成文件。
 *
 * @author Frank
 * @time 2026-08-27 23:30:00
 */
import { tailTransOf, transAtOf, transTailClsOf } from './functions'
import { LineBreaks } from './linebreaks'
import { NewsPara } from './newspara'
import type { NewsBodyIn } from './types'
import css from './news.module.css'

/**
 * 渲染正文全文。
 *
 * @param props 原文段、译文段与对照开关。
 * @returns 正文区。
 */
export function NewsBody({ paras, transParas, on }: NewsBodyIn) {
  const rows = []
  for (let i = 0; i < paras.length; i += 1) {
    const p = paras[i]
    if (p != null) {
      rows.push(<NewsPara key={i} text={p} trans={transAtOf({ paras: transParas, i, on })} />)
    }
  }
  const tails = []
  const extra = tailTransOf({ paras: transParas, i: paras.length, on })
  for (let j = 0; j < extra.length; j += 1) {
    const p = extra[j]
    if (p != null) {
      tails.push(<p key={j} className={transTailClsOf()}><LineBreaks text={p} /></p>)
    }
  }
  return (
    <div className={css.body}>
      {rows}
      {tails}
    </div>
  )
}
