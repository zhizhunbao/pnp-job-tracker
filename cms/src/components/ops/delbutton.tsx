'use client'
/**
 * ops 域的小件:行内删除钮(点了先弹确认框)。
 *
 * @author Frank
 * @time 2026-11-08 18:00:00
 */
import { Button } from '@/components/button'
import { DEL_BTN_KIND, DEL_TEXT } from './constants'
import { makeDelOpen } from './functions'
import { useDelAsk } from './hooks'
import type { DelButtonIn } from './types'

/**
 * 删除钮。
 *
 * @param props 要删的那一条。
 * @returns 次要小钮。
 */
export function DelButton({ del }: DelButtonIn) {
  const setAsk = useDelAsk()
  return <Button kind={DEL_BTN_KIND} sm onClick={makeDelOpen({ setAsk, del })}>{DEL_TEXT}</Button>
}
