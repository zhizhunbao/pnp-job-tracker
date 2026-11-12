'use client'
/**
 * me 桶子桶 base 的状态机器:「基础简历」卡(那一份上传的简历:拉清单、上传 / 替换 / 拖放、替换确认、删除确认、
 * 生成简历窗口)。2026-11-12 自子桶 resume 的 useResume 裁出重写,为档案与简历并页(2026-11-11 Frank
 * 「只留一份上传的吧。因为之后都可以按岗位改写」「左边我的档案,右面我的简历」):页签、求职信、设默认、预览框、表格行都不带。
 *
 * @author Frank
 * @time 2026-11-12 10:00:00
 */
import { useEffect, useState } from 'react'
import { useCvOpen } from '@/components/cv'
import { useIsNarrow } from '@/components/modal'
import { TEXT_NONE } from './constants'
import {
  errTextOf, fileOf, makeAskClose, makeAskOk, makeDeleteAsk, makeDragLeave, makeDragOver, makeFileDrop, makeFilePick,
  makePicker, makeReplaceAsk, makeResumeListLoad, makeResumeUpload, replaceIdOf,
} from './functions'
import type { Ask, AskPanel, BaseIn, BasePanel, ResumeMetas } from './types'

/**
 * 「基础简历」卡的状态机器:挂载拉一次清单,第一条就是那一份;已有一份时再传(选文件 / 拖进来)一律替换它,
 * 没有才是新加。「替换文件」与拖进来替换先弹替换确认框,「删除」先弹删除确认框;拖放高亮与报错也在这一台。
 *
 * @param x 取词(报错的字按界面语取好)。
 * @returns 「基础简历」的面板。
 */
export function useBase(x: BaseIn): BasePanel {
  const narrow = useIsNarrow()
  const [checked, setChecked] = useState(false)
  const [items, setItems] = useState<ResumeMetas>([])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(TEXT_NONE)
  const [dragOn, setDragOn] = useState(false)
  const [input, setInput] = useState<HTMLInputElement | null>(null)

  const reload = makeResumeListLoad({ setItems, setChecked })
  useEffect(function firstLoad() {
    void makeResumeListLoad({ setItems, setChecked })()
  }, [])

  const file = fileOf(items)
  const upload = makeResumeUpload({ replaceId: replaceIdOf(file), reload, setBusy, setErr })
  const del = useAsk()
  const rep = useAsk()
  const cv = useCvOpen({ onDone: reload })
  return {
    narrow,
    checked,
    file,
    busy,
    err: errTextOf({ err, t: x.t }),
    dragOn,
    onInputMount: setInput,
    onAdd: makePicker({ input }),
    onPick: makeFilePick({ upload }),
    onDragOver: makeDragOver({ setDragOn }),
    onDragLeave: makeDragLeave({ setDragOn }),
    onDrop: makeFileDrop({ file, upload, setDragOn, setAsk: rep.setAsk }),
    onReplace: makeReplaceAsk({ file, input, setAsk: rep.setAsk }),
    onDelete: makeDeleteAsk({ file, setAsk: del.setAsk, act: { reload, setErr } }),
    del,
    rep,
    cv,
  }
}

/**
 * 确认框整机(2026-10-12 Frank「所有删除按钮不要直接删,先弹框确认是否删除」;替换同理,各用一台):
 * 记下等着确认的那一次;框里点确认才跑,点「取消」或 × 只关框。
 *
 * @returns 等着确认的那一次与三只手柄。
 */
function useAsk(): AskPanel {
  const [ask, setAsk] = useState<Ask | null>(null)
  return { ask, setAsk, onOk: makeAskOk({ ask, setAsk }), onCancel: makeAskClose(setAsk) }
}
