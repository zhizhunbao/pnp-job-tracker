'use client'
/**
 * verdict 域的结构:「雇主资质」卡 —— 紧跟「本职位」(2026-08-13 Frank:
 * 「放到申请人条件上面」):岗位侧的事实连排讲完,再进入申请人自己的条件。
 * 市/省分开两块(2026-08-14 Frank「拆成 省 市 两个卡片」——一格塞两级地名是杂糅)。
 * 卡头右上角的「该雇主在招职位」是原裸动作条收进来的(2026-08-13 Frank「这两个是什么东西」);
 * 同批删掉的「全部可行通道」不回来 —— 带岗态它 = 刷回本页去掉岗位,
 * 顶栏「PR 评估」本来就是这个入口。
 * 2026-08-28 换装批自 TripleVerdictModal.tsx 的同名卡片提出成件。
 *
 * @author Frank
 * @time 2026-08-28 17:55:00
 */
import { LinkButton } from '@/components/button'
import { cssOf } from '@/components/css'
import { TEXT_NONE, TRACK_NEXT_EMPLOYER } from './constants'
import { FactTile } from './facttile'
import { VerdictCard } from './verdictcard'
import { VerdictRows } from './verdictrows'
import { cityTextOf, companyJobsHrefOf, empRowsOf, makeTrackClick, provDispOf } from './functions'
import type { EmployerFactsIn } from './types'
import css from './verdict.module.css'

/**
 * 渲染「雇主资质」卡。
 *
 * @param props 取词函数、界面语言、这份岗与判定结果(逐格注释见 EmployerFactsIn)。
 * @returns 雇主事实瓦片与雇主判定行同挤一副栅格的一张卡。
 */
export function EmployerFacts({ t, lang, job, wire }: EmployerFactsIn) {
  return (
    <VerdictCard title={t('tv.g.emp')}
      action={
        <LinkButton href={companyJobsHrefOf({ company: job.company })}
          onClick={makeTrackClick({ event: TRACK_NEXT_EMPLOYER })}
          className={cssOf(css.ghostLink)}>
          {t('tv.next.jobs')}
        </LinkButton>
      }>
      <div className={css.answers}>
        <FactTile label={t('tv.f.employer')} value={job.company} sub={TEXT_NONE} />
        <FactTile label={t('tv.f.city')} value={cityTextOf({ city: job.city })} sub={TEXT_NONE} />
        <FactTile label={t('tv.f.prov')} value={provDispOf({ t, code: job.province })} sub={TEXT_NONE} />
        <VerdictRows t={t} lang={lang} rows={empRowsOf({ wire })} />
      </div>
    </VerdictCard>
  )
}
