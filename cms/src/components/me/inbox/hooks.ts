'use client'
/**
 * me 桶子桶 inbox 的状态机器:拉清单、深链 `?msg=` 直开那封、点信标已读、转发开关、站内回信。
 *
 * @author Frank
 * @time 2026-11-07 16:30:00
 */
import { useEffect, useState } from 'react'
import { useIsNarrow } from '@/components/modal'
import { TEXT_NONE } from './constants'
import {
  curOf, makeFlagSet, makeForward, makeLoadInbox, makeOpenApp, makePickOf, makeReplySend, makeTextSet, makeUnpick,
  msgLinkOf,
} from './functions'
import type { InboxIn, InboxPanel, InboxView } from './types'

/**
 * 收件箱一页的状态机器。
 *
 * @param x 取词与打开投递记录框。
 * @returns 收件箱状态与手柄。
 */
export function useInbox(x: InboxIn): InboxPanel {
  const narrow = useIsNarrow()
  const [data, setData] = useState<InboxView | null>(null)
  const [failed, setFailed] = useState(false)
  const [sel, setSel] = useState<number | null>(null)
  const [replying, setReplying] = useState(false)
  const [replyText, setReplyText] = useState(TEXT_NONE)
  const [replyBusy, setReplyBusy] = useState(false)
  const [replyNote, setReplyNote] = useState(TEXT_NONE)

  useEffect(function firstLoad() {
    void makeLoadInbox({ setData, setFailed })()
  }, [])

  const pickOf = makePickOf({ data, setData, setSel })
  const linked = data != null
  useEffect(function readMsgLink() {
    const id = msgLinkOf()
    if (linked && id != null) {
      pickOf(id)()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 深链只在收件箱第一次拉回来时认一次;之后点别的不再被地址栏拉回去
  }, [linked])

  const cur = curOf({ data, sel, narrow })
  return {
    data,
    failed,
    narrow,
    cur,
    pickOf,
    onUnpick: makeUnpick({ setSel }),
    onForward: makeForward({ data, setData, t: x.t }),
    onOpenApp: makeOpenApp({ cur, open: x.openApp }),
    replying,
    onReply: makeFlagSet({ set: setReplying, v: true }),
    onReplyClose: makeFlagSet({ set: setReplying, v: false }),
    replyText,
    onReplyText: makeTextSet({ set: setReplyText }),
    onReplySend: makeReplySend({
      cur,
      text: replyText,
      data,
      setData,
      setBusy: setReplyBusy,
      setNote: setReplyNote,
      setOpen: setReplying,
      setText: setReplyText,
      t: x.t,
    }),
    replyBusy,
    replyNote,
  }
}
