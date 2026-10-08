'use client'
/**
 * queue 组件桶(「今日待投」)的状态机器:挂上拉一次队列;投出 / 跳过 / 全部投出 / 开关 / 展开 / 升级框;
 * 2026-10-08 UX 批加:设置清单(英文姓名、上传简历、开启)、改信弹框、职位描述弹框栈;小白走查后加:开启后每 5 秒轮询一次等这一轮跑完。
 *
 * @author Frank
 * @time 2026-10-08 15:00:00
 */
import { useEffect, useState } from 'react'
import { useLang } from '@/components/i18n'
import { useLayerStack } from '@/components/modal'
import { ERR_NONE, LOAD_BUSY, POLL_MS, TEXT_NONE } from './constants'
import {
  isFinding, isReadyOf, makeAdd, makeEditChange, makeEditOpen, makeEditSave, makeEnable, makeFlip, makeLoad,
  makeNameChange, makeNameSave, makePushJob, makeSend, makeSendAll, makeSkip, makeToggle, makeUpload, titleOpenOf,
} from './functions'
import type {
  FindMark, PeekLayer, QueueCells, QueueFindingIn, QueueFindingOut, QueuePanel, QueueReviewIn, QueueState,
} from './types'

/**
 * 「今日待投」整机。
 *
 * @param x 分层态与发出后的回调。
 * @returns 面板。
 */
export function useQueueReview(x: QueueReviewIn): QueuePanel {
  const [lang] = useLang()
  const [load, setLoad] = useState(LOAD_BUSY)
  const [state, setState] = useState<QueueState>({
    auto: false, hasNocs: false, hasName: false, hasResume: false, items: [], lastQueueAt: TEXT_NONE,
  })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(ERR_NONE)
  const [expanded, setExpanded] = useState(false)
  const [upsell, setUpsell] = useState(false)
  const [name, setName] = useState(TEXT_NONE)
  const [uploading, setUploading] = useState(false)
  const [input, setInput] = useState<HTMLInputElement | null>(null)
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(TEXT_NONE)
  const stack = useLayerStack<PeekLayer>()
  const reload = makeLoad({ setLoad, setState })
  const { finding, setFind } = useQueueFinding({ state, setLoad, setState })
  const cells: QueueCells = {
    state,
    setState,
    setBusy,
    setErr,
    setUpsell,
    pro: x.plan.isPro,
    onSent: x.onSent,
    name,
    setUploading,
    input,
    setEditing,
    editText,
    setFind,
  }
  let item = null
  const first = state.items[0]
  if (first != null) {
    item = first
  }
  return {
    load,
    state,
    item,
    lang,
    busy,
    err,
    expanded,
    upsell,
    finding,
    ready: isReadyOf(state),
    name,
    uploading,
    editing,
    editText,
    stack,
    plan: x.plan,
    onTitle: titleOpenOf({ item, onOpenJob: makePushJob(stack) }),
    onName: makeNameChange(setName),
    onNameSave: makeNameSave({ cells, reload }),
    onInputMount: setInput,
    onAdd: makeAdd({ cells }),
    onFile: makeUpload({ cells, reload }),
    onEnable: makeEnable({ cells }),
    onEdit: makeEditOpen({ cells, setEditText }),
    onEditText: makeEditChange(setEditText),
    onEditSave: makeEditSave({ cells }),
    onEditClose: makeFlip({ v: editing, set: setEditing }),
    onToggle: makeToggle({ cells }),
    onSend: makeSend({ cells }),
    onSkip: makeSkip({ cells }),
    onSendAll: makeSendAll({ cells }),
    onExpand: makeFlip({ v: expanded, set: setExpanded }),
    onUpsellClose: makeFlip({ v: upsell, set: setUpsell }),
  }
}

/**
 * 首拉 + 「开启后这一轮还在跑」(2026-10-08 小白走查):点了开启记个记号,每 5 秒重拉一次,
 * 有岗了 / 上一轮时刻变了 / 超时就停。
 *
 * @param x 队列状态与两个落格。
 * @returns 还在跑与记记号的手柄。
 */
export function useQueueFinding(x: QueueFindingIn): QueueFindingOut {
  const [find, setFind] = useState<FindMark | null>(null)
  const [now, setNow] = useState(0)
  const finding = isFinding({ find, state: x.state, now })
  const setLoad = x.setLoad
  const setState = x.setState
  useEffect(function firstLoad() {
    void makeLoad({ setLoad, setState })()
  }, [setLoad, setState])
  useEffect(function pollWhileFinding() {
    if (finding === false) {
      return
    }
    function tick(): void {
      setNow(Date.now())
      void makeLoad({ setLoad, setState })()
    }
    const id = window.setInterval(tick, POLL_MS)
    return function stop(): void {
      window.clearInterval(id)
    }
  }, [finding, setLoad, setState])
  return { finding, setFind }
}
