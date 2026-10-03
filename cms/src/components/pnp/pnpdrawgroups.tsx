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
 * 2026-09-29 抽选卡重排(Frank「按你建议」「如果改一个地方,是不是所有省份都得改一遍」):本省抽选 / 改制前的抽选 / AIP 抽选三张卡同一个形,
 * 卡由 PnpListSection 算好递进来(drawCardOf / preReformCardOf / aipCardOf),这里只渲染:标题下灰字(原 NB 不按分数那行在这里按
 * DRAW_NO_SCORE_PROVS 判,挪进 drawCardOf)、各组、开关(每张卡一把键)、卡底合计行。
 * 2026-09-30 Frank「我觉得这个 日期 和 总数 互换一下位置是不是好一些」(看过效果图选「互换」):组头传 dateBelow —— 本年合计换到
 * 原日期那一格、日期落最下一行(没合计的组同样排,各组分数照旧对齐);EE 分数线卡不传。
 * 同日 Frank「收起那个按钮是不是不要放在外面」,选「可提名的岗去掉收起」:开关只在折着时出(「查看全省 N 组」),展开后不给收起。
 * 2026-10-02 Frank「一会把所有的这个抽选都展开吧」「这种多个的不用展开」:整张卡只有一组的(NS 按月那种)默认展开,多组的照旧折着(drawGroupOpenOf)。
 * 2026-10-02 申请步骤批 2:组区(灰字 / 各组 / 开关 / 卡底合计)拆成 DrawGroupsBody,「申请步骤」卡「进池与抽选」一步共用;本件只剩卡框与标题行。
 *
 * @author Frank
 * @time 2026-09-23 23:50:00
 */
import { DrawGroupsBody } from './drawgroupsbody'
import { DrawsHead } from './drawshead'
import type { PnpDrawGroupsIn } from './types'
import css from './pnp.module.css'

/**
 * 渲染一张抽选分组卡。
 *
 * @param props 取词函数、这张卡、展开着的组与开合手柄工厂。
 * @returns 抽选卡。
 */
export function PnpDrawGroups({ t, card, open, toggleOf }: PnpDrawGroupsIn) {
  return (
    <div className={css.card}>
      <DrawsHead title={card.title} source={card.source} />
      <DrawGroupsBody t={t} card={card} open={open} toggleOf={toggleOf} />
    </div>
  )
}
