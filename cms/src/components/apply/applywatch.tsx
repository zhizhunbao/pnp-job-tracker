'use client'
/**
 * 投递框宿主的本体(2026-10-09 A 批):读地址栏的 `?apply=<职位号>`,带了就弹投递框;换岗按职位 id 整框重挂(重新取起始态)。
 * 读查询串要 useSearchParams,外层 ApplyHost 给它包一层 Suspense。
 *
 * @author Frank
 * @time 2026-10-09 02:10:00
 */
import { ApplyModal } from './applymodal'
import { useApplyHost } from './hooks'

/**
 * 宿主本体。
 *
 * @returns 地址栏带了职位就是投递框,其余什么都不渲。
 */
export function ApplyWatch() {
  const h = useApplyHost()
  if (h.jobId == null) {
    return null
  }
  return <ApplyModal key={h.jobId} jobId={h.jobId} onClose={h.onClose} />
}
