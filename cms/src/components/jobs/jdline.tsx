'use client'
/**
 * 域内小件:JD 原文保真轨的一行。六档各一种版式(空行 = 段距、列表项、大节头、子节头、
 * 行内「Label: 值」、普通正文行),档由 functions 的 jdLineViewOf 先算好。
 * 2026-08-28 换装批自 Jd.tsx 的 renderLine 闭包提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 19:15:06
 */
import { cssOf } from '@/components/css'
import { COLON, JD_KIND, SPACE } from './constants'
import type { JdLineIn } from './types'
import css from './jobs.module.css'

/**
 * 渲染 JD 正文的一行。
 *
 * @param props 这一行的展示行。
 * @returns 对应版式的一行。
 */
export function JdLine({ view }: JdLineIn) {
  if (view.kind === JD_KIND.gap) {
    return <div className={cssOf(css.gap)} />
  }
  if (view.kind === JD_KIND.bullet) {
    return <div className={cssOf(css.bullet)}>{view.text}</div>
  }
  if (view.kind === JD_KIND.h1) {
    return <div className={cssOf(css.h1)}>{view.text}</div>
  }
  if (view.kind === JD_KIND.h2) {
    return <div className={cssOf(css.h2)}>{view.text}</div>
  }
  if (view.kind === JD_KIND.label) {
    return (
      <div className={cssOf(css.indent)}>
        <strong className={cssOf(css.label)}>{view.label}{COLON}</strong>{SPACE}{view.text}
      </div>
    )
  }
  return <div className={cssOf(css.indent)}>{view.text}</div>
}
