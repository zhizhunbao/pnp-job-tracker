'use client'
/**
 * 域内小件:S6 职位板入口(文案承接判决)。全站唯一用渐变的色带,标记「这里是出口」。
 * S7 订阅 / 分享区与页尾口径说明 2026-08-06 Frank 拍板都删(半空色带只挂一个折叠钮
 * = 版面噪音)—— 本页到这里结束。
 * 2026-08-28 换装批自 Pulse.tsx 提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 14:20:00
 */
import { LinkButton } from '@/components/button'
import { URL_HOME } from './constants'
import { ctaBtnClsOf, trackCtaClick } from './functions'
import { Band } from './band'
import type { CtaBandIn } from './types'
import css from './start.module.css'

/**
 * 渲染职位板入口区。
 *
 * @param props 取词函数。
 * @returns 渐变色带。
 */
export function CtaBand({ t }: CtaBandIn) {
  return (
    <Band cta>
      <div className={css.cta}>
        <span className={css.ctaText}>
          <span className={css.ctaTitle}>{t('pulse.s6.t')}</span>
          <span className={css.ctaSub}>{t('pulse.s6.s')}</span>
        </span>
        <LinkButton href={URL_HOME} className={ctaBtnClsOf()} onClick={trackCtaClick}>
          {t('home.ctaBrowse')}
        </LinkButton>
      </div>
    </Band>
  )
}
