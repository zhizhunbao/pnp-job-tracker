'use client'
/**
 * 域内小件:改制省的现行规则(项 | 内容 两列左对齐)。
 * Frank 2026-07-26 二拍「老的历史记录删了吧,改成最新的打分规则」之后,改制省的抽选卡列的
 * 就是这块 —— 已关闭通道的历史不再铺,规则行是人工登记的政策事实(登记表在 constants)。
 * 2026-08-28 换装批自 Pnp.tsx 的 PnpDrawsBlock 拆出成文件。
 *
 * @author Frank
 * @time 2026-08-28 17:59:16
 */
import { Grid } from '@/components/grid'
import { REFORM_COLS } from './constants'
import type { ReformRulesIn } from './types'
import css from './pnp.module.css'

/**
 * 渲染现行规则两列表。
 *
 * @param props 取词函数与本省的改制登记。
 * @returns 两列表。
 */
export function ReformRules({ t, reform }: ReformRulesIn) {
  const cells = []
  for (const [k, v] of reform.rules) {
    cells.push(<span key={k} className={css.ruleK}>{t(k)}</span>)
    cells.push(<span key={v} className={css.ruleV}>{t(v)}</span>)
  }
  return (
    <div className={css.reform}>
      <Grid cols={REFORM_COLS}>{cells}</Grid>
    </div>
  )
}
