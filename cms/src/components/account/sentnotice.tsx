'use client'
/**
 * 投递区发出去后的成功条(2026-10-08 照 AIApply 重设计故事 6):「已发给 <公司>」,挂在投递记录表上方;
 * 刷新后消失(不记状态,同付款成功条)。
 *
 * @author Frank
 * @time 2026-10-08 10:00:00
 */
import { Notice } from '@/components/notice'
import { cssOf } from '@/components/css'
import { SENT_NOTICE_KEY, SENT_NOTICE_KIND } from './constants'
import type { SentNoticeIn } from './types'
import css from './account.module.css'

/**
 * 成功条一条。
 *
 * @param props 取词函数与公司名。
 * @returns 绿色成功提示条。
 */
export function SentNotice({ t, company }: SentNoticeIn) {
  return <Notice kind={SENT_NOTICE_KIND} className={cssOf(css.payOk)}>{t(SENT_NOTICE_KEY, { co: company })}</Notice>
}
