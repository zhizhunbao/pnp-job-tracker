'use client'
/**
 * apply 桶子桶 review 的状态(2026-11-09):打开投递框就自动生成,进度、核对结果、放大、补充与修改。
 *
 * @author Frank
 * @time 2026-11-09 20:00:00
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { track } from '@/lib/track'
import { mailTextOf } from '@/lib/apply'
import { withDescOf } from './cv'
import {
  TRACK_REVIEW,
  BLOCK_NEAREST, NARROW_W, SEL_N_HEAD, SEL_N_TAIL,
  STEP_PLAN, STEP_RESUME, TEXT_NONE,
  NEED_COVER,
  STEP_COVER,
} from './constants'
import {
  drawPdf, filledTextOf, needKeyOf, needRunOf, reloadState, runSteps, saveCoverEdit, saveResumeEdit, sendReview,
} from './functions'
import { loadJdOnly } from './jdonly'
import { saveMailEdit } from './mail'
import type {
  HlRect, Review, ReviewCells, ReviewCv, ReviewFlowIn, ReviewPanel, ReviewPdfIn, ReviewPdfPanel, ReviewReq, SheetSize,
  ToggledIn,
} from './types'

/**
 * 三屏整机。
 *
 * @param x 收发信息。
 * @returns 面板。
 */
