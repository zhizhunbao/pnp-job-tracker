'use client'
/**
 * apply 桶的「接着投这几个」一行(2026-11-09):职位名(点了弹职位框)、公司、地点一行,右边「投递」原地换成这一岗的投递框。
 *
 * @author Frank
 * @time 2026-11-09 16:00:00
 */
import { Button } from '@/components/button'
import { CompanyName, JobName, PlaceName, subOf } from '@/components/name'
import { placeLineOf } from '@/lib/location'
import { NEXT_BTN_KEY, NEXT_BTN_KIND } from './constants'
import { makeNextApply } from './functions'
import type { NextPickRowIn } from './types'
import css from './apply.module.css'

/**
 * 一行职位。
 *
 * 2026-11-09 第一条换成主按钮「下一个:职位名」,单占一行铺满;其余照旧是次要钮「投递」。
 * 2026-11-13 Frank「下面不是有 apply 了吗」「还有必要弄这个吗」:第一条的主按钮撤,每一条同一个形。
 *
 * @param props 这一行、界面语、第几条与取词。
 * @returns 一行。
 */
export function NextPickRow({ p, lang, pos, t }: NextPickRowIn) {
  return (
    <div className={css.nextRow}>
      <div className={css.nextMain}>
        <JobName id={p.id} title={p.title} sub={subOf({ lang, zh: p.titleZh, ko: p.titleKo })} />
        <CompanyName name={p.company} slug={p.companySlug} zh={p.companyZh} ko={p.companyKo} />
        <PlaceName line={placeLineOf({ address: p.address, city: p.city, province: p.province })}
          cityZh={p.cityZh} cityKo={p.cityKo} province={p.province} />
      </div>
      <Button kind={NEXT_BTN_KIND} sm onClick={makeNextApply({ jobId: p.id, pos })}>{t(NEXT_BTN_KEY)}</Button>
    </div>
  )
}
