'use client'
/**
 * 向导的头两行:步数行(「第 N 步 · 共 M 步」)+ 进度条。首访向导与访客向导共用。
 * 2026-10-03 付费闭环批 A1 自 OnboardingWizard.tsx 体内原样提出成件(访客向导同一副头,不复制第二份)。
 * 2026-10-04 访客四题改版:访客向导迁 gate 桶、顶行换成返回钮 + 四段进度条,不再借这副头;本件只剩首访向导用。
 * 2026-10-09「我的档案」批:首访向导退役,本件只剩站内投递流(apply 桶的 applyflow,2026-10-07 起经桶借)用;件名照旧不改。
 *
 * @author Frank
 * @time 2026-10-03 20:40:00
 */
import { obBarStyleOf } from './functions'
import type { ObHeadIn } from './types'
import css from './profile.module.css'

/**
 * 步数行 + 进度条。
 *
 * @param props 走到第几步、一共几步与取词函数(见 ObHeadIn 逐格注释)。
 * @returns 两行。
 */
export function OnboardingHead({ step, total, t }: ObHeadIn) {
  return (
    <>
      <div className={css.obStepRow}>
        <span>{t('ob.step', { i: step + 1, n: total })}</span>
      </div>
      <div className={css.obBar}>
        {/* eslint-disable-next-line react/forbid-dom-props -- 运行时数据:走到第几步算出来的百分比,类是有限枚举装不下 */}
        <div className={css.obBarFill} style={obBarStyleOf({ step, total })} />
      </div>
    </>
  )
}
