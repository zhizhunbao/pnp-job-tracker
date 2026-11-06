'use client'
/**
 * 行内删除钮:点了不直接删,交给确认框(站规 2026-10-12 Frank「所有删除按钮不要直接删,先弹框确认是否删除」)。
 * 拨框手柄经上下文从 Queue 下来(表格单元格是渲染函数,拿不到 Queue 的局部状态;同 auth 桶 SessionProvider 先例)。
 *
 * @author Frank
 * @time 2026-11-06 00:40:00
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
