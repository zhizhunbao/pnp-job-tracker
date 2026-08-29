'use client'
/**
 * pricing 域的定价弹窗(E8-02,2026-07-06 用户拍板「定价也是弹窗」):对照表与按钮三态
 * 走的就是 PricingCard 那一份代码,不许 fork;/pricing 页保留供直链 / SEO / Stripe 回跳,
 * 站内入口一律开本弹窗。
 * 加高档(94vh):三卡是站内最长的弹框内容,85vh 在普通笔记本必出滚动条
 * (2026-07-17 用户「不要有滚动框」)。
 * 档位数走 clientCapsOf() —— 客户端拿到的是构建期默认值;哪天用 env 改分层数字,
 * 那几个常量要么 NEXT_PUBLIC 化,要么改走 props。
 * 2026-08-28 换装批自 PricingModal.tsx 重写成小写件形制。
 *
 * @author Frank
 * @time 2026-08-28 16:40:00
 */
import { AuthModal } from '@/components/auth'
import { Modal } from '@/components/modal'
import { AUTH_MODE_REGISTER, MODAL_SIZE_LG, Z_AUTH_STEP, Z_PRICING } from './constants'
import { clientCapsOf } from './functions'
import { usePricingModal } from './hooks'
import { PricingCard } from './pricingcard'
import type { PricingModalIn } from './types'
import css from './pricing.module.css'

/**
 * 定价弹窗。
 *
 * @param props 取词函数、登录态、Pro 态、关闭回调与层级(逐格注释见 PricingModalIn)。
 * @returns 弹窗与窗内点注册时那一层注册弹框。
 */
export function PricingModal({ t, loggedIn, pro, onClose, z = Z_PRICING }: PricingModalIn) {
  const modal = usePricingModal()
  return (
    <Modal onClose={onClose} size={MODAL_SIZE_LG} z={z} tall>
      <h3 className={css.modalTitle}>{t('price.title')}</h3>
      <p className={css.modalSub}>{t('price.sub')}</p>
      <PricingCard t={t}
        loggedIn={loggedIn}
        pro={pro}
        caps={clientCapsOf()}
        onRegister={modal.onRegister} />
      {modal.authOpen && <AuthModal t={t}
        mode={AUTH_MODE_REGISTER}
        z={z + Z_AUTH_STEP}
        onClose={modal.onAuthClose}
        onDone={modal.onAuthDone} />}
    </Modal>
  )
}
