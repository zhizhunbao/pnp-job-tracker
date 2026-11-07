'use client'
/**
 * me 域的结构:「我的档案」一整页 = 页标题(右边「修改」)+ 子桶 profile 的正文
 * (2026-11-07 照效果图在新域重写,docs/design/我的/我的框架-20261107.md 2.4)。
 *
 * @author Frank
 * @time 2026-11-07 17:30:00
 */
import { SEC_PROFILE } from './constants'
import { MeHead } from './mehead'
import { ProfileActs, ProfileBody, useProfile } from './profile'
import type { MeSecPageIn } from './types'

/**
 * 我的档案一页。
 *
 * @param props 取词、窄屏否、导航抽屉开没开与拉开抽屉。
 * @returns 页标题 + 正文。
 */
export function MeProfile({ t, narrow, open, onOpen }: MeSecPageIn) {
  const p = useProfile({ t })
  return (
    <>
      <MeHead sec={SEC_PROFILE} t={t} narrow={narrow} open={open} onOpen={onOpen} acts={<ProfileActs p={p} t={t} />} />
      <ProfileBody p={p} t={t} />
    </>
  )
}
