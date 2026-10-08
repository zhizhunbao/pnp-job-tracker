'use client'
/**
 * 第 1 步:简历 + 英文姓名(与简历一致)。
 * 2026-10-07 二改(Frank「我的简历 我的 cover letter 是不是要跟着已投职位走」→ 按岗选简历):不再整张照搬「我的简历」卡片
 * (那样只能附默认那份),改成本人几份简历点选一份(默认那份先选中),旁边就地「添加简历」(传到「我的简历」同一个接口)。
 *
 * @author Frank
 * @time 2026-10-07 03:00:00
 */
import { Button } from '@/components/button'
import { ApplyFileInput } from './applyfileinput'
import { ApplyPick } from './applypick'
import { ADD_KEY, AUTOCOMPLETE_NAME, BTN_GHOST, NAME_MAX_LEN, UP_SUB_KEY } from './constants'
import type { ApplyStepIn } from './types'
import css from './apply.module.css'

/**
 * 第 1 步。
 *
 * @param props 整机面板。
 * @returns 简历点选、添加与英文姓名一行。
 */
export function ApplyResume({ p }: ApplyStepIn) {
  const rows = []
  for (const r of p.resumes) {
    rows.push(<ApplyPick key={r.id} r={r} checked={r.id === p.resumeId} onPick={p.pickOf(r.id)} t={p.t} />)
  }
  return (
    <>
      <div className={css.h2}>{p.t('ap.resume')}</div>
      <div className={css.picks}>{rows}</div>
      <div className={css.addRow}>
        <Button kind={BTN_GHOST} sm onClick={p.onAdd} busy={p.uploading}>{p.t(ADD_KEY)}</Button>
        <span className={css.pickNote}>{p.t(UP_SUB_KEY)}</span>
        <ApplyFileInput onMount={p.onInputMount} onPick={p.onFile} />
      </div>
      <label className={css.field}>
        {p.t('ap.name')}
        <input className={css.input} value={p.name} onChange={p.onName} autoComplete={AUTOCOMPLETE_NAME}
          maxLength={NAME_MAX_LEN} />
      </label>
    </>
  )
}
