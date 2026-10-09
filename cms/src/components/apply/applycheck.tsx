'use client'
/**
 * 发出前逐项检查(2026-10-08 Frank「再投递之前 有让用户一项一项检查吗」):收件人、简历、求职信、署名一行一项,
 * 每行一个勾、灰字项名、值,简历与求职信带「打开看」;四项全勾才放行。手动投递第 3 步与「今日待投」共用这一个(queue 桶从本桶取)。
 * 同日 Frank「看着不乱吗」改两层:上层勾 + 灰字项名 + 右端「打开看」,下层值占满整行(手机上文件名不再断在词中间、链接不折行)。
 *
 * @author Frank
 * @time 2026-10-08 21:00:00
 */
import { LinkButton } from '@/components/button'
import { INPUT_CHECKBOX, TARGET_BLANK, TEXT_NONE } from './constants'
import { breakPartsOf } from './functions'
import type { ApplyCheckIn } from './types'
import css from './apply.module.css'

/**
 * 逐项检查四行。
 *
 * @param props 取词函数、四行、已勾的项与勾选手柄。
 * @returns 一列勾选行。
 */
export function ApplyCheck({ t, rows, ticks, onTick }: ApplyCheckIn) {
  const out = []
  for (const r of rows) {
    const value = []
    for (const [i, part] of breakPartsOf(r.value).entries()) {
      value.push(<span key={i}>{part}<wbr /></span>)
    }
    out.push(
      <label key={r.key} className={css.check}>
        <input type={INPUT_CHECKBOX}
          className={css.checkBox}
          checked={ticks.includes(r.key)}
          onChange={onTick(r.key)} />
        <span className={css.checkLabel}>{t(r.key)}</span>
        {r.href !== TEXT_NONE && (
          <LinkButton href={r.href} target={TARGET_BLANK} className={css.checkLink}>{t(r.linkKey)}</LinkButton>
        )}
        <span className={css.checkValue}>{value}</span>
      </label>,
    )
  }
  return <div className={css.checks}>{out}</div>
}
