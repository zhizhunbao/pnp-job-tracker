'use client'

// 界面语言的**客户端唯一状态**。原来 17 个视图各抄一份
//   useState('zh') + useEffect(() => setLang(initialLang())) + setLangSaved
// —— 初值写死中文、水合后才读偏好,所以英韩用户每次刷新都先闪一帧中文
// (2026-08-03 Frank「英文版本和韩语版本在刷新的时候为什么会先切换到中文」)。
// 现在初值由服务端 ssrLang() 从 cookie/Accept-Language 算好,经 layout 传进来 → 首帧即终态。
// 各视图只用 useLang(),不再自己 useState/读 localStorage。
import { createContext, useContext, useEffect, useMemo, useState } from 'react'

import { LANG_COOKIE, LANG_KEY, makeT, parseLang, saveLang, type Lang, type TFn } from './jobs/i18n'

const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({ lang: 'zh', setLang: () => {} })

/** 全站语言。签名沿用 stats/ui.tsx 原有的 useLang(元组含 t)—— 那是这套写法的雏形,
 *  现在把状态挪进 context 并推广到全部视图。setLang 顺带落盘,调用方不必再自己存。 */
export function useLang(): [Lang, (l: Lang) => void, TFn] {
  const { lang, setLang } = useContext(Ctx)
  const t = useMemo(() => makeT(lang), [lang])
  return [lang, setLang, t]
}

export function LangProvider({ initial, children }: { initial: Lang; children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initial)
  // html lang 由 SSR 按 cookie 渲;当场切换时同步改掉,否则「内容已是韩文、lang 还写着 en」——
  // 读屏器会用错发音规则(搜索引擎看到的永远是 SSR 那份,不受影响)
  const setLang = (l: Lang) => {
    saveLang(l)
    setLangState(l)
    try { document.documentElement.lang = l } catch { /* ignore */ }
  }

  // 老用户迁移(照列偏好 cookie 的先例):改造前的偏好只写进了 localStorage,没有 cookie →
  // 服务端第一次仍按 Accept-Language 猜。这里补写一次 cookie,并按 localStorage 纠正当前语言;
  // 之后每次刷新服务端都读得到,永久零闪。只在两者不一致时动,避免无谓重渲。
  useEffect(() => {
    try {
      const re = new RegExp(`(?:^|;\\s*)${LANG_COOKIE.replace(/\./g, '\\.')}=([^;]+)`)
      if (parseLang(document.cookie.match(re)?.[1])) return   // 已有 cookie,不用管
      const saved = parseLang(localStorage.getItem(LANG_KEY))
      if (!saved) return                      // 没有旧偏好 → 服务端按 Accept-Language 猜的就是最终结果
      document.cookie = `${LANG_COOKIE}=${saved}; path=/; max-age=31536000; samesite=lax`
      if (saved !== initial) setLangState(saved)
    } catch { /* ignore */ }
  }, [initial])

  return <Ctx.Provider value={{ lang, setLang }}>{children}</Ctx.Provider>
}
