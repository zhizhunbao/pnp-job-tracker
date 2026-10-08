'use client'
/**
 * 投递区的整机状态:当前步、英文姓名、选用的简历与清单、信(按哪份简历写的)、写信 / 上传 / 存发在途、错误;
 * 离页时存草稿(审查 #8)。另一台 useApplyStart 管投递区的取数。
 * 2026-10-07 二改:信由模型按 JD 每岗写一封(进第 2 步现写,可「按职位重写」),第 1 步按岗点选简历、就地添加。
 *
 * @author Frank
 * @time 2026-10-07 03:00:00
 */
import { useEffect, useState } from 'react'
import { useLang } from '@/components/i18n'
import { coverFileOf, pdfBadCharsOf } from '@/lib/apply'
import { ERR_NONE, EV_PAGEHIDE, LOAD_BUSY, TEXT_NONE } from './constants'
import {
  canNextOf, coverHrefOf, isAiOpenOf, jobIdOf, loadStart, makeAdd, makeBack, makeFile, makeLetterChange,
  makeNameChange, makeNext, makePickOf, makeQuietSave, makeRewrite, makeUpsellClose, makeUpsellOpen, nextKeyOf,
  resumeNameOf, startStepOf, stepIndexOf, upsellBackOf,
} from './functions'
import type {
  ApplyCells, ApplyPageIn, ApplyPanel, ApplyResumeView, ApplyStartPanel, ApplyStartView, TrialHook,
} from './types'

/**
 * 投递区整机。
 *
 * @param x 起始态与发出后的回调。
 * @returns 面板(各件只读它)。
 */
export function useApply(x: ApplyPageIn): ApplyPanel {
  const s = x.start
  const [, , t] = useLang()
  const [step, setStep] = useState(startStepOf({
    status: s.status, cover: s.cover, resumeId: s.resumeId, name: s.senderName,
  }))
  const [name, setName] = useState(s.senderName)
  const [letter, setLetter] = useState(s.cover)
  const [letterFor, setLetterFor] = useState<number | null>(letterForOf(s))
  const [resumes, setResumes] = useState<ApplyResumeView[]>(s.resumes)
  const [resumeId, setResumeId] = useState<number | null>(s.resumeId)
  const [err, setErr] = useState(ERR_NONE)
  const [busy, setBusy] = useState(false)
  const [writing, setWriting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [input, setInput] = useState<HTMLInputElement | null>(null)
  const tr = useTrial(s)
  const cells: ApplyCells = {
    job: s.job,
    step,
    name,
    letter,
    letterFor,
    resumeId,
    input,
    setStep,
    setLetter,
    setLetterFor,
    setResumes,
    setResumeId,
    setErr,
    setBusy,
    setWriting,
    setUploading,
    onSent: x.onSent,
    trial: tr.cells,
  }
  const quietSave = makeQuietSave({ cells })
  useSaveOnHide(quietSave)

  const badChars = pdfBadCharsOf(letter)
  return {
    t,
    job: s.job,
    step,
    stepIndex: stepIndexOf(step),
    name,
    resumes,
    resumeId,
    letter,
    writing,
    uploading,
    badChars,
    resumeName: resumeNameOf({ resumes, resumeId }),
    coverHref: coverHrefOf(s.job.id),
    coverFile: coverFileOf(s.job.company),
    err,
    busy,
    nextKey: nextKeyOf(step),
    canNext: canNextOf({ step, badChars, letter, writing, uploading }),
    onName: makeNameChange(setName),
    pickOf: makePickOf({ setResumeId, setErr }),
    onInputMount: setInput,
    onAdd: makeAdd(cells),
    onFile: makeFile(cells),
    onLetter: makeLetterChange(setLetter),
    onLetterBlur: quietSave,
    onRewrite: makeRewrite(cells),
    trial: tr.panel,
    onNext: makeNext(cells),
    onBack: makeBack(cells),
  }
}

/**
 * 试用那几格(2026-10-07 批 C):剩几个、本岗用过没有、升级框开没开;交回整机用的格与第 2 步读的面板。
 *
 * @param s 起始态。
 * @returns 格与面板。
 */
function useTrial(s: ApplyStartView): TrialHook {
  const [left, setLeft] = useState<number | null>(s.trialLeft)
  const [here, setHere] = useState(s.trialHere)
  const [upsell, setUpsell] = useState(false)
  return {
    cells: { left, here, setLeft, setHere, setUpsell },
    panel: {
      left,
      locked: isAiOpenOf({ left, here }) === false,
      upsell,
      back: upsellBackOf(s.job.id),
      onUpsell: makeUpsellOpen(setUpsell),
      onUpsellClose: makeUpsellClose(setUpsell),
    },
  }
}

/**
 * 离页时存草稿(审查 #8):pagehide 挂上存草稿的手柄,手柄换了就换挂。
 *
 * @param save 存草稿的手柄。
 * @returns 无。
 */
function useSaveOnHide(save: () => void): void {
  useEffect(function saveOnHide() {
    window.addEventListener(EV_PAGEHIDE, save)
    function off() {
      window.removeEventListener(EV_PAGEHIDE, save)
    }
    return off
  }, [save])
}

/**
 * 草稿里的信是按哪份简历写的(有信就当是按草稿里记的那份写的;没信 = null,进第 2 步现写)。
 *
 * @param s 起始态。
 * @returns 简历 id 或 null。
 */
function letterForOf(s: ApplyStartView): number | null {
  if (s.cover === TEXT_NONE) {
    return null
  }
  return s.resumeId
}

/**
 * 投递区的取数(2026-10-07 投递并进「我的求职」):地址栏里的职位 id → /api/apply/start;没带职位落「不出」。
 *
 * @returns 取词函数、取数状态与起始态。
 */
export function useApplyStart(): ApplyStartPanel {
  const [, , t] = useLang()
  const [load, setLoad] = useState(LOAD_BUSY)
  const [start, setStart] = useState<ApplyStartView | null>(null)
  useEffect(function firstLoad() {
    void loadStart({ jobId: jobIdOf(window.location.search), setLoad, setStart })
  }, [])
  return { t, load, start }
}
