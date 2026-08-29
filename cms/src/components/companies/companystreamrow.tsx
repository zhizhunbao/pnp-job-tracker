'use client'
/**
 * 担保记录里的一股(股别名 | 份数 | 空格):技能股绿字带「技能类」标签,
 * 份数加粗;其余股灰字常规。技能股 = High Wage / GTS / PR,match.ts 口径 ——
 * 🔴 前端只展示不判定。
 * 2026-08-28 拆域批自 jobs/Company.tsx 的 streams.flatMap 体重写成件。
 *
 * @author Frank
 * @time 2026-08-28 18:13:09
 */
import { cssOf } from '@/components/css'
import { CLS_SEP } from './constants'
import type { CompanyStreamRowIn } from './types'
import css from './companies.module.css'

/**
 * 一股担保记录(三个格子,由外层网格排列)。
 *
 * @param props 这一股与取词函数(逐格注释见 CompanyStreamRowIn)。
 * @returns 三个格子。
 */
export function CompanyStreamRow({ stream, t }: CompanyStreamRowIn) {
  let nameCls = cssOf(css.spUnskilled)
  let numCls = cssOf(css.factV) + CLS_SEP + cssOf(css.spN)
  if (stream.skilled) {
    nameCls = cssOf(css.spSkilled)
    numCls = cssOf(css.factV) + CLS_SEP + cssOf(css.spN) + CLS_SEP + cssOf(css.spNOn)
  }
  return (
    <>
      <span className={nameCls}>
        {stream.label}
        {stream.skilled && <span className={css.spTag}>{t('co.spSkilledTag')}</span>}
      </span>
      <span className={numCls}>{stream.count}</span>
      <span />
    </>
  )
}
