'use client'
/**
 * 域内小件:操作列。只剩收藏一颗(2026-07-26:「移民通道」钮下架,内容归各字段;
 * 逐行判定入口 2026-08-16 Frank 拍板撤 ——「不应该每个岗位都加一个…按钮,应该先评估,
 * 通过评估再跳到对应的工作」,动线反过来:先评估 → 初评表操作列「去投递」落到岗)。
 * 2026-08-28 换装批自 Jobs.tsx 提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 19:15:06
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { BTN_GHOST } from './constants'
import { actBtnClsOf } from './functions'
import type { ActionsCellIn } from './types'
import css from './jobs.module.css'

/**
 * 渲染操作列。
 *
 * @param props 钮面文案、已收藏态与开关。
 * @returns 一颗收藏钮。
 */
export function ActionsCell({ label, on, onToggle }: ActionsCellIn) {
  return (
    <span className={cssOf(css.actCell)}>
      <Button kind={BTN_GHOST} onClick={onToggle} className={actBtnClsOf(on)}>{label}</Button>
    </span>
  )
}
