'use client'
/**
 * ops 域的小件:事件行的确认或关闭钮(Azure alerts 的用户响应)。
 *
 * @author Frank
 * @time 2026-11-08 23:59:00
 */
import { useRouter } from 'next/navigation'
import { Button } from '@/components/button'
import { useLang } from '@/components/i18n'
import { ACT_BTN_KIND } from './constants'
import { makeAlertAct } from './functions'
import type { AlertButtonIn } from './types'

/**
 * 事件操作钮。
 *
 * @param props 这个操作。
 * @returns 次要小钮。
 */
export function AlertButton({ act }: AlertButtonIn) {
  const router = useRouter()
  const [, , t] = useLang()
  const onAct = makeAlertAct({ act, refresh: router.refresh, t })
  return <Button kind={ACT_BTN_KIND} sm onClick={onAct}>{t(act.text)}</Button>
}
