// 界面语言的**服务端唯一入口**:只在 (frontend)/layout.tsx 调一次,往下靠 LangProvider 的 context 分发。
// 判据顺序与客户端 initialLang() 一模一样(同一套 parseLang/langFromAccept):
//   ① cookie(用户显式选过) → ② Accept-Language(首访跟浏览器) → ③ 中文兜底。
// 单独成文件是因为 next/headers 只能在服务端 import;判据本身仍在 jobs/i18n.ts 一处,这里不复制规则。
import { cookies, headers } from 'next/headers'

import { LANG_COOKIE, langFromAccept, parseLang, type Lang } from '@/app/(frontend)/jobs/i18n'

export async function ssrLang(): Promise<Lang> {
  try {
    const fromCookie = parseLang((await cookies()).get(LANG_COOKIE)?.value)
    if (fromCookie) return fromCookie
    return langFromAccept((await headers()).get('accept-language'))
  } catch {
    // force-static 的页面里 cookies()/headers() 取不到真值 → 退默认(那几页保持静态,不为语言破例)
    return 'zh'
  }
}
