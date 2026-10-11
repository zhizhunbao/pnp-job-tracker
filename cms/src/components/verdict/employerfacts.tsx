'use client'
/**
 * verdict 域的结构:「雇主资质」卡 —— 紧跟「本职位」(2026-08-13 Frank:
 * 「放到申请人条件上面」):岗位侧的事实连排讲完,再进入申请人自己的条件。
 * 市/省分开两块(2026-08-14 Frank「拆成 省 市 两个卡片」——一格塞两级地名是杂糅)。
 * 卡头右上角的「该雇主在招职位」是原裸动作条收进来的(2026-08-13 Frank「这两个是什么东西」);
 * 同批删掉的「全部可行通道」不回来 —— 带岗态它 = 刷回本页去掉岗位,
 * 顶栏「PR 评估」本来就是这个入口。
 * 2026-08-28 换装批自 TripleVerdictModal.tsx 的同名卡片提出成件。
 * 2026-10-09 N 批(Frank「名字一律英文在上、译名灰字在下」「省市 分开」「城市 和 省份 点击 跳 google 地图」):
 * 雇主 / 城市 / 省三块换名字瓦片 NameTile —— 雇主走 name 桶 Name(黑字不可点:本岗只带公司名,没有公司页 slug,
 * 也没带公司译名,灰字暂空)、城市走 CityName(带的城市没有译名,灰字暂空)、省走 ProvName(英文省名在上、
 * 界面语省名灰字在下),城市与省点了新标签开 Google 地图;库里没记城市的照旧横杠事实瓦片。
 * 2026-10-11 批 4 全站卡片字段(CLAUDE.md「地点照 Indeed 写一行」,覆盖上面「省市分开」):市、省两个名字并成 name 桶 PlaceName ——
 * 「市, 省码」一行(lib/location placeLineOf;本处数据不带街号)整行一个地图链,中 / 韩界面下面灰字「市译名,省译名」。
 *
 * @author Frank
 * @time 2026-08-28 17:55:00
 */
import { LinkButton } from '@/components/button'
import { cssOf } from '@/components/css'
import { Name, PlaceName } from '@/components/name'
import { placeLineOf } from '@/lib/location'
import { TEXT_NONE, TRACK_NEXT_EMPLOYER } from './constants'
import { NameTile } from './nametile'
import { VerdictCard } from './verdictcard'
import { VerdictRows } from './verdictrows'
import { companyJobsHrefOf, empRowsOf, makeTrackClick } from './functions'
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
        <NameTile label={t('tv.f.employer')}><Name en={job.company} sub={TEXT_NONE} /></NameTile>
        <NameTile label={t('tv.f.place')}>
          <PlaceName line={placeLineOf({ address: TEXT_NONE, city: job.city, province: job.province })}
            cityZh={TEXT_NONE} cityKo={TEXT_NONE} province={job.province} />
        </NameTile>
        <VerdictRows t={t} lang={lang} rows={empRowsOf({ wire })} />
      </div>
    </VerdictCard>
  )
}
