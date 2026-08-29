'use client'
/**
 * 域内小件:整理版一节的正文行。有「- 」开头的行就整节渲成列表,否则逐行缩进;
 * 每行下面挂它对齐的那句译文(样式与资讯页对照同规范:蓝条 + 深蓝字)。
 * 2026-08-28 换装批自 Jd.tsx 的 JdFormattedView 体内提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 19:15:06
 */
import { cssOf } from '@/components/css'
import { jdStripDash } from './functions'
import { JdZhLine } from './jdzhline'
import type { JdSecLinesIn } from './types'
import css from './jobs.module.css'

/**
 * 渲染一节的正文行。
 *
 * @param props 这一节的行与渲不渲成列表。
 * @returns 列表或逐行。
 */
export function JdSecLines({ pairs, bullets }: JdSecLinesIn) {
  const items = []
  let i = 0
  for (const p of pairs) {
    const zh = <JdZhLine zh={p.zh} />
    if (bullets) {
      items.push(<li key={i}>{jdStripDash(p.en)}{zh}</li>)
    } else {
      items.push(<div key={i} className={cssOf(css.indent)}>{p.en}{zh}</div>)
    }
    i = i + 1
  }
  if (bullets) {
    return <ul className={cssOf(css.bullets)}>{items}</ul>
  }
  return <>{items}</>
}
