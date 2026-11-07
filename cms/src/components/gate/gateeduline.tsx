'use client'
/**
 * 教育经历题的一段(2026-10-13 档案加题;形照 10-11 资讯页「教育经历」卡的一行):
 * 院校所在地 / 公立或私立 / 课程时长三只下拉并排(占位词即标签,放不下折行),行尾 ✕ 删这一段。
 *
 * @author Frank
 * @time 2026-10-13 02:00:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { Select } from '@/components/select'
import {
  EDU_BTN_KIND, EDU_F_KIND, EDU_F_LEN, EDU_F_PROV, EDU_KINDS, EDU_LENS, EDU_PROVS, EDU_REMOVE_GLYPH, K_EDU_KIND,
  K_EDU_LEN, K_EDU_REMOVE, K_EDU_WHERE,
} from './constants'
import { makeEduLabel } from './functions'
import type { GateEduLineIn } from './types'
import css from './gate.module.css'

/**
 * 教育经历一段。
 *
 * @param props 整机、取词函数、第几段与这一段。
 * @returns 一行三只下拉 + ✕。
 */
export function GateEduLine({ g, t, i, row }: GateEduLineIn) {
  return (
    <div className={cssOf(css.eduLine)}>
      <Select value={row.prov} onChange={g.edit.eduPickOf({ i, f: EDU_F_PROV })} opts={EDU_PROVS} all={t(K_EDU_WHERE)}
        labelOf={makeEduLabel({ t, f: EDU_F_PROV })} tap />
      <Select value={row.kind} onChange={g.edit.eduPickOf({ i, f: EDU_F_KIND })} opts={EDU_KINDS} all={t(K_EDU_KIND)}
        labelOf={makeEduLabel({ t, f: EDU_F_KIND })} tap />
      <Select value={row.len} onChange={g.edit.eduPickOf({ i, f: EDU_F_LEN })} opts={EDU_LENS} all={t(K_EDU_LEN)}
        labelOf={makeEduLabel({ t, f: EDU_F_LEN })} tap />
      <Button kind={EDU_BTN_KIND} className={cssOf(css.eduRemove)} onClick={g.edit.eduRemoveOf(i)}
        title={t(K_EDU_REMOVE)}>
        {EDU_REMOVE_GLYPH}
      </Button>
    </div>
  )
}
