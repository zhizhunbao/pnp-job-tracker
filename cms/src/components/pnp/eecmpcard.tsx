'use client'
/**
 * 域内小件:EE 分数线对比卡(本岗类别最近一轮 vs CEC 最近一轮 + 分差)。
 * 2026-09-23 Frank「先改这个 EE 类别。加个卡,对比最近走 EE CEC 分和单独走医疗社服的分」:
 * 抽选行照抄省抽选表的行形(DrawRow,手机两行),分差一行一条,低于 CEC 绿字。
 * 同日第二版(「这个我觉得都列全了,分开列,然后带展开,收缩。而且可以简单看到对比的」「EE 基本就这三个对比就可以了吧」):
 * 本岗类别 / CEC / 法语三组分开列,默认全收 —— 组头一行就是最近一轮,三组分数上下对齐一眼可比;点开列全部轮次。
 *
 * @author Frank
 * @time 2026-09-23 22:40:00
 */
import { EeCmpGroupView } from './eecmpgroupview'
import { cmpLineClsOf } from './functions'
import type { EeCmpCardIn } from './types'
import css from './pnp.module.css'

/**
 * 渲染 EE 分数线对比卡。
 *
 * @param props 取词函数、洗好的对比、展开着的组与开合手柄工厂。
 * @returns 对比卡。
 */
export function EeCmpCard({ t, cmp, open, toggleOf }: EeCmpCardIn) {
  const groups = []
  for (const g of cmp.groups) {
    groups.push(<EeCmpGroupView key={g.key} g={g} open={open.has(g.key)} onToggle={toggleOf(g.key)} />)
  }
  const lines = []
  for (const l of cmp.lines) {
    lines.push(<div key={l.key} className={cmpLineClsOf({ lower: l.lower })}>{l.text}</div>)
  }
  return (
    <div className={css.card}>
      <div className={css.cardHead}>{t('eecmp.title')}</div>
      {groups}
      {lines}
    </div>
  )
}
