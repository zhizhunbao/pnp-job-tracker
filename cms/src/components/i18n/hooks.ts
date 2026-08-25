'use client'
/**
 * i18n 组件域的状态机器:界面语言的**客户端唯一状态**。原来 17 个视图各抄一份
 * useState('zh') + useEffect(读 localStorage)—— 初值写死中文、水合后才读偏好,
 * 英韩用户每次刷新先闪一帧中文(2026-08-03 Frank「英文版本和韩语版本在刷新的时候
 * 为什么会先切换到中文」)。现在初值由服务端 ssrLang() 算好经 layout 传进来 →
 * 首帧即终态;各视图只用 useLang()。
 *
 * @author Frank
 * @time 2026-08-24 01:30:00
 */
import { createContext, useContext, useEffect, useMemo, useState } from 'react'

import { LANG_COOKIE, LANG_KEY, makeT, parseLang, saveLang, type Lang, type TFn } from '@/lib/i18n'
import type { LangStateOut } from './types'
import { COOKIE_RE_HEAD, COOKIE_RE_TAIL, DOT_ESCAPED, DOT_RE, LANG_COOKIE_ATTRS, LANG_COOKIE_EQ, LANG_DEFAULT } from './constants'

/**
 * 语言上下文(react 接缝件,住机器抽屉)。默认值只给「不在 Provider 下」的
 * 测试/存量路径兜底:中文 + 空操作。
 */
const LangCtx = createContext<LangStateOut>({ lang: LANG_DEFAULT, setLang: noopSetLang })

/**
 * 默认上下文的空操作(不在 Provider 下换语言没有去处)。
 *
 * @param _l 语言(用不上,下划线开头是「库形状定死、这格不用」的标法)。
 * @returns 无。
 */
function noopSetLang(_l: Lang) {
  return
}

/**
 * LangProvider 组件要用的上下文本体(域内取,不出桶)。
 *
 * @returns 上下文对象。
 */
export function langCtxOf() {
  return LangCtx
}

/**
 * 全站语言。签名沿用 stats/ui.tsx 原有的 useLang(元组含 t)—— 那是这套写法的雏形,
 * 现在把状态挪进 context 并推广到全部视图。setLang 顺带落盘,调用方不必再自己存。
 *
 * @returns [当前语言, 换语言, 取词函数]。
 */
export function useLang(): [Lang, (l: Lang) => void, TFn] {
  const { lang, setLang } = useContext(LangCtx)
  const t = useMemo(function make() {
    return makeT(lang)
  }, [lang])
  return [lang, setLang, t]
}

/**
 * 语言状态整机(LangProvider 的机器):换语言的每条路都走 apply ——
 * 2026-08-03 生产实拍:迁移分支原先绕开 html lang 同步 → 页面已是英文、
 * html lang 还写着 zh,读屏器照中文发音规则念英文(搜索引擎看 SSR 那份不受影响)。
 * 老用户迁移(照列偏好 cookie 的先例):改造前偏好只在 localStorage,这里补写一次
 * cookie 并纠正当前语言;之后每次刷新服务端都读得到,永久零闪。
 *
 * 迁移那个 effect 的依赖只有 `initial`:它**只在挂载与换初值时跑一次**,
 * apply 是稳定闭包不必入依赖(此话原先挂在一张 eslint 特批牌上,
 * 2026-08-25 那张牌已失效——React Compiler 接手后规则不再报——理由搬进这里保住)。
 *
 * @param initial 服务端算好的首帧语言。
 * @returns 机器面板(当前语言与换语言)。
 */
export function useLangState(initial: Lang): LangStateOut {
  const [lang, setLangState] = useState<Lang>(initial)

  function apply(l: Lang) {
    setLangState(l)
    try {
      document.documentElement.lang = l
    } catch {
      return
    }
  }

  function setLang(l: Lang) {
    saveLang(l)
    apply(l)
  }

  useEffect(function migrate() {
    try {
      const re = new RegExp(COOKIE_RE_HEAD + LANG_COOKIE.replace(DOT_RE, DOT_ESCAPED) + COOKIE_RE_TAIL)
      const m = document.cookie.match(re)
      let cookieVal: string | null = null
      if (m != null && m[1] != null) {
        cookieVal = m[1]
      }
      if (parseLang(cookieVal) != null) {
        return
      }
      const saved = parseLang(localStorage.getItem(LANG_KEY))
      if (saved == null) {
        return
      }
      document.cookie = LANG_COOKIE + LANG_COOKIE_EQ + saved + LANG_COOKIE_ATTRS
      if (saved !== initial) {
        apply(saved)
      }
    } catch {
      return
    }
  }, [initial])

  return { lang, setLang }
}
