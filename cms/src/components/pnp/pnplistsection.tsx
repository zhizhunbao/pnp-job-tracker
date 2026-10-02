'use client'
/**
 * 省提名(PNP)事实区块整块:判定卡 → 判定区入口 → 雇主线 → 本省最近抽选 → 本省最新公告 →
 * 每条通道清单,一块一张卡(2026-07-25 用户「乱,拆成多个卡片」;块自身无数据就返回 null,
 * 外层卡不渲,不出空壳)。
 * 红线在这儿落地 —— **粗筛信号,不是资格认定**:命中与否都只陈列官方事实与出处,
 * 各省自己的职业清单/语言/工资要求不在这里判,更不替用户下结论。
 * B1 雇主线摆在判定卡之后、抽选卡之前 —— 用户点这个弹框问的就是「这雇主/这职业谁能担保我」。
 * E12-09 自评打分已迁到「移民路径」页(Frank 2026-07-27「应该单独弄个功能吧,不应该放到 pnp
 * 弹框里面」):它算的是**你这个人**够不够分,跟看哪一个岗没关系;这里连跳转链也不留
 * (#198/#199「多余的跳转都删掉」)。2026-07-25 走查#13:「怎么走这个通道」整卡删 ——
 * ①②③ 通用步骤 + 官方页链 = 废话,无实际价值。
 * 2026-08-28 换装批自 Pnp.tsx 整体重写成小写件形制。
 * 2026-09-23 Frank「pnp 的这部分删了吧」:顶上的判定卡(「PNP · 走不了 / 能走」)与判定区入口卡(「能拿身份吗 ·
 * 一键三合一判定」)撤,弹框从雇主线开始。
 * 同日 Frank「这个删掉」:「本省最新公告」卡撤(地点弹框的省份卡里照旧有)。
 * 同日「这个要不要分类」「和 EE 那个一样」:本省抽选卡换成分组形(PnpDrawGroups,照 EE 分数线卡);
 * 「安省的这部分删了吧。安省这部分要重新设计一下」:改制省(安省)这里不出抽选 / 现行规则卡,等重新设计;
 * 「这个默认展开吧」:通道职业清单默认展开。地点弹框的省份卡仍用 PnpDrawsBlock(最近 1 / 3 轮),不动。
 * 同日 Frank「这个删掉」「担保雇主这个怎么还显示」:雇主线卡(担保雇主:AIP 指定 / LMIA 获批 + 看它全部在招职位)撤,
 * 弹框从本省抽选开始。
 * 2026-09-26 /fe 首页 Frank:抽选卡出不出整句收进 hasProvDraws(改制省那道原先写在这里),格子可不可点照同一句判
 * (pnpFactsIndexOf);清单卡的命中改认数据层 pnp_stream(见 pnpMatchOf)。
 * 同日「止血 + 补完整」(效果图点头):顶上加「本岗能走的通道」卡(PnpChannelCard);本省抽选卡按数据分三种形
 * (drawsFormOf:分组 / NS 按月选取人数 / 安省改制现状,后两种走 PnpFactCard);排除清单卡只给不可提名的岗。
 * 2026-09-27 NS 按月与安省改制两种形也改走 PnpDrawGroups 的组头行(Frank「还是横着排的」、勾「安省改一行组头」),PnpFactCard 退役。
 * 同日 Frank 勾「2026 名额小表」「全年名额部分也单独弄个框」:通道卡与抽选卡之间加「{年} 年配额」卡(PnpQuotaCard);
 * 抽选卡标题下多一行「全年已发邀请 / 已入选」(ops 递进 PnpDrawGroups)。
 * 同日 Frank「已发和总数放到一个卡片里可以吗」「你帮我弄」:那一行并进配额卡当一列,ops 不再递进抽选卡。
 * 2026-09-27 Frank 勾「门槛卡」「用本岗通道的门槛」:通道卡与配额卡之间加「本岗通道的门槛」卡(PnpGateCard,版式照公司信息卡的「行名 - 值」)。
 * 2026-09-28 通道表批二:本岗走哪条通道先认一次(pnpChannelOf,读懒取到的库表 pathways),抽选高亮、门槛流、配额键都取它那一行,
 * 前端五张对照常量退役;页面一个字不变。
 * 2026-09-29 抽选卡重排(Frank「很多省都糊里糊涂的 感觉」「AIP 是不是应该单独的卡」「ON 可以单独设计一个卡,列出历史的」,看过效果图
 * 「按你建议」;设计稿 docs/design/省提名抽选卡重排-20260929.md):抽选卡在这里算好递进去,配额卡之后依次三张 —— 本省抽选(只列配额卡
 * 那一年、不含 AIP;卡底合计与配额卡「已发邀请」同一个数)、改制前的抽选(安省)、AIP 抽选(大西洋四省)。出不出卡看卡函数给不给
 * null(原按 drawsFormOf 的形判 drawGroupsShownOf,随之退役;SK 没有抽选也出卡写「不经抽选」)。
 * 2026-09-30 魁省门槛弹框(Frank「先不要解读,只要门槛」,看过效果图第三版「可以」;设计 docs/design/魁省门槛弹框-20260929.md):
 * 魁省岗最前面是这个职业能走的每个通道一张门槛卡(qcGateCardsOf);其余各卡对魁省本来就不出(各自有魁省挡板)。
 * 2026-09-30 通道补全批二:通道卡带下段「不要 offer 的通道」(p.offChannels);上段没有、下段有也出卡。
 * 同日晚 Frank「不要 offer 这个也删了,只列本岗能走的通道」:下段撤,本岗一条都走不了就不出卡。
 * 2026-09-30 Frank「这个是一般雇主是不给你办的吧」(选「加」):AIP 卡顶上加一行本岗雇主在不在本省 AIP 指定雇主名单(aipEmployerCardOf)。
 * 2026-10-01 Frank「PNP 弹框 里面的 AIP 部分 提出来,放到 AIP 弹框吗?」「都做吧」:AIP 抽选卡与通道卡末尾的 AIP 那条搬去 AIP 弹框(AipSection),
 * 这里只讲省提名;抽选卡的公共入参与配额卡收进 drawCtxOf(两个弹框同用,年份与本岗那组不岔),上面那行雇主句随之撤(aipEmployerCardOf 删)。
 * 2026-10-01 三弹框统一(Frank「统一一下 ee pnp aip 弹框的顺序 和 格式」「各个省都检查一下」,看过效果图「可以,做吧」;
 * 效果图 docs/design/移民弹框统一效果图-20261001.html):省提名 / AIP / EE 同一骨架 ① 结论 → ② 门槛 → ③ 名单 → ④ 配额 → ⑤ 抽选。
 * 这里通道职业清单从最后挪到门槛卡之后(③),配额与抽选殿后。
 *
 * @author Frank
 * @time 2026-08-28 17:59:16
 */
