'use client'
/**
 * quiz 域的结构:选职业控件大号档(访客第 3 题)最上面一行已选标签 —— 借 profile 桶的 OnboardingTags(已选标签的形只此一份,
 * 不在本桶另起),只回显这一屏胶囊以外的码(胶囊本身已亮的不重复挂),名字取控件自己的名字表。
 * 按专业取的热门还在路上(胶囊整排是占位)时这一行不渲:这一拍还不知道哪些码会摆成亮着的胶囊,先把预选的码全挂成标签、
 * 热门一到又摘掉一部分,最上面一行就跳一下;热门到了与胶囊一起一次成型。搜索结果那一屏照常回显。
 * 2026-10-04 A2 收口自 OccBody 体内提出成件(审查:取的路上标签先全挂、热门到了又消失,最上面一行会跳)。
 * 2026-10-05:一个职业一颗标签 —— 交过去的是各组代表码(同组几个码只挂一颗、名字取代表码),× 掉一颗由 d.setNocs 展开成整组撤掉;
 * 「这一屏摆着」也按职业比(同组任一个码在这一屏就不再挂标签)。
 * 2026-10-05 Frank「也改成左右 两部分吗?」「改啊」:大号档改成与第 2 题同一副左右两栏,已选一行照第 2 题已选专业那一行
 * (majors 桶 MajorPicked)—— 摆在搜索框下面(OccRail 的竖排里),外层是 tag 桶 TagRow(定高一行、放不下横着滚),
 * 一颗 = tag 桶 Tag 的 pick 已选档 + × 摘除钮(读屏名「移除 {名字}」);**全部已选职业都摆**(职业藏在左栏各类里,
 * 行里亮着也常常看不见,同第 2 题),一个职业一颗、名字与行上看得见的同一把(chipNameOf),× 走与行同一只 pickOf 整组撤掉。
 * 上面几句作废:不再借 profile 桶 OnboardingTags、不再「只回显这一屏胶囊外的码」、不再「热门还在路上时不渲」(全部都摆,
 * 没有先挂后摘那一跳)。名字还没拉回来摆一条与文字同高的占位条(同底部汇总 OccChip,不在标签上甩码)。没选就整块不渲 ——
 * 与下面定高区让高(pane 桶 Pane 的 belowTags 格)同一判。
 * 2026-10-05 同日收口:入参改用自己的 OccTagsIn(只有真读的取词函数与整机;原借的 OccRailIn 多一格界面语言码,本件不读);
 * 名字还没拉回来时 × 的读屏名不再报五位码(代码不裸奔),报「移除 职业」这类泛称,名字一到就换(见 tagDelNameOf)。
 *
 * @author Frank
 * @time 2026-10-04 04:41:26
 */
import { Tag, TagRow } from '@/components/tag'
import { LEN_ZERO, OCC_DEL_KEY, OCC_PICKED_KEY, TAG_V_PICK, TEXT_NONE } from './constants'
import { chipNameOf, chipPickNameOf, tagDelNameOf } from './functions'
import type { OccTagsIn } from './types'
import css from './quiz.module.css'

/**
 * 大号档的已选标签一行。
 *
 * @param props 取词函数与选职业整机(见 OccTagsIn 逐格注释)。
 * @returns 已选标签一行;一个都没选 = null。
 */
export function OccTags({ t, d }: OccTagsIn) {
  if (d.picked.length === LEN_ZERO) {
    return null
  }
  const tags = []
  for (const g of d.picked) {
    const name = chipNameOf({ noc: g.head, titles: d.titles })
    const onClick = d.pickOf({ key: g.key, nocs: g.nocs, name: chipPickNameOf({ noc: g.head, titles: d.titles }) })
    const aria = t(OCC_DEL_KEY, { name: tagDelNameOf({ t, noc: g.head, titles: d.titles }) })
    tags.push(
      <Tag key={g.key} variant={TAG_V_PICK} del={{ aria, onClick }}>
        {name !== TEXT_NONE && name}
        {name === TEXT_NONE && <span aria-hidden className={css.nameSkeleton} />}
      </Tag>,
    )
  }
  return <TagRow label={t(OCC_PICKED_KEY, { n: d.picked.length })}>{tags}</TagRow>
}