// eslint-disable-next-line local/function-length -- 一屏的格一处声明一处交出,拆开要来回传十几个 setter
export function useReview(x: ReviewFlowIn): ReviewPanel {
  const [stage, setStage] = useState(STEP_PLAN)
  const [err, setErr] = useState(TEXT_NONE)
  const [review, setReview] = useState<Review | null>(null)
  const [cover, setCover] = useState(TEXT_NONE)
  const [jd, setJd] = useState(TEXT_NONE)
  const [gen, setGen] = useState(0)
  const [active, setActive] = useState(0)
  const [focus, setFocus] = useState(TEXT_NONE)
  const [fillOpen, setFillOpen] = useState(false)
  const [extra, setExtra] = useState(TEXT_NONE)
  const [saved, setSaved] = useState(TEXT_NONE)
  const [fills, setFills] = useState<Record<string, string>>({})
  const [need, setNeed] = useState<ReviewReq | null>(null)
  const [mail, setMail] = useState(TEXT_NONE)
  const [mailDraft, setMailDraft] = useState<string | null>(null)
  const [cv, setCv] = useState<ReviewCv | null>(null)
  const [cvDraft, setCvDraft] = useState<ReviewCv | null>(null)
  const [cvOpen, setCvOpen] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [opening, setOpening] = useState(true)
  const started = useRef(false)
  function bumpGen(): void {
    setGen(Date.now())
  }
  const c: ReviewCells = {
    jobId: x.jobId,
    setStage,
    setErr,
    setReview,
    setCover,
    setJd,
    setSaved,
    setCv,
    bumpGen,
    setMail,
    onUpsell: x.onUpsell,
    setOpening,
  }
  const cells = useRef(c)
  useEffect(function keepCells() {
    cells.current = c
  })
  useEffect(function firstLoad() {
    if (started.current) {
      return
    }
    started.current = true
    track(TRACK_REVIEW)
    void startReview(cells.current)
  }, [])
  function pickOf(n: number): () => void {
    return function onPick(): void {
      setActive(toggled({ now: active, n }))
    }
  }
  function focusOf(pane: string): () => void {
    return function onFocus(): void {
      if (focus === pane) {
        setFocus(TEXT_NONE)
      } else {
        setFocus(pane)
      }
    }
  }
  function openFill(): void {
    if (review == null) {
      return
    }
    if (extra === TEXT_NONE) {
      setExtra(saved)
    }
    setFillOpen(true)
  }
  function closeFill(): void {
    setFillOpen(false)
  }
  function saveFill(): void {
    if (review == null) {
      return
    }
    const text = filledTextOf({ base: extra, fills, reqs: review.reqs })
    if (text === TEXT_NONE || text === saved) {
      return
    }
    setFillOpen(false)
    setExtra(text)
    setFills({})
    void runSteps({
      c: cells.current, start: { step: STEP_RESUME, extra: text, both: true, regen: false, fill: true, fix: 0 },
    })
  }
  function fillChangeOf(id: number): React.ChangeEventHandler<HTMLTextAreaElement> {
    return function onFillText(e: React.ChangeEvent<HTMLTextAreaElement>): void {
      setFills(Object.assign({}, fills, { [String(id)]: e.target.value }))
    }
  }
  function extraChange(e: React.ChangeEvent<HTMLTextAreaElement>): void {
    setExtra(e.target.value)
  }
  function openCover(): void {
    setErr(TEXT_NONE)
    setEditing(cover)
  }
  function closeCover(): void {
    setEditing(null)
    setNeed(null)
  }
  function saveCover(): void {
    if (editing != null) {
      void saveCoverEdit({ c: cells.current, text: editing, close: closeCover })
    }
  }
  function openCv(): void {
    if (cv == null) {
      return
    }
    if (cvDraft == null) {
      setCvDraft(cv)
    }
    setErr(TEXT_NONE)
    setCvOpen(true)
  }
  function closeCv(): void {
    setCvOpen(false)
    setNeed(null)
  }
  function dropCv(): void {
    setCvOpen(false)
    setCvDraft(null)
    setNeed(null)
  }
  function aiFix(): void {
    if (need == null) {
      return
    }
    let step = STEP_RESUME
    if (needKeyOf(need) === NEED_COVER) {
      step = STEP_COVER
    }
    const start = { step, extra: TEXT_NONE, both: false, regen: true, fill: false, fix: need.id }
    setCvOpen(false)
    setEditing(null)
    setNeed(null)
    void runSteps({ c: cells.current, start })
  }
  function openMail(): void {
    setErr(TEXT_NONE)
    if (mail !== TEXT_NONE) {
      setMailDraft(mail)
      return
    }
    setMailDraft(mailTextOf({ title: x.title, city: x.city, province: x.province, name: x.name, cover: true }))
  }
  function closeMail(): void {
    setMailDraft(null)
  }
  function mailChange(e: React.ChangeEvent<HTMLTextAreaElement>): void {
    setMailDraft(e.target.value)
  }
  function saveMail(): void {
    if (mailDraft != null && mailDraft.trim() !== TEXT_NONE) {
      void saveMailEdit({ jobId: x.jobId, body: mailDraft.trim(), setMail, setErr, close: closeMail })
    }
  }
  function resetMail(): void {
    void saveMailEdit({ jobId: x.jobId, body: null, setMail, setErr, close: closeMail })
  }
  function fixOf(r: ReviewReq): () => void {
    return function onFix(): void {
      if (r.basis === false) {
        openFill()
        return
      }
      setNeed(r)
      if (needKeyOf(r) === NEED_COVER) {
        openCover()
      } else {
        openCv()
      }
    }
  }
  function saveCv(): void {
    if (cvDraft != null && cvDraft !== cv) {
      void saveResumeEdit({ c: cells.current, cv: cvDraft, close: dropCv })
    }
  }
  function cvSummaryChange(e: React.ChangeEvent<HTMLTextAreaElement>): void {
    if (cvDraft != null) {
      setCvDraft({ summary: e.target.value, skills: cvDraft.skills, work: cvDraft.work })
    }
  }
  function cvSkillsChange(e: React.ChangeEvent<HTMLTextAreaElement>): void {
    if (cvDraft != null) {
      setCvDraft({ summary: cvDraft.summary, skills: e.target.value, work: cvDraft.work })
    }
  }
  function cvDescOf(i: number): React.ChangeEventHandler<HTMLTextAreaElement> {
    return function onDesc(e: React.ChangeEvent<HTMLTextAreaElement>): void {
      if (cvDraft != null) {
        setCvDraft(withDescOf({ cv: cvDraft, i, desc: e.target.value }))
      }
    }
  }
  function send(): void {
    void sendReview({ jobId: x.jobId, askName: x.askName, name: x.name, setSending, setErr, onSent: x.onSent })
  }
  function coverChange(e: React.ChangeEvent<HTMLTextAreaElement>): void {
    setEditing(e.target.value)
  }
  return {
    opening,
    stage,
    err,
    review,
    cover,
    jd,
    gen,
    active,
    focus,
    fillOpen,
    extra,
    saved,
    fills,
    fillChangeOf,
    need,
    fixOf,
    onAiFix: aiFix,
    mail,
    mailDraft,
    onMailEdit: openMail,
    onMailText: mailChange,
    onMailSave: saveMail,
    onMailReset: resetMail,
    onMailClose: closeMail,
    editing,
    cv,
    cvDraft,
    cvOpen,
    onResumeEdit: openCv,
    onResumeClose: closeCv,
    onResumeSave: saveCv,
    onCvSummary: cvSummaryChange,
    onCvSkills: cvSkillsChange,
    cvDescOf,
    sending,
    pickOf,
    setActive,
    focusOf,
    onFillOpen: openFill,
    onExtraText: extraChange,
    onFillClose: closeFill,
    onFillSave: saveFill,
    onCoverEdit: openCover,
    onCoverText: coverChange,
    onCoverClose: closeCover,
    onCoverSave: saveCover,
    onSend: send,
  }
}

