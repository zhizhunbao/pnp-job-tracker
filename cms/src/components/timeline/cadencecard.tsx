'use client'
/**
 * 域内小件:一张省×流的抽选节奏卡(最近一期 / 距今多少天 / 近几期平均间隔)。
 * 整卡可点 —— 点它把下面的事件流筛到这条流并滚过去。
 * 诚实红线:卡上只报**历史统计**,右端那句口径小注说的就是这件事,不预测下一次。
 * 2026-08-28 换装批自 Timeline.tsx 的节奏卡提出成文件;原先手搓的 role/tabIndex/
 * 回车空格键盘手柄随「整卡经 Button」一并退役,键盘可达由标签自己保证。
 *
 * @author Frank
 * @time 2026-08-28 12:43:06
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { CARD_BTN_KIND, META_SEP, TEXT_NONE } from './constants'
import { daysClsOf } from './functions'
import { ProvTag } from './provtag'
import type { CadenceCardIn } from './types'
import css from './timeline.module.css'

/**
 * 渲染一张省×流节奏卡。
 *
 * @param props 取词函数、这张卡的节奏数据与点击手柄。
 * @returns 整卡钮。
 */
export function CadenceCard({ t, row, onClick }: CadenceCardIn) {
  return (
    <Button kind={CARD_BTN_KIND} onClick={onClick} className={cssOf(css.card)}>
      <span className={css.cardHead}>
        <ProvTag t={t} prov={row.prov} />
        <span className={css.stream}>{row.stream}</span>
        {row.scale !== TEXT_NONE && <span className={css.scale}>{row.scale}</span>}
        <span className={css.hist}>{t('tl.hist')}</span>
      </span>
      <span className={css.cardBody}>
        {t('tl.last', { d: row.last })}{META_SEP}
        <b className={daysClsOf({ daysSince: row.daysSince, avgGapDays: row.avgGapDays })}>
          {t('tl.daysSince', { n: row.daysSince })}
        </b>
        {row.avgGapDays != null && <>{META_SEP}{t('tl.avgGap', { n: row.avgGapDays, m: row.draws })}</>}
      </span>
    </Button>
  )
}
