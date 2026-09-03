'use client'
/**
 * pte 域的状态机器:题单(usePteBoard:显示更多 + 练过集)、
 * 答题(usePteAnswer:准备 → 作答 → 对照三段,倒计时 / 秒表 / 朗读 / 录音)、
 * 评论(usePteComments:「考过」钮与留言表单)。
 * 体内只有 useState、具名 effect 壳与工厂装配;步骤与口径注释全在 ./functions 的 make* 工厂里
 * (hooks 抽屉的形制照样张 companies/hooks.ts)。
 *
 * @author Frank
 * @time 2026-09-03 12:00:00
 */
import { useEffect, useState, useSyncExternalStore } from 'react'
import {
  DICT_IDLE, KIND_EXAM, KIND_NOTE, PAGE_STEP, PHASE_ANSWERING, PHASE_READY, STATE_IDLE, T_WFD, TEXT_NONE,
} from './constants'
import {
  commentsOfKind, doneServerSnapshotOf, doneSnapshotOf, makeCanPlaySnapshot, makeCountdown, makeDictClose,
  makeDictLookup, makeDoneSync, makeExamSubmit, makeMore, makeNoteSubmit, makePhaseSet, makePlay,
  makeRedo, makeSelectionWatch, makeStartRec, makeSubmit, makeTextChange, makeTicker, makeToggle,
  prepSecOf, recCapOf, seenCountOf, serverFalseOf, subscribeDone, subscribeNone,
} from './functions'
import type {
  DictEntry, DictPos, DictState, DoneSyncIn, PostState, PteAnswerHookIn, PteAnswerPanel, PteBoardHookIn,
  PteBoardPanel, PteComment, PteCommentsHookIn, PteCommentsPanel, PteDictPanel, PteHomePanel, PtePhase,
  RecorderHandle,
} from './types'

/**
 * 题单整机:前 N 条显示、练过集(首帧空集,挂载后从 localStorage 读 —— SSR 没有它)。
 *
 * @param x 这一型的全部题。
 * @returns 面板。
 */
export function usePteBoard(x: PteBoardHookIn): PteBoardPanel {
  const [shown, setShown] = useState(PAGE_STEP)
  const done = useSyncExternalStore(subscribeDone, doneSnapshotOf, doneServerSnapshotOf)

  useEffect(function syncDone() {
    return makeDoneSync({ loggedIn: x.loggedIn })()
  }, [x.loggedIn])

  const shownRows = x.rows.slice(0, shown)
  return {
    done,
    shown: shownRows,
    rest: x.rows.length - shownRows.length,
    onMore: makeMore({ shown, setShown }),
  }
}

/**
 * 答题整机(三段一条线):RA 从准备倒计时起,倒完或跳过进作答并起录音;听力三型从准备段的
 * 播放钮起,播完进作答(WFD 打字 / RS·ASQ 录音);提交进对照并记练过。秒表到上限自动提交。
 *
 * @param x 题与题型。
 * @returns 面板。
 */
