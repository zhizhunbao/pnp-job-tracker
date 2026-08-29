'use client'
/**
 * 域内小件:顶层发评论表单(输入框 + 发送钮 + 结果提示)。发出去落成 pending,
 * 人工审核过了才公开 —— 提示说的就是这件事,不假装已公开。
 * 2026-08-27 换装批自 News.tsx 提出成文件。
 *
 * @author Frank
 * @time 2026-08-27 23:30:00
 */
import { Button } from '@/components/button'
import { CMT_MAX_LEN, CMT_ROWS, PLAIN_BTN_KIND, STATE_ERR, STATE_SENT } from './constants'
import { isSendDisabled, sendClsOf, textareaClsOf } from './functions'
import type { CommentFormIn } from './types'
import css from './news.module.css'

/**
 * 渲染顶层发评论表单。
 *
 * @param props 取词函数、输入框现值、提交状态与两只手柄。
 * @returns 表单。
 */
export function CommentForm({ t, body, state, onChange, onSubmit }: CommentFormIn) {
  return (
    <div className={css.cmtForm}>
      <textarea value={body}
        onChange={onChange}
        maxLength={CMT_MAX_LEN}
        rows={CMT_ROWS}
        placeholder={t('news.cmt.ph')}
        className={textareaClsOf({ small: false })} />
      <div className={css.cmtActions}>
        <Button kind={PLAIN_BTN_KIND}
          className={sendClsOf({ small: false })}
          disabled={isSendDisabled({ body, state })}
          onClick={onSubmit}>
          {t('news.cmt.send')}
        </Button>
        {state === STATE_SENT && <span className={css.ok}>{t('news.cmt.sent')}</span>}
        {state === STATE_ERR && <span className={css.err}>{t('news.cmt.err')}</span>}
      </div>
    </div>
  )
}
