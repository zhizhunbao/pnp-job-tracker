'use client'
/**
 * drawer 域的结构:右侧编辑面板(照 Fluent 2 Drawer 的 overlay、position end;Azure 门户点「编辑」从右边滑出的那一块):
 * 标题 + × 一行、正文自己滚、底部一行钮。宽屏 480 宽贴右边,屏宽 640 及以下铺满整屏。
 * 开着才挂;点遮罩、点 ×、按 Esc 都关(Esc 走 modal 桶的同一个队,里面再叠弹框时只关最上面一层)。
 * 2026-11-07 Frank「按 Azure 的改」:「我的档案」的「修改」从一题一屏的弹框换成这块一页表单(docs/design/我的/我的框架-20261107.md 2.8)。
 * 2026-11-13 Frank「这个运行时候,中间也不能点」:多一格 locked —— 面板里的事还没做完时(从简历填写在读简历),
 * 点遮罩、点 ×、按 Esc 都不关,× 变灰。
 *
 * @author Frank
 * @time 2026-11-07 19:00:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { IconX } from '@/components/icons'
import { useEscClose, useOverlayClose } from '@/components/modal'
import { CLOSE_ARIA, PLAIN_BTN_KIND, ROLE_DIALOG } from './constants'
import { makeLockedClose } from './functions'
import type { DrawerIn } from './types'
import css from './drawer.module.css'

/**
 * 右侧编辑面板。
 *
 * @param props 标题、关闭回调、底栏、正文与锁没锁。
 * @returns 遮罩 + 右侧面板。
 */
export function Drawer({ title, onClose, foot = null, children, locked = false }: DrawerIn) {
  const close = makeLockedClose({ locked, onClose })
  useEscClose(close)
  const overlay = useOverlayClose(close)
  return (
    <div className={cssOf(css.overlay)} onMouseDown={overlay.onMouseDown} onClick={overlay.onClick}>
      <div role={ROLE_DIALOG} aria-modal aria-label={title} className={cssOf(css.panel)}>
        <div className={cssOf(css.head)}>
          <h2 className={cssOf(css.title)}>{title}</h2>
          <Button kind={PLAIN_BTN_KIND} onClick={close} ariaLabel={CLOSE_ARIA} className={cssOf(css.close)}
            disabled={locked}>
            <IconX />
          </Button>
        </div>
        <div className={cssOf(css.body)}>{children}</div>
        {foot != null && <div className={cssOf(css.foot)}>{foot}</div>}
      </div>
    </div>
  )
}
