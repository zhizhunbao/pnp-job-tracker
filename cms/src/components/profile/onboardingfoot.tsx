'use client'
/**
 * 向导的底部钮组:左边「跳过这步」(每一步都能跳,跳到最后一步就是直接落地),
 * 右边「上一步 / 下一步」。第一步上不出「上一步」;终键在存档期间禁用(#113 组件统一 P2:
 * 上一步 ghost 灰字、主行动 primary,禁用态的浅蓝由 button 域内置)。
 * 2026-08-28 换装批自 OnboardingWizard.tsx 体内的钮组提出成件。
 *
 * @author Frank
 * @time 2026-08-28 17:30:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { PLAIN_BTN_KIND } from './constants'
import { obNextLabelOf } from './functions'
import type { OnboardingStepIn } from './types'
import css from './profile.module.css'

/**
 * 底部钮组。
 *
 * @param props 向导整机与取词函数(见 OnboardingStepIn 逐格注释)。
 * @returns 跳过、上一步与下一步三枚钮。
 */
export function OnboardingFoot({ p, t }: OnboardingStepIn) {
  return (
    <div className={css.obActs}>
      <Button kind={PLAIN_BTN_KIND} onClick={p.onNext} className={cssOf(css.obSkip)}>{t('ob.skip')}</Button>
      <div className={css.obActsRight}>
        {p.step > 0 && (
          <Button kind={PLAIN_BTN_KIND} onClick={p.onBack} className={cssOf(css.obBack)}>{t('ob.back')}</Button>
        )}
        <Button onClick={p.onNext} disabled={p.saving} className={cssOf(css.obNext)}>
          {obNextLabelOf({ isLast: p.isLast, apply: p.apply, t })}
        </Button>
      </div>
    </div>
  )
}
