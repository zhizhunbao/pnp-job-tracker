'use client'
/**
 * 域内小件:单题页左侧目录树 —— 上排题型钮(有题的型,当前型亮态,点了去那一型题单;
 * Frank 2026-09-04「进到这个页面之后,我想切到其他题型怎么切」),下面这一型全部题一行一条
 * (#题号 + 题面截尾,当前题高亮,进页滚进视野;同日「左侧应该有个目录树可以快速导航到其他题目」)。
 * 手机叠到正文之下。
 *
 * @author Frank
 * @time 2026-09-04 12:00:00
 */
import { LinkButton } from '@/components/button'
import { Chip } from '@/components/chip'
import { cssOf } from '@/components/css'
import { CLS_SEP, NAV_ID_PREFIX, NUM_HEAD } from './constants'
import { listHrefOf, navTextOf, typeLabelOf, typeNameOf } from './functions'
import { usePteNav } from './hooks'
import type { PteNavIn } from './types'
import css from './pte.module.css'

/**
 * 渲染目录树。
 *
 * @param props 题型维度、当前题型、这一型全部题、当前题键与界面语。
 * @returns 侧栏。
 */
export function PteNav({ types, type, rows, qid, lang }: PteNavIn) {
  usePteNav({ qid })
  const chips = []
  for (const x of types) {
    if (x.count > 0) {
      chips.push(
        <Chip key={x.code} href={listHrefOf({ type: x.code })} active={x.code === type}>
          {typeLabelOf({ name: typeNameOf({ type: x, lang }), count: x.count })}
          <span className={css.typeCode}>{x.code}</span>
        </Chip>,
      )
    }
  }
  const items = []
  for (const r of rows) {
    let cls = cssOf(css.navRow)
    if (r.qid === qid) {
      cls = cls + CLS_SEP + cssOf(css.navOn)
    }
    items.push(
      <LinkButton key={r.qid} href={r.href} className={cls}>
        <span id={NAV_ID_PREFIX + r.qid} className={css.navNum}>{NUM_HEAD}{r.num}</span>
        <span className={css.navText}>{navTextOf({ text: r.text })}</span>
      </LinkButton>,
    )
  }
  return (
    <aside className={css.side}>
      <div className={css.navChips}>{chips}</div>
      <div className={css.navList}>{items}</div>
    </aside>
  )
}
