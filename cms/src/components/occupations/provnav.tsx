'use client'
/**
 * 省锚点导航:一行省名,点了跳到本页对应的省小节 —— 全国 183 条清单一页展示,
 * 没有这一行就得整页滚着找省。
 * 2026-08-28 换装批自 Occupations.tsx 的锚点行提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 00:10:00
 */
import { LinkButton } from '@/components/button'
import { cssOf } from '@/components/css'
import { provAnchorHrefOf, provNameOf } from './functions'
import type { ProvNavIn } from './types'
import css from './occupations.module.css'

/**
 * 省锚点导航行。
 *
 * @param props 页面上出现的省与取词函数(逐格注释见 ProvNavIn)。
 * @returns 导航行。
 */
export function ProvNav({ provs, t }: ProvNavIn) {
  const links = []
  for (const p of provs) {
    links.push(
      <LinkButton key={p.prov}
        href={provAnchorHrefOf({ code: p.prov })}
        className={cssOf(css.navLink)}>
        {provNameOf({ t, code: p.prov })}
      </LinkButton>,
    )
  }
  return <div className={css.nav}>{links}</div>
}