/**
 * 开框:已经生成过就直接显示,否则从头生成。
 *
 * @param c 落格。
 * @returns 无。
 */
async function startReview(c: ReviewCells): Promise<void> {
  try {
    const d = await reloadState(c)
    if (needRunOf(d)) {
      await runSteps({
        c, start: { step: STEP_PLAN, extra: TEXT_NONE, both: false, regen: false, fill: false, fix: 0 },
      })
    } else {
      c.setStage(TEXT_NONE)
    }
  } catch {
    await runSteps({ c, start: { step: STEP_PLAN, extra: TEXT_NONE, both: false, regen: false, fill: false, fix: 0 } })
  }
  c.setOpening(false)
}

/**
 * 点同一条取消选中。
 *
 * @param y 现值与点的那条。
 * @returns 新值。
 */
function toggled(y: ToggledIn): number {
  if (y.now === y.n) {
    return 0
  }
  return y.n
}

/**
 * 画一份 PDF 的状态。
 *
 * @param x 地址、引文、放大了吗与选中项。
 * @returns 容器挂载口、高亮块、尺寸与失败。
 */
export function useReviewPdf(x: ReviewPdfIn): ReviewPdfPanel {
  const box = useRef<HTMLDivElement>(null)
  const [rects, setRects] = useState<HlRect[]>([])
  const [size, setSize] = useState<SheetSize>({ w: 0, h: 0, left: 0, top: 0, fit: 0 })
  const [failed, setFailed] = useState(false)
  const key = useMemo(function quoteKey(): string {
    return JSON.stringify(x.quotes)
  }, [x.quotes])
  useEffect(function draw() {
    if (box.current == null) {
      return
    }
    let dead = false
    function alive(): boolean {
      return dead === false
    }
    setFailed(false)
    void drawPdf({
      url: x.url,
      host: box.current,
      quotes: x.quotes,
      zoomed: x.zoomed,
      setRects,
      setSize,
      setFailed,
      alive,
    })
    return function stop(): void {
      dead = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 引文按内容比,数组身份每次渲染都变
  }, [x.url, key, x.zoomed])
  useEffect(function jump() {
    if (x.active === 0 || box.current == null || window.innerWidth <= NARROW_W) {
      return
    }
    const hit = box.current.querySelector(SEL_N_HEAD + String(x.active) + SEL_N_TAIL)
    if (hit != null) {
      hit.scrollIntoView({ block: BLOCK_NEAREST })
    }
  }, [x.active, rects])
  return { box, rects, size, failed }
}

/**
 * 只取职位描述(三栏外框不带核对时右栏用;2026-11-11 基础简历投递屏并进三栏外框)。
 *
 * @param jobId 职位 id。
 * @returns 职位描述;没取到是空串。
 */
export function useJdOnly(jobId: number): string {
  const [jd, setJd] = useState(TEXT_NONE)
  useEffect(function loadJd() {
    void loadJdOnly({ jobId, setJd })
  }, [jobId])
  return jd
}
