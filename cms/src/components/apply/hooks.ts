'use client'
/**
 * 投递区的整机状态:当前步、英文姓名、选用的简历与清单、信(按哪份简历写的)、写信 / 上传 / 存发在途、错误;
 * 离页时存草稿(审查 #8)。另一台 useApplyStart 管投递区的取数。
 * 2026-10-07 二改:信由模型按 JD 每岗写一封(进第 2 步现写,可「按职位重写」),第 1 步按岗点选简历、就地添加。
 *
 * @author Frank
 * @time 2026-10-07 03:00:00
 */
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useLang } from '@/components/i18n'
import { storedTitleOf, titleSubOf, useTitleTrans } from '@/components/jobtitle'
import { pdfBadCharsOf } from '@/lib/apply'
import {
  ERR_NONE, EV_APPLY_NAV, EV_APPLY_OPEN, EV_APPLY_SENT, EV_PAGEHIDE, EV_POPSTATE, LOAD_BUSY, TEXT_NONE,
} from './constants'
import {
  applyCheckOf, canNextOf, closeApply, isAiOpenOf, loadStart, makeAdd, makeAuthRetry, makeBack, makeFile,
  makeLetterChange, makeNameChange, makeNext, makeOpenOf, makePickOf, makePreviewClose, makeQuietSave, makeRewrite,
  makeUpsellClose, makeUpsellOpen, nextKeyOf, noteOpened, openFromEvent, readApplyId, sentOfEvent, startStepOf,
  stepIndexOf, titledOf, upsellBackOf,
} from './functions'
import type {
  ApplyCells, ApplyHostPanel, ApplyPageIn, ApplyPanel, ApplyResumeView, ApplyStartPanel, ApplyStartView,
  CheckPreviewHook, MaybeCheckPreview, SentFn, TrialHook,
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
  const pv = useCheckPreview()
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
    check: applyCheckOf({ job: s.job, resumes, resumeId, name, letter, pv, setResumeId, setErr, cells }),
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
 * 逐项检查的弹框预览三格(2026-10-08 Frank「这两个应该都是可以弹框,并且可以替换吧」):正在预览的那一份、按行开、关。
 * 投递区与今日待投都用它(今日待投从桶门取)。
 *
 * @returns 三格。
 */
export function useCheckPreview(): CheckPreviewHook {
  const [preview, setPreview] = useState<MaybeCheckPreview>(null)
  return { preview, openOf: makeOpenOf(setPreview), onPreviewClose: makePreviewClose(setPreview) }
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
 * 2026-10-09 A 批投递搬进弹框:关框(卸载)也存一次 —— 关框不离页,pagehide 不响;存的是最后一版手柄
 * (发出后已切到已投递一步,手柄自己判不是半路就不存)。
 *
 * @param save 存草稿的手柄。
 * @returns 无。
 */
function useSaveOnHide(save: () => void): void {
  const latest = useRef(save)
  useEffect(function keepLatest() {
    latest.current = save
  }, [save])
  useEffect(function saveOnHide() {
    window.addEventListener(EV_PAGEHIDE, save)
    function off() {
      window.removeEventListener(EV_PAGEHIDE, save)
    }
    return off
  }, [save])
  useEffect(function saveOnUnmount() {
    function last() {
      latest.current()
    }
    return last
  }, [])
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
 * 2026-10-09 A 批:职位 id 由投递框宿主读好传进来(换岗时宿主按 id 重挂整框,这里只取一次)。
 * 同日 Frank「这个地方英文,中文灰字 没有啊」:顺带按 jobtitle 桶全站口径算职位名的灰字(库里存好的 → 当场按岗现翻,
 * 与职位页标题下那行同一台 useTitleTrans),标题栏与「职位信息」那一行共用。
 * 同日 A 批测试实撞:没登录(会话过期 / 邮件深链)取数回 401 落 auth,框上叠登录框;登录完换一代重取并软刷顶栏。
 *
 * @param jobId 职位 id。
 * @returns 取词函数、取数状态与起始态。
 */
export function useApplyStart(jobId: number): ApplyStartPanel {
  const [lang, , t] = useLang()
  const [load, setLoad] = useState(LOAD_BUSY)
  const [start, setStart] = useState<ApplyStartView | null>(null)
  const [gen, setGen] = useState(0)
  const router = useRouter()
  useEffect(function firstLoad() {
    void loadStart({ jobId, setLoad, setStart })
  }, [jobId, gen])
  const row = titledOf(start)
  const lazy = useTitleTrans({ title: row.title, id: jobId, lang, cached: storedTitleOf({ row, lang }), gen: 0 })
  const onAuthDone = makeAuthRetry({ gen, setGen, setLoad, refresh: router.refresh })
  return { t, lang, load, start, titleSub: titleSubOf({ row, lang, lazy, noc: TEXT_NONE }), onAuthDone }
}

/**
 * 投递框宿主(2026-10-09 A 批,挂在全站骨架上):地址栏带 `?apply=<id>` 就弹框。三条路都会改地址栏:本站 openApply
 * (pushState,不导航)、站内链接(Next 软导航,如求职信卡「继续」)、浏览器前进后退(手机返回键关框)——
 * 盯 Next 的路径与查询串,外加本站开关框事件与 popstate 兜底,任一变了就重读。
 * 宿主活着时框从无到有 = 有人往历史里推了一笔(openApply 或站内链接),记账,关框时退回去;刚挂上就带着 = 深链,不记。
 * 另听职位桶广播的「要投这一岗」,收到就开框(职位桶取不了本桶的 openApply,见 EV_APPLY_OPEN)。
 *
 * @returns 要投的职位 id 与关框手柄。
 */
export function useApplyHost(): ApplyHostPanel {
  const path = usePathname()
  const query = useSearchParams().toString()
  const [jobId, setJobId] = useState<number | null>(null)
  const prev = useRef<number | null>(null)
  const first = useRef(true)
  useEffect(function watchApply() {
    function sync() {
      const id = readApplyId()
      noteOpened({ first: first.current, prev: prev.current, id })
      first.current = false
      prev.current = id
      setJobId(id)
    }
    sync()
    window.addEventListener(EV_APPLY_NAV, sync)
    window.addEventListener(EV_POPSTATE, sync)
    function off() {
      window.removeEventListener(EV_APPLY_NAV, sync)
      window.removeEventListener(EV_POPSTATE, sync)
    }
    return off
  }, [path, query])
  useEffect(function listenOpen() {
    window.addEventListener(EV_APPLY_OPEN, openFromEvent)
    function off() {
      window.removeEventListener(EV_APPLY_OPEN, openFromEvent)
    }
    return off
  }, [])
  return { jobId, onClose: closeApply }
}

/**
 * 听「投递发出去了」(2026-10-09 A 批:投递框挂在全站骨架上,「我的」页拿它刷新投递表、写成功条)。
 *
 * @param fn 收到后的回调。
 * @returns 无。
 */
export function useApplySent(fn: SentFn): void {
  useEffect(function listenSent() {
    function onSent(e: Event) {
      fn(sentOfEvent(e))
    }
    window.addEventListener(EV_APPLY_SENT, onSent)
    function off() {
      window.removeEventListener(EV_APPLY_SENT, onSent)
    }
    return off
  }, [fn])
}
