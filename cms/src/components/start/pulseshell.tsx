'use client'
/**
 * 域内小件:就业把脉外框 —— 手机分区条 + 左侧导航两栏(右边 banner + 四格数字卡 + 这一页的表)+ 窄屏导航抽屉。
 * 2026-11-07 Frank「我切换的时候,其他项如果是展开就继续展开,切换的时候不要刷页面,只有中间的 table 在动」:
 * 本件住 /start/layout.tsx,在七页之间切换不卸载(侧栏开合、banner 轮播都留着),只换 children;
 * 当前分区从网址路径反推,当前子项读网址参数 `?t=`。
 *
 * @author Frank
 * @time 2026-11-07 23:50:00
 */
import { usePathname } from 'next/navigation'
import { useLang } from '@/components/i18n'
import { NavDrawer, NavFrame, useNavDrawer } from '@/components/nav'
import { Hero } from './hero'
import { PulsePick } from './pulsepick'
import { PulseSideNav } from './pulsesidenav'
import { useOnlyBlock, usePick, usePulseCards, usePulseSide } from './hooks'
import { makeSidePick, onlyBlockOf, secOfPath } from './functions'
import type { PulseShellIn } from './types'
import css from './start.module.css'

/**
 * 就业把脉外框。
 *
 * @param props 布局门取好的 SSR 数据与这一页的内容。
 * @returns 外框。
 */
export function PulseShell({ stats, children }: PulseShellIn) {
  const [, , t] = useLang()
  const sec = secOfPath(usePathname())
  const pick = usePick()
  const side = usePulseSide({ t, navSec: sec, pick })
  useOnlyBlock(onlyBlockOf(side))
  const cards = usePulseCards({ t, stats })
  const d = useNavDrawer()
  const onPick = makeSidePick({ onClose: d.onClose })
  return (
    <>
      <PulsePick head={side.head} sub={side.sub} open={d.open} onOpen={d.onOpen} />
      <NavFrame bare nav={<PulseSideNav t={t} value={side.value} onPick={onPick} />}>
        <div className={css.main}>
          <Hero t={t} cards={cards} updatedAt={stats.checkedAt} />
          {children}
        </div>
      </NavFrame>
      {d.open && (
        <NavDrawer title={t('pulse.entry')} onClose={d.onClose}>
          <PulseSideNav t={t} value={side.value} onPick={onPick} />
        </NavDrawer>
      )}
    </>
  )
}
