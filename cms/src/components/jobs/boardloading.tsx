'use client'
/**
 * 域内小件:整表换血条。#83(Frank「点我的匹配先跳医疗再跳科技」):整表换血(第 0 页在拉)
 * 期间旧行原样挂着零提示,视觉像跳两次 —— 换血中表格/卡片半透明 + 顶部这一条「更新中」,
 * 数据回来再恢复。
 * 2026-08-28 换装批自 Jobs.tsx 提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 19:15:06
 */
import { cssOf } from '@/components/css'
import type { BoardLoadingIn } from './types'
import css from './jobs.module.css'

/**
 * 渲染换血条。
 *
 * @param props 「更新中」文案。
 * @returns 转圈 + 一句话。
 */
export function BoardLoading({ text }: BoardLoadingIn) {
  return (
    <div className={cssOf(css.loading)}>
      <span className={cssOf(css.spin)} />
      {text}
    </div>
  )
}