export function usePteAnswer(x: PteAnswerHookIn): PteAnswerPanel {
  const prepS = prepSecOf({ type: x.q.type })
  const cap = recCapOf({ type: x.q.type })
  const wfd = x.q.type === T_WFD
  const [phase, setPhase] = useState<PtePhase>(PHASE_READY)
  const [prepLeft, setPrepLeft] = useState(prepS)
  const [elapsed, setElapsed] = useState(0)
  const [playing, setPlaying] = useState(false)
  const canPlay = useSyncExternalStore(subscribeNone, makeCanPlaySnapshot({ audioUrl: x.q.audioUrl }), serverFalseOf)
  const [textShown, setTextShown] = useState(false)
  const [typed, setTyped] = useState(TEXT_NONE)
  const [recording, setRecording] = useState(false)
  const [recUrl, setRecUrl] = useState<string | null>(null)
  const [micDenied, setMicDenied] = useState(false)
  const [rec, setRec] = useState<RecorderHandle | null>(null)

  const onSubmit = makeSubmit({ qid: x.q.qid, loggedIn: x.loggedIn, rec, setRecUrl, setRecording, setRec, setPhase })
  const toAnswering = makePhaseSet({ setPhase, phase: PHASE_ANSWERING })

  useEffect(function countdown() {
    return makeCountdown({
      active: phase === PHASE_READY && prepS > 0, value: prepLeft, set: setPrepLeft, cap: 0, onCap: toAnswering,
    })()
  }, [prepLeft, phase, prepS, toAnswering])

  useEffect(function ticker() {
    return makeTicker({ active: phase === PHASE_ANSWERING, value: elapsed, set: setElapsed, cap, onCap: onSubmit })()
  }, [elapsed, phase, cap, onSubmit])

  useEffect(function startRec() {
    return makeStartRec({
      should: phase === PHASE_ANSWERING && wfd === false && rec == null && micDenied === false,
      setRec,
      setRecording,
      setMicDenied,
    })()
  }, [phase, wfd, rec, micDenied])

  return {
    phase,
    prepLeft,
    elapsed,
    playing,
    canPlay,
    textShown,
    typed,
    recording,
    recSeconds: elapsed,
    recUrl,
    micDenied,
    onPlay: makePlay({ q: x.q, audioType: x.type.audio, phase, setPlaying, setPhase }),
    onSkipPrep: toAnswering,
    onShowText: makeToggle({ on: textShown, set: setTextShown }),
    onTyped: makeTextChange({ set: setTyped }),
    onStopRec: onSubmit,
    onSubmit,
    onRedo: makeRedo({
      setPhase, setRec, setMicDenied, setTyped, setRecUrl, setElapsed, setTextShown, setPrepLeft, prepS,
    }),
  }
}

/**
 * 评论整机:考试记录(一颗「考过」钮,点了记今天、当场并入)与留言栏(发出去待审)。
 *
 * @param x 题键与 SSR 带下的评论。
 * @returns 面板。
 */
export function usePteComments(x: PteCommentsHookIn): PteCommentsPanel {
  const [exams, setExams] = useState<PteComment[]>(commentsOfKind({ comments: x.comments, kind: KIND_EXAM }))
  const seenN = seenCountOf({ times: x.times, comments: x.comments, exams })
  const [examState, setExamState] = useState<PostState>(STATE_IDLE)
  const [noteOpen, setNoteOpen] = useState(false)
  const [note, setNote] = useState(TEXT_NONE)
  const [noteState, setNoteState] = useState<PostState>(STATE_IDLE)

  return {
    exams,
    seenN,
    notes: commentsOfKind({ comments: x.comments, kind: KIND_NOTE }),
    examState,
    noteOpen,
    note,
    noteState,
    onNoteOpen: makeToggle({ on: noteOpen, set: setNoteOpen }),
    onExamSubmit: makeExamSubmit({ qid: x.qid, state: examState, setState: setExamState, exams, setExams }),
    onNote: makeTextChange({ set: setNote }),
    onNoteSubmit: makeNoteSubmit({ qid: x.qid, note, state: noteState, setState: setNoteState, setNote }),
  }
}

/**
 * 查词整机(Frank 2026-09-03「选中单词应该有字典功能」):页上选中一个英文单词 → 弹层给音标与释义;
 * 选区没了弹层就关。接口是 Free Dictionary API,结果按词缓存。
 *
 * @returns 面板。
 */
export function usePteDict(): PteDictPanel {
  const [word, setWord] = useState(TEXT_NONE)
  const [pos, setPos] = useState<DictPos>({ x: 0, y: 0 })
  const [state, setState] = useState<DictState>(DICT_IDLE)
  const [entry, setEntry] = useState<DictEntry | null>(null)

  useEffect(function watchSelection() {
    return makeSelectionWatch({ setWord, setPos })()
  }, [])

  useEffect(function lookup() {
    return makeDictLookup({ word, setState, setEntry })()
  }, [word])

  return { state, word, entry, pos, onClose: makeDictClose({ setWord }) }
}

/**
 * 门厅整机:练过题数(本机练过集;登录挂载后与库并集)。
 *
 * @param x 登录态。
 * @returns 面板。
 */
export function usePteHome(x: DoneSyncIn): PteHomePanel {
  const done = useSyncExternalStore(subscribeDone, doneSnapshotOf, doneServerSnapshotOf)

  useEffect(function syncDone() {
    return makeDoneSync({ loggedIn: x.loggedIn })()
  }, [x.loggedIn])

  return { doneN: done.size }
}
