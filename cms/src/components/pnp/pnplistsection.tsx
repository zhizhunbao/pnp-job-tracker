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
 *
 * @author Frank
 * @time 2026-08-28 17:59:16
 */
import { DRAWS_FORM_GROUPS } from './constants'
import { drawHitStreamsOf, drawsFormOf, factCardOf, shownStreamsOf, streamKeyOf } from './functions'
import { usePnpList } from './hooks'
import { PnpChannelCard } from './pnpchannelcard'
import { PnpDrawGroups } from './pnpdrawgroups'
import { PnpFactCard } from './pnpfactcard'
import { StreamCard } from './streamcard'
import type { PnpListSectionIn } from './types'

/**
 * 渲染省提名事实区块。
 *
 * @param props 本岗、界面语言、清单、抽选、动态与两个显示开关(逐格注释见 PnpListSectionIn)。
 * @returns 一组卡片。
 */
export function PnpListSection({ job, lang, occ, draws, nocDesc = [], showZh = true }: PnpListSectionIn) {
  const p = usePnpList({ job, lang, occ, nocDesc, showZh })
  const form = drawsFormOf({ province: job.province, draws })
  const fact = factCardOf({ t: p.t, province: job.province, draws })
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
      {p.channels.length > 0 && <PnpChannelCard t={p.t} channels={p.channels} />}
      {form === DRAWS_FORM_GROUPS && (
        <PnpDrawGroups t={p.t} lang={lang} province={job.province} draws={draws} hitStreams={drawHitStreamsOf(job)}
          cut={p.cut} open={p.drawOpen} toggleOf={p.drawToggleOf} />
      )}
      {fact != null && <PnpFactCard spec={fact} />}
      {cards}
    </>
  )
}
