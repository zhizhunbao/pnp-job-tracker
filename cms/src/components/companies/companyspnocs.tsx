'use client'
/**
 * 获批职业拆分(#286,Frank 2026-08-08「有哪些岗也不知道」):近两年窗口,
 * 与上方获批数同口径;数据没灌时整块不出(容缺自激活)。Top 6 逐行,余量并一行;
 * 职业名走界面语言、没名字的渲裸码。
 * 不用通用 Grid:它的 max-content 名列遇英文长职业名会把数值列挤出 375 屏
 * (效果图实撞)—— 名列 minmax(0,1fr) 可折行(禁截断 → 折行,#268 同判),数值列恒右。
 * 2026-08-28 拆域批自 jobs/Company.tsx 的立即执行段重写成件。
 *
 * @author Frank
 * @time 2026-08-28 18:13:09
 */
import { Fragment } from 'react'
import { cssOf } from '@/components/css'
import { CLS_SEP, TEXT_NONE } from './constants'
import { lmiaNocNameOf, restNocsOf, restPositionsOf, topNocsOf } from './functions'
import type { CompanySpNocsIn } from './types'
import css from './companies.module.css'

/**
 * 获批职业拆分。
 *
 * @param props 获批职业行、取词函数与界面语言(逐格注释见 CompanySpNocsIn)。
 * @returns 小标题 + 两列网格。
 */
export function CompanySpNocs({ rows, t, lang }: CompanySpNocsIn) {
  const rest = restNocsOf({ rows })
  const cells = []
  for (const row of topNocsOf({ rows })) {
    const name = lmiaNocNameOf({ row, lang })
    cells.push(
      <Fragment key={row.noc}>
        <span className={css.nocName}>
          {name === TEXT_NONE && row.noc}
          {name !== TEXT_NONE && name}
          {name !== TEXT_NONE && <span className={css.nocCode}>{row.noc}</span>}
        </span>
        <span className={cssOf(css.factV) + CLS_SEP + cssOf(css.nocNum)}>{row.positions}</span>
      </Fragment>,
    )
  }
  return (
    <>
      <div className={cssOf(css.hr) + CLS_SEP + cssOf(css.hrTight)} />
      <div className={css.nocsHead}>{t('co.spNocs')}</div>
      <div className={css.nocs}>
        {cells}
        {rest.length > 0 && (
          <>
            <span className={css.nocRest}>{t('co.spNocRest', { n: rest.length })}</span>
            <span className={cssOf(css.factV) + CLS_SEP + cssOf(css.nocRestNum)}>{restPositionsOf({ rest })}</span>
          </>
        )}
      </div>
    </>
  )
}
