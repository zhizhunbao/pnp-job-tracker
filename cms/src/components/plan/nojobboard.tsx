'use client'
/**
 * plan 域的结构:无岗态的主干。卡序 = 申请人条件 → 估分与抽选线(问卷弹框壳常驻其中)
 * → 可行通道初评 → 该职业分省竞争 → 各省名额竞争。
 * 初评在前、竞争表随后(2026-08-14 Frank「这个放到各省竞争名额上面吧」——结论先行,
 * 支撑它的竞争数据紧跟其后;此前一日的「竞争在初评上面」被本条取代);
 * 该职业分省竞争又在名额竞争之前(2026-08-15 Frank)——先看这个职业在哪个省好找,
 * 再看那个省的名额有多挤。
 * 「其余所选省份」卡与「已有 offer 或看中的岗位?」CTA 卡 2026-08-13 Frank 拍板删除;
 * 常见案例卡同日迁去 /cases 索引页。
 * 2026-08-28 换装批自 Decision.tsx 的无岗态分支提出成件。
 *
 * @author Frank
 * @time 2026-08-28 00:30:00
 */
import { CompetitionCard } from './competitioncard'
import { ConditionsCard } from './conditionscard'
import { OccCompCard } from './occcompcard'
import { PlanCard } from './plancard'
import { QuizSection } from './quizsection'
import { ScoreSection } from './scoresection'
import type { QuizSectionIn } from './types'

/**
 * 渲染无岗态主干。
 *
 * @param props 决策页整机与热门职业榜。
 * @returns 无岗态的五张卡。
 */
export function NoJobBoard({ d, topNocs }: QuizSectionIn) {
  return (
    <>
      <ConditionsCard d={d} />
      <ScoreSection d={d}>
        <QuizSection d={d} topNocs={topNocs} />
      </ScoreSection>
      <PlanCard d={d} />
      <OccCompCard d={d} />
      <CompetitionCard d={d} />
    </>
  )
}
