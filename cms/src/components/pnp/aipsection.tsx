'use client'
/**
 * AIP 弹框里的通道卡与「AIP 抽选」卡(2026-10-01 Frank「PNP 弹框 里面的 AIP 部分 提出来,放到 AIP 弹框吗?」「都做吧」):原在省提名弹框
 * (PnpListSection)的两块原样搬来,卡还是那两张(PnpChannelCard / PnpDrawGroups);整表懒取同省提名弹框,加载行与失败框也同它。
 * 同日 Frank「AIP 也需要一个 门槛卡片吧」「可以,做吧」:通道卡与抽选卡之间加门槛卡(PnpGateCard,同省提名弹框那张;位置同那边)。
 *
 * @author Frank
 * @time 2026-10-01 20:17:42
 */
import { Loading } from '@/components/loading'
import { Notice } from '@/components/notice'
import { K_LOAD_FAILED, K_LOADING, NOTICE_ERR } from './constants'
import { useAipSection } from './hooks'
import { PnpChannelCard } from './pnpchannelcard'
import { PnpDrawGroups } from './pnpdrawgroups'
import { PnpGateCard } from './pnpgatecard'
import type { AipSectionIn } from './types'

/**
 * 渲染 AIP 那条通道与 AIP 抽选卡。
 *
 * @param props 本岗与界面语言。
 * @returns 两张卡(各自没有就不出;整表没到出加载行,取挂了出失败框)。
 */
export function AipSection({ job, lang }: AipSectionIn) {
  const p = useAipSection({ job, lang })
  return (
    <>
      {p.ready === false && p.failed === false && <Loading text={p.t(K_LOADING)} />}
      {p.failed && <Notice kind={NOTICE_ERR}>{p.t(K_LOAD_FAILED)}</Notice>}
      {p.ready && p.section.channels.length > 0 && <PnpChannelCard t={p.t} channels={p.section.channels} />}
      {p.ready && p.section.gate != null && <PnpGateCard spec={p.section.gate} />}
      {p.ready && p.section.card != null && (
        <PnpDrawGroups t={p.t} card={p.section.card} open={p.drawOpen} toggleOf={p.drawToggleOf} />
      )}
    </>
  )
}
