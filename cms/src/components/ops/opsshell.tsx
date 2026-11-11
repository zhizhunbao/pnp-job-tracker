'use client'
/**
 * ops 组件域的外框:手机分区条、左侧导航、banner。住在 /ops 的 layout,切页时不卸载,只有四格和表在换(形照就业把脉)。
 *
 * @author Frank
 * @time 2026-11-08 18:00:00
 */
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { BANNER_IMGS, Banner } from '@/components/banner'
import { useLang } from '@/components/i18n'
import { IconTable } from '@/components/icons'
import { NavDrawer, NavFrame, NavPick, useNavDrawer } from '@/components/nav'
import { Shell } from '@/components/shell'
import { Updated } from '@/components/time'
import { BANNER_MODULE, ISO_NONE, NAV_ARIA, SHELL_BOTTOM, SHELL_TOP, TITLE_TEXT } from './constants'
import { pickTextOf, secNameOf, secOfPath } from './functions'
import { updatedCtxOf } from './hooks'
import { OpsNav } from './opsnav'
import type { OpsShellIn } from './types'
import css from './ops.module.css'

/**
 * 运维页外框。
 *
 * @param props 这一页的内容。
 * @returns 外框。
 */
export function OpsShell({ children }: OpsShellIn) {
  const [, , t] = useLang()
  const sec = secOfPath(usePathname())
  const pick = pickTextOf({ sec, t })
  const d = useNavDrawer()
  const [updated, setUpdated] = useState(ISO_NONE)
  const Ctx = updatedCtxOf()
  return (
    <Ctx.Provider value={setUpdated}>
      <NavPick head={pick.head} sub={pick.sub} open={d.open} onOpen={d.onOpen} />
      <NavFrame bare nav={<OpsNav value={sec} onPick={d.onClose} />}>
        <div className={css.main}>
          <div className={css.hero}>
            <Shell top={SHELL_TOP} bottom={SHELL_BOTTOM}>
              <Banner module={BANNER_MODULE} icon={<IconTable />} title={t(TITLE_TEXT)} sub={t(secNameOf(sec))}
                images={BANNER_IMGS.home}
                right={<Updated iso={updated} t={t} seconds />} />
            </Shell>
          </div>
          {children}
        </div>
      </NavFrame>
      {d.open && (
        <NavDrawer title={t(NAV_ARIA)} onClose={d.onClose}>
          <OpsNav value={sec} onPick={d.onClose} />
        </NavDrawer>
      )}
    </Ctx.Provider>
  )
}
