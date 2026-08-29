'use client'
/**
 * 域内小件:一个 EE 类别的最近抽选(类别名 + 抽选行 + 展开后的历史轮次)。
 * 只有一个类别时不出类别名 —— 卡头已经说清是谁。有历史可展开时抽选行是一颗钮,
 * 没有历史就仍是一层不可点的 div(不给假入口)。
 * 2026-08-28 换装批自 Pnp.tsx 的 EeCategorySection 拆出成文件。
 *
 * @author Frank
 * @time 2026-08-28 17:59:16
 */
import { Button } from '@/components/button'
import { eeDisplay } from '@/lib/jobs'
import { BOX_GAP_BOTH, PLAIN_BTN_KIND } from './constants'
import { boxClsOf, catNameClsOf, drawLineClsOf, histExpandable, histRowsOf } from './functions'
import { EeDrawText } from './eedrawtext'
import { EeHistRow } from './eehistrow'
import type { EeCatDrawIn } from './types'
import css from './pnp.module.css'

/**
 * 渲染一个类别的最近抽选。
 *
 * @param props 取词函数、这个类别、类别名开关、历史轮次与展开态。
 * @returns 抽选块。
 */
export function EeCatDraw({ t, cat, showName, hist, open, onToggle }: EeCatDrawIn) {
  const expandable = histExpandable(hist)
  const rows = []
  if (expandable && open) {
    for (const r of histRowsOf({ t, hist })) {
      rows.push(<EeHistRow key={r.key} r={r} />)
    }
  }
  const text = <EeDrawText t={t} cat={cat} histCount={hist.length} open={open} expandable={expandable} />
  return (
    <div className={css.cat}>
      {showName && <div className={catNameClsOf({ lg: false })}>{eeDisplay({ t, label: cat.label })}</div>}
      {expandable && (
        <Button kind={PLAIN_BTN_KIND} className={drawLineClsOf({ clickable: true })} onClick={onToggle}>
          {text}
        </Button>
      )}
      {expandable === false && <div className={drawLineClsOf({ clickable: false })}>{text}</div>}
      {rows.length > 0 && <div className={boxClsOf({ clip: true, gap: BOX_GAP_BOTH })}>{rows}</div>}
    </div>
  )
}
