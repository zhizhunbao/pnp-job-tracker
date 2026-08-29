'use client'
/**
 * plan 域的结构:估分卡的卡头 —— 标题 + 估分段计数 + 右上角动作区。
 * 动作区次要在左、主要在右;主钮随态走:没选省先选省 → 选了省先算分 → 答满了改答案。
 * 「改省份」2026-08-16 自页签末位挪上来(Frank「也应该放到右上角」):
 * 页签只管切省,不混动作。计数与基础卷各算各的 —— 两段卡在哪一步第一次能分开读。
 * 2026-08-28 换装批第二段自 ScoreLineCard.tsx 的卡头提出成件。
 *
 * @author Frank
 * @time 2026-08-28 02:15:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { CountPill } from './countpill'
import { PLAIN_BTN_KIND, TEXT_NONE } from './constants'
import { joinCls, lineMainActOf, lineMainBtnClsOf, lineMainLabelOf } from './functions'
import type { ScoreLineHeadIn } from './types'
import css from './plan.module.css'

/**
 * 渲染估分卡卡头。
 *
 * @param props 取词函数、当前页签省、估分段的两个计数与两个出口。
 * @returns 卡头。
 */
export function ScoreLineHead({ t, prov, done, total, onEdit, onPickProv }: ScoreLineHeadIn) {
  return (
    <div className={css.lineHead}>
      <div className={css.lineHeadMain}>
        <div className={css.lineTitleRow}>
          <h2 className={joinCls({ base: css.h2, more: css.h2Nowrap })}>{t('sl.title')}</h2>
          {total > 0 && <CountPill t={t} done={done} total={total} />}
        </div>
      </div>
      <span className={css.lineActs}>
        {prov !== TEXT_NONE && (
          <Button kind={PLAIN_BTN_KIND} className={cssOf(css.lineBtn)} onClick={onPickProv}>
            {t('sl.editProv')}
          </Button>
        )}
        <Button kind={PLAIN_BTN_KIND} className={lineMainBtnClsOf({ prov, done, total })}
          onClick={lineMainActOf({ prov, onEdit, onPickProv })}>
          {lineMainLabelOf({ t, prov, done, total })}
        </Button>
      </span>
    </div>
  )
}
