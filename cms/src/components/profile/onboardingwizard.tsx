'use client'
/**
 * 首访引导向导(E11-05 ② §2.5 分叉 + §3.4 零打字 + §7 触点):一步一问、每步可跳过、
 * 进度可见、价值前置。登录后没档案的人第一次到职位板自动弹一次(可关、不再弹),
 * 横幅上的「建档案」也手动开;投递流复用它当求职意向表单(E9-04),填完交还继续投递。
 * 弹框壳走 @/components/modal,题面与钮组是本件拼装,逐步的题目在各步件里。
 * 状态机器住 hooks 的 useOnboardingWizard,本件只拼装。
 * 2026-08-28 换装批自 OnboardingWizard.tsx(旧形迁入存量)整体重写:内联样式落
 * profile.module.css、逐步题面拆成各步件、记忆键与手柄进抽屉;对外的组件名与
 * OB_SEEN_KEY 一个字没动 —— 职位板、投递流、问卷三处消费者照旧。
 *
 * @author Frank
 * @time 2026-08-28 17:30:00
 */
import { Modal } from '@/components/modal'
import { OB_MODAL_SIZE } from './constants'
import { obBarStyleOf, obQuestionKeyOf, obValueTextOf } from './functions'
import { useOnboardingWizard } from './hooks'
import { OnboardingFoot } from './onboardingfoot'
import { OnboardingSteps } from './onboardingsteps'
import type { OnboardingWizardIn } from './types'
import css from './profile.module.css'

/**
 * 首访引导向导。
 *
 * @param props 取词函数、档案初值、关闭与投递流回调、弹框层级(见 OnboardingWizardIn 逐格注释)。
 * @returns 向导弹框。
 */
export function OnboardingWizard({ t, initial, onClose, onFinished, z }: OnboardingWizardIn) {
  let finished = null
  if (onFinished != null) {
    finished = onFinished
  }
  const p = useOnboardingWizard({ initial, onFinished: finished })
  return (
    <Modal onClose={onClose} size={OB_MODAL_SIZE} z={z}>
      <div className={css.obStepRow}>
        <span>{t('ob.step', { i: p.step + 1, n: p.total })}</span>
      </div>
      <div className={css.obBar}>
        {/* eslint-disable-next-line react/forbid-dom-props -- 运行时数据:走到第几步算出来的百分比,类是有限枚举装不下 */}
        <div className={css.obBarFill} style={obBarStyleOf({ step: p.step, total: p.total })} />
      </div>
      <div className={css.obValue}>{obValueTextOf({ apply: p.apply, t })}</div>
      <div className={css.obQuestion}>{t(obQuestionKeyOf({ step: p.cur }))}</div>
      <OnboardingSteps p={p} t={t} />
      <OnboardingFoot p={p} t={t} />
    </Modal>
  )
}
