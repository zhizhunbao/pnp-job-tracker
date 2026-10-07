'use client'
/**
 * quiz 域的结构:选职业控件大号档(访客第 3 题)的一列职业行 —— 右边那块白卡里(推荐 / 某个大类的职业)与在搜时的单列命中共用:
 * chip 桶的一行选项 ChipLine,一个职业一行(同组的几个码合成一行,名字取代表行),选中主色 + 勾,点一下整组选上 / 撤掉;
 * 命中把检索词那一截标主色。不设上限(第 3 题从来没有),行不灰。
 * 2026-10-05 立(Frank「也改成左右 两部分吗?」「改啊」:与第 2 题专业选择器同一副左右两栏,照 majors 桶 MajorLines 的形),
 * 替掉大号胶囊 OccLgPill(chip 桶 Chip 的 lg 档;原文件同日删)。它头注里的两条照留:名字砍尾不截断(shortOcc 只砍分类学尾巴,
 * 走查 #296,放不下由行自己换行);不挂在招数与五位码(访客门只给点选项,数字归职位板)。重名小注(dupHintOf)不带过来:
 * 同组合成以后线上 23 个大类 + 热门榜共 418 个职业在中 / 英 / 韩三语下没有一对同名(2026-10-05 只读 GET 逐类查过),
 * 行上也没有放小注的格;哪天数据层放进同名,得先给 ChipLine 加一格灰字小注再接。
 * 2026-10-05 同日收口(审查:同名两行长得一模一样分不出,测试还把这种分不出写成了期望;通用件不够用该扩通用件,不该砍功能):
 * ChipLine 加了灰字小注一格(sub),重名小注接回 —— 这一列里显示名撞了的行在名字下面挂官方英文名(dupHintOf,同常规档胶囊),
 * 不撞的什么都不挂;按这一列自己数(右边那块 = 推荐 / 某个大类那一屏,单列命中 = 命中那一列)。上面「重名小注不带过来」作废;
 * 「不挂五位码」照旧,只有撞名又没有官方英文名可挂时 dupHintOf 才退回五位码(当灰字小注,同常规档)。
 *
 * @author Frank
 * @time 2026-10-05 14:11:12
 */
import { ChipLine } from '@/components/chip'
import { dupCountOf, dupHintOf, itemNocsOf, itemOnOf, occLabelOf, shortOcc } from './functions'
import type { OccLinesIn } from './types'

/**
 * 一列职业行。
 *
 * @param props 这一列的职业、要标的检索词、已选职业、界面语言码与点选手柄工厂(见 OccLinesIn 逐格注释)。
 * @returns 一列行(无外壳,装它的白卡 / 定高区给)。
 */
export function OccLines({ items, mark, picked, lang, pickOf }: OccLinesIn) {
  const dupCount = dupCountOf({ list: items, lang })
  const lines = []
  for (const item of items) {
    const label = occLabelOf({ row: item.head, lang })
    lines.push(
      <ChipLine key={item.head.noc}
        label={shortOcc(label)}
        mark={mark}
        active={itemOnOf({ key: item.key, picked })}
        disabled={false}
        sub={dupHintOf({ row: item.head, label, dupCount })}
        onClick={pickOf({ key: item.key, nocs: itemNocsOf(item), name: label })} />,
    )
  }
  return <>{lines}</>
}
