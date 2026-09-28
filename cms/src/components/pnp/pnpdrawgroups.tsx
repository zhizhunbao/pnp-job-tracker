'use client'
/**
 * 域内小件:省提名弹框的本省抽选卡(按通道分组,组头 = 最近一轮,点开列全部轮次)。
 * 2026-09-23 Frank「这个要不要分类」「和 EE 那个一样」立:组件与组形照抄 EE 分数线卡(EeCmpGroupView),
 * 卡标题沿用旧抽选卡那句(「本省最近抽选 {轮次标签}」)。地点弹框的省份卡仍用 PnpDrawsBlock(最近 1 / 3 轮)。
 * 同日 Frank「NB 省不需要分数,在哪标注一下」:官方明说不按分数抽选的省(DRAW_NO_SCORE_PROVS),标题下一行灰字注明;
 * 「所以这个 NB 技术工人点进去应该哪个高亮」:本岗 PNP 格对应的那组琥珀高亮、排最前。
 * 2026-09-26 /fe 首页 Frank「止血 + 补完整」看过效果图点头:卡里只摊开本岗那一组(DrawFeatView:三格 + 灰字统计),
 * 其余组收进「查看全省 N 组」开关,点开照旧组头一行、开关落到末尾改「收起」(同清单卡末尾的开关)。
 * 同日晚 Frank「这部分怎么改的这么乱了」「默认也别合并啊」:其余组默认就展开(开关初值见 usePnpList,末尾照旧「收起」可收);
 * 标题只留「本省最近抽选」,轮次标签另起一行灰字;本岗那组改琥珀底、字回黑 / 灰两档(样式见 pnp.module.css 的 .feat)。
 * 同晚 Frank「这个下面还有必要灰字吗」:那行轮次标签灰字(AAIP / OINP …)也撤 —— 弹框顶上已写「阿尔伯塔省提名(PNP)」,重复。
 * 同晚 Frank「上面这个高亮是不是格式改成和下面的一样的」:本岗那一组也走 EeCmpGroupView,与其余组同一种组头行(DrawFeatView 撤),
 * 排最前、开关收起时也留着;「全站高亮要不要都改成蓝色」:本岗高亮改浅蓝(.cmpHit)。「来源」挪到标题那一行右端(DrawsHead;
 * Frank 选「标题那一行右端」,问「每个通道 link 不一样吧」—— 抽选数据每省只来自一个官方页,各通道同一个链接)。
 * 2026-09-27 Frank 勾「全年已邀请合计」:标题下一行灰字「{年} 年已发 N 份邀请」(NS 写「已入选 N 人」),汇装加总、缺一轮不出。
 * 同日 Frank「已发和总数放到一个卡片里可以吗」「你帮我弄」:那一行并进「{年} 年配额」卡当一列(quotaCardOf),这里撤。
 *
 * @author Frank
 * @time 2026-09-23 23:50:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { DRAWS_ALL_KEY, DRAW_NO_SCORE_PROVS, PLAIN_BTN_KIND } from './constants'
import { DrawsHead } from './drawshead'
import { EeCmpGroupView } from './eecmpgroupview'
import { allGroupsLabelOf, drawCardOf } from './functions'
import type { PnpDrawGroupsIn } from './types'
import css from './pnp.module.css'

/**
 * 渲染本省抽选分组卡。
 *
 * @param props 取词函数、界面语言、省码、全部抽选行、本岗对应的那一组、展开着的组、开合手柄工厂与本省省默认通道的抽选组。
 * @returns 抽选卡;本省没有抽选给 null。
 */
export function PnpDrawGroups({ t, lang, province, draws, hitStreams, open, toggleOf, genDraw }: PnpDrawGroupsIn) {
  const card = drawCardOf({ t, lang, province, draws, hitStreams, genDraw })
  if (card == null) {
    return null
  }
  const hits = []
  for (const g of card.hits) {
    hits.push(<EeCmpGroupView key={g.key} g={g} open={open.has(g.key)} onToggle={toggleOf(g.key)} />)
  }
  const allOpen = open.has(DRAWS_ALL_KEY)
  const others = []
  if (allOpen) {
    for (const g of card.others) {
      others.push(<EeCmpGroupView key={g.key} g={g} open={open.has(g.key)} onToggle={toggleOf(g.key)} />)
    }
  }
  return (
    <div className={css.card}>
      <DrawsHead title={card.title} source={card.source} />
      {DRAW_NO_SCORE_PROVS.has(province) && <div className={css.drawsBasis}>{t('pnpdraws.noScore')}</div>}
      {hits}
      {others}
      {card.others.length > 0 && (
        <Button kind={PLAIN_BTN_KIND} className={cssOf(css.foldMore)} onClick={toggleOf(DRAWS_ALL_KEY)}>
          {allGroupsLabelOf({ t, open: allOpen, total: card.total, label: card.label })}
        </Button>
      )}
    </div>
  )
}
