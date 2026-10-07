'use client'
/**
 * 专业选择器的已选一行(2026-10-05 多选立,Frank「在哪里显示已选的专业呢」):搜索框上面,一枚标签 = 专业名 + × 摘除钮。
 * 位置与长相照第 3 题已选职业那一行(profile 桶 OnboardingTags):tag 桶 Tag 的 pick 已选档 + 它的 × 摘除钮(del 格),
 * × 的读屏名同一条「移除 {名字}」;名字与行里看到的同一把(majorNameOf)。全部已选都摆(不像第 3 题只回显胶囊外的码 ——
 * 专业藏在左栏各类里,行里亮着也常常看不见)。一行到底,放不下横着滚,名字不截断;它在的时候两栏 / 结果单列让出同样的高
 * (见 majors.module.css 的 .picked),白卡总高不跳。挂 data-nodrag:横着滑这一行不会把弹框拖走。没选就整块不渲。
 * 同日 Frank「放到搜索框下面吧」:摆在搜索框下面(搜索框与两栏 / 结果单列之间),首句「搜索框上面」与「位置照第 3 题」作废,
 * 长相照旧。
 * 同日访客第 3 题要同一行:外层那一行(定高一行、横滚、藏滚动条、× 点按区的内衬与负外距、data-nodrag)收进 tag 桶 TagRow,
 * 本件只摆标签;上面「见 majors.module.css 的 .picked」现为 tag.module.css 的 .tagRow,让高现为 pane 桶 Pane 的 belowTags 格。
 *
 * @author Frank
 * @time 2026-10-05 12:24:22
 */
import { Tag, TagRow } from '@/components/tag'
import { MAJOR_DEL_KEY, MAJOR_PICK_MAX, MAJOR_PICKED_KEY, TAG_V_PICK } from './constants'
import { majorNameOf } from './functions'
import type { MajorPartIn } from './types'

/**
 * 已选专业的标签一行。
 *
 * @param props 选择器机器、取词函数与界面语言码(见 MajorPartIn 逐格注释)。
 * @returns 标签一行;还没有认得出名字的已选专业 = null。
 */
export function MajorPicked({ m, t, lang }: MajorPartIn) {
  if (m.picked.length === 0) {
    return null
  }
  const tags = []
  for (const row of m.picked) {
    const name = majorNameOf({ row, lang })
    tags.push(
      <Tag key={row.code} variant={TAG_V_PICK} del={{ aria: t(MAJOR_DEL_KEY, { name }), onClick: m.pickOf(row) }}>
        {name}
      </Tag>,
    )
  }
  return <TagRow label={t(MAJOR_PICKED_KEY, { n: m.picked.length, max: MAJOR_PICK_MAX })}>{tags}</TagRow>
}
