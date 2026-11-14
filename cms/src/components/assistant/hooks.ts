'use client'
/**
 * assistant 组件桶的状态机器:useAssistant 一台管全部(在不在线、开合、对话、输入、等待、出错)。
 * 对话只存在这台机器的状态里:关面板再开还在,刷新页面就没了(每次打开页面是新的一段)。
 * 带口径的步骤(验形、消息表增减、历史)在 ./functions;这里只有 useState、具名 effect 与手柄。
 *
 * @author Frank
 * @time 2026-11-14 12:00:00
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useLang } from '@/components/i18n'
import { TEXT_MAX } from '@/lib/assistant'
import { track } from '@/lib/track'
import {
  ERR_NONE, EV_OPEN, EV_SEND, EVT_KEYDOWN, KEY_ENTER, KEY_ESC, SEND_OFFLINE, SEND_OK, SLOW_MS, TEXT_NONE,
} from './constants'
import { errOf, fetchReady, historyOf, msgsAfterSend, msgsWith, nextMsgId, sendTurn, userMsgOf } from './functions'
import type { AssistantOut, ErrKind, Msg, SendOut, UseSendIn } from './types'

/**
 * 整机:挂上问一次在不在线;开合、对话、输入、等待与出错都在这里。
 *
 * @returns 整机面板与两枚 DOM 引用。
 */
export function useAssistant(): AssistantOut {
  const [lang, , t] = useLang()
  const [ready, setReady] = useReady()
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [draft, setDraft] = useState(TEXT_NONE)
  const [busy, setBusy] = useState(false)
  const [slow, setSlow] = useState(false)
  const [err, setErr] = useState<ErrKind>(ERR_NONE)
  const inputEl = useRef<HTMLTextAreaElement | null>(null)
  const threadEl = useRef<HTMLDivElement | null>(null)
  const show = useCallback(function showPanel(): void {
    setOpen(true)
    track(EV_OPEN)
  }, [])
  const hide = useCallback(function hidePanel(): void {
    setOpen(false)
  }, [])
  const send = useSend({ lang, t, msgs, draft, busy, setMsgs, setDraft, setBusy, setSlow, setErr, setReady, setOpen })
  const onDraft = useCallback(function changeDraft(e: React.ChangeEvent<HTMLTextAreaElement>): void {
    setDraft(e.target.value.slice(0, TEXT_MAX))
  }, [])
  const onKey = useCallback(function keyDown(e: React.KeyboardEvent<HTMLTextAreaElement>): void {
    if (e.key !== KEY_ENTER || e.shiftKey || e.nativeEvent.isComposing) {
      return
    }
    e.preventDefault()
    send()
  }, [send])
  useSlowTimer({ busy, setSlow })
  useEsc({ open, hide })
  useEffect(function focusInput() {
    if (open && inputEl.current != null) {
      inputEl.current.focus()
    }
  }, [open])
  useEffect(function scrollToEnd() {
    const el = threadEl.current
    if (el != null) {
      el.scrollTop = el.scrollHeight
    }
  }, [open, msgs.length, busy, slow])
  return { p: { t, ready, open, msgs, draft, busy, slow, err, show, hide, send, onDraft, onKey }, inputEl, threadEl }
}

/**
 * 在不在线:挂上请求一次 /api/assistant/ready,回 true 才出入口;卸载后回来的结果不落格。
 *
 * @returns [在线, 在线落格]。
 */
function useReady(): [boolean, (v: boolean) => void] {
  const [ready, setReady] = useState(false)
  useEffect(function probe() {
    let alive = true
    function onReady(ok: boolean): void {
      if (alive) {
        setReady(ok)
      }
    }
    void fetchReady().then(onReady)
    function stop(): void {
      alive = false
    }
    return stop
  }, [])
  return [ready, setReady]
}

/**
 * 造发送手柄:空的、在等回复的不发;发出先上访客那条气泡并清空输入框,回来后接上回复。
 * 没答上:撤掉刚上的那条气泡,字放回输入框(可重发);503 按不在线收起入口;其余出一句提示。
 *
 * @param x 现有状态与各落格。
 * @returns 发送手柄。
 */
function useSend(x: UseSendIn): () => void {
  const { lang, t, msgs, draft, busy, setMsgs, setDraft, setBusy, setSlow, setErr, setReady, setOpen } = x
  return useCallback(function send(): void {
    const text = draft.trim().slice(0, TEXT_MAX)
    if (text === TEXT_NONE || busy) {
      return
    }
    const mine = userMsgOf({ id: nextMsgId(), text })
    const history = historyOf({ msgs, t })
    setMsgs(msgsWith({ list: msgs, item: mine }))
    setDraft(TEXT_NONE)
    setErr(ERR_NONE)
    setSlow(false)
    setBusy(true)
    track(EV_SEND)
    function onDone(out: SendOut): void {
      const replyId = nextMsgId()
      function next(prev: Msg[]): Msg[] {
        return msgsAfterSend({ list: prev, mineId: mine.id, out, replyId })
      }
      setMsgs(next)
      setBusy(false)
      if (out.status === SEND_OK) {
        return
      }
      setDraft(text)
      if (out.status === SEND_OFFLINE) {
        setReady(false)
        setOpen(false)
        return
      }
      setErr(errOf(out.status))
    }
    void sendTurn({ text, lang, history }).then(onDone)
  }, [lang, t, msgs, draft, busy, setMsgs, setDraft, setBusy, setSlow, setErr, setReady, setOpen])
}

/**
 * 等回复超过 SLOW_MS 记一笔「超过三秒」(界面加一句「还在想」);回复到了停表。
 *
 * @param x 在不在等与落格。
 * @returns 无。
 */
function useSlowTimer(x: {
  /**
   * 在等回复。
   */
  busy: boolean

  /**
   * 「超过三秒」落格。
   */
  setSlow: (v: boolean) => void
}): void {
  const { busy, setSlow } = x
  useEffect(function slowTimer() {
    if (busy === false) {
      return
    }
    function mark(): void {
      setSlow(true)
    }
    const h = window.setTimeout(mark, SLOW_MS)
    function stop(): void {
      window.clearTimeout(h)
    }
    return stop
  }, [busy, setSlow])
}

/**
 * 面板开着时按 Esc 关。
 *
 * @param x 开合与关闭手柄。
 * @returns 无。
 */
function useEsc(x: {
  /**
   * 面板开着。
   */
  open: boolean

  /**
   * 关面板。
   */
  hide: () => void
}): void {
  const { open, hide } = x
  useEffect(function escToClose() {
    if (open === false) {
      return
    }
    function onKey(e: KeyboardEvent): void {
      if (e.key === KEY_ESC) {
        hide()
      }
    }
    document.addEventListener(EVT_KEYDOWN, onKey)
    function stop(): void {
      document.removeEventListener(EVT_KEYDOWN, onKey)
    }
    return stop
  }, [open, hide])
}
