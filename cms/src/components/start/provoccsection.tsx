'use client'
/**
 * 域内小件:S4b 省内职业榜 —— chips 切省(档案省预选 / 匿名默认 ON,禁 IP 定位)
 * + 通道标签 + 职业榜 + 分布主图。
 * 分布主图常驻(Frank 2026-08-06「柱状图带拖动的找回来 / 最重要的」;7-28 也骂过图被藏
 * —— 不再折叠)。
 * 2026-08-28 换装批自 Pulse.tsx 提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 14:20:00
 */
import { MarketChart } from '@/components/stats'
import { ID_PROVOCC, PH_CHART, PH_PROVOCC, TEXT_NONE } from './constants'
import { Band } from './band'
import { OccBoard } from './occboard'
import { Placeholder } from './placeholder'
import { ProvChips } from './provchips'
import { ProvStreams } from './provstreams'
import { Sec } from './sec'
import type { ProvOccSectionIn } from './types'
import css from './start.module.css'

/**
 * 渲染省内职业榜区。
 *
 * @param props 取词函数、界面语言、切省三件、当前省统计行、榜行与主图四份数据。
 * @returns 白底色带。
 */
export function ProvOccSection({
  t,
  lang,
  prov,
  onProvSelect,
  provPickOf,
  provStat,
  provOcc,
  nocProvs,
  market,
}: ProvOccSectionIn) {
  return (
    <Band white id={ID_PROVOCC}>
      <Sec title={t('pulse.s4b')}>
        <ProvChips t={t} lang={lang} prov={prov} onProvSelect={onProvSelect} provPickOf={provPickOf} />
        {provStat != null && provStat.streamLabels !== TEXT_NONE && (
          <ProvStreams t={t} labels={provStat.streamLabels} />
        )}
        {provOcc == null && <Placeholder size={PH_PROVOCC} />}
        {provOcc != null && provOcc.length > 0 && (
          <OccBoard rows={provOcc} t={t} lang={lang} nocProvs={nocProvs} />
        )}
        {market == null && <Placeholder size={PH_CHART} />}
        {market != null && market.occ.length > 0 && (
          <div className={css.chartWrap}>
            <MarketChart occ={market.occ}
              city={market.city}
              rows={market.rows}
              t={t}
              lang={lang}
              channels={market.channels} />
          </div>
        )}
      </Sec>
    </Band>
  )
}
