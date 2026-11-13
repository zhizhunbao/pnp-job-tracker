'use client'
/**
 * me 桶子桶 inbox 的状态机器:拉清单、深链 `?msg=` 直开那封、点信标已读、转发开关、站内回信。
 * 2026-11-07 照 Outlook 网页版:多 搜索 / 全部 / 未读 筛选 / 未读数;回信改在阅读区里就地展开(状态照旧,只是不再走弹框)。
 * 2026-11-13 Frank「先修收件箱问题」:宽屏默认显示的那一封(没点过也摆在右边)显示了就算已读,
 * 原先要再点一下才标,红点不消;换到别的信先清回信草稿(原先给甲写的草稿会留在乙的回信框里)。
 * 同日「同时转到」开关撤(Frank「照这个做」:固定都转),转发开关手柄随之撤。
 *
 * @author Frank
 * @time 2026-11-07 16:30:00
 */
import { useEffect, useState } from 'react'
import { useIsNarrow } from '@/components/modal'
import { FILTER_ALL, TEXT_NONE } from './constants'
import {
  curIdOf, curOf, makeDraftReset, makeFlagSet, makeLoadInbox, makeOpenApp, makePickOf, makeReplySend,
  makeTextSet, makeUnpick, msgLinkOf, shownOf, unreadNOf,
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
  const [q, setQ] = useState(TEXT_NONE)
  const [filter, setFilter] = useState(FILTER_ALL)

  useEffect(function firstLoad() {
    void makeLoadInbox({ setData, setFailed })()
  }, [])

  const cur = curOf({ data, sel, narrow })
  const resetDraft = makeDraftReset({ setOpen: setReplying, setText: setReplyText, setNote: setReplyNote })
  const pickOf = makePickOf({ data, setData, setSel, curId: curIdOf(cur), resetDraft })
  const linked = data != null
  useEffect(function readMsgLink() {
    const id = msgLinkOf()
    if (linked && id != null) {
      pickOf(id)()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 深链只在收件箱第一次拉回来时认一次;之后点别的不再被地址栏拉回去
  }, [linked])

  const shownUnread = cur != null && cur.read === false
  useEffect(function readShown() {
    if (cur != null && shownUnread) {
      pickOf(cur.id)()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 只在「眼前这封没读」这件事变了时跑;pickOf 每次渲染都是新的,不进依赖
  }, [shownUnread])

  return {
    data,
    failed,
    narrow,
    cur,
    pickOf,
    onUnpick: makeUnpick({ setSel }),
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
    q,
    onQ: setQ,
    filter,
    onFilter: setFilter,
    shown: shownOf({ data, q, filter }),
    unreadN: unreadNOf(data),
  }
}
