'use client'
/**
 * 清单末尾的展开 / 收起两只钮 —— 全站清单卡唯一出口(2026-10-02 Frank「全站统一 都改成 展开 20 和 收起。全部统一」「展开 20, 再展开 20, 再开其余, 收起」):
 * 收着「展开 20 家 ▾」→ 展开着「再展开 20 家 ▾」→ 剩不到一步「展开其余 N 家 ▾」;展开着另有「收起 ▴」。
 * 状态归调用方(浏览器端清单用 useFold,服务器分页的清单自己取数),本件只按「折起来几个 / 已展开几个」出钮。
 *
 * @author Frank
 * @time 2026-10-02 02:10:00
 */
import { Button } from '@/components/button'
import { FOLD_MORE_NONE, PLAIN_BTN_KIND } from './constants'
import { foldMoreLabelOf, foldUpLabelOf, foldViewOf } from './functions'
import type { FoldLineIn } from './types'
import css from './pager.module.css'

/**
 * 渲染展开 / 收起两只钮。
 *
 * @param props 取词函数、量词、折起来的总数、已展开个数、取数中与两只手柄。
 * @returns 钮行;都不用出时给 null。
 */
export function FoldLine({ t, unit, hidden, extra, busy, onMore, onFold }: FoldLineIn) {
  const view = foldViewOf({ hidden, extra })
  const more = foldMoreLabelOf({ t, unit, view, busy })
  if (more === FOLD_MORE_NONE && view.up === false) {
    return null
  }
  return (
    <div className={css.fold}>
      {more !== FOLD_MORE_NONE && (
        <Button kind={PLAIN_BTN_KIND} className={css.foldBtn} disabled={busy} onClick={onMore}>{more}</Button>
      )}
      {view.up && <Button kind={PLAIN_BTN_KIND} className={css.foldBtn} onClick={onFold}>{foldUpLabelOf(t)}</Button>}
    </div>
  )
}
