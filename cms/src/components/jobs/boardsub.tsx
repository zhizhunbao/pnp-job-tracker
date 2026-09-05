'use client'
/**
 * 域内小件:横幅副标。标题数字口径:库内真实总数(第 15 轮 #34)/ 筛选态只报命中数
 * (第 17 轮 #42);证言行(第 5 轮 #14)跟在后面。
 * #170(Frank 批,实测证据):这行证言在 375px 上是 nowrap + 省略号 —— 后半截被直接切掉,
 * 也就是说「N 家雇主有外劳雇佣记录」这条**手机用户从来没看见过**,而手机是主要流量。
 * ⚠️ 旧注释说它「窄屏整条隐藏」,但全站 grep 不到那条媒体查询 —— 从来没写过,375 上照样显示。
 * 换装批只搬不改行为,那条缺失记在样式文件的注释里。
 * 2026-08-28 换装批自 Jobs.tsx 提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 19:15:06
 */
import { cssOf } from '@/components/css'
import { TEXT_NONE } from './constants'
import type { BoardSubIn } from './types'
import css from './jobs.module.css'

/**
 * 渲染横幅副标。
 *
 * @param props 主句与证言句。
 * @returns 副标。
 */
export function BoardSub({ text, proof }: BoardSubIn) {
  return (
    <>
      {text}
      {proof !== TEXT_NONE && <span className={cssOf(css.proof)}>{proof}</span>}
    </>
  )
}
