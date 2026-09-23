'use client'
/**
 * Stripe 付款回跳的成功提示(E3-03):回跳 `/account?ok=1` 时出一条绿条,到期日由 webhook 拨,
 * 前端只出提示。2026-09-23 Frank 把账户页撤到三节(「只保留一个 我的简历 我的收藏 我的求职
 * 其他的能删都删了」),这条提示原住概览节 AccountOverview 顶上 —— 概览删了它不能跟着没,
 * 原样抽成这一件;出不出由页面门按面板的 payOk 判,挂在右列内容最上面,三节都出。
 *
 * @author Frank
 * @time 2026-09-23 01:32:44
 */
import { Notice } from '@/components/notice'
import { cssOf } from '@/components/css'
import { PAY_OK_KIND } from './constants'
import type { PayOkNoticeIn } from './types'
import css from './account.module.css'

/**
 * 付款成功提示一条。
 *
 * @param props 取词函数(见 PayOkNoticeIn 逐格注释)。
 * @returns 绿色成功提示条。
 */
export function PayOkNotice({ t }: PayOkNoticeIn) {
  return <Notice kind={PAY_OK_KIND} className={cssOf(css.payOk)}>{t('acct.payOk')}</Notice>
}
