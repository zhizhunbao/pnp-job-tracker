'use client'
/**
 * 生成简历窗口的整机状态:草稿(首开从本地或档案取,改了就存本地)、三种表单(联系方式 / 段落 / 一条)、删除确认、
 * 导入职责那块(边打边搜)、预览、存着、错误。
 *
 * @author Frank
 * @time 2026-11-07 16:00:00
 */
import { useEffect, useState } from 'react'
import { useLang } from '@/components/i18n'
import { DUTY_DEBOUNCE_MS, DUTY_Q_MIN, ERR_NONE, OWNER_NONE } from './constants'
import {
  blankContactOf, closedDutyOf, loadDuties, loadFirst, makeAddOf, makeContactEdit, makeContactFieldOf, makeContactSave,
  makeDelOf, makeDelOk, makeDescArea, makeDutyCheckOf, makeDutyImport, makeDutyPickOf, makeDutyQ, makeDutyToggle,
  makeEditOf, makeEntryFieldOf, makeEntryNow, makeEntrySave, makeFormClose, makeHideOf, makeSave, makeTextArea,
  makeTextEditOf, makeTextSave, newDraftOf, writeDraft, makeAskClose, makeCvSaved, makeFlagSet, mergeProfileInto,
} from './functions'
import type {
  CvBuilderIn, CvCells, CvContact, CvDraft, CvOpenIn, CvOpenPanel, CvPanel, DutySearchIn, DutyState, EntryAt, EntryEdit,
  TextEdit,
} from './types'
import { makeProfileImport } from './prefill'

/**
 * 生成简历窗口整机。
 *
 * @param x 关窗口与存成了的回调。
 * @returns 面板(各件只读它)。
 */
// eslint-disable-next-line local/function-length -- 整机的格一处声明一处交出(窗口、三种表单、确认框、导入职责共用一份草稿),拆开就要在几个钩子间来回传 setter
export function useCvBuilder(x: CvBuilderIn): CvPanel {
  const [, , t] = useLang()
  const [loaded, setLoaded] = useState(false)
  const [owner, setOwner] = useState(OWNER_NONE)
  const [draft, setDraft] = useState<CvDraft>(newDraftOf(blankContactOf()))
  const [entry, setEntry] = useState<EntryEdit | null>(null)
  const [contact, setContact] = useState<CvContact | null>(null)
  const [text, setText] = useState<TextEdit | null>(null)
  const [ask, setAsk] = useState<EntryAt | null>(null)
  const [duty, setDuty] = useState<DutyState>(closedDutyOf())
  const [preview, setPreview] = useState(false)
  const [saving, setSaving] = useState(false)
  const [importing, setImporting] = useState(false)
  const [err, setErr] = useState(ERR_NONE)
  const [formErr, setFormErr] = useState(ERR_NONE)
  const [chars, setChars] = useState<string[]>([])
  useEffect(function first() {
    void loadFirst({ setDraft, setOwner, setLoaded })
  }, [])
  useEffect(function persist() {
    if (loaded) {
      writeDraft({ owner, d: draft })
    }
  }, [draft, loaded, owner])
  useDutySearch({ duty, setDuty })
  const cells: CvCells = {
    draft,
entry,
contact,
text,
ask,
duty,
setDraft,
setEntry,
setContact,
setText,
setAsk,
setDuty,
setPreview,
setSaving,
    setErr,
setFormErr,
setChars,
onSaved: x.onSaved,
  }
  return {
    t,
    loaded,
    draft,
    entry,
    contact,
    text,
    ask,
    duty,
    preview,
    saving,
    err,
    formErr,
    chars,
    onClose: x.onClose,
    onContactEdit: makeContactEdit(cells),
    contactFieldOf: makeContactFieldOf(cells),
    onContactSave: makeContactSave(cells),
    textEditOf: makeTextEditOf(cells),
    onTextArea: makeTextArea(cells),
    onTextSave: makeTextSave(cells),
    addOf: makeAddOf(cells),
    editOf: makeEditOf(cells),
    hideOf: makeHideOf(cells),
    delOf: makeDelOf(cells),
    onDelOk: makeDelOk(cells),
    onDelCancel: makeAskClose(setAsk),
    entryFieldOf: makeEntryFieldOf(cells),
    onDescArea: makeDescArea(cells),
    onEntryNow: makeEntryNow(cells),
    onEntrySave: makeEntrySave(cells),
    onFormClose: makeFormClose(cells),
    onDutyToggle: makeDutyToggle(cells),
    onDutyQ: makeDutyQ(cells),
    dutyPickOf: makeDutyPickOf(cells),
    dutyCheckOf: makeDutyCheckOf(cells),
    onDutyImport: makeDutyImport(cells),
    onPreview: makeFlagSet({ set: setPreview, v: true }),
    onImport: makeProfileImport({ load: makeProfileLoad(draft), t, setDraft, setImporting }),
    importing,
    onPreviewClose: makeFlagSet({ set: setPreview, v: false }),
    onSave: makeSave(cells),
  }
}

/**
 * 「导入职责」边打边搜:展开着、检索词够长,停顿一下再搜;检索词又变了就作废上一次的计时
 * (在途的那次回来时检索词已经变了,结果丢掉,见 loadDuties)。
 *
 * @param x 导入职责那块与设它的函数。
 * @returns 无。
 */
function useDutySearch(x: DutySearchIn): void {
  const open = x.duty.open
  const q = x.duty.q
  const setDuty = x.setDuty
  useEffect(function search() {
    if (open === false || q.trim().length < DUTY_Q_MIN) {
      return
    }
    const timer = setTimeout(function fire() {
      void loadDuties({ q, setDuty })
    }, DUTY_DEBOUNCE_MS)
    function cancel() {
      clearTimeout(timer)
    }
    return cancel
  }, [open, q, setDuty])
}

/**
 * 生成简历窗口的开关(「我的简历」页与投递第 1 步共用):开、关、存成了先关再交宿主。
 *
 * @param x 宿主在存成之后要做的事(收新简历 id)。
 * @returns 开着吗与三只手柄。
 */
export function useCvOpen(x: CvOpenIn): CvOpenPanel {
  const [open, setOpen] = useState(false)
  return {
    open,
    onOpen: makeFlagSet({ set: setOpen, v: true }),
    onClose: makeFlagSet({ set: setOpen, v: false }),
    onSaved: makeCvSaved({ setOpen, onDone: x.onDone }),
  }
}

/**
 * 造「拉档案并并入这份草稿」。
 *
 * @param d 现有草稿。
 * @returns 无参函数。
 */
function makeProfileLoad(d: CvDraft): () => ReturnType<typeof mergeProfileInto> {
  return function loadMerge() {
    return mergeProfileInto(d)
  }
}
