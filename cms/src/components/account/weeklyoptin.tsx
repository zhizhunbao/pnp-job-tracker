'use client'
/**
 * 周报开关那一行(E9-02b;#113 亮回):勾选框 + 说明,整行可点(label 包着)。
 * 显示语义取反:勾 = 订阅,存的是退订(weeklyOptOut)。
 * 2026-07-25 实证:域名 Verified + FROM=alerts@offer2pr.com + 外部邮箱真实 Delivered。
 * 订阅/退订的 umami 埋点在 functions 的 makeWeeklyToggle 里(E5-07 §3.4 漏斗第 3 步:
 * 周报是留存钩的主力,退订量本身就是信号)。
 * 2026-08-27 换装批自 SavedJobsList.tsx 的开关段提出成文件。
 * 2026-10-06「我的收藏」改成 myjobs 桶的表(Frank「也重新改一下」):本件自带退订态(useWeeklyOptin)并出桶,
 * 页面门把它拼在收藏表下面;原先替它管状态的收藏清单 SavedJobsList 撤了。
 *
 * @author Frank
 * @time 2026-08-27 22:00:00
 */
import { CHECKBOX_TYPE } from './constants'
import { makeWeeklyToggle } from './functions'
import { useWeeklyOptin } from './hooks'
import type { WeeklyOptinIn } from './types'
import css from './account.module.css'

/**
 * 周报开关一行。
 *
 * @param props 登录人 id、库里的退订现状与取词函数(见 WeeklyOptinIn 逐格注释)。
 * @returns 可点的开关行。
 */
export function WeeklyOptin({ userId, weeklyOptOut, t }: WeeklyOptinIn) {
  const w = useWeeklyOptin({ weeklyOptOut })
  return (
    <label className={css.weeklyRow}>
      <input type={CHECKBOX_TYPE}
        checked={w.optOut === false}
        onChange={makeWeeklyToggle({ userId, setOptOut: w.setOptOut })} />
      {t('sj.weekly')}
    </label>
  )
}
