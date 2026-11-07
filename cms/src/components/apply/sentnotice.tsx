'use client'
/**
 * apply 桶 的投递发出去后的成功条(2026-10-08 照 AIApply 重设计故事 6):「已发给 <公司>」;刷新后消失(不记状态,同付款成功条)。
 * 2026-11-07 自 account 桶在新域重写(apply 桶投递流程挂它)。
 *
 * 2026-11-07「我的」整页在新域重写:成功条只剩投递框用(「我的」页改右上角提示),随唯一消费者归 apply 桶。
 *
 * @author Frank
 * @time 2026-11-07 18:00:00
 */
import { cssOf } from '@/components/css'
import { Notice } from '@/components/notice'
import { SENT_NOTICE_KEY, SENT_NOTICE_KIND } from './constants'
import type { SentNoticeIn } from './types'
import css from './apply.module.css'

/**
 * 成功条一条。
 *
 * @param props 取词函数与公司名。
 * @returns 绿色成功提示条。
 */
export function SentNotice({ t, company }: SentNoticeIn) {
  return <Notice kind={SENT_NOTICE_KIND} className={cssOf(css.sentOk)}>{t(SENT_NOTICE_KEY, { co: company })}</Notice>
}
