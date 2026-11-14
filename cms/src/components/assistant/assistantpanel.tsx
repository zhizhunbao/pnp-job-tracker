'use client'
/**
 * 对话面板:标题栏(标题与关闭)、对话区(开场白、一问一答气泡、等待)、出错提示、底部输入框与发送钮。
 * 桌面是右下角浮起的一块,640px 及以下铺满。对话区是读屏的日志区,新回复等读完手上的再播报。
 *
 * @author Frank
 * @time 2026-11-14 12:00:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { IconX } from '@/components/icons'
import { TEXT_MAX } from '@/lib/assistant'
import {
  ARIA_POLITE, CLOSE_ICON_PX, ERR_KEY, ERR_NONE, INPUT_ROWS, PLAIN_BTN_KIND, ROLE_ALERT, ROLE_DIALOG, ROLE_LOG,
  TEXT_NONE,
} from './constants'
import { AssistantBubble } from './assistantbubble'
import { AssistantTyping } from './assistanttyping'
import type { AssistantPanelIn } from './types'
import css from './assistant.module.css'

/**
 * 对话面板。
 *
 * @param props 整机面板与两枚 DOM 引用。
 * @returns 面板。
 */
export function AssistantPanel({ p, inputEl, threadEl }: AssistantPanelIn) {
  const bubbles = []
  for (const m of p.msgs) {
    bubbles.push(<AssistantBubble key={m.id} msg={m} t={p.t} />)
  }
  return (
    <div className={cssOf(css.panel)} role={ROLE_DIALOG} aria-label={p.t('asst.title')}>
      <div className={cssOf(css.head)}>
        <span className={cssOf(css.title)}>{p.t('asst.title')}</span>
        <Button kind={PLAIN_BTN_KIND}
          className={cssOf(css.close)}
          ariaLabel={p.t('asst.close')}
          title={p.t('asst.close')}
          onClick={p.hide}>
          <IconX size={CLOSE_ICON_PX} />
        </Button>
      </div>
      <div ref={threadEl} className={cssOf(css.thread)} role={ROLE_LOG} aria-live={ARIA_POLITE}>
        <div className={`${cssOf(css.bubble)} ${cssOf(css.bot)}`}>
          <p className={cssOf(css.say)}>{p.t('asst.hello')}</p>
        </div>
        {bubbles}
        {p.busy && <AssistantTyping slow={p.slow} t={p.t} />}
      </div>
      {p.err !== ERR_NONE && <p className={cssOf(css.err)} role={ROLE_ALERT}>{p.t(ERR_KEY[p.err])}</p>}
      <div className={cssOf(css.composer)}>
        <textarea ref={inputEl}
          className={cssOf(css.input)}
          rows={INPUT_ROWS}
          maxLength={TEXT_MAX}
          value={p.draft}
          placeholder={p.t('asst.ph')}
          aria-label={p.t('asst.ph')}
          onChange={p.onDraft}
          onKeyDown={p.onKey} />
        <Button className={cssOf(css.send)} disabled={p.busy || p.draft.trim() === TEXT_NONE} onClick={p.send}>
          {p.t('asst.send')}
        </Button>
      </div>
    </div>
  )
}
