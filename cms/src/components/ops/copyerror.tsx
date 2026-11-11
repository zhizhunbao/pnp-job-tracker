'use client'
/**
 * ops 域的小件:复制报错钮(2026-11-08 Frank「这种报错信息,应该不用直接显示出来吧,应该有复制报错的按钮吧」)。
 *
 * @author Frank
 * @time 2026-11-08 19:00:00
 */
import { Button } from '@/components/button'
import { useLang } from '@/components/i18n'
import { COPY_TEXT, DEL_BTN_KIND } from './constants'
import { makeCopyError } from './functions'
import type { CopyErrorIn } from './types'

/**
 * 复制报错钮。
 *
 * @param props 报错全文。
 * @returns 次要小钮。
 */
export function CopyError({ text }: CopyErrorIn) {
  const [, , t] = useLang()
  return <Button kind={DEL_BTN_KIND} sm onClick={makeCopyError({ text, t })}>{t(COPY_TEXT)}</Button>
}
