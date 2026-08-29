'use client'
/**
 * 域内小件:最近抽选那一行的文字(分数线 / 日期 / 邀请数,外加历史轮次的折叠记号)。
 * 单拎成件是因为这一行有两种壳:有历史可展开时它是一颗钮,没有时仍是一层 div —— 文字只有一份。
 * 2026-08-28 换装批自 Pnp.tsx 的 EeCategorySection 拆出成文件。
 *
 * @author Frank
 * @time 2026-08-28 17:59:16
 */
import { caretOf, eeDrawTextOf } from './functions'
import type { EeDrawTextIn } from './types'
import css from './pnp.module.css'

/**
 * 渲染最近抽选那一行的文字。
 *
 * @param props 取词函数、这个类别、历史轮次条数与展开态。
 * @returns 抽选话术 + 折叠记号。
 */
export function EeDrawText({ t, cat, histCount, open, expandable }: EeDrawTextIn) {
  return (
    <>
      {eeDrawTextOf({ t, cat })}
      {expandable && (
        <span className={css.histTog}>{caretOf(open)} {t('eelist.hist', { n: histCount })}</span>
      )}
    </>
  )
}
