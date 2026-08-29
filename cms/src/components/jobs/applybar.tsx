'use client'
/**
 * E9-04 投递栏(B11,2026-07-24 拍板):详情底部常驻;注册闸设在投递 = 全站意愿最强瞬间。
 * 2026-07-25 用户:全宽大蓝钮「太吓人」→ 右对齐紧凑钮;同日「复制要点」钮撤除,只留投递单钮。
 * 底 padding 14px = 吸底栏自带留白(容器底 padding 已归 0,补「穿墙」);窄屏整页改 fixed 时
 * 由占位补回文档流高度,免得来源行被压住。
 * 流程与三个闸的口径都在 hooks 的 useApplyBar。
 * 2026-08-28 换装批自 Jd.tsx 重写落位。
 *
 * @author Frank
 * @time 2026-08-28 19:15:06
 */
import { AuthModal } from '@/components/auth'
import { Button, LinkButton } from '@/components/button'
import { cssOf } from '@/components/css'
import { Modal } from '@/components/modal'
import { OnboardingWizard } from '@/components/profile'
import { ResumeMatchModal } from '@/components/resume'
import {
  APPLY_AUTH, APPLY_INTENT, AUTH_REGISTER, BTN_GHOST, MODAL_SM, MODAL_Z_STACKED, STATUS_CLOSED,
  TARGET_BLANK, TEXT_NONE, URL_JOB,
} from './constants'
import { applyLabelOf, barClsOf } from './functions'
import { useApplyBar } from './hooks'
import type { ApplyBarIn } from './types'
import css from './jobs.module.css'

/**
 * 渲染投递栏。
 *
 * @param props 本岗、投递邮箱、查完没、取词函数、分层态与在不在整页里。
 * @returns 投递栏 + 它的三层浮层;这一岗没有投递链接就整条不渲。
 */
export function ApplyBar({ job, email, emailDone, t, plan, onPage }: ApplyBarIn) {
  const a = useApplyBar({ job, email, emailDone, t, plan, onPage })
  if (job.applyUrl === TEXT_NONE) {
    return null
  }
  return (
    <>
      {a.fixedBar && <div className={cssOf(css.barPad)} />}
      <div className={barClsOf(a.fixedBar)}>
        <Button kind={BTN_GHOST} onClick={a.onMatch} className={cssOf(css.btnMatch)}>{t('rm.btn')}</Button>
        {job.status === STATUS_CLOSED && (
          <LinkButton href={job.applyUrl} target={TARGET_BLANK} className={cssOf(css.btnClosed)}>
            {t('act.seeOfficial')}
          </LinkButton>
        )}
        {job.status !== STATUS_CLOSED && (
          <Button kind={BTN_GHOST} onClick={a.onApply} className={cssOf(css.btnApply)}>
            {applyLabelOf({ t, email, emailDone })}
          </Button>
        )}
      </div>
      {a.matchJd !== null && a.matchJd !== TEXT_NONE && (
        <ResumeMatchModal jobId={job.id} jd={a.matchJd} loggedIn={plan.loggedIn || a.authed}
          onClose={a.onMatchClose} />
      )}
      {a.matchJd === TEXT_NONE && (
        <Modal onClose={a.onMatchClose} size={MODAL_SM}>
          <div className={cssOf(css.noJd)}>{t('rm.noJd')}</div>
        </Modal>
      )}
      {a.stage === APPLY_AUTH && (
        <AuthModal t={t} mode={AUTH_REGISTER} z={MODAL_Z_STACKED} hero={t('apply.authHero')}
          returnTo={URL_JOB + String(job.id)} onClose={a.onAuthClose} onDone={a.onAuthDone} />
      )}
      {a.stage === APPLY_INTENT && (
        <OnboardingWizard t={t} initial={a.intentProfile} z={MODAL_Z_STACKED}
          onClose={a.onIntentDone} onFinished={a.onIntentDone} />
      )}
    </>
  )
}
