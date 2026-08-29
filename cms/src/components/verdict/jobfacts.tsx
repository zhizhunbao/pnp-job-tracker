'use client'
/**
 * verdict 域的结构:「本职位」卡 —— 判的是哪一份岗。事实摆成与「申请人条件」同款瓦片
 * (同一页上同一种东西一个长相);职业匹配的判定行并在同卡尾部
 * (2026-08-13 Frank:「这两个也合一起吧」——它们判的就是这份岗的职业,不另立一张卡)。
 * 职位名收成第一块瓦片(同日 Frank:「为什么有两个 title」——卡标题「本职位」下
 * 再挂一行加粗岗位名,看着就是双标题);雇主/地点两块归「雇主资质」卡
 * (同日 Frank:「这两个是不是应该放到雇主那里」)。
 * 卡头右上角那条链接是原先浮在卡片之间的裸「下一步」动作条收进来的
 * (2026-08-13 Frank「这两个是什么东西」)。
 * 2026-08-28 换装批自 TripleVerdictModal.tsx 的同名卡片提出成件。
 *
 * @author Frank
 * @time 2026-08-28 17:55:00
 */
import { LinkButton } from '@/components/button'
import { cssOf } from '@/components/css'
import { TEXT_NONE, TRACK_OPEN_JOB } from './constants'
import { FactTile } from './facttile'
import { VerdictCard } from './verdictcard'
import { VerdictRows } from './verdictrows'
import {
  answersTopClsOf, jobHrefOf, makeTrackClick, nocTextOf, occRowsOf, teerTextOf, titleTileOf,
} from './functions'
import type { JobFactsIn } from './types'
import css from './verdict.module.css'

/**
 * 渲染「本职位」卡。
 *
 * @param props 取词函数、界面语言、这份岗与判定结果(逐格注释见 JobFactsIn)。
 * @returns 事实瓦片与职业判定行同挤一副栅格的一张卡。
 */
export function JobFacts({ t, lang, job, wire }: JobFactsIn) {
  const title = titleTileOf({ lang, wire, title: job.title })
  return (
    <VerdictCard title={t('tv.c.job')}
      action={
        <LinkButton href={jobHrefOf({ id: job.id })}
          onClick={makeTrackClick({ event: TRACK_OPEN_JOB })}
          className={cssOf(css.ghostLink)}>
          {t('tv.c.jobOpen')}
        </LinkButton>
      }>
      <div className={answersTopClsOf()}>
        <FactTile label={t('tv.f.title')} value={title.value} sub={title.sub} />
        <FactTile label={t('tv.f.noc')} value={nocTextOf({ wire })} sub={TEXT_NONE} />
        <FactTile label={t('tv.f.teer')} value={teerTextOf({ wire })} sub={TEXT_NONE} />
        <VerdictRows t={t} lang={lang} rows={occRowsOf({ wire })} />
      </div>
    </VerdictCard>
  )
}
