'use client'
/**
 * 我的求职的简历附件格:开发出去的那份简历快照(2026-10-07 Frank「我的简历 我的 cover letter 是不是要跟着已投职位走」);新标签页打开,没有地址画横杠。
 *
 * @author Frank
 * @time 2026-10-07 07:00:00
 */
import { LinkButton } from '@/components/button'
import { DASH, TARGET_BLANK, TEXT_NONE } from './constants'
import type { MyJobCellRow } from './types'

/**
 * 简历附件格。
 *
 * @param r 展示行。
 * @returns 「查看」链接或横杠。
 */
export function ResumeFileCell(r: MyJobCellRow) {
  if (r.resumeHref === TEXT_NONE) {
    return <span>{DASH}</span>
  }
  return <LinkButton href={r.resumeHref} target={TARGET_BLANK}>{r.viewText}</LinkButton>
}
