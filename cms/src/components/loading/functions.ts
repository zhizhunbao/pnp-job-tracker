/**
 * loading 域的纯派生。
 *
 * @author Frank
 * @time 2026-11-09 12:00:00
 */
import { cssOf } from '@/components/css'
import type { LoadingClsIn } from './types'
import css from './loading.module.css'

/**
 * 加载行的类(要撑满定高外框时多挂一个 fill)。
 *
 * @param x 要不要撑满。
 * @returns 类名串。
 */
export function loadingClsOf(x: LoadingClsIn): string {
  if (x.fill) {
    return `${cssOf(css.loading)} ${cssOf(css.fill)}`
  }
  return cssOf(css.loading)
}
