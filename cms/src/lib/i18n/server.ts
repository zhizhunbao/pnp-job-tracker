/**
 * i18n 的**服务端**门:SSR 首帧语言(next/headers 只能在服务端 import,故与浏览器安全的
 * index 桶分开)。只在 (frontend)/layout.tsx 调一次,往下靠 LangProvider 的 context 分发;
 * 判据顺序:① cookie(用户显式选过)→ ② Accept-Language(首访跟浏览器)→ ③ 中文兜底 ——
 * 判语函数都住本域 index,这里只按顺序调用,不复制规则。
 * (2026-08-22 自 lib/lang.server.ts 收编:它从来就是 i18n 的服务端半边。)
 *
 * @author Frank
 * @time 2026-08-22 19:27:15
 */

import { cookies, headers } from 'next/headers'

import { LANG_COOKIE, langFromAccept, parseLang } from './index'
import type { LangOut } from './index'

/**
 * SSR 首帧语言。catch 兜底:force-static 的页面里 cookies()/headers() 取不到真值 →
 * 退站点默认中文(那几页保持静态,不为语言破例)。
 *
 * @returns 首帧语言。
 */
export async function ssrLang(): LangOut {
  try {
    const raw = (await cookies()).get(LANG_COOKIE)
    let cookieValue: string | null = null
    if (raw != null) {
      cookieValue = raw.value
    }
    const fromCookie = parseLang(cookieValue)
    if (fromCookie != null) {
      return fromCookie
    }
    return langFromAccept((await headers()).get('accept-language'))
  } catch {
    return 'zh'
  }
}
