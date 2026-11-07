'use client'
/**
 * me 桶子桶 resume 的状态机器:「我的简历」一页(简历清单、上传 / 替换 / 拖放、设默认、删除确认、预览框、
 * 生成简历窗口、求职信清单、页签)。2026-11-07 自 account 桶 useResumeFile / useCoverLetters 在新域重写,行为照旧。
 *
 * @author Frank
 * @time 2026-11-07 18:00:00
 */
import { useEffect, useState } from 'react'
import { useCvOpen } from '@/components/cv'
import { useIsNarrow } from '@/components/modal'
import { TAB_RESUME, TEXT_NONE } from './constants'
import {
  makeAdd, makeAskClose, makeAskOk, makeDefaultOf, makeDeleteOf, makeDragLeave, makeDragOver, makeFileDrop,
  makeFilePick, makeLettersLoad, makePickerOf, makePreviewClose, makePreviewOf, makeResumeListLoad, makeResumeUpload,
  letterRowsOf, previewMetaOf, resumeRowsOf,
} from './functions'
import type { AskDel, AskPanel, LetterMetas, LettersPanel, ResumeIn, ResumeMetas, ResumePanel } from './types'

/**
 * 「我的简历」一页的状态机器(2026-10-05 立;10-06 改一人多份):挂载拉一次清单;新加(选文件 / 拖进来)、替换某一份、
 * 删某一份(先弹确认框)、设默认、开关预览框、拖放高亮与报错都在这一台 —— 所有份共用一个隐藏文件框,
 * 点「替换文件」先记下替换哪一份再打开它。2026-11-07 预览框改按 id 记(替换 / 设默认后跟着新的走),多管页签与求职信清单。
 *
 * @param x 取词(造两张表的展示行)。
 * @returns 「我的简历」的面板。
 */
export function useResume(x: ResumeIn): ResumePanel {
  const narrow = useIsNarrow()
  const [tab, setTab] = useState(TAB_RESUME)
  const [checked, setChecked] = useState(false)
  const [items, setItems] = useState<ResumeMetas>([])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(TEXT_NONE)
  const [dragOn, setDragOn] = useState(false)
  const [previewId, setPreviewId] = useState<number | null>(null)
  const [replaceId, setReplaceId] = useState<number | null>(null)
  const [input, setInput] = useState<HTMLInputElement | null>(null)

  const reload = makeResumeListLoad({ setItems, setChecked })
  useEffect(function firstLoad() {
    void makeResumeListLoad({ setItems, setChecked })()
  }, [])

  const upload = makeResumeUpload({ replaceId, reload, setBusy, setErr })
  const act = { reload, setErr }
  const ask = useAskDel()
  const cv = useCvOpen({ onDone: reload })
  const letters = useLetters()
  const previewOf = makePreviewOf({ setPreviewId })
  return {
    narrow,
    tab,
    onTab: setTab,
    checked,
    items,
    busy,
    err,
    dragOn,
    preview: previewMetaOf({ items, id: previewId }),
    onInputMount: setInput,
    onAdd: makeAdd({ input, setReplaceId }),
    onPick: makeFilePick({ upload }),
    onDragOver: makeDragOver({ upload, setDragOn }),
    onDragLeave: makeDragLeave({ upload, setDragOn }),
    onDrop: makeFileDrop({ upload, setDragOn }),
    replaceOf: makePickerOf({ input, setReplaceId }),
    ask,
    deleteOf: makeDeleteOf(act),
    defaultOf: makeDefaultOf(act),
    previewOf,
    onPreviewClose: makePreviewClose({ setPreviewId }),
    cv,
    lettersChecked: letters.checked,
    lettersFailed: letters.failed,
    letters: letters.items,
    resumeRows: resumeRowsOf({ items, previewOf, t: x.t }),
    letterRows: letterRowsOf({ items: letters.items, t: x.t }),
  }
}

/**
 * 删除确认框整机(2026-10-12 Frank「所有删除按钮不要直接删,先弹框确认是否删除」):
 * 记下等着确认的那一次删除;框里点「删除」才跑真删,点「取消」或 × 只关框。
 *
 * @returns 等着确认的那一次与三只手柄。
 */
function useAskDel(): AskPanel {
  const [ask, setAsk] = useState<AskDel | null>(null)
  return { ask, setAsk, onOk: makeAskOk({ ask, setAsk }), onCancel: makeAskClose(setAsk) }
}

/**
 * 求职信清单整机(2026-10-08):挂上拉一次。
 *
 * @returns 清单与「拉回来了」。
 */
function useLetters(): LettersPanel {
  const [checked, setChecked] = useState(false)
  const [items, setItems] = useState<LetterMetas>([])
  const [failed, setFailed] = useState(false)
  useEffect(function firstLoad() {
    void makeLettersLoad({ setItems, setChecked, setFailed })()
  }, [])
  return { checked, items, failed }
}
