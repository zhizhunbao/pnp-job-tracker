'use client'
/**
 * 我的求职(E9-01 最小求职看板)的拼装件:收藏岗清单(SavedJobRow)+ 周报开关
 * (WeeklyOptin)。数据 = Payload REST /api/saved-jobs(access 本人);title/company
 * 用快照,岗位下架后仍可读。#62A:variant='favs' = 「我的收藏」独立节 —— 同一份
 * 收藏数据的纯列表视图(无状态下拉/周报开关),抬头两套键由 sjTitleKeysOf 二选一。
 * 状态机器住 hooks 的 useSavedJobs;还在拉时清单区什么都不渲(加载区占位由行高兜)。
 * 2026-08-27 换装批自 SavedJobsList.tsx(PascalCase 迁移存量)整体重写。
 *
 * @author Frank
 * @time 2026-08-27 22:00:00
 */
import { sjTitleKeysOf } from './functions'
import { useSavedJobs } from './hooks'
import { SavedJobRow } from './savedjobrow'
import type { SavedJobsListIn } from './types'
import { WeeklyOptin } from './weeklyoptin'
import css from './account.module.css'

/**
 * 收藏岗清单节。
 *
 * @param props 取词函数、登录人 id、周报现状与视图档(见 SavedJobsListIn 逐格注释)。
 * @returns 收藏节整块。
 */
export function SavedJobsList({ t, userId, weeklyOptOut, variant }: SavedJobsListIn) {
  const favs = variant != null
  let weekly = null
  if (weeklyOptOut != null) {
    weekly = weeklyOptOut
  }
  const p = useSavedJobs({ weeklyOptOut: weekly })
  const keys = sjTitleKeysOf({ favs })
  let body = null
  if (p.items != null) {
    if (p.items.length === 0) {
      body = <div className={css.sjEmpty}>{t('sj.empty')}</div>
    } else {
      const rows = []
      for (const row of p.items) {
        rows.push(
          <SavedJobRow key={row.id} row={row} favs={favs} items={p.items} setItems={p.setItems} t={t} />,
        )
      }
      body = <div className={css.sjList}>{rows}</div>
    }
  }
  return (
    <div>
      <div className={css.secTitle}>{t(keys.title)}</div>
      <div className={css.secHint}>{t(keys.note)}</div>
      {body}
      {favs === false && userId != null && (
        <WeeklyOptin userId={userId} optOut={p.optOut} setOptOut={p.setOptOut} t={t} />
      )}
    </div>
  )
}
