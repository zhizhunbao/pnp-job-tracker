'use client'
/**
 * 「我的求职」上方的投递区(2026-10-07 Frank「投递不应该跳到我的投递页面吗」→「合成一个」:投递并进「我的求职」):
 * 地址栏带职位 id 就取起始态、走四步;没带不出东西(只看下面的投递记录表);岗下架 / 没投递邮箱(且没投过)只摆原因一行;
 * 取不到出「刷新再试」;发出后收起,并通知外面刷新表。
 * 2026-10-08 照 AIApply 重设计(故事 7):这一岗已经发出的,不再整块空白,摆一行「已于 <日期> 投递」(正在发的没日期,摆「已经投过了」)。
 * 2026-10-09 A 批投递搬进弹框(docs/design/投递向导-照Azure-20261008.md):取数挪到投递框外壳(标题栏要用岗名),本件只按取数结果摆正文;
 * 发出后不再收起 —— 四步本体切到已投递一步,框里直接看到「已发给 <公司>」,同时广播给「我的」页刷新投递表。
 * 同日 A 批测试实撞:没登录(会话过期 / 邮件深链)不再落「刷新再试」—— 框上叠登录框(auth 桶 AuthModal 登录档,框内能切注册),
 * 登录完重取、顶栏软刷(第三方登录整页跳走,回跳默认落当前页,深链参数还在);关登录框连投递框一起关。
 *
 * @author Frank
 * @time 2026-10-07 05:00:00
 */
import { AuthModal } from '@/components/auth'
import { Loading } from '@/components/loading'
import { ymd } from '@/lib/time'
import { ApplyFlow } from './applyflow'
import {
  AUTH_LOGIN, FAIL_KEY, LOAD_AUTH, LOAD_FAIL, LOAD_NONE, LOAD_OK, SENT_KEY, SENT_ON_KEY, SENT_STATUSES, TEXT_NONE,
} from './constants'
import { announceSent, blockKeyOf, closeApply } from './functions'
import type { ApplySectionIn } from './types'
import css from './apply.module.css'

/**
 * 投递区。
 *
 * @param props 投递区取数面板。
 * @returns 四步本体,或原因 / 失败 / 已投递一行,或登录框,或加载占位;没带职位给空。
 */
export function ApplySection({ s }: ApplySectionIn) {
  if (s.load === LOAD_NONE) {
    return null
  }
  if (s.load === LOAD_FAIL) {
    return <div className={css.note}>{s.t(FAIL_KEY)}</div>
  }
  if (s.load === LOAD_AUTH) {
    return <AuthModal t={s.t} mode={AUTH_LOGIN} onClose={closeApply} onDone={s.onAuthDone} />
  }
  if (s.load !== LOAD_OK || s.start == null) {
    return <Loading text={s.t('act.loadingText')} />
  }
  if (SENT_STATUSES.includes(s.start.status)) {
    if (s.start.sentAt === TEXT_NONE) {
      return <div className={css.note}>{s.t(SENT_KEY)}</div>
    }
    return <div className={css.note}>{s.t(SENT_ON_KEY, { d: ymd(s.start.sentAt) })}</div>
  }
  const block = blockKeyOf(s.start)
  if (block !== TEXT_NONE) {
    return <div className={css.note}>{s.t(block)}</div>
  }
  return <ApplyFlow start={s.start} titleSub={s.titleSub} onSent={announceSent} />
}
