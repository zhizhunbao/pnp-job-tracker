'use client'
/**
 * 中 / 韩界面的职位描述自动带对照(2026-09-14 Frank「删掉。默认就自带中文对照,如果是中文或者韩文用户」):
 * 原 jdacts.tsx 那颗「显示中文对照」钮撤,整理版一到就替用户按一次 —— 只在还没译过、也没在译时按,
 * 译失败不重按(重试仍走整理版状态行)。不渲任何东西。
 *
 * @author Frank
 * @time 2026-09-14 13:20:00
 */
import { useEffect } from 'react'
import { JD_LOADING, LANG_EN, TRANS_IDLE } from './constants'
import type { JdAutoTransIn } from './types'

/**
 * 整理版就绪且界面非英文时自动加载对照。
 *
 * @param props JD 身体状态机与界面语言。
 * @returns 无(纯副作用件)。
 */
export function JdAutoTrans({ d, lang }: JdAutoTransIn) {
  const want = d.status !== JD_LOADING && lang !== LANG_EN && d.fmt != null && d.showOrig === false
  const idle = d.trans === null && d.showTrans === false && d.transStatus === TRANS_IDLE
  const onToggleTrans = d.onToggleTrans
  useEffect(function autoTrans() {
    if (want && idle) {
      onToggleTrans()
    }
  }, [want, idle, onToggleTrans])
  return null
}
