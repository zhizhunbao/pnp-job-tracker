'use client'
/**
 * 域内小件:在招担保雇主橱窗三分表(Frank 2026-08-08:按人群拆 + 分页 —— 每表 50 行,
 * 桌面 10/页,手机卡 5/页;列组 = 每表只描述自己那条通道)。
 * 三类人对应三条路:没工签 → LMIA、有工签 → PNP 担保记录(省清单命中,二拍撤 LMIA 维)、
 * 想去海洋省 → AIP。货架页与「看全部」钮 08-08 拍板下架,橱窗即唯一承载。
 * 伞标题(08-08 二次拍板「二级导航和下面对不上」):外层文字与二级导航项「在招担保雇主」
 * (se.title)完全一致,原三张表各自的表题降级为子标题。
 * 2026-08-28 换装批自 Pulse.tsx 提出成文件。
 * 2026-09-03 Frank「所有的 table 右上角都应该有一个更新时间」:挂伞标题行右槽,
 * 整区一枚(三张分表同一份数据,逐表重复三遍是同一句话说三遍)。
 *
 * @author Frank
 * @time 2026-08-28 14:20:00
 */
import { Updated } from '@/components/time'
import { ID_SE } from './constants'
import { sponsorGroupsOf } from './functions'
import { Band } from './band'
import { Sec } from './sec'
import { SponsorTable } from './sponsortable'
import type { SponsorSectionIn } from './types'

/**
 * 渲染橱窗三分表区。
 *
 * @param props 取词函数、界面语言、更新时刻、三分表与三张字典。
 * @returns 色带。
 */
export function SponsorSection({ t, lang, updatedAt, sponsor, occOpts, catMids, nocCat }: SponsorSectionIn) {
  const groups = sponsorGroupsOf({ sponsor })
  const tables = []
  for (let i = 0; i < groups.length; i += 1) {
    const g = groups[i]
    if (g != null && g.group.top.length > 0) {
      tables.push(
        <SponsorTable key={g.kind}
          t={t}
          lang={lang}
          kind={g.kind}
          group={g.group}
          gap={i !== 0}
          occOpts={occOpts}
          catMids={catMids}
          nocCat={nocCat} />,
      )
    }
  }
  return (
    <Band id={ID_SE}>
      <Sec title={t('se.title')} right={<Updated iso={updatedAt} t={t} />}>{tables}</Sec>
    </Band>
  )
}
