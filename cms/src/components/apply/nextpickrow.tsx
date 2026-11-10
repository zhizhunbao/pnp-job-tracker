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
import { NEXT_BTN_KEY, NEXT_BTN_KIND, NEXT_KIND_MAIN } from './constants'
import { makeNextApply } from './functions'
import type { NextPickRowIn } from './types'
import css from './apply.module.css'

/**
 * 一行职位。
 *
 * 2026-11-09 第一条换成主按钮「下一个:职位名」,单占一行铺满;其余照旧是次要钮「投递」。
 *
 * @param props 这一行、界面语、是不是第一条与取词。
 * @returns 一行。
 */
export function NextPickRow({ p, lang, first, t }: NextPickRowIn) {
  if (first) {
    return (
      <div className={`${css.nextRow} ${css.nextRowMain}`}>
        <div className={css.nextMain}>
          <CompanyName name={p.company} slug={p.companySlug} zh={p.companyZh} ko={p.companyKo} />
          <PlaceName line={placeLineOf({ address: p.address, city: p.city, province: p.province })}
            cityZh={p.cityZh} cityKo={p.cityKo} province={p.province} />
        </div>
        <Button kind={NEXT_KIND_MAIN} onClick={makeNextApply(p.id)}>{t('ap.nextOne', { title: p.title })}</Button>
      </div>
    )
  }
  return (
    <div className={css.nextRow}>
      <div className={css.nextMain}>
        <JobName id={p.id} title={p.title} sub={subOf({ lang, zh: p.titleZh, ko: p.titleKo })} />
        <CompanyName name={p.company} slug={p.companySlug} zh={p.companyZh} ko={p.companyKo} />
        <PlaceName line={placeLineOf({ address: p.address, city: p.city, province: p.province })}
          cityZh={p.cityZh} cityKo={p.cityKo} province={p.province} />
      </div>
      <Button kind={NEXT_BTN_KIND} sm onClick={makeNextApply(p.id)}>{t(NEXT_BTN_KEY)}</Button>
    </div>
  )
}
