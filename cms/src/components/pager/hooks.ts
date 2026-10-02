/**
 * pager 域的机器(2026-10-02 Frank「全站统一 都改成 展开 20 和 收起。全部统一」「展开 20, 再展开 20, 再开其余, 收起」):浏览器端已有全量的清单的展开状态 —— 已展开了几个,
 * 「展开」一次加 FOLD_STEP 个、「收起」归零(服务器分页的清单自己取数,只把已展开个数交给 FoldLine)。
 *
 * @author Frank
 * @time 2026-10-02 02:10:00
 */
import { useState } from 'react'
import { makeFoldMore, makeFoldUp } from './functions'
import type { FoldHookIn, FoldPanel } from './types'

/**
 * 清单的展开状态。
 *
 * @param x 折起来的总数。
 * @returns 已展开个数与两只手柄。
 */
export function useFold(x: FoldHookIn): FoldPanel {
  const [extra, setExtra] = useState(0)
  return {
    extra: Math.min(extra, x.hidden),
    onMore: makeFoldMore({ hidden: x.hidden, setExtra }),
    onFold: makeFoldUp(setExtra),
  }
}
