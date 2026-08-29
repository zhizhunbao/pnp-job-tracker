'use client'
/**
 * verdict 域的结构:一块判定瓦片。与事实瓦片同一套解剖(Frank 拍板瓦片式):
 * 灰标签在上、加粗结论在下、说明降级,同一副四列栅格(Frank:「不需要这么长」)。
 * 区别只有一处:结论带状态色 + ✓/!/✗ 符号(色弱用户靠符号兜底,可访问性不上砧板)。
 * 官方英文原句与出处链接/抓取日期**不再渲染**(2026-08-13 Frank:「这部分没有必要显示吧」)——
 * quote-anchored 依据仍在判定引擎与接口数据里,只是不占用户的屏。
 * 2026-08-28 换装批自 TripleVerdictModal.tsx 的 VRow 提出成件(配色逐格迁类)。
 *
 * @author Frank
 * @time 2026-08-28 17:55:00
 */
import { TEXT_NONE } from './constants'
import { rowMainClsOf, rowSignOf } from './functions'
import type { VerdictRowIn } from './types'
import css from './verdict.module.css'

/**
 * 渲染一块判定瓦片。
 *
 * @param props 判定态与三行文字(逐格注释见 VerdictRowIn)。
 * @returns 判定瓦片。
 */
export function VerdictRow({ state, label, main, sub }: VerdictRowIn) {
  const sign = rowSignOf({ state })
  return (
    <div className={css.tile}>
      <div className={css.tileLabel}>{label}</div>
      <div className={rowMainClsOf({ state })}>
        {sign !== TEXT_NONE && <span aria-hidden className={css.sign}>{sign}</span>}
        {main}
      </div>
      {sub !== TEXT_NONE && <div className={css.tileSub}>{sub}</div>}
    </div>
  )
}
