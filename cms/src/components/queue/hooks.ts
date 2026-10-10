'use client'
/**
 * queue 组件桶(「今日待投」)的状态机器:挂上拉一次队列;投出 / 跳过 / 全部投出 / 开关 / 展开 / 升级框;
 * 2026-10-08 UX 批加:设置清单(英文姓名、上传简历、开启)、改信弹框、职位描述弹框栈;小白走查后加:开启后每 5 秒轮询一次等这一轮跑完。
 * 同日 Frank 看「我的」:跳过、全部投出、展开 / 收起、升级框撤;加翻页(记着的位置夹进队列长度)与投出前逐项检查(勾四项才放行)。
 * 2026-10-09 N 批:弹框栈改用 modal 桶的代理栈 usePeekBus(只发消息),唯一的栈在全站骨架上的 PeekHost。
 * 同日 N6 批:卡上职位名换 name 桶的 JobName(件自己往弹框总线上推层),本机不再持栈、不再递界面语。
 *
 * @author Frank
 * @time 2026-10-08 15:00:00
 */
import { useEffect, useState } from 'react'
import { useCheckPreview } from '@/components/apply'
import { homeProvinceOf } from '@/lib/location'
import { ERR_NONE, LOAD_BUSY, POLL_MS, TEXT_NONE } from './constants'
import {
  currentOf, emptyQueueOf, isFinding, isReadyOf, makeAdd, makeEditChange, makeEditOpen, makeEditSave,
  makeEnable, makeFlip, makeLoad, makeNameChange, makeNameSave, makePage, makeProvChange, makeProvSave,
  makeSend, makeToggle, makeUpload, posOf, queueCheckOf,
} from './functions'
import type {
  FindMark, QueueCells, QueueFindingIn, QueueFindingOut, QueuePanel, QueueReviewIn, QueueState,
} from './types'

/**
 * 「今日待投」整机。
 *
 * @param x 分层态与发出后的回调。
 * @returns 面板。
 */
export function useQueueReview(x: QueueReviewIn): QueuePanel {
  const [load, setLoad] = useState(LOAD_BUSY)
  const [state, setState] = useState<QueueState>(emptyQueueOf())
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(ERR_NONE)
  const [name, setName] = useState(TEXT_NONE)
  const [prov, setProv] = useState(homeProvinceOf)
  const [uploading, setUploading] = useState(false)
  const [input, setInput] = useState<HTMLInputElement | null>(null)
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(TEXT_NONE)
  const [keptPos, setPos] = useState(0)
  const reload = makeLoad({ setLoad, setState })
  const pv = useCheckPreview()
  const { finding, setFind } = useQueueFinding({ state, setLoad, setState })
  const pos = posOf({ pos: keptPos, n: state.items.length })
  const cells: QueueCells = {
    state,
    setState,
    setBusy,
    setErr,
    pos,
    onSent: x.onSent,
    name,
    prov,
    setUploading,
    input,
    setEditing,
    editText,
    setFind,
  }
  const item = currentOf(cells)
  const onEdit = makeEditOpen({ cells, setEditText })
  return {
    load,
    state,
    item,
    pos,
    check: queueCheckOf({ item, pv, state, cells, reload, onEdit }),
    onPage: makePage({ setPos }),
    busy,
    err,
    finding,
    ready: isReadyOf(state),
    name,
    prov,
    uploading,
    editing,
    editText,
    plan: x.plan,
    onName: makeNameChange(setName),
    onNameSave: makeNameSave({ cells, reload }),
    onProv: makeProvChange(setProv),
    onProvSave: makeProvSave({ cells, reload }),
    onInputMount: setInput,
    onAdd: makeAdd({ cells }),
    onFile: makeUpload({ cells, reload }),
    onEnable: makeEnable({ cells }),
    onEdit,
    onEditText: makeEditChange(setEditText),
    onEditSave: makeEditSave({ cells }),
    onEditClose: makeFlip({ v: editing, set: setEditing }),
    onToggle: makeToggle({ cells }),
    onSend: makeSend({ cells }),
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
