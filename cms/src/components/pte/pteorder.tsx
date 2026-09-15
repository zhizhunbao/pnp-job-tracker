'use client'
/**
 * 域内小件:段落排序 —— 按现序列出段落,每段右侧一只抓手,拖着换位(指针事件,鼠标触屏同一套;
 * 把手只接按下,移动与松手由 hooks 的 effect 挂在 document 上;把手聚焦后上下箭头也能挪);提交前每段标身份字母(跟段走),提交后每段前给它在正确序里的位置
 * (与现位一致标绿,不一致标红)。批五 2026-09-04;同日 Frank「这个改成拖动不行吗」上移 / 下移钮退役,
 * 「默认怎么是排序号了」位次数字改字母。
 *
 * @author Frank
 * @time 2026-09-04 12:00:00
 */
import { cssOf } from '@/components/css'
import { IconGrip } from '@/components/icons'
import { CLS_SEP, ROLE_BUTTON } from './constants'
import { orderIndexOf, paraLabelOf } from './functions'
import type { PteOrderIn, PteParagraph } from './types'
import css from './pte.module.css'

/**
 * 渲染段落排序。
 *
 * @param props 取词函数、载荷、作答面板与是否提交。
 * @returns 段落清单。
 */
export function PteOrder({ t, extra, r, checked }: PteOrderIn) {
  const byId: Record<number, PteParagraph> = {}
  for (const p of extra.paragraphs) {
    byId[p.id] = p
  }
  const rows = []
  let pos = 0
  for (const id of r.order) {
    const p = byId[id]
    if (p == null) {
      continue
    }
    pos = pos + 1
    const want = orderIndexOf({ order: extra.order, id })
    let tagCls = cssOf(css.orderTag)
    if (checked && want === pos) {
      tagCls = tagCls + CLS_SEP + cssOf(css.blankOk)
    } else if (checked) {
      tagCls = tagCls + CLS_SEP + cssOf(css.blankBad)
    }
    let tag = paraLabelOf({ paragraphs: extra.paragraphs, id })
    if (checked) {
      tag = String(want)
    }
    let rowCls = cssOf(css.orderRow)
    if (r.dragId === id) {
      rowCls = rowCls + CLS_SEP + cssOf(css.orderDragging)
    }
    rows.push(
      <div key={id} className={rowCls} data-oid={id}>
        <span className={tagCls}>{tag}</span>
        <span className={css.orderText}>{p.text}</span>
        {checked === false && (
          <span className={css.orderGrip} role={ROLE_BUTTON} tabIndex={0} aria-label={t('pte.drag')}
            onPointerDown={r.dragOf(id)} onKeyDown={r.keyOf(id)}>
            <IconGrip />
          </span>
        )}
      </div>,
    )
  }
  return <div className={css.orderList}>{rows}</div>
}
