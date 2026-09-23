'use client'
/**
 * profile 域的状态机器:useProfileForm 一台管整份档案表单(七格表单值 + 职业搜索
 * 兜底 + 保存落地态)。2026-08-27 Frank 拍板自 account 域拆出(hooks 抽屉形制同
 * account 的 useAccountPage:体内只剩 useState、具名 effect 壳与工厂装配)。
 * 2026-09-23 账户页撤移民档案节(Frank「只保留一个 我的简历 我的收藏 我的求职」),档案表单
 * ProfileForm 删文件,它的整机 useProfileForm 随之删除;本抽屉只剩首访向导与简历预填两台。
 *
 * @author Frank
 * @time 2026-08-27 23:30:00
 */
import { useEffect, useState } from 'react'
import { RESUME_IDLE } from './constants'
import {
  makeFileOpen, makeLoadUserId, makeOnboardingFinish, makeResumePick,
  makeResumeUpload, makeStepBack, makeStepNext, obCurrentStepOf, obStepsOf, profileSeedOf,
} from './functions'
import type {
  NocCandidate, OnboardingHookIn, OnboardingPanel,
  ResumeHookIn, ResumePanel, ResumeState,
} from './types'

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
