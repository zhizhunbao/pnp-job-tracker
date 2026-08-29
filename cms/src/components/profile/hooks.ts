'use client'
/**
 * profile 域的状态机器:useProfileForm 一台管整份档案表单(七格表单值 + 职业搜索
 * 兜底 + 保存落地态)。2026-08-27 Frank 拍板自 account 域拆出(hooks 抽屉形制同
 * account 的 useAccountPage:体内只剩 useState、具名 effect 壳与工厂装配)。
 *
 * @author Frank
 * @time 2026-08-27 23:30:00
 */
import { useEffect, useState } from 'react'
import { RESUME_IDLE, TEXT_NONE } from './constants'
import {
  makeAddTyped, makeFileOpen, makeLoadNocOpts, makeLoadUserId, makeNocAdder, makeOnboardingFinish, makeResumePick,
  makeResumeUpload, makeSaveProfile, makeStepBack, makeStepNext, nocHitsOf, obCurrentStepOf, obStepsOf, profileSeedOf,
} from './functions'
import type {
  NocCandidate, NocOpt, OnboardingHookIn, OnboardingPanel, ProfileHookIn, ProfilePanel, ProfileSaveState,
  ResumeHookIn, ResumePanel, ResumeState,
} from './types'

/**
 * 档案表单整机(E5-00 §3.2):七格表单值 + 职业搜索兜底 + 保存落地态。
 * 初值 = 返回用户已填的精确值(不点不覆盖);职业选项全集挂载时拉一次;
 * 命中清单是纯派生,每渲染现算(397 行线性扫,不值得上 memo)。
 *
 * @param x 登录人 id、档案初值与存成回调。
 * @returns 档案表单的整块面板:状态 + 手柄。
 */
export function useProfileForm(x: ProfileHookIn): ProfilePanel {
  const seed = profileSeedOf({ initial: x.initial })
  const [status, setStatus] = useState<string>(seed.status)
  const [nocs, setNocs] = useState<string[]>(seed.nocs)
  const [clb, setClb] = useState<number | null>(seed.clb)
  const [crs, setCrs] = useState<number | null>(seed.crs)
  const [crsCalc, setCrsCalc] = useState<boolean>(seed.crsCalc)
  const [provs, setProvs] = useState<string[]>(seed.provs)
  const [pgwp, setPgwp] = useState<number | null>(seed.pgwp)
  const [q, setQ] = useState<string>(TEXT_NONE)
  const [opts, setOpts] = useState<NocOpt[]>([])
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState<ProfileSaveState>(TEXT_NONE)

  useEffect(function loadNocs() {
    makeLoadNocOpts({ setOpts })()
  }, [])

  const hits = nocHitsOf({ q, opts, nocs })
  const addNoc = makeNocAdder({ nocs, setNocs, setQ })

  return {
    status,
    setStatus,
    nocs,
    setNocs,
    clb,
    setClb,
    crs,
    setCrs,
    crsCalc,
    setCrsCalc,
    provs,
    setProvs,
    pgwp,
    setPgwp,
    q,
    setQ,
    opts,
    hits,
    busy,
    saved,
    onAddTyped: makeAddTyped({ q, hits, addNoc }),
    onSave: makeSaveProfile({
      userId: x.userId,
      status,
      nocs,
      clb,
      crs,
      crsCalc,
      provs,
      pgwp,
      setBusy,
      setSaved,
      onSaved: x.onSaved,
    }),
  }
}

/**
 * 首访引导向导整机(E11-05 ②):六格档案值 + 走到第几步 + 简历预填 + 存档忙态。
 * 初值与档案表单同一把尺子(profileSeedOf:返回用户已填的精确值不点不覆盖);
 * 走哪几步由分型现算(选完分型当场变长,进度条跟着动);登录人挂载时拉一次。
 *
 * @param x 档案初值与投递流回调。
 * @returns 向导的整块面板:状态 + 手柄。
 */
export function useOnboardingWizard(x: OnboardingHookIn): OnboardingPanel {
  const seed = profileSeedOf({ initial: x.initial })
  const [uid, setUid] = useState<string | number | null>(null)
  const [status, setStatus] = useState<string>(seed.status)
  const [nocs, setNocs] = useState<string[]>(seed.nocs)
  const [clb, setClb] = useState<number | null>(seed.clb)
  const [crs, setCrs] = useState<number | null>(seed.crs)
  const [crsCalc, setCrsCalc] = useState<boolean>(seed.crsCalc)
  const [provs, setProvs] = useState<string[]>(seed.provs)
  const [pgwp, setPgwp] = useState<number | null>(seed.pgwp)
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const resume = useResumePrefill({ setNocs, setClb })

  useEffect(function loadUid() {
    makeLoadUserId({ setUid })()
  }, [])

  const steps = obStepsOf({ status })
  const total = steps.length
  const isLast = step >= total - 1
  const finish = makeOnboardingFinish({
    userId: uid,
    status,
    nocs,
    clb,
    crs,
    crsCalc,
    provs,
    pgwp,
    setSaving,
    onFinished: x.onFinished,
  })

  return {
    status,
    setStatus,
    nocs,
    setNocs,
    clb,
    setClb,
    crs,
    setCrs,
    crsCalc,
    setCrsCalc,
    provs,
    setProvs,
    pgwp,
    setPgwp,
    step,
    total,
    cur: obCurrentStepOf({ steps, step }),
    isLast,
    saving,
    apply: x.onFinished != null,
    resume,
    onNext: makeStepNext({ isLast, step, total, setStep, finish }),
    onBack: makeStepBack({ step, setStep }),
  }
}

/**
 * 简历预填那一块(E11-07):解析态 + 这次识别出的职业候选 + 藏起来的文件框。
 * 解析结果要落进向导的档案值(预选职业、预选英语水平),所以那两个落格由调用方给 ——
 * 这一块自己不持有档案,它只产建议。
 *
 * @param x 已选职业与英语水平两个落格。
 * @returns 简历预填的整块面板。
 */
export function useResumePrefill(x: ResumeHookIn): ResumePanel {
  const [fileEl, setFileEl] = useState<HTMLInputElement | null>(null)
  const [state, setState] = useState<ResumeState>(RESUME_IDLE)
  const [candidates, setCandidates] = useState<NocCandidate[]>([])
  const onUpload = makeResumeUpload({ setState, setCandidates, setNocs: x.setNocs, setClb: x.setClb })

  return {
    state,
    candidates,
    onFileMount: setFileEl,
    onPick: makeResumePick({ onUpload }),
    onOpen: makeFileOpen({ el: fileEl }),
  }
}
