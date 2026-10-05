'use client'
/**
 * E9-04 投递栏(B11,2026-07-24 拍板):详情底部常驻;注册闸设在投递 = 全站意愿最强瞬间。
 * 2026-07-25 用户:全宽大蓝钮「太吓人」→ 右对齐紧凑钮;同日「复制要点」钮撤除,只留投递单钮。
 * 底 padding 14px = 吸底栏自带留白(容器底 padding 已归 0,补「穿墙」);窄屏整页改 fixed 时
 * 由占位补回文档流高度,免得来源行被压住。
 * 流程与三个闸的口径都在 hooks 的 useApplyBar。
 * 2026-08-28 换装批自 Jd.tsx 重写落位。
 * 2026-09-14 Frank「简历对照按钮去掉,之后创建一个单独的简历模块」:钮撤,对照弹层与 hooks 里的
 * 流程先留着不动(简历模块立域时整体搬走)。
 * 2026-09-14 Frank「点击前往投递应该先跳出来登录框啊,而不是注册框」「这个文字删了」:匿名点投递弹登录框(框内可切注册),
 * 「注册后帮你预填投递邮件,记录投递进度」那句 hero 不再传。
 * 2026-09-27 手机职位页水合报 React #418:占位与 fixed 原先跟着 JS 判的窄屏出(首帧读 matchMedia,服务端首帧没有窗口),
 * 两边一棵树对不上。改成整页恒渲占位、恒挂 fixed 那一档的类,窄不窄交给 CSS 断点(见 jobs.module.css 投递栏段);手机上的最终长相不变。
 * 2026-10-05 Frank「已经下架了,就不要在有按钮点击了吧」:已下架岗整栏不出,灰色「看官网」钮撤,栏里只剩投递钮。
 * 原判(2026-08-03,随 `.btnClosed` 类一起撤,原文照录):「已下架岗:主钮还写「前往投递」等于继续把人往死链上送 ——
 * 降级成灰色的「查看官方页」。不直接禁掉:closed 有一部分来自「本次未见+30天」的推断(非逐帖实测),留个口子让用户自己核。」
 *
 * @author Frank
 * @time 2026-08-28 19:15:06
 */
import { AuthModal } from '@/components/auth'
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { Modal } from '@/components/modal'
import { OnboardingWizard } from '@/components/profile'
import { ResumeMatchModal } from '@/components/resume'
import {
  APPLY_AUTH, APPLY_EMAIL, APPLY_INTENT, AUTH_LOGIN, BTN_GHOST, MODAL_SM, MODAL_Z_STACKED, STATUS_CLOSED,
  TEXT_NONE, URL_JOB,
} from './constants'
import { applyLabelOf, barClsOf } from './functions'
import { ApplyEmail } from './applyemail'
import { useApplyBar } from './hooks'
import type { ApplyBarIn } from './types'
import css from './jobs.module.css'

/**
 * 渲染投递栏。
 *
 * @param props 本岗、投递邮箱、查完没、取词函数、分层态与在不在整页里。
 * @returns 投递栏 + 它的三层浮层;这一岗没有投递链接或已下架就整条不渲。
 */
export function ApplyBar({ job, email, emailDone, t, plan, onPage }: ApplyBarIn) {
  const a = useApplyBar({ job, email, emailDone, t, plan, onPage })
  if (job.applyUrl === TEXT_NONE || job.status === STATUS_CLOSED) {
    return null
  }
  return (
    <>
      {onPage && <div className={cssOf(css.barPad)} />}
      <div className={barClsOf(onPage)}>
        <Button kind={BTN_GHOST} onClick={a.onApply} className={cssOf(css.btnApply)}>
          {applyLabelOf({ t, email, emailDone })}
        </Button>
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
        <AuthModal t={t} mode={AUTH_LOGIN} z={MODAL_Z_STACKED}
          returnTo={URL_JOB + String(job.id)} onClose={a.onAuthClose} onDone={a.onAuthDone} />
      )}
      {a.stage === APPLY_EMAIL && (
        <ApplyEmail email={email} job={job} t={t} copied={a.copied} onCopy={a.onCopyEmail} onClose={a.onEmailClose} />
      )}
      {a.stage === APPLY_INTENT && (
        <OnboardingWizard t={t} initial={a.intentProfile} z={MODAL_Z_STACKED}
          onClose={a.onIntentDone} onFinished={a.onIntentDone} />
      )}
    </>
  )
}
