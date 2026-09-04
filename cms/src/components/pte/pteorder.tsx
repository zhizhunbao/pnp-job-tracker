'use client'
/**
 * 域内小件:段落排序 —— 按现序列出段落,每段带上移 / 下移钮;提交后每段前给它在正确序里的位置
 * (与现位一致标绿,不一致标红)。批五 2026-09-04。
 *
 * @author Frank
 * @time 2026-09-04 12:00:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { CLS_SEP, KIND_ICON, MOVE_DOWN, MOVE_UP, ORDER_BASE } from './constants'
import { orderIndexOf } from './functions'
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
    let tag = String(pos)
    if (checked) {
      tag = String(want)
    }
    rows.push(
      <div key={id} className={css.orderRow}>
        <span className={tagCls}>{tag}</span>
        <span className={css.orderText}>{p.text}</span>
        {checked === false && (
          <span className={css.orderBtns}>
            <Button kind={KIND_ICON} sm onClick={r.moveOf({ id, dir: MOVE_UP })} disabled={pos === ORDER_BASE}
              ariaLabel={t('pte.up')}>
              {t('pte.up')}
            </Button>
            <Button kind={KIND_ICON} sm onClick={r.moveOf({ id, dir: MOVE_DOWN })} disabled={pos === r.order.length}
              ariaLabel={t('pte.down')}>
              {t('pte.down')}
            </Button>
          </span>
        )}
      </div>,
    )
  }
  return <div className={css.orderList}>{rows}</div>
}
