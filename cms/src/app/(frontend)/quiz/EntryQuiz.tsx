'use client'
// 三问的**答案层**(组件本体已于 2026-07-31 退役 —— Frank「不需要弹框答题了,统一一下答题功能」:
// 四选一的题归 /plan/* 的 SurveyJS 答题器,选职业归 quiz/OccPicker,弹框问卷不再存在)。
// 这里只剩三样还有人用的东西:读答案(readQuiz)、注册后落档(quizToProfile)、职业名砍尾(shortOcc)。
import { OB_SEEN_KEY } from '../jobs/OnboardingWizard'
import { ANSWERS_KEY, answeredBasics, readAnswers, toEngineAnswers, type Answers } from '@/lib/answers'

// 记忆键收敛到 lib/answers 一个 key(2026-07-31 统一题库):三问与拿 PR 的答案同住一份,
// 处境与目标省不再各存一份。本文件不再直接碰 localStorage,读写都过门面。
export const QUIZ_KEY = ANSWERS_KEY       // 兼容导出:JobsTable 仍按名引它做「答过没有」的判定

export type QuizAnswers = { status: string; nocs: string[]; provs: string[] }
export type QuizFacts = {
  noc: string; teer: number | null; title: string
  titleZh: string
  open: number; eligible: number; named: number
  streams: { stream: string; n: number }[]
  byProv: { province: string; n: number; eligible: number }[]
  medianSalary: number | null
}

// 语义不变:从没答过 → null(职位板据此决定弹不弹)。三问只关心三个字段,档位字段留给答题器。
export function readQuiz(): (QuizAnswers & { done?: boolean }) | null {
  const a = readAnswers()
  if (!answeredBasics(a)) return null
  return { status: a.status, nocs: a.nocs, provs: a.provs, ...(a.done ? { done: true } : {}) }
}

// 三问答案 → 档案落库(注册成功后由宿主调;原内联在 JobsTable,2026-07-30 随组件提级抽到这——
// jobs 与 /start 两个宿主同一份落库逻辑,不复制)。
// #107 同类保险丝(空白覆盖真档案):三问只管三个字段,**先读回既有档案再合并**,
// 语言分/CRS/PGWP 这些三问没问的一律原样带回,不能被整组 PATCH 抹掉。
export async function quizToProfile(a: QuizAnswers): Promise<void> {
  try {
    const me = await fetch('/api/users/me', { credentials: 'include' }).then((r) => r.json()).catch(() => null)
    const uid = me?.user?.id
    if (!uid) return
    const old = me?.user?.profile || {}
    await fetch(`/api/users/${uid}`, {
      method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile: {
        ...old,
        currentStatus: a.status || old.currentStatus || null,
        nocCodes: a.nocs.length ? a.nocs : (old.nocCodes || []),
        targetProvinces: a.provs.length ? a.provs : (old.targetProvinces || []),
        // 语言档一起落(08-10 决策页答题=唯一采集面):判定核个人条件读的是 profile.clb,
        // 不落档答了也白答;档位→CLB 值走字段库 toAnswer(单一来源),没答不覆盖旧值
        clb: (typeof (a as { clbBand?: number }).clbBand === 'number' && (a as { clbBand?: number }).clbBand!
          ? (toEngineAnswers({ ...readAnswers(), ...a } as Answers).clb as number | undefined) ?? old.clb ?? null
          : old.clb ?? null),
        profileUpdatedAt: new Date().toISOString(),
      } }),
    })
    try { localStorage.setItem(OB_SEEN_KEY, '1') } catch { /* ignore */ }   // 已经问过三题,别再弹建档向导
  } catch { /* 落库失败不卡用户:答案还在 localStorage */ }
}

// NOC 官方职业名是**分类名**不是岗位名,天生很长(「食品柜台服务员、厨房助手及相关辅助职业」)。
// Frank 2026-07-27「很多职业名字是不是太长了啊」:选职业的人只需要认出**头一个**是不是自己那行,
// 后面的「及相关职业」是分类学尾巴 → 显示层砍尾 + 取第一段;全名仍挂 title,不丢信息。
// 只在「、」「及」处切(不切「和」——中文译名里「汽车服务技师卡车和公共汽车机械师」切了会更怪)。
export const shortOcc = (name: string): string => {   // landing 行情卡同用这把刀(2026-07-30 v2)
  let s = (name || '').replace(/[、,]?\s*(?:及|和)?其?(?:他)?相关[^、,]*(?:职业|工作)$/, '').trim()
  s = s.split(/[、,]/)[0].trim()
  s = s.split(/及/)[0].trim()
  return s || name
}
