/**
 * 预览纸面(照 Job Bank 传统模板,与服务端 PDF 用同一份版式):姓名居中、联系方式居中、
 * 分区标题大写加横线、条目标题粗体右端起止、下一行灰字机构与地点、描述按要点排。
 *
 * @author Frank
 * @time 2026-11-07 16:00:00
 */
import { TEXT_NONE } from './constants'
import { CvLines } from './cvlines'
import type { CvPaperIn } from './types'
import css from './cv.module.css'

/**
 * 纸面。
 *
 * @param props 版式。
 * @returns 一张白纸。
 */
export function CvPaper({ layout }: CvPaperIn) {
  const contact = []
  for (const [i, c] of layout.contact.entries()) {
    contact.push(<div key={i} className={css.pContact}>{c}</div>)
  }
  const sections = []
  for (const [i, s] of layout.sections.entries()) {
    const items = []
    for (const [j, it] of s.items.entries()) {
      items.push(
        <div key={j} className={css.pItem}>
          <div className={css.pTop}>
            <span className={css.pTitle}>{it.title}</span>
            {it.when !== TEXT_NONE && <span className={css.pWhen}>{it.when}</span>}
          </div>
          {it.sub !== TEXT_NONE && <div className={css.pSub}>{it.sub}</div>}
          <CvLines lines={it.lines} />
        </div>,
      )
    }
    sections.push(
      <div key={i} className={css.pBody}>
        <div className={css.pHead}>{s.head}</div>
        <CvLines lines={s.lines} />
        {items}
      </div>,
    )
  }
  return (
    <div className={css.paper}>
      {layout.name !== TEXT_NONE && <div className={css.pName}>{layout.name}</div>}
      {contact}
      {sections}
    </div>
  )
}
