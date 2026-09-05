'use client'
/**
 * GPT 式 composer:一条紧凑圆角输入条,文字多了向上长;发送钮固定右下;离上限近了才显示计数。
 *
 * @author Frank
 * @time 2026-09-05 16:00:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { IconArrowUp } from '@/components/icons'
import { COUNT_SEP, NUM_WARN_SLACK, PLAIN_BTN_KIND, SEND_ICON_PX, TEXT_LEN_MAX, TEXT_NONE } from './constants'
import type { GuideComposerIn } from './types'
import css from './guide.module.css'

/**
 * 输入条。
 *
 * @param props 面板与输入框引用。
 * @returns 输入条整块。
 */
export function GuideComposer({ p, taEl }: GuideComposerIn) {
  return (
    <div className={`${css.cbComposer} ${css.cbCol}`}>
      <textarea ref={taEl}
        className={css.cbIn}
        rows={1}
        value={p.input}
        maxLength={TEXT_LEN_MAX}
        placeholder={p.t('chat.ph')}
        onChange={p.onChange}
        onKeyDown={p.onKeyDown} />
      <div className={css.cbBar}>
        {p.input.length > TEXT_LEN_MAX - NUM_WARN_SLACK && (
          <span className={css.cbNum}>{p.input.length}{COUNT_SEP}{TEXT_LEN_MAX}</span>
        )}
        <Button kind={PLAIN_BTN_KIND}
          className={cssOf(css.cbSend)}
          disabled={p.busy || p.input.trim() === TEXT_NONE}
          onClick={p.onSubmit}
          ariaLabel={p.t('chat.send')}
          title={p.t('chat.send')}>
          <IconArrowUp size={SEND_ICON_PX} />
        </Button>
      </div>
    </div>
  )
}
