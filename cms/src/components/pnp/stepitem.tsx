'use client'
/**
 * 域内小件:「申请步骤」卡的一步 —— 编号圆点 + 步骤名(带「谁做」小胶囊,不需要的步骤不带)+ 事实行 + 可选的下挂小表(萨省收件窗口,QuotaGrid)。
 * 不需要的整步灰字、卡点的圆点橙(stepClsOf);卡人的条件橙字(stepLineClsOf)。2026-10-02 申请步骤批 1。
 * 同日批 2:引用 draws 的那一步下挂抽选表(DrawGroupsBody,与抽选卡同一份),抽选表的「来源」钮挂在步骤名那一行右端。
 *
 * @author Frank
 * @time 2026-10-02 22:30:00
 */
import { Button } from '@/components/button'
import { KEY_SEP, SRC_BTN_KIND, TARGET_BLANK } from './constants'
import { DrawGroupsBody } from './drawgroupsbody'
import { stepClsOf, stepLineClsOf } from './functions'
import { QuotaGrid } from './quotagrid'
import type { StepItemIn } from './types'
import css from './pnp.module.css'

/**
 * 渲染一步。
 *
 * @param props 洗好的一步、取词函数、抽选表与它的开合。
 * @returns 列表项。
 */
export function StepItem({ step, t, draws, open, toggleOf }: StepItemIn) {
  const lines = []
  let i = 0
  for (const line of step.lines) {
    lines.push(<div key={step.key + KEY_SEP + String(i)} className={stepLineClsOf(line)}>{line.text}</div>)
    i += 1
  }
  return (
    <li className={stepClsOf(step)}>
      <span className={css.stepDot}>{step.n}</span>
      <div className={css.stepBody}>
        <div className={css.stepName}>
          {step.name}
          {step.none === false && <span className={css.stepWho}>{step.who}</span>}
          {step.draws && draws != null && draws.source != null && (
            <span className={css.stepSrc}>
              <Button kind={SRC_BTN_KIND} sm href={draws.source.href} target={TARGET_BLANK}>{draws.source.text}</Button>
            </span>
          )}
        </div>
        {lines}
        {step.table != null && (
          <div className={css.stepTable}>
            <QuotaGrid corner={step.table.corner} heads={step.table.heads} rows={step.table.rows} asOf={[]} />
          </div>
        )}
        {step.draws && draws != null && (
          <div className={css.stepTable}>
            <DrawGroupsBody t={t} card={draws} open={open} toggleOf={toggleOf} />
          </div>
        )}
      </div>
    </li>
  )
}
