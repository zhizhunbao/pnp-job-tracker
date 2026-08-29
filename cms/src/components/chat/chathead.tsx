'use client'
/**
 * 面板标题栏:标题 + 重置(就地二次确认,红 = 这一下会清东西)+ 最小化/全屏/关闭
 * 三钮(2026-08-06 Frank「右上角与 job 弹框保持一致」:统一 Modal 的 iconBtnS 形制,
 * 30×30 圆角灰底;关闭钮用文字 ×)。标题栏兼拖拽把手 —— 按在钮上时不拖
 * (不然点「收起」会先被当成一次 0 像素的拖动);全屏档没得拖。
 *
 * @author Frank
 * @time 2026-08-27 02:30:00
 */
import { IconMaximize, IconMinimize, IconMinus, IconRefresh } from '@/components/icons'
import { Button } from '@/components/button'
import { CLOSE_MARK, ICON_PX, K_MAX, K_RESET, K_RESET_OK, K_RESTORE, PLAIN_BTN_KIND, RESET_ICON_PX } from './constants'
import type { ChatHeadIn } from './types'
import css from './chat.module.css'

/**
 * 面板标题栏。
 *
 * @param props 面板(逐格注释见下方内联形状)。
 * @returns 标题栏一条。
 */
export function ChatHead({ p }: ChatHeadIn) {
  let resetCls = `${css.clWin} ${css.clReset}`
  let resetKey = K_RESET
  if (p.askReset) {
    resetCls = `${css.clWin} ${css.clReset} ${css.clAsk}`
    resetKey = K_RESET_OK
  }
  let maxKey = K_MAX
  if (p.max) {
    maxKey = K_RESTORE
  }
  return (
    <div className={css.clHead} onPointerDown={p.onHeadDown}>
      <span className={css.clTitle}>{p.t('chat.title')}</span>
      <Button kind={PLAIN_BTN_KIND}
        className={resetCls}
        onClick={p.onResetClick}
        ariaLabel={p.t(resetKey)}
        title={p.t(resetKey)}>
        <IconRefresh size={RESET_ICON_PX} />
      </Button>
      <div className={css.clWindowActions}>
        <Button kind={PLAIN_BTN_KIND}
          className={`${css.clWin} ${css.clMin}`}
          onClick={p.minimize}
          ariaLabel={p.t('cw.minimize')}
          title={p.t('cw.minimize')}>
          <IconMinus size={ICON_PX} />
        </Button>
        <Button kind={PLAIN_BTN_KIND}
          className={`${css.clWin} ${css.clMax}`}
          onClick={p.toggleMax}
          ariaLabel={p.t(maxKey)}
          title={p.t(maxKey)}>
          {p.max && <IconMinimize size={ICON_PX} />}
          {p.max === false && <IconMaximize size={ICON_PX} />}
        </Button>
        <Button kind={PLAIN_BTN_KIND}
          className={`${css.clWin} ${css.clClose}`}
          onClick={p.hide}
          ariaLabel={p.t('cw.close')}
          title={p.t('cw.close')}>
          {CLOSE_MARK}
        </Button>
      </div>
    </div>
  )
}
