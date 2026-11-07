'use client'
/**
 * nav 域的结构:窄屏抽屉(照 Fluent 2 Nav:屏宽 640 及以下,导航从左边拉出、盖在内容上)。
 * 开着才挂;点遮罩、点 ×、按 Esc 都关(Esc 走 modal 桶的同一个队,不跟弹框抢)。
 *
 * @author Frank
 * @time 2026-11-07 15:10:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { IconX } from '@/components/icons'
import { useEscClose, useOverlayClose } from '@/components/modal'
import { CLOSE_ARIA, PLAIN_BTN_KIND, ROLE_DIALOG } from './constants'
import type { NavDrawerIn } from './types'
import css from './nav.module.css'

/**
 * 窄屏抽屉。
 *
 * @param props 标题、关闭回调与内容。
 * @returns 遮罩 + 左侧抽屉。
 */
export function NavDrawer({ title, onClose, children }: NavDrawerIn) {
  useEscClose(onClose)
  const overlay = useOverlayClose(onClose)
  return (
    <div className={cssOf(css.overlay)} onMouseDown={overlay.onMouseDown} onClick={overlay.onClick}>
      <div role={ROLE_DIALOG} aria-modal aria-label={title} className={cssOf(css.drawer)}>
        <div className={cssOf(css.drawerHead)}>
          <span className={cssOf(css.drawerTitle)}>{title}</span>
          <Button kind={PLAIN_BTN_KIND} onClick={onClose} ariaLabel={CLOSE_ARIA} className={cssOf(css.drawerClose)}>
            <IconX />
          </Button>
        </div>
        {children}
      </div>
    </div>
  )
}
