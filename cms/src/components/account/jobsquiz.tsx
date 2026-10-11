'use client'
/**
 * 「进我的求职先弹五题」(2026-10-11 Frank「一共没几个问题啊 都问不行吗」):登录的人进「我的」页「我的求职」,
 * 档案「求职」卡五样(目标 / 专业 / 想做的工作 / 所在地 / 英文姓名)有空着的,自动弹档案页「修改」同一个弹框
 * (gate 桶 GateEdit 的 missing 弹法,不另做一套问卷):只问空着的那几题、按原序、每题可跳、可关。
 * 一人只自动弹一次(弹出那一刻记进答案档,换设备不再弹);关了(保存或 ×)交还页面门,今日推荐按新答案现算重拉。
 * 整机在 hooks 的 useJobsQuiz;不弹时什么都不画。
 *
 * @author Frank
 * @time 2026-10-11 01:11:17
 */
import { GateEdit } from '@/components/gate'
import { profileSeedOf } from './functions'
import { useJobsQuiz } from './hooks'
import type { JobsQuizIn } from './types'

/**
 * 五题弹框。
 *
 * @param props 取词函数与关了之后的交还口。
 * @returns 弹框;不弹 null。
 */
export function JobsQuiz({ t, onDone }: JobsQuizIn) {
  const q = useJobsQuiz({ onDone })
  if (q.open === false || q.view == null) {
    return null
  }
  return <GateEdit t={t} seed={profileSeedOf(q.view)} onClose={q.onClose} onSaved={q.onClose} missing />
}
