'use client'
/**
 * 域内小件:职业段的伞(2026-09-04 重构)。Frank「职业应该分行业,比如医疗、技工、STEM 这种,
 * 但是还需要一个所有职业的,比如说加拿大最高工资榜单、最多工作的榜单」:
 * 先两张全职业榜(最多岗位 / 最高工资),再 8 个行业各一表;不让用户筛,每表各带 Top N。
 * 原四榜(雷区 / 备选 / 降温 / 升温)同批撤。主图数据没到出占位块。
 *
 * @author Frank
 * @time 2026-09-04 22:10:00
 */
import { ID_BOARDS, PH_BOARDS } from './constants'
import { Band } from './band'
import { OccBoardSec } from './occboardsec'
import { Placeholder } from './placeholder'
import { Sec } from './sec'
import type { BoardsSectionIn } from './types'

/**
 * 渲染职业段。
 *
 * @param props 分表清单、语言、更新时刻与可提名省映射。
 * @returns 一条色带;到了数据却一表没有则 null。
 */
export function BoardsSection({ t, lang, updatedAt, secs, nocProvs }: BoardsSectionIn) {
  if (secs != null && secs.length === 0) {
    return null
  }
  const items = []
  if (secs != null) {
    for (let i = 0; i < secs.length; i += 1) {
      const sec = secs[i]
      if (sec != null) {
        items.push(
          <OccBoardSec key={sec.key}
            t={t}
            lang={lang}
            nocProvs={nocProvs}
            rows={sec.rows}
            title={sec.title}
            gap={i !== 0}
            updatedAt={updatedAt} />,
        )
      }
    }
  }
  return (
    <Band id={ID_BOARDS}>
      <Sec title={t('pulse.nav.occ')}>
        {secs == null && <Placeholder size={PH_BOARDS} />}
        {items}
      </Sec>
    </Band>
  )
}
