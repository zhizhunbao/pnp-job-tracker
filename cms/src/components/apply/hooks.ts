'use client'
/**
 * 投递区的整机状态:当前步、英文姓名、选用的简历与清单、信(按哪份简历写的)、写信 / 上传 / 存发在途、错误;
 * 离页时存草稿(审查 #8)。另一台 useApplyStart 管投递区的取数。
 * 2026-10-07 二改:信由模型按 JD 每岗写一封(进第 2 步现写,可「按职位重写」),第 1 步按岗点选简历、就地添加。
 * 2026-10-10 投递框三步:页签、求职信单选(写过的信进来就拉)+ 旁边预览、上传求职信、按职位改写只给 Pro(对照框)、
 * 「确认」页;试用那台 useTrial 与「这封信按哪份简历写的」一格撤。
 * 同日 Frank「两处都改吧」:不再拉写过的信(past 一格与 loadLetters 撤),单选项只剩这一岗的、本次上传 / 改写的与不附。
 *
 * @author Frank
 * @time 2026-10-07 03:00:00
 */
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useLang } from '@/components/i18n'
import { storedTitleOf, titleSubOf, useTitleTrans } from '@/components/jobtitle'
import { isSenderName, pdfBadCharsOf } from '@/lib/apply'
import {
  ERR_NONE, EV_APPLY_NAV, EV_APPLY_OPEN, EV_APPLY_SENT, EV_PAGEHIDE, EV_POPSTATE, LOAD_BUSY, TEXT_NONE,
} from './constants'
import {
  canNextOf, closeApply, loadStart, mailOf, makeAdd, makeAuthRetry, makeBack, makeFile, makeNameChange, makeNext,
  makeOpenOf, makePickOf, makePreviewClose, makeQuietSave, makeSetTo, makeTab, nextKeyOf, noteOpened, openFromEvent,
  readApplyId, resumeHrefOf, resumeMimeOf, resumeNameOf, sentOfEvent, startStepOf, titledOf, upsellBackOf,
} from './functions'
import {
  draftOptsOf, firstPickOf, makeLetterChange, makeLetterPickOf, makeLetterRewrite, makeResumeRewrite,
  makeRwUse, OPT_NONE_ITEM,
} from './letter'
import type {
  ApplyCells, ApplyHostPanel, ApplyPageIn, ApplyPanel, ApplyResumeView, ApplyStartPanel, ApplyStartView,
  CheckPreviewHook, LetterOpt, MaybeCheckPreview, MaybeRewrite, SentFn,
} from './types'

/**
 * 投递区整机。
 *
 * @param x 起始态与发出后的回调。
 * @returns 面板(各件只读它)。
 */
// eslint-disable-next-line local/function-length -- 整机的格一处声明一处交出(三步共用一份落格),拆开就要在几个钩子间来回传 setter
export function useApply(x: ApplyPageIn): ApplyPanel {
  const s = x.start
  const [, , t] = useLang()
  const [step, setStep] = useState(startStepOf(s.status))
  const [reached, setReached] = useState(0)
  const [name, setName] = useState(s.senderName)
  const [askName] = useState(isSenderName(s.senderName) === false)
  const [letter, setLetter] = useState(s.cover)
  const [mine, setMine] = useState<LetterOpt[]>(draftOptsOf(s))
  const [pick, setPick] = useState(firstPickOf(s.cover))
  const [editing, setEditing] = useState(false)
  const [resumes, setResumes] = useState<ApplyResumeView[]>(s.resumes)
  const [resumeId, setResumeId] = useState<number | null>(s.resumeId)
  const [err, setErr] = useState(ERR_NONE)
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [letterBusy, setLetterBusy] = useState(false)
  const [input, setInput] = useState<HTMLInputElement | null>(null)
  const [letterInput, setLetterInput] = useState<HTMLInputElement | null>(null)
  const [upsell, setUpsell] = useState(false)
  const [soon, setSoon] = useState(false)
  const [rw, setRw] = useState<MaybeRewrite>(null)
  const cells: ApplyCells = {
    job: s.job,
    pro: s.pro,
    step,
    reached,
    name,
    askName,
    letter,
    pick,
    mine,
    resumeId,
    rw,
    input,
    letterInput,
    setStep,
    setReached,
    setLetter,
    setPick,
    setMine,
    setEditing,
    setResumes,
    setResumeId,
    setErr,
    setBusy,
    setUploading,
    setLetterBusy,
    setUpsell,
    setSoon,
    setRw,
    onSent: x.onSent,
  }
  const quietSave = makeQuietSave({ cells })
  useSaveOnHide(quietSave)

  const badChars = pdfBadCharsOf(letter)
  const chosen = { resumes, resumeId }
  return {
    t,
    job: s.job,
    step,
    reached,
    name,
    askName,
    replyTo: s.replyTo,
    resumes,
    resumeId,
    resumeSrc: resumeHrefOf(resumeId),
    resumeMime: resumeMimeOf(chosen),
    resumeName: resumeNameOf(chosen),
    opts: mine,
    noneOpt: OPT_NONE_ITEM,
    pick,
    letter,
    editing,
    badChars,
    uploading,
    letterBusy,
    soon,
    upsell,
    back: upsellBackOf(s.job.id),
    rw,
    mail: mailOf({ job: s.job, name, letter }),
    err,
    busy,
    nextKey: nextKeyOf(step),
    canNext: canNextOf({ step, badChars, letter, uploading, letterBusy }),
    onTab: makeTab(cells),
    onName: makeNameChange(setName),
    pickOf: makePickOf({ setResumeId, setErr }),
    onInputMount: setInput,
    onAdd: makeAdd(input),
    onFile: makeFile({ cells, letter: false }),
    onLetterInputMount: setLetterInput,
    onLetterAdd: makeAdd(letterInput),
    onLetterFile: makeFile({ cells, letter: true }),
    letterPickOf: makeLetterPickOf(cells),
    onEdit: makeSetTo({ set: setEditing, v: true }),
    onLetter: makeLetterChange(cells),
    onLetterBlur: quietSave,
    onLetterRewrite: makeLetterRewrite(cells),
    onResumeRewrite: makeResumeRewrite(cells),
    onUpsellClose: makeSetTo({ set: setUpsell, v: false }),
    onRwAgain: makeLetterRewrite(cells),
    onRwUse: makeRwUse(cells),
    onRwClose: makeSetTo<MaybeRewrite>({ set: setRw, v: null }),
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
