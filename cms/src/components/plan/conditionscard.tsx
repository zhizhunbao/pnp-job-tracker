'use client'
/**
 * plan 域的结构:「我的评估条件」摘要卡。
 * **带岗进来时整张不出**(2026-08-12 B2/A3,Frank 实拍指「重复」):判定卡里已经有
 * 「按你答的 n/N 项判定 · 改答案」那一行,同屏再摆一张「你的条件」就是两个输入面 ——
 * 设计 §5「输入面只留一个,多一个就又是两套主语」。
 * 「继续作答」= 落在**第一道没答的题**,不把人送回第一页(2026-08-12 Frank 实拍:
 * 加了两题之后,答过 6 项的人点「继续作答」又从选职业开始重走一遍)。
 * 卡里只留共用题:省专属题 = 估分题,已随结论并进「估分与抽选线」那张卡(2026-08-16)。
 * 2026-08-28 换装批自 Decision.tsx 的摘要卡提出成件。
 *
 * @author Frank
 * @time 2026-08-28 00:30:00
 */
import { Button } from '@/components/button'
import { ConditionGrid } from '@/components/verdict'
import { CountPill } from './countpill'
import { GRID_ID_COND, PLAIN_BTN_KIND } from './constants'
import { entryBtnClsOf, entryKeyOf, makeProvDisp } from './functions'
import type { ConditionsCardIn } from './types'
import css from './plan.module.css'

/**
 * 渲染申请人条件摘要卡。
 *
 * @param props 决策页整机。
 * @returns 摘要卡。
 */
export function ConditionsCard({ d }: ConditionsCardIn) {
  return (
    <div className={css.card}>
      <div className={css.condHead}>
        <div className={css.condHeadMain}>
          <div className={css.condTitleRow}>
            <h2 className={css.h2Nowrap}>{d.t('dp.quiz')}</h2>
            {d.answers.ready && <CountPill t={d.t} done={d.progress.stepDone} total={d.progress.stepTotal} />}
          </div>
        </div>
        <span className={css.condActions}>
          <Button kind={PLAIN_BTN_KIND} className={entryBtnClsOf(d.progress)} onClick={d.acts.openQuiz}>
            {d.t(entryKeyOf(d.progress))}
          </Button>
        </span>
      </div>
      <div className={css.condGrid}>
        <ConditionGrid rows={d.view.cond.basicRows}
          provLabel={makeProvDisp({ t: d.t })}
          ariaLabel={d.t('dp.prov')}
          idPrefix={GRID_ID_COND}
          onTile={d.acts.startQuiz} />
      </div>
    </div>
  )
}
