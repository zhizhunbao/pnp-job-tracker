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
 * 2026-10-03 付费闭环批 A1:匿名点投递不再直接弹登录框,改弹访客向导(profile 桶 GateWizard:四道题 + 注册屏,
 * 注册屏框内照旧能切登录);注册完接 makeAuthDone 照旧往下投,Google 整页登录回跳本岗职位页。
 * 2026-10-03 付费闭环批 B1:外链投递撤,钮面固定「投递」;懒查完仍没有邮箱就不出投递钮(栏与占位照旧)。
 * 同日收口审查改判:在架岗查完仍没有邮箱就整栏不出(连占位,手机屏底不留一条带上边框的空栏);整栏出不出
 * 不再看原帖链接空不空(投递只靠邮箱),原帖链接只管已下架岗的「看官网」—— 判定收进 applyBarShownOf。
 * 2026-10-04 改判(Frank「照这样改」):邮箱只给登录用户、点了才查(useApplyBar 的 launch 现查),不再从外面递邮箱;
 * 在架岗投递栏一律出。
 * 同日收口审查:投递钮挂 busy(现查邮箱、记「已投」在途时禁用 + 转圈),连点不再重复查。
 * 同日访客四题改版:GateWizard 自 profile 桶迁入 gate 桶,改从 gate 桶取(契约不变)。
 * 同日二轮收口审查:点了投递没拿到邮箱不再无声 —— 会话过期(401)弹登录框(auth 桶 AuthModal 登录档,登录完照注册闸那一路接着投),
 * 次数用完(429)与其余失败各弹一行提示(照简历对照「拿不到全文」那一框的形:小号 Modal + 一行字),都叠在职位弹框之上。
 * 2026-10-05 Frank「已经下架了,就不要在有按钮点击了吧」:已下架岗整栏不出,灰色「看官网」钮撤,栏里只剩投递钮。
 * 2026-10-07 B2 站内投递:投递钮改跳投递页 /apply/<id>(见 useApplyBar),邮件投递框 ApplyEmail、会话过期的登录框、
 * 「次数用完」「投递失败」两行提示框随 mailto 一路撤。
 * 原判(2026-08-03,随 `.btnClosed` 类一起撤,原文照录):「已下架岗:主钮还写「前往投递」等于继续把人往死链上送 ——
 * 降级成灰色的「查看官方页」。不直接禁掉:closed 有一部分来自「本次未见+30天」的推断(非逐帖实测),留个口子让用户自己核。」
 *
 * @author Frank
 * @time 2026-08-28 19:15:06
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { GateWizard } from '@/components/gate'
import { Modal } from '@/components/modal'
import { OnboardingWizard } from '@/components/profile'
import { ResumeMatchModal } from '@/components/resume'
import {
  APPLY_AUTH, APPLY_INTENT, BTN_GHOST, GATE_INTENT_APPLY, MODAL_SM, MODAL_Z_STACKED, TEXT_NONE, URL_JOB,
} from './constants'
import { applyBarShownOf, barClsOf } from './functions'
import { useApplyBar } from './hooks'
import type { ApplyBarIn } from './types'
import css from './jobs.module.css'

/**
 * 渲染投递栏。
 *
 * @param props 本岗、取词函数、分层态与在不在整页里。
 * @returns 投递栏 + 它的三层浮层;整栏出不出见 applyBarShownOf(在架一律出,已下架不出)。
 */
export function ApplyBar({ job, t, plan, onPage }: ApplyBarIn) {
  const a = useApplyBar({ job, t, plan, onPage })
  if (applyBarShownOf(job) === false) {
    return null
  }
  return (
    <>
      {onPage && <div className={cssOf(css.barPad)} />}
      <div className={barClsOf(onPage)}>
        <Button kind={BTN_GHOST} onClick={a.onApply} busy={a.busy} className={cssOf(css.btnApply)}>
          {t('apply.plain')}
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
        <GateWizard t={t} intent={GATE_INTENT_APPLY} z={MODAL_Z_STACKED}
          returnTo={URL_JOB + String(job.id)} onClose={a.onAuthClose} onDone={a.onAuthDone} />
      )}
      {a.stage === APPLY_INTENT && (
        <OnboardingWizard t={t} initial={a.intentProfile} z={MODAL_Z_STACKED}
          onClose={a.onIntentDone} onFinished={a.onIntentDone} />
      )}
    </>
  )
}
