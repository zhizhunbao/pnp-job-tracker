'use client'
/**
 * me 域的结构:「账户设置」一整页 = 页标题 + 子桶 settings 的正文
 * (2026-11-07 Frank「先做 5 条必备」第 5 条,只留改登录邮箱、改密码;docs/design/我的/账户设置-20261107.md)。
 *
 * @author Frank
 * @time 2026-11-07 23:55:00
 */
import { SEC_SETTINGS } from './constants'
import { MeHead } from './mehead'
import { SettingsBody, useSettings } from './settings'
import type { MeSettingsPageIn } from './types'

/**
 * 账户设置一页。
 *
 * @param props 取词、窄屏否、导航抽屉开没开、拉开抽屉与当前用户。
 * @returns 页标题 + 正文。
 */
export function MeSettings({ t, narrow, open, onOpen, me }: MeSettingsPageIn) {
  const s = useSettings({ t })
  return (
    <>
      <MeHead sec={SEC_SETTINGS} t={t} narrow={narrow} open={open} onOpen={onOpen} acts={null} />
      <SettingsBody t={t} me={me} s={s} />
    </>
  )
}
