'use client'
/**
 * 站内向导对话框的状态机:输入框、轮次、忙态、贴底与触屏两枚引用;手柄全由 functions 的工厂装配。
 *
 * @author Frank
 * @time 2026-09-05 16:00:00
 */

import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useLang } from '@/components/i18n'
import { TEXT_NONE } from './constants'
import {
  makeAutofocusEffect, makeCoarseEffect, makeComposerChange, makeComposerKey, makeEmailChange, makeEmailOpen,
  makeEmailSend, makeNav, makeScroll, makeSend, makeStickEffect, makeSubmit,
} from './functions'
import type {
  ComposerKeyEvent, GuideBoxHookIn, GuideBoxOut, MakeKeyIn, SendDeps, SendFn, StickIn, TurnList, VoidFn,
} from './types'

/**
 * 对话框整机。
 *
 * @param x 预填问句与展开聚焦档(挂件壳递进来)。
 * @returns 面板 + 两枚 DOM 引用。
 */
export function useGuideBox(x: GuideBoxHookIn): GuideBoxOut {
  const [lang, , t] = useLang()
  const pathname = usePathname()
  const [input, setInput] = useState(x.prefill)
  const [prefillSeen, setPrefillSeen] = useState(x.prefill)
  if (x.prefill !== prefillSeen) {
    setPrefillSeen(x.prefill)
    if (x.prefill !== TEXT_NONE) {
      setInput(x.prefill)
    }
  }
  const [turns, setTurns] = useState<TurnList>([])
  const [busy, setBusy] = useState(false)
  const threadEl = useRef<HTMLDivElement | null>(null)
  const taEl = useRef<HTMLTextAreaElement | null>(null)
  const stick = useRef(true)
  const coarse = useRef(false)
  let path = TEXT_NONE
  if (pathname != null) {
    path = pathname
  }

  useEffect(function detectCoarse() {
    makeCoarseEffect({ coarse })()
  }, [])

  useEffect(function focusOnOpen() {
    if (x.autoFocus === false) {
      return
    }
    makeAutofocusEffect({ taEl })()
  }, [x.autoFocus])

  useEffect(function followBottom() {
    makeStickEffect({ threadEl, stick })()
  }, [turns, busy])

  const send = useSend({ turns, busy, lang, path, setTurns, setInput, setBusy, taEl, stick })
  return {
    p: {
      t,
      input,
      turns,
      busy,
      onChange: makeComposerChange({ setInput }),
      onKeyDown: useComposerKey({ coarse, input, send }),
      onSubmit: makeSubmit({ input, send }),
      onChip: send,
      onScroll: useThreadScroll({ threadEl, stick }),
      onNav: makeNav({ turns }),
      onEmailOpen: makeEmailOpen({ setTurns }),
      onEmailChange: makeEmailChange({ setTurns }),
      onEmailSend: makeEmailSend({ turns, setTurns }),
    },
    threadEl,
    taEl,
  }
}

/**
 * 键盘手柄的 hook 皮:触屏引用只在手柄体内读(react-hooks/refs:渲染期不许把 ref 交给普通函数)。
 *
 * @param x 触屏引用、输入框现值与发话手柄。
 * @returns 键盘手柄。
 */
function useComposerKey(x: MakeKeyIn): (e: ComposerKeyEvent) => void {
  return makeComposerKey(x)
}

/**
 * 滚动手柄的 hook 皮:两枚引用只在手柄体内读。
 *
 * @param x 历史区与贴底引用。
 * @returns 滚动手柄。
 */
function useThreadScroll(x: StickIn): VoidFn {
  return makeScroll(x)
}

/**
 * 发话手柄的 hook 皮:输入框与贴底两枚引用只在发话体内读。
 *
 * @param x 依赖包。
 * @returns 发话手柄。
 */
function useSend(x: SendDeps): SendFn {
  return makeSend(x)
}
