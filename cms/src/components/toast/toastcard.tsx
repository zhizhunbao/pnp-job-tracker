'use client'
/**
 * 右上角提示的一张卡(2026-10-11 批 5,照 Azure 门户的通知卡):左边档位色条 + 图标,粗体一行,可选灰字副行,右上 ×。
 *
 * @author Frank
 * @time 2026-10-11 10:00:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { IconCheckCircle, IconWarn, IconX, IconXCircle } from '@/components/icons'
import { CLOSE_ARIA, DETAIL_NONE, PLAIN_BTN_KIND, TOAST_ERR, TOAST_OK } from './constants'
import { toastClsOf } from './functions'
import { useToastCard } from './hooks'
import type { ToastCardIn } from './types'
import css from './toast.module.css'

/**
 * 一张提示卡。
 *
 * @param props 这一张与宿主的「关一张」。
 * @returns 卡。
 */
export function ToastCard({ item, close }: ToastCardIn) {
  const onClose = useToastCard({ item, close })
  return (
    <div className={toastClsOf(item.kind)}>
      <span className={cssOf(css.icon)}>
        {item.kind === TOAST_OK && <IconCheckCircle />}
        {item.kind === TOAST_ERR && <IconXCircle />}
        {item.kind !== TOAST_OK && item.kind !== TOAST_ERR && <IconWarn />}
      </span>
      <span className={cssOf(css.text)}>
        <span className={cssOf(css.title)}>{item.title}</span>
        {item.detail !== DETAIL_NONE && <span className={cssOf(css.detail)}>{item.detail}</span>}
      </span>
      <Button kind={PLAIN_BTN_KIND} onClick={onClose} ariaLabel={CLOSE_ARIA} className={cssOf(css.close)}>
        <IconX />
      </Button>
    </div>
  )
}
