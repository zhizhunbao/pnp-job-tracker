'use client'
/**
 * GPT 式 composer:默认一条紧凑圆角输入条,文字变多才向上生长;发送钮固定右下。
 * Enter 发送 / Shift+Enter 换行(IME 组合中不发),按钮进 composer 内、有内容才亮;
 * 字数只在快撞上限时出(手机上更要看得见)。16px 字号是手机优先站规:小于 16 时
 * iOS Safari 聚焦会自动放大页面,这是全站主输入。
 *
 * @author Frank
 * @time 2026-08-27 02:30:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { IconArrowUp } from '@/components/icons'
import { COUNT_SEP, NUM_WARN_SLACK, PLAIN_BTN_KIND, SEND_ICON_PX, TEXT_LEN_MAX } from './constants'
import { makeComposerSend } from './functions'
import type { ChatComposerIn } from './types'
import css from './chat.module.css'

/**
 * composer(输入条 + 发送钮)。
 *
 * @param props 面板与输入框引用(逐格注释见 ChatComposerIn)。
 * @returns composer 一条。
 */
export function ChatComposer({ p, taEl }: ChatComposerIn) {
  return (
    <div className={`${css.cbComposer} ${css.cbCol}`}>
      <textarea ref={taEl}
        className={css.cbIn}
        rows={1}
        value={p.input}
        placeholder={p.t('chat.ph')}
        maxLength={TEXT_LEN_MAX}
        onFocus={p.onFocus}
        onChange={p.onChange}
        onKeyDown={p.onKeyDown} />
      <div className={css.cbBar}>
        {p.input.length > TEXT_LEN_MAX - NUM_WARN_SLACK && (
          <span className={css.cbNum}>{p.input.length}{COUNT_SEP}{TEXT_LEN_MAX}</span>
        )}
        <Button kind={PLAIN_BTN_KIND}
          className={cssOf(css.cbSend)}
          disabled={p.busy || p.input.trim() === ''}
          onClick={makeComposerSend({ p })}
          ariaLabel={p.t('chat.send')}
          title={p.t('chat.send')}>
          <IconArrowUp size={SEND_ICON_PX} />
        </Button>
      </div>
    </div>
  )
}
