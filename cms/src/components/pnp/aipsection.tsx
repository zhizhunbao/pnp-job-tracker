'use client'
/**
 * AIP 弹框里的通道卡与「AIP 抽选」卡(2026-10-01 Frank「PNP 弹框 里面的 AIP 部分 提出来,放到 AIP 弹框吗?」「都做吧」):原在省提名弹框
 * (PnpListSection)的两块原样搬来,卡还是那两张(PnpChannelCard / PnpDrawGroups);整表懒取同省提名弹框,加载行与失败框也同它。
 * 同日 Frank「AIP 也需要一个 门槛卡片吧」「可以,做吧」:通道卡与抽选卡之间加门槛卡(PnpGateCard,同省提名弹框那张;位置同那边)。
 * 同日三弹框统一(Frank「统一一下 ee pnp aip 弹框的顺序 和 格式」,看过效果图「可以,做吧」):判定卡撤,AIP 弹框整块住这里 ——
 * ① 结论(本岗能走的通道 / 本岗不满足的门槛)→ ② 门槛 → ③ 指定雇主名单(AipEmpCard 自 advisor 挪进来)→ ⑤ 抽选。
 *
 * @author Frank
 * @time 2026-10-01 20:17:42
 */
import { Loading } from '@/components/loading'
import { Notice } from '@/components/notice'
import { AipEmpCard } from './aipempcard'
import { K_LOAD_FAILED, K_LOADING, NOTICE_ERR } from './constants'
import { useAipSection } from './hooks'
import { PnpBlockCard } from './pnpblockcard'
import { PnpChannelCard } from './pnpchannelcard'
import { PnpDrawGroups } from './pnpdrawgroups'
import { PnpGateCard } from './pnpgatecard'
import type { AipSectionIn } from './types'

/**
 * 渲染 AIP 弹框整块。
 *
 * @param props 本岗、界面语言与 AIP 指定雇主名单。
 * @returns 结论卡、门槛卡、指定雇主名单卡与抽选卡(各自没有就不出;整表没到出加载行,取挂了出失败框)。
 */
export function AipSection({ job, lang, employers }: AipSectionIn) {
  const p = useAipSection({ job, lang })
  return (
    <>
      {p.ready === false && p.failed === false && <Loading text={p.t(K_LOADING)} />}
      {p.failed && <Notice kind={NOTICE_ERR}>{p.t(K_LOAD_FAILED)}</Notice>}
      {p.ready && <PnpBlockCard t={p.t} text={p.section.block} />}
      {p.ready && p.section.channels.length > 0 && <PnpChannelCard t={p.t} channels={p.section.channels} />}
      {p.ready && p.section.gate != null && <PnpGateCard spec={p.section.gate} />}
      <AipEmpCard t={p.t} job={job} employers={employers} />
      {p.ready && p.section.card != null && (
        <PnpDrawGroups t={p.t} card={p.section.card} open={p.drawOpen} toggleOf={p.drawToggleOf} />
      )}
    </>
  )
}
