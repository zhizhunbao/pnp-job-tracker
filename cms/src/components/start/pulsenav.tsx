'use client'
/**
 * 域内小件:二级导航条(2026-08-08 Frank)。分区锚点直跳;粘顶,375 横向滚动。
 * 2026-08-09 Frank「这个地方的高亮也不对啊」:原先五个锚点永远灰、属主永远蓝
 * = 看着像永远停在第一项 —— 现加滚动跟随(当前分区的锚点亮蓝),属主前缀改深色粗体,
 * 蓝色只有一个语义:你现在在哪。
 * 归属设计(Frank 2026-08-08「二级标题应该只属于这个一级标题」):条首挂一级项作属主。
 * #312:导航项与分区 h2 逐字同文 = 同屏同一事实说两遍 —— TOC 保留(可点锚跳),
 * 措辞差异化:导航用短词(pulse.nav.*),h2 保全称(se.title / pulse.s4 等不动)。
 * 2026-08-28 换装批自 Pulse.tsx 提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 14:20:00
 */
import { LinkButton } from '@/components/button'
import { Shell } from '@/components/shell'
import { SHELL_BOTTOM, SHELL_TOP } from './constants'
import { anchorOf, navItemsOf, navLinkClsOf } from './functions'
import type { PulseNavIn } from './types'
import css from './start.module.css'

/**
 * 渲染二级导航条。
 *
 * @param props 取词函数与当前所在分区。
 * @returns 粘顶的导航条。
 */
export function PulseNav({ t, navSec }: PulseNavIn) {
  const items = []
  for (const it of navItemsOf({ t })) {
    items.push(
      <LinkButton key={it.id} href={anchorOf(it.id)} className={navLinkClsOf({ on: navSec === it.id })}>
        {it.label}
      </LinkButton>,
    )
  }
  return (
    <div className={css.navBar}>
      <Shell top={SHELL_TOP} bottom={SHELL_BOTTOM}>
        <div className={css.navRow}>
          <span className={css.navOwner}>{t('pulse.entry')}</span>
          <span className={css.navSep} />
          {items}
        </div>
      </Shell>
    </div>
  )
}
