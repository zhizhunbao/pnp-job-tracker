/**
 * notice 域的纯函数(零 JSX 零 hook)。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */
import { cssOf } from '@/components/css'
import { CLS_SEP } from './constants'
import type { NoticeClsIn, NoticeKind } from './types'
import css from './notice.module.css'

/**
 * 提醒框的类名预算:基座 + 四色 + 调用方追加类(查表,键完整性由
 * Record<NoticeKind, string> 管)。
 *
 * @param x 色与追加类。
 * @returns 拼好的 className。
 */
export function noticeClsOf(x: NoticeClsIn): string {
  const kindCls: Record<NoticeKind, string> = {
    warn: cssOf(css.warn),
    err: cssOf(css.err),
    info: cssOf(css.info),
    ok: cssOf(css.ok),
  }
  const cls = [css.notice, kindCls[x.kind]]
  if (x.className != null) {
    cls.push(x.className)
  }
  return cls.join(CLS_SEP)
}
