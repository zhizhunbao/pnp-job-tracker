'use client'
/**
 * 我的档案卡里的五行(2026-10-09「我的档案」批):通用 Row 件的左标签右值(照 Azure Essentials 用短名词标签);
 * 名字照名字规范英文在上、界面语译名灰字在下(name 桶),所在地的城市和省份两个名字并排;没答的写「还没答」。
 * 电脑两列(样式归 .pfRows)。
 *
 * @author Frank
 * @time 2026-10-09 23:30:00
 */
import { cssOf } from '@/components/css'
import { Row } from '@/components/row'
import { PF_NONE_KEY, PF_ROW_KEYS, TEXT_NONE } from './constants'
import { pfGoalKeyOf } from './functions'
import { ProfileNames } from './profilenames'
import { ProfileWhere } from './profilewhere'
import type { PfRowsIn } from './types'
import css from './account.module.css'

/**
 * 五行。
 *
 * @param props 档案、界面语与取词函数。
 * @returns 五行。
 */
export function ProfileRows({ v, lang, t }: PfRowsIn) {
  const none = <span className={cssOf(css.pfNone)}>{t(PF_NONE_KEY)}</span>
  const goalKey = pfGoalKeyOf(v.goal)
  return (
    <div className={cssOf(css.pfRows)}>
      <Row k={t(PF_ROW_KEYS.goal)}>
        {goalKey === TEXT_NONE && none}
        {goalKey !== TEXT_NONE && t(goalKey)}
      </Row>
      <Row k={t(PF_ROW_KEYS.majors)}>
        {v.majors.length === 0 && none}
        {v.majors.length > 0 && <ProfileNames names={v.majors} lang={lang} t={t} />}
      </Row>
      <Row k={t(PF_ROW_KEYS.jobs)}>
        {v.nocs.length === 0 && none}
        {v.nocs.length > 0 && <ProfileNames names={v.nocs} lang={lang} t={t} />}
      </Row>
      <Row k={t(PF_ROW_KEYS.where)}>
        {v.prov === TEXT_NONE && v.abroad === false && none}
        {(v.prov !== TEXT_NONE || v.abroad) && <ProfileWhere v={v} t={t} />}
      </Row>
      <Row k={t(PF_ROW_KEYS.name)}>
        {v.name === TEXT_NONE && none}
        {v.name !== TEXT_NONE && v.name}
      </Row>
    </div>
  )
}
