'use client'
/**
 * 域内小件:教育经历一段 —— 院校所在地 / 公立或私立 / 课程时长三只下拉(select 桶)并排,下拉空值档的字就是这一格的名字;
 * 行尾 ✕ 删这一段(只剩一段且三格都空时不出 ✕)。2026-10-11 申请步骤分区筛选批 1。
 *
 * @author Frank
 * @time 2026-10-11 23:30:00
 */
import { Button } from '@/components/button'
import { Select } from '@/components/select'
import {
  BTN_GHOST, EDU_F_KIND, EDU_F_LEN, EDU_F_PROV, EDU_KINDS, EDU_LENS, EDU_PROVS, K_EDU_KIND, K_EDU_LEN, K_EDU_WHERE,
  K_REMOVE, REMOVE_GLYPH, TEXT_NONE,
} from './constants'
import type { EduLineIn } from './types'
import css from './streams.module.css'

/**
 * 渲染一段。
 *
 * @param props 整机面板、第几段与这一段。
 * @returns 一行下拉。
 */
export function EduLine({ p, i, row }: EduLineIn) {
  const blank = row.prov === TEXT_NONE && row.kind === TEXT_NONE && row.len === TEXT_NONE
  return (
    <div className={css.eduLine}>
      <Select value={row.prov} onChange={p.eduPickOf(i, EDU_F_PROV)} opts={EDU_PROVS} all={p.t(K_EDU_WHERE)}
        labelOf={p.eduProvLabel} tap />
      <Select value={row.kind} onChange={p.eduPickOf(i, EDU_F_KIND)} opts={EDU_KINDS} all={p.t(K_EDU_KIND)}
        labelOf={p.eduKindLabel} tap />
      <Select value={row.len} onChange={p.eduPickOf(i, EDU_F_LEN)} opts={EDU_LENS} all={p.t(K_EDU_LEN)}
        labelOf={p.eduLenLabel} tap />
      {(p.s.edu.length > 1 || blank === false) && (
        <Button kind={BTN_GHOST} className={css.removeBtn} onClick={p.eduRemoveOf(i)} title={p.t(K_REMOVE)}>
          {REMOVE_GLYPH}
        </Button>
      )}
    </div>
  )
}
