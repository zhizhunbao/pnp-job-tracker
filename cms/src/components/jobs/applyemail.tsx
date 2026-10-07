'use client'
/**
 * 邮件投递框(2026-09-14 Frank「这个需要弹个页面出来吧」):原先「邮件投递」直接跳 mailto,没装邮件客户端的机器点了
 * 没任何反应;改成弹一小框,给收件邮箱,一颗打开邮件(mailto 带主题正文)、一颗复制邮箱(按过换「已复制」)。
 * 2026-10-05 Frank「打开邮箱 为什么下面有个 下划线」:「打开邮件」原是裸 LinkButton 套本桶 .btnApply(链接默认下划线没去、
 * 与旁边白底胶囊长得也不一样);两颗都改走 button 桶的 Button —— 主钮(href 形态,基座去下划线)+ 次钮,同高同圆角。
 *
 * @author Frank
 * @time 2026-09-14 19:40:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { Modal } from '@/components/modal'
import { BTN_PRIMARY, BTN_SECONDARY, MODAL_SM, MODAL_Z_STACKED } from './constants'
import { copyLabelOf, mailtoOf } from './functions'
import type { ApplyEmailIn } from './types'
import css from './jobs.module.css'

/**
 * 邮件投递框。
 *
 * @param props 邮箱、本岗、取词函数、复制态与两个回调。
 * @returns 小弹框。
 */
export function ApplyEmail({ email, job, t, copied, onCopy, onClose }: ApplyEmailIn) {
  return (
    <Modal onClose={onClose} size={MODAL_SM} z={MODAL_Z_STACKED}>
      <div className={cssOf(css.mailBox)}>
        <div className={cssOf(css.mailLabel)}>{t('apply.mailTo')}</div>
        <div className={cssOf(css.mailAddr)}>{email}</div>
        <div className={cssOf(css.mailActs)}>
          <Button kind={BTN_PRIMARY} href={mailtoOf({ email, job })}>{t('apply.openMail')}</Button>
          <Button kind={BTN_SECONDARY} onClick={onCopy}>{copyLabelOf({ t, copied })}</Button>
        </div>
      </div>
    </Modal>
  )
}
