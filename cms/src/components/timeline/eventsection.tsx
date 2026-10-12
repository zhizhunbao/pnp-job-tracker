'use client'
/**
 * 域内小件:「事件流」分区卡(2026-10-12 抽选页三段式,页面三段的第三段)—— 筛选药丸 + 时间轴装进一张白卡
 * (页面正文一律分区卡)。节奏卡点下来时多一枚卡筛药丸(界面语短名 + ✕),时间轴只留那张卡统计的抽选流。
 * 锚点挂在这张卡上:点节奏卡滚到这里。
 *
 * @author Frank
 * @time 2026-10-12 17:30:00
 */
import { CARD_HEAD_CLS, CARD_MD_CLS, EVENTS_ANCHOR_ID, TEXT_NONE } from './constants'
import { EventList } from './eventlist'
import { FilterChips } from './filterchips'
import { pickLabelOf, pickedOf, provsOf, shownOf } from './functions'
import type { EventSectionIn } from './types'
import css from './timeline.module.css'

/**
 * 渲染事件流分区卡。
 *
 * @param props 取词函数、界面语、全部事件、节奏卡、两格筛选与手柄。
 * @returns 分区卡。
 */
export function EventSection({ t, lang, events, cadence, prov, pick, provPickOf, onStreamClear }: EventSectionIn) {
  const card = pickedOf({ cards: cadence, pick })
  let streams: string[] | null = null
  let pickLabel = TEXT_NONE
  if (card != null) {
    streams = card.streams
    pickLabel = pickLabelOf({ t, lang, card })
  }
  const shown = shownOf({ events, prov, streams })
  return (
    <div id={EVENTS_ANCHOR_ID} className={`${CARD_MD_CLS} ${css.anchor}`}>
      <div className={CARD_HEAD_CLS}>{t('tl.events')}</div>
      <FilterChips t={t}
        provs={provsOf({ events })}
        prov={prov}
        pickLabel={pickLabel}
        provPickOf={provPickOf}
        onStreamClear={onStreamClear} />
      <EventList t={t} lang={lang} events={shown} />
    </div>
  )
}