import {
  drawCardOf, drawCtxOf, gateCardOf, gateChannelOf, preReformCardOf,
  qcGateCardsOf, shownStreamsOf, streamKeyOf,
} from './functions'
import { usePnpList } from './hooks'
import { PnpBlockCard } from './pnpblockcard'
import { PnpChannelCard } from './pnpchannelcard'
import { PnpDrawGroups } from './pnpdrawgroups'
import { PnpGateCard } from './pnpgatecard'
import { PnpQuotaCard } from './pnpquotacard'
import { StreamCard } from './streamcard'
import type { PnpListSectionIn } from './types'

/**
 * 渲染省提名事实区块。
 *
 * @param props 本岗、界面语言、清单、抽选、动态、两个显示开关与通道对照表(逐格注释见 PnpListSectionIn)。
 * @returns 一组卡片(结论 → 门槛 → 职业清单 → 配额 → 抽选)。
 */
export function PnpListSection({
  job, lang, occ, draws, ops, reqs, nocDesc = [], showZh = true, pathways, qcChannels,
}: PnpListSectionIn) {
  const p = usePnpList({ job, lang, occ, nocDesc, showZh, pathways })
  const ctx = drawCtxOf({ t: p.t, lang, job, draws, ops, reqs, pathways, qcChannels })
  const quota = ctx.quota
  const drawCard = drawCardOf(ctx.dx)
  const reformCard = preReformCardOf(ctx.dx)
  const gate = gateCardOf({ t: p.t, job, reqs, channel: gateChannelOf({ job, pathways }) })
  const qcCards = []
  for (const c of qcGateCardsOf({ t: p.t, lang, job, reqs, channels: qcChannels })) {
    qcCards.push(<PnpGateCard key={c.title} spec={c} />)
  }
  const cards = []
  for (const s of shownStreamsOf({ match: p.match, noc: job.noc, eligible: job.pnpEligible })) {
    const key = streamKeyOf(s)
    cards.push(<StreamCard key={key}
      t={p.t}
      lang={lang}
      showZh={showZh}
      stream={s}
      noc={job.noc}
      nocRows={p.nocRows}
      open={p.closed.has(key) === false}
      onToggle={p.toggleOf(key)}
      matchRef={p.matchRef} />)
  }
  return (
    <>
      {qcCards}
      <PnpBlockCard t={p.t} text={p.block} />
      {p.channels.length > 0 && <PnpChannelCard t={p.t} channels={p.channels} />}
      {gate != null && <PnpGateCard spec={gate} />}
      {cards}
      {quota != null && <PnpQuotaCard spec={quota} />}
      {drawCard != null && <PnpDrawGroups t={p.t} card={drawCard} open={p.drawOpen} toggleOf={p.drawToggleOf} />}
      {reformCard != null && <PnpDrawGroups t={p.t} card={reformCard} open={p.drawOpen} toggleOf={p.drawToggleOf} />}
    </>
  )
}
