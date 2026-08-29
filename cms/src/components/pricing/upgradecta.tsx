'use client'
/**
 * pricing 域的统一升级钮(⓪ 2026-07-19 Frank 批「升级 Pro 按钮单独设计」):全站的升级
 * 入口从裸文字链换装到这一件 —— 已登录点了开升级弹框,未登录点了开注册弹框
 * (答题前注册闸是收费的地基:身份先留下,「自动帮你做」才有落点)。
 * #160 新增文字链形态:打码占位旁的 CTA 不该再是实心钮 —— 一屏若干处打码,每处一枚棕钮
 * 就是又一堵墙;实心钮留给顶栏与弹窗,稀缺性就是它的说服力。两种形态行为完全一致。
 * 2026-08-28 换装批自 UpgradeModal.tsx 拆出成文件(一个 tsx 一个组件),并把原先由唯一
 * 调用方传进来的字号收进 .upLink —— 组件不再开 style 口。
 *
 * @author Frank
 * @time 2026-08-28 16:40:00
 */
import { AuthModal } from '@/components/auth'
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { IconStar } from '@/components/icons'
import { AUTH_MODE_REGISTER, BTN_PRO, ICON_GAP, PLAIN_BTN_KIND, UPGRADE_AUTH, UPGRADE_BUY } from './constants'
import { ctaLabelOf, reloadPage } from './functions'
import { useUpgradeCta } from './hooks'
import type { UpgradeCtaIn } from './types'
import { UpgradeModal } from './upgrademodal'
import css from './pricing.module.css'

/**
 * 统一升级钮。
 *
 * @param props 取词函数、登录态、缘由、文案与形态(逐格注释见 UpgradeCtaIn)。
 * @returns 钮与它点开的那一层弹框。
 */
export function UpgradeCta({ t, loggedIn, reason, label, link = false }: UpgradeCtaIn) {
  const cta = useUpgradeCta({ loggedIn })
  return (
    <>
      {link && <Button kind={PLAIN_BTN_KIND}
        onClick={cta.onOpen}
        className={cssOf(css.upLink)}>{ctaLabelOf({ t, label, link: true })}</Button>}
      {link === false && <Button kind={BTN_PRO} sm onClick={cta.onOpen}>
        <IconStar />{ICON_GAP}{ctaLabelOf({ t, label, link: false })}
      </Button>}
      {cta.open === UPGRADE_BUY && <UpgradeModal t={t} reason={reason} onClose={cta.onClose} />}
      {cta.open === UPGRADE_AUTH && <AuthModal t={t}
        mode={AUTH_MODE_REGISTER}
        onClose={cta.onClose}
        onDone={reloadPage} />}
    </>
  )
}
