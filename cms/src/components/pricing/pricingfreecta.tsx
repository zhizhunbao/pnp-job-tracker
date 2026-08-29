'use client'
/**
 * pricing 域的免费卡底 CTA 三态:已是 Pro 出一格破折号占位(免费档对他没有动作可给,
 * 但格子不能塌 —— 三张卡的钮要在同一条线上)、已登录未 Pro 出「当前方案」、
 * 未登录出免费注册钮。三态是三种长相也是三种动作,所以各写各的一条早返回。
 * 2026-08-28 换装批自 PricingModal.tsx 免费卡底那串嵌套三目提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 16:40:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { IconCheck } from '@/components/icons'
import { BTN_SECONDARY, CTA_BLANK_MARK, ICON_GAP } from './constants'
import { ctaSlotClsOf } from './functions'
import type { PricingFreeCtaIn } from './types'
import css from './pricing.module.css'

/**
 * 免费卡底的 CTA。
 *
 * @param props 取词函数、登录态、Pro 态与注册出口(逐格注释见 PricingFreeCtaIn)。
 * @returns 该态对应的那一格。
 */
export function PricingFreeCta({ t, loggedIn, pro, onRegister }: PricingFreeCtaIn) {
  if (pro) {
    return <div className={ctaSlotClsOf({ current: false })}>{CTA_BLANK_MARK}</div>
  }
  if (loggedIn) {
    return (
      <div className={ctaSlotClsOf({ current: true })}><IconCheck />{ICON_GAP}{t('price.cur')}</div>
    )
  }
  return (
    <Button kind={BTN_SECONDARY}
      onClick={onRegister}
      className={cssOf(css.ctaReg)}>{t('price.regFree')}</Button>
  )
}
