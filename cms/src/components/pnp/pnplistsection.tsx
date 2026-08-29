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
 *
 * @author Frank
 * @time 2026-08-28 17:59:16
 */
import { TvEntryCard } from '@/components/verdict'
import { SRC_PNP } from './constants'
import { hasProvDraws, hasProvNews, makeTvOpen, pnpVerdictOf, shownStreamsOf, streamKeyOf } from './functions'
import { usePnpList } from './hooks'
import { NewsLatestBlock } from './newslatestblock'
import { PnpDrawsBlock } from './pnpdrawsblock'
import { PnpVerdictCard } from './pnpverdictcard'
import { SponsorLeadCard } from './sponsorleadcard'
import { StreamCard } from './streamcard'
import type { PnpListSectionIn } from './types'
import css from './pnp.module.css'

/**
 * 渲染省提名事实区块。
 *
 * @param props 本岗、界面语言、清单、抽选、动态与两个显示开关(逐格注释见 PnpListSectionIn)。
 * @returns 一组卡片。
 */
export function PnpListSection({ job, lang, occ, draws, news, nocDesc = [], showZh = true }: PnpListSectionIn) {
  const p = usePnpList({ job, lang, occ, nocDesc })
  const cards = []
  for (const s of shownStreamsOf({ match: p.match, noc: job.noc })) {
    const key = streamKeyOf(s)
    cards.push(<StreamCard key={key}
      t={p.t}
      lang={lang}
      showZh={showZh}
      stream={s}
      noc={job.noc}
      nocRows={p.nocRows}
      open={p.open.has(key)}
      onToggle={p.toggleOf(key)}
      matchRef={p.matchRef} />)
  }
  return (
    <>
      <PnpVerdictCard t={p.t} verdict={pnpVerdictOf({ t: p.t, job, match: p.match })} />
      <TvEntryCard t={p.t} onOpen={makeTvOpen({ id: job.id })} />
      <SponsorLeadCard job={job} t={p.t} src={SRC_PNP} />
      {hasProvDraws({ job, draws }) && (
        <div className={css.card}><PnpDrawsBlock province={job.province} lang={lang} draws={draws} /></div>
      )}
      {hasProvNews({ job, news }) && (
        <div className={css.card}><NewsLatestBlock province={job.province} lang={lang} news={news} /></div>
      )}
      {cards}
    </>
  )
}
