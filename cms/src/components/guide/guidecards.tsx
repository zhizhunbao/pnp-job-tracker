'use client'
/**
 * 答复下的卡:带路 → 「打开 X」(推荐徽标,站内链接);问题 / 建议 → 「留个邮箱,上线通知我」→ 邮箱框 → 已记。
 * 闲聊 → 站内地图(主要页面各一卡);故障不出卡。
 *
 * @author Frank
 * @time 2026-09-05 16:00:00
 */
import { Button, LinkButton, btnClsOf } from '@/components/button'
import { cssOf } from '@/components/css'
import { EMAIL, KIND, PLAIN_BTN_KIND } from './constants'
import { destLabelOf, makeEmailOpenClick, makeNavClick, wantsEmail } from './functions'
import { GuideEmail } from './guideemail'
import { GuideMap } from './guidemap'
import type { GuideCardsIn } from './types'
import css from './guide.module.css'

/**
 * 答复下的卡。
 *
 * @param props 面板、这一轮与轮位。
 * @returns 卡;没有可出的卡是 null。
 */
export function GuideCards({ p, turn, i }: GuideCardsIn) {
  const r = turn.reply
  if (r == null) {
    return null
  }
  if (r.kind === KIND.nav && r.url != null && r.dest != null) {
    const recCls = `${cssOf(css.cbOpt)} ${cssOf(css.cbOptRec)}`
    return (
      <div className={css.cbOpts}>
        <LinkButton href={r.url}
          className={btnClsOf({ kind: PLAIN_BTN_KIND, sm: false, lg: false, active: false, className: recCls })}
          onClick={makeNavClick({ p, i })}>
          <span className={css.cbOptTag}>{p.t('chat.opt.rec')}</span>
          <span className={css.cbOptMain}>
            <span className={css.cbOptLabel}>
              {p.t('chat.openDest', { name: destLabelOf({ t: p.t, dest: r.dest }) })}
            </span>
          </span>
        </LinkButton>
      </div>
    )
  }
  if (r.kind === KIND.chat) {
    return <GuideMap p={p} />
  }
  if (wantsEmail(turn) === false) {
    return null
  }
  if (turn.email === EMAIL.idle) {
    return (
      <div className={css.cbOpts}>
        <Button kind={PLAIN_BTN_KIND} className={cssOf(css.cbOpt)} onClick={makeEmailOpenClick({ p, i })}>
          <span className={css.cbOptMain}><span className={css.cbOptLabel}>{p.t('chat.notify')}</span></span>
        </Button>
      </div>
    )
  }
  if (turn.email === EMAIL.sent) {
    return <div className={css.cbOptWhy}>{p.t('chat.emailSent')}</div>
  }
  return <GuideEmail p={p} turn={turn} i={i} />
}
