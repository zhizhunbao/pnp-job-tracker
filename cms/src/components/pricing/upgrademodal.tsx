'use client'
/**
 * pricing 域的升级 Pro 弹框(2026-09-04 Frank 拍板照猩际重做:两张套餐卡 30 天 CA$5 / 90 天 CA$13,
 * 90 天卡写「每 30 天多少钱」+ 省 N% 角标,每卡一行「到期不会自动续费」,点卡选中、「确认支付 CA$x」
 * 去 Stripe Checkout(卡 / 微信 / 支付宝在那页选,站内不碰支付方式与税);卡下面是权益清单,只写已有的功能。
 * **只在已登录上下文渲染** —— 未登录的升级入口先走 AuthModal 注册。
 * 2026-10-07 权益清单改读 PRO_PERKS 的标题(原先两条写的是 PTE 刷题,PTE 10-03 起不卖)。
 * 2026-11-09 Frank 定的投递动线:投递没额度时弹这一框,多一颗「不改写,直接投基础简历」;会员当期用完只出这一颗,
 * 不出购买卡与权益清单(说明那一行写额度哪天恢复)。
 * 2026-11-09 Frank「现在有两个定价页,是不是合成一个」→「可以」:全站卖会员只留这一种形态 —— 正文拆成 UpgradeBody
 * (定价页也铺它),本件只剩弹框外壳与标题;定价弹框 PricingModal 撤,原来弹它的入口都弹本框。
 * 「只在已登录上下文渲染」随之放开:没登录的入口(雇主对比、定价页)传 loggedIn = false,点「确认支付」先弹注册框。
 *
 * @author Frank
 * @time 2026-08-28 16:40:00
 */
import { IconStar } from '@/components/icons'
import { Modal } from '@/components/modal'
import { ICON_GAP, MODAL_SIZE_SM, Z_AUTH_STEP, Z_UPGRADE } from './constants'
import type { UpgradeModalIn } from './types'
import { UpgradeBody } from './upgradebody'
import css from './pricing.module.css'

/**
 * 升级 Pro 弹框。
 *
 * @param props 取词函数、关闭回调、弹这一下的缘由与付完回哪儿(逐格注释见 UpgradeModalIn)。
 * @returns 弹框。
 */
export function UpgradeModal({
  t, onClose, reason, back, onBase, baseOnly = false, loggedIn = true, z = Z_UPGRADE,
}: UpgradeModalIn) {
  return (
    <Modal onClose={onClose} size={MODAL_SIZE_SM} z={z}>
      {baseOnly === false && <div className={css.upTitle}><IconStar />{ICON_GAP}{t('acct.buyTitle')}</div>}
      <UpgradeBody t={t}
        reason={reason}
        back={back}
        onBase={onBase}
        baseOnly={baseOnly}
        loggedIn={loggedIn}
        authZ={z + Z_AUTH_STEP} />
    </Modal>
  )
}
