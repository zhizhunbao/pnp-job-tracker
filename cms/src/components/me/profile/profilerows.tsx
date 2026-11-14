'use client'
/**
 * me 桶子桶 profile 的结构:档案几行(2026-10-09「我的档案」批起;照 Azure Essentials 用短名词标签):
 * 名字照名字规范英文在上、界面语译名灰字在下(name 桶),所在地的城市和省份两个名字上下排;没答的写「还没答」。
 * 2026-10-11:英文姓名是填的不是答的,没填写「还没填」;另外几行照旧「还没答」。
 * 2026-10-13 档案加身份、教育经历两行(所在地之后、英文姓名之前,与弹框题序同)。
 * 2026-11-07 照 Fluent 效果图在新域重写:原先电脑两列并排的 Row 换成一列「标签-值」(ProfileItem),手机标签在上、值在下。
 * 2026-11-12 Frank「这两个不能合并成一个吗?比如匹配规则 是 按专业,还是按什么其他的一个下拉选」:「匹配依据」「匹配模式」两行并成
 * 一行「匹配规则」;同日教育经历那一行改读明细(年份、证书或学历名称、学校)。
 * 2026-11-13 Frank「来自简历 删掉」:专业、做过的工作、英文姓名后面的「来自简历」胶囊撤。
 *
 * @author Frank
 * @time 2026-11-07 16:05:00
 */
import { cssOf } from '@/components/css'
import { PF_NONE_KEY, PF_NONE_NAME_KEY, PF_ROW_KEYS, PF_WHO_HEAD, TEXT_NONE } from './constants'
import { pfGoalKeyOf, pfRuleKeyOf } from './functions'
import { ProfileEdu } from './profileedu'
import { ProfileItem } from './profileitem'
import { ProfileNames } from './profilenames'
import { ProfileWhere } from './profilewhere'
import type { PfRowsIn } from './types'
import css from './profile.module.css'

/**
 * 档案几行。
 *
 * @param props 档案、界面语与取词函数。
 * @returns 几行。
 */
export function ProfileRows({ v, lang, t }: PfRowsIn) {
  const none = <span className={cssOf(css.none)}>{t(PF_NONE_KEY)}</span>
  const goalKey = pfGoalKeyOf(v.goal)
  return (
    <div className={cssOf(css.rows)}>
      <ProfileItem k={t(PF_ROW_KEYS.goal)}>
        {goalKey === TEXT_NONE && none}
        {goalKey !== TEXT_NONE && t(goalKey)}
      </ProfileItem>
      <ProfileItem k={t(PF_ROW_KEYS.majors)}>
        {v.majors.length === 0 && none}
        {v.majors.length > 0 && <ProfileNames names={v.majors} lang={lang} t={t} />}
      </ProfileItem>
      <ProfileItem k={t(PF_ROW_KEYS.jobs)}>
        {v.nocs.length === 0 && none}
        {v.nocs.length > 0 && <ProfileNames names={v.nocs} lang={lang} t={t} />}
      </ProfileItem>
      <ProfileItem k={t(PF_ROW_KEYS.work)}>
        {v.works.length === 0 && none}
        {v.works.length > 0 && <ProfileNames names={v.works} lang={lang} t={t} />}
      </ProfileItem>
      <ProfileItem k={t(PF_ROW_KEYS.where)}>
        {v.prov === TEXT_NONE && v.abroad === false && none}
        {(v.prov !== TEXT_NONE || v.abroad) && <ProfileWhere v={v} t={t} />}
      </ProfileItem>
      <ProfileItem k={t(PF_ROW_KEYS.who)}>
        {v.who === TEXT_NONE && none}
        {v.who !== TEXT_NONE && t(PF_WHO_HEAD + v.who)}
      </ProfileItem>
      <ProfileItem k={t(PF_ROW_KEYS.edu)}>
        {v.eduList.length === 0 && none}
        {v.eduList.length > 0 && <ProfileEdu list={v.eduList} t={t} />}
      </ProfileItem>
      <ProfileItem k={t(PF_ROW_KEYS.rule)}>
        {t(pfRuleKeyOf({ matchBy: v.matchBy, matchMode: v.matchMode }))}
      </ProfileItem>
      <ProfileItem k={t(PF_ROW_KEYS.name)}>
        {v.name === TEXT_NONE && <span className={cssOf(css.none)}>{t(PF_NONE_NAME_KEY)}</span>}
        {v.name !== TEXT_NONE && v.name}
      </ProfileItem>
    </div>
  )
}
