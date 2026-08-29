'use client'
/**
 * 域内小件:抽选表里的一条通告(如 ON 2026-06 改制)。跨满四列,琥珀底 —— 它讲的是通道本身
 * 变了,不是某一轮抽选。
 * 2026-08-28 换装批自 Pnp.tsx 的 PnpDrawsBlock 拆出成文件。
 *
 * @author Frank
 * @time 2026-08-28 17:59:16
 */
import { IconWarn } from '@/components/icons'
import type { DrawNoticeIn } from './types'
import css from './pnp.module.css'

/**
 * 渲染一条通告。
 *
 * @param props 通告全文。
 * @returns 通告行。
 */
export function DrawNotice({ text }: DrawNoticeIn) {
  return (
    <div className={css.notice}>
      <IconWarn /> {text}
    </div>
  )
}
