'use client'
/**
 * 第 3 步:确认(2026-10-10 投递框三步,Frank「就叫 确认吧」「他只关心自己的信息对不对,然后投出去」;
 * docs/design/我的求职-三段-20261009.md 1.4 / 2.4 第三张):接替原「预览」一步(ApplyPreview,逐项检查邮件形)。
 * 两张分区卡:「确认」四行 —— 英文姓名(档案里没有才出输入框,填了随投出存回档案)、回复邮箱、简历、求职信(不附写「不附」);
 * 「邮件预览」—— 收件人、主题、正文(短的那一段,不是求职信全文,Frank「邮件的内容 和 求职信 是不一样的东西吧」)。
 * 不再摆手动勾选;系统检查在服务端跑,不过才在钮上方出一行。
 *
 * @author Frank
 * @time 2026-10-10 10:00:00
 */
import { Row } from '@/components/row'
import { ApplyCard } from './applycard'
import {
  AUTOCOMPLETE_NAME, CARD_HEAD_CLS, CARD_MD_CLS, CHECK_TO, NAME_MAX_LEN, SUBJECT_KEY, TEXT_NONE,
} from './constants'
import type { ApplyStepIn } from './types'
import css from './apply.module.css'

/**
 * 第 3 步。
 *
 * @param props 整机面板。
 * @returns 「确认」与「邮件预览」两张分区卡。
 */
export function ApplyConfirm({ p }: ApplyStepIn) {
  return (
    <>
      <ApplyCard p={p} acts={null}>
        <Row k={p.t('ap.name')}>
          {p.askName && (
            <input className={css.input} value={p.name} onChange={p.onName} autoComplete={AUTOCOMPLETE_NAME}
              maxLength={NAME_MAX_LEN} aria-label={p.t('ap.name')} />
          )}
          {p.askName === false && p.name}
        </Row>
        <Row k={p.t('ap.replyTo')}>
          {p.replyTo === TEXT_NONE && p.t('ap.replyInbox')}
          {p.replyTo}
        </Row>
        <Row k={p.t('ap.resume')}>{p.resumeName}</Row>
        <Row k={p.t('ap.letter')}>
          {p.mail.cover === TEXT_NONE && p.t('ap.noLetter')}
          {p.mail.cover}
        </Row>
      </ApplyCard>
      <div className={CARD_MD_CLS}>
        <div className={CARD_HEAD_CLS}>{p.t('ap.mailPv')}</div>
        <Row k={p.t(CHECK_TO)}>{p.mail.to}</Row>
        <Row k={p.t(SUBJECT_KEY)}>{p.mail.subject}</Row>
        <div className={`${css.paperText} ${css.mailText}`}>{p.mail.body}</div>
      </div>
    </>
  )
}
