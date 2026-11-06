'use client'
/**
 * 「最近跑完」卡失败行下面那条跨列细行:本轮最后几行出错行,原样等宽排(2026-11-06 Frank「跑完的任务是不是应该有历史记录」)。
 * 成功行没有报错,不挂细行。
 *
 * @author Frank
 * @time 2026-11-06 01:10:00
 */
import { TEXT_NONE } from './constants'
import type { RunRow } from './types'
import css from './queue.module.css'

/**
 * 渲染报错细行。
 *
 * @param r 这一行的展示行。
 * @returns 报错块;没有报错 = null(表格不追加细行)。
 */
export function RunError(r: RunRow) {
  if (r.errorText === TEXT_NONE) {
    return null
  }
  return <pre className={css.err}>{r.errorText}</pre>
}
