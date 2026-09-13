'use client'
/**
 * resources 页面域的一件:「通道门槛」段 —— 官方入口卡之下,每个联邦通道 / 每省一张折叠卡,
 * 数据来自 pnp_requirements(一行一条官方门槛,quote-anchored)。空清单整段不出。
 * 挂载后按地址栏 hash 展开对应卡(把脉页抽选表「门槛」钮直链;2026-09-13)。
 *
 * @author Frank
 * @time 2026-09-06 23:30:00
 */
import { useRuleHashOpen } from './hooks'
import { ResRuleCard } from './resrulecard'
import type { ResRulesIn } from './types'
import css from './resources.module.css'

/**
 * 渲染通道门槛段。
 *
 * @param props 取词函数与分组清单。
 * @returns 段;没有分组则 null。
 */
export function ResRules({ t, groups }: ResRulesIn) {
  useRuleHashOpen()
  if (groups.length === 0) {
    return null
  }
  const cards = []
  for (const g of groups) {
    cards.push(<ResRuleCard key={g.key} t={t} group={g} />)
  }
  return (
    <section className={css.section}>
      <h2 className={css.catTitle}>{t('res.rules')}</h2>
      <div className={css.ruleGrid}>{cards}</div>
    </section>
  )
}
