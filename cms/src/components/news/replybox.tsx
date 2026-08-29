'use client'
/**
 * 域内小件:楼中楼的回复框(输入框 + 小一档的发送钮)。楼中楼只有一层
 * (E8-07 F 件 v2:一层封顶,审核台与排版都可控),所以它只挂在顶层楼上。
 * 2026-08-27 换装批自 News.tsx 提出成文件。
 *
 * @author Frank
 * @time 2026-08-27 23:30:00
 */
import { Button } from '@/components/button'
import { CMT_MAX_LEN, PLAIN_BTN_KIND, REPLY_ROWS } from './constants'
import { isSendDisabled, sendClsOf, textareaClsOf } from './functions'
import type { ReplyBoxIn } from './types'
import css from './news.module.css'

/**
 * 渲染回复框。
 *
 * @param props 取词函数、回复框现值、提交状态与两只手柄。
 * @returns 回复框。
 */
export function ReplyBox({ t, body, state, onChange, onSubmit }: ReplyBoxIn) {
  return (
    <div className={css.replyBox}>
      <textarea value={body}
        onChange={onChange}
        maxLength={CMT_MAX_LEN}
        rows={REPLY_ROWS}
        placeholder={t('news.cmt.replyPh')}
        autoFocus
        className={textareaClsOf({ small: true })} />
      <Button kind={PLAIN_BTN_KIND}
        className={sendClsOf({ small: true })}
        disabled={isSendDisabled({ body, state })}
        onClick={onSubmit}>
        {t('news.cmt.send')}
      </Button>
    </div>
  )
}
