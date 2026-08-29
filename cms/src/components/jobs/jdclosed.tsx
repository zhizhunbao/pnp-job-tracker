'use client'
/**
 * 域内小件:已下架横幅。closed 岗页面照旧保留可访问(已收录不 404),但必须当面说清 ——
 * Google 招聘富结果把人直接送到详情页,他不经列表、看不到「状态」列,点了申请才撞过期页。
 * 文案 detail.closedNote 早就写好了,一直没人挂上去(2026-08-03 挂上);弹框与整页同源,
 * 挂这一处两边都有。
 * 2026-08-28 换装批自 Jd.tsx 提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 19:15:06
 */
import { cssOf } from '@/components/css'
import type { JdClosedIn } from './types'
import css from './jobs.module.css'

/**
 * 渲染已下架横幅。
 *
 * @param props 横幅正文。
 * @returns 琥珀底的一条提示。
 */
export function JdClosed({ text }: JdClosedIn) {
  return (
    <div className={cssOf(css.closed)}>{text}</div>
  )
}
