'use client'
/**
 * quiz 域的结构:选职业控件大号档(访客第 3 题)左栏右边那块:左栏在「推荐」= 一张白卡装热门那一屏的职业(给了专业码是按专业取的
 * 那份,前 24 个职业);在某个大类 = 一张白卡装这一类的职业(接口按在招量排好,一次摆全)。一行一个职业(OccLines),白卡是
 * card 桶 ListCard,浮在 tabs 桶 RailTabs 面板的浅灰底上(内衬归 RailTabs)。目录还在路上、或按专业取的推荐还在路上摆 loading 桶
 * 那一行(判定见 railBusyOf);取回来是空的就什么都不摆(同常规档那一排空着)。
 * 2026-10-05 立(Frank「也改成左右 两部分吗?」「改啊」:与第 2 题专业选择器同一副左右两栏,照 majors 桶 MajorCards 的形;
 * 职业没有「专业类」那一层,一类一张白卡、不折叠)。
 *
 * 2026-10-05 Frank「有可能这个大类下 我想全选」:大类那一屏白卡首行多一行「全选」(chip 桶 ChipLine,与职业行同一形;
 * 全选着挂勾,再点整屏撤掉);「推荐」那一屏跨大类混排,不出。
 * 同日 Frank「推荐也要加全选」:「推荐」那一屏也出,上一句「不出」作废。
 *
 * @author Frank
 * @time 2026-10-05 14:11:12
 */
import { ListCard } from '@/components/card'
import { ChipLine } from '@/components/chip'
import { Loading } from '@/components/loading'
import { LEN_ZERO, OCC_ALL_KEY, OCC_LOADING_KEY, TEXT_NONE } from './constants'
import { railBusyOf } from './functions'
import { OccLines } from './occlines'
import type { OccRailIn } from './types'

/**
 * 左栏右边那块。
 *
 * @param props 取词函数、界面语言码与选职业整机(见 OccRailIn 逐格注释)。
 * @returns 一张装这一屏职业的白卡;在路上 = 加载中那一行;空清单 = null。
 */
export function OccCards({ t, lang, d }: OccRailIn) {
  if (railBusyOf(d)) {
    return <Loading text={t(OCC_LOADING_KEY)} />
  }
  if (d.list.length === LEN_ZERO) {
    return null
  }
  return (
    <ListCard>
      <ChipLine label={t(OCC_ALL_KEY)} mark={TEXT_NONE} active={d.allOn} disabled={false} sub={TEXT_NONE}
        onClick={d.onAll} />
      <OccLines items={d.list} mark={TEXT_NONE} picked={d.picked} lang={lang} pickOf={d.pickOf} />
    </ListCard>
  )
}
