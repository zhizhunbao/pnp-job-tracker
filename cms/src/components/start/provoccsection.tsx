'use client'
/**
 * 域内小件:S4b 省内职业榜(省胶囊切省 → 该省通道标签 + 该省职业榜)。
 * 2026-09-04 重构:原挂在榜下的「在招职位分布」探索图(横轴 / 簇内 / 右轴 / 通道筛 / 排序七个控件)
 * 从把脉页撤出,留在 /stats;Frank「现在一个趋势图会包含太多的信息用户能看明白吗」——
 * 把脉页的走势归趋势段,一张图只答一个问题。
 * 2026-08-28 换装批自 Pulse.tsx 提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 14:20:00
 */
import { ID_PROVOCC, PH_PROVOCC, TEXT_NONE } from './constants'
import { Band } from './band'
import { OccBoard } from './occboard'
import { Placeholder } from './placeholder'
import { ProvChips } from './provchips'
import { ProvStreams } from './provstreams'
import { Sec } from './sec'
import type { ProvOccSectionIn } from './types'

/**
 * 渲染省内职业榜。
 *
 * @param props 当前省、切省手柄、该省统计行与职业榜。
 * @returns 一条色带。
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
      </Sec>
    </Band>
  )
}
