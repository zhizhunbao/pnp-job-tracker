'use client'
/**
 * inbox 组件桶的状态机器(2026-10-10 批 3「收件箱」):useInbox 管整节(拉收件箱、选一封、转发开关、回信框)。
 * 页签红点归 account 桶自己拉(account → inbox → myjobs → apply → account 会成环)。
 * 2026-10-11 批 5「提示统一 + 顶栏铃铛」:转发开关存上 / 没存上改右上角提示(toast 桶),fwdNote 一格撤。
 *
 * @author Frank
 * @time 2026-10-10 23:50:00
 */
import { useEffect, useState } from 'react'
import { useIsNarrow } from '@/components/modal'
import { openAppView } from '@/components/myjobs'
import { TEXT_NONE } from './constants'
import {
  curOf, makeFlagSet, makeForward, makeLoadInbox, makeOpenApp, makePickOf, makeReplySend, makeTextSet,
  makeUnpick, msgLinkOf,
} from './functions'
import type { InboxIn, InboxPanel, InboxView } from './types'

/**
 * 收件箱整机:挂上拉一次;地址栏带 `?msg=` 就选中那一封(手机直接弹阅读框);点一封标已读;勾转发;开 / 关 / 发回信框。
 *
 * @param x 取词函数。
 * @returns 整节的面板。
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
    onOpenApp: makeOpenApp({ cur, open: openAppView }),
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
