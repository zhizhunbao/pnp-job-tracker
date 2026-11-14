'use client'
/**
 * gate 域的结构:修改面板里长清单那一格的已选名字(2026-11-09「我的」第一批,原先只写「已选 N 个」,保存前看不到选了什么):
 * 一个名字一行,从简历来的挂「来自简历」胶囊;多了折起,修改钮在右。
 * 2026-11-13 Frank「来自简历 删掉」:胶囊撤,名字后面什么都不挂。
 *
 * @author Frank
 * @time 2026-11-09 16:00:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { FoldLine, useFold } from '@/components/pager'
import { FORM_NONE_KEY, FORM_SECONDARY_KIND, PICK_FOLD_N, PICK_FOLD_UNIT_KEY, TEXT_NONE } from './constants'
import type { GatePickedIn } from './types'
import css from './gate.module.css'

/**
 * 一格已选名字。
 *
 * @param props 名字行、修改手柄与取词。
 * @returns 名字与修改钮。
 */
export function GatePicked({ lines, onEdit, t }: GatePickedIn) {
  const hidden = Math.max(0, lines.length - PICK_FOLD_N)
  const f = useFold({ hidden })
  const out = []
  for (const l of lines.slice(0, PICK_FOLD_N + f.extra)) {
    out.push(
      <div key={l.key} className={cssOf(css.pickName)}>
        <span>{l.name}</span>
        {l.sub !== TEXT_NONE && <span className={cssOf(css.pickSub)}>{l.sub}</span>}
      </div>,
    )
  }
  return (
    <div className={cssOf(css.pickRow)}>
      <div className={cssOf(css.pickNames)}>
        {lines.length === 0 && <span>{t(FORM_NONE_KEY)}</span>}
        {out}
        <FoldLine t={t}
          unit={t(PICK_FOLD_UNIT_KEY)}
          hidden={hidden}
          extra={f.extra}
          busy={false}
          onMore={f.onMore}
          onFold={f.onFold} />
      </div>
      <Button kind={FORM_SECONDARY_KIND} sm onClick={onEdit}>{t('pf.edit')}</Button>
    </div>
  )
}
