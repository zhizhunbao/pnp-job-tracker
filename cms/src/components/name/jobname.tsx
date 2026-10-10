'use client'
/**
 * 职位名两行(2026-10-09 N 批):英文职位名蓝链在上、界面语译名灰字在下;普通左键叠开职位框,Ctrl 点新标签开职位页。
 * 灰字由调用方按 jobtitle 桶口径算好传进来(存好的 → 当场现翻的;列表批量取、单岗现翻,各处取法不同)。
 *
 * @author Frank
 * @time 2026-10-09 09:00:00
 */
import { URL_JOB_HEAD } from './constants'
import { makeJobPeek } from './functions'
import { Name } from './name'
import type { JobNameIn } from './types'

/**
 * 职位名两行。
 *
 * @param props 职位号、职位名与灰字。
 * @returns 两行(或一行)。
 */
export function JobName({ id, title, sub }: JobNameIn) {
  return <Name en={title} sub={sub} href={URL_JOB_HEAD + String(id)} onOpen={makeJobPeek(id)} />
}
