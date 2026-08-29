'use client'
/**
 * 周报开关那一行(E9-02b;#113 亮回):勾选框 + 说明,整行可点(label 包着)。
 * 显示语义取反:勾 = 订阅,存的是退订(weeklyOptOut)。
 * 2026-07-25 实证:域名 Verified + FROM=alerts@offer2pr.com + 外部邮箱真实 Delivered。
 * 订阅/退订的 umami 埋点在 functions 的 makeWeeklyToggle 里(E5-07 §3.4 漏斗第 3 步:
 * 周报是留存钩的主力,退订量本身就是信号)。
 * 2026-08-27 换装批自 SavedJobsList.tsx 的开关段提出成文件。
 *
 * @author Frank
 * @time 2026-08-27 22:00:00
 */
import { CHECKBOX_TYPE } from './constants'
import { makeWeeklyToggle } from './functions'
import type { WeeklyOptinIn } from './types'
import css from './account.module.css'

/**
 * 周报开关一行。
 *
 * @param props 登录人 id、退订态与落格(见 WeeklyOptinIn 逐格注释)。
 * @returns 可点的开关行。
 */
export function WeeklyOptin({ userId, optOut, setOptOut, t }: WeeklyOptinIn) {
  return (
    <label className={css.weeklyRow}>
      <input type={CHECKBOX_TYPE} checked={optOut === false} onChange={makeWeeklyToggle({ userId, setOptOut })} />
      {t('sj.weekly')}
    </label>
  )
}
