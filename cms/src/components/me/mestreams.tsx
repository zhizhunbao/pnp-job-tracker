'use client'
/**
 * me 域的结构:「我的通道」一整页 = 页标题 + 子桶 profile 的通道正文
 * (2026-11-11 Frank「我的通道拿出来」「我的通道拿到 sidebar 你觉得如何」「可以 继续吧」:原先挂在「我的档案」页底下,
 * 单独成页并进侧栏;没答身份的在这一页出「去回答」,开的是档案同一张右侧表单)。
 *
 * @author Frank
 * @time 2026-11-12 10:00:00
 */
import { SEC_STREAMS } from './constants'
import { MeHead } from './mehead'
import { ProfileStreams, useProfile } from './profile'
import type { MeProfilePageIn } from './types'

/**
 * 我的通道一页。
 *
 * @param props 取词、窄屏否、导航抽屉开没开、拉开抽屉与答完档案后的回调。
 * @returns 页标题 + 正文。
 */
export function MeStreams({ t, narrow, open, onOpen, autoEdit, onChanged }: MeProfilePageIn) {
  const p = useProfile({ t, autoEdit, onChanged })
  return (
    <>
      <MeHead sec={SEC_STREAMS} t={t} narrow={narrow} open={open} onOpen={onOpen} />
      <ProfileStreams p={p} t={t} />
    </>
  )
}
