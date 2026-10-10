'use client'
/**
 * 发出前逐项检查(2026-10-08 Frank「再投递之前 有让用户一项一项检查吗」):收件人、简历、求职信、署名一行一项,
 * 每行一个勾、灰字项名、值,简历与求职信带「打开看」;四项全勾才放行。手动投递第 3 步与「今日待投」共用这一个(queue 桶从本桶取)。
 * 同日 Frank「看着不乱吗」改两层:上层勾 + 灰字项名 + 右端「打开看」,下层值占满整行(手机上文件名不再断在词中间、链接不折行)。
 *
 * @author Frank
 * @time 2026-10-08 21:00:00
 */
import { ResumePreview } from '@/components/account'
import { Button, LinkButton } from '@/components/button'
import { Select } from '@/components/select'
import {
  ATTACH_KEY, BTN_GHOST, BTN_SECONDARY, CHECK_LETTER, CHECK_RESUME, CHECK_TO, EDIT_KEY, PICK_SELECT_SIZE, SUBJECT_KEY,
  TARGET_BLANK, TEXT_NONE,
} from './constants'
import { ApplyChip } from './applychip'
import { rowOf } from './functions'
import type { ApplyCheckIn } from './types'
import css from './apply.module.css'

/**
 * 邮件形预览(2026-10-08 Frank「这个不能改成类似于邮件那种吗」):收件人 / 主题两行,正文,附件两枚(简历、求职信 PDF 站内弹框预览,
 * .docx 简历新开标签页;简历两份以上出换简历下拉),正文右上「改信」。原先的四行勾选清单撤。
 *
 * @param props 取词函数与面板。
 * @returns 邮件形预览 + 预览弹框。
 */
export function ApplyMail({ t, p }: ApplyCheckIn) {
  const to = rowOf({ rows: p.rows, key: CHECK_TO })
  const resume = rowOf({ rows: p.rows, key: CHECK_RESUME })
  const letter = rowOf({ rows: p.rows, key: CHECK_LETTER })
  return (
    <div className={css.mail}>
      <div className={css.mailRow}>
        <span className={css.mailLabel}>{t(CHECK_TO)}</span>
        <span className={css.mailValue}>{to != null && to.value}</span>
      </div>
      <div className={css.mailRow}>
        <span className={css.mailLabel}>{t(SUBJECT_KEY)}</span>
        <span className={css.mailValue}>{p.subject}</span>
      </div>
      <div className={css.mailBodyWrap}>
        <div className={css.mailBody}>{p.body}</div>
        <span className={css.mailEdit}>
          <Button kind={BTN_SECONDARY} sm onClick={p.onLetter}>{t(EDIT_KEY)}</Button>
        </span>
      </div>
      <div className={css.mailRow}>
        <span className={css.mailLabel}>{t(ATTACH_KEY)}</span>
        <span className={css.mailAttach}>
          {resume != null && resume.href !== TEXT_NONE && resume.previewable && (
            <span className={css.chip}>
              <Button kind={BTN_GHOST} sm onClick={p.openOf(resume)}><ApplyChip name={resume.value} /></Button>
            </span>
          )}
          {resume != null && resume.href !== TEXT_NONE && resume.previewable === false && (
            <LinkButton href={resume.href} target={TARGET_BLANK} className={css.chip}>
              <ApplyChip name={resume.value} />
            </LinkButton>
          )}
          {p.resumeOpts.length > 0 && (
            <Select value={p.resumeValue}
              onChange={p.onResume}
              opts={p.resumeOpts}
              all={t(CHECK_RESUME)}
              labelOf={p.resumeLabel}
              size={PICK_SELECT_SIZE} />
          )}
          {letter != null && letter.href !== TEXT_NONE && (
            <span className={css.chip}>
              <Button kind={BTN_GHOST} sm onClick={p.openOf(letter)}><ApplyChip name={letter.value} /></Button>
            </span>
          )}
        </span>
      </div>
      {p.preview != null && (
        <ResumePreview src={p.preview.src} title={p.preview.title} onClose={p.onPreviewClose} t={t} />
      )}
    </div>
  )
}
