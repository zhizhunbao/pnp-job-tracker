'use client'
/**
 * auth 域的密码强度条(注册/重置时实时提示):三段条 + 档位文案,档色走
 * .lv0-.lv3 的 --pw-c 变量。强度是引导不是闸门 —— 只有「太短」拦提交。
 * 2026-08-24 自 AuthForm 拆出(一个 tsx 一个组件)。
 *
 * @author Frank
 * @time 2026-08-24 01:30:00
 */
import { cssOf } from '@/components/css'
import { PW_HINT_SEP, PW_METER_KEYS } from './constants'
import { pwStrength } from './functions'
import type { PwMeterIn } from './types'
import css from './auth.module.css'

/**
 * 强度条(三段 + 文案;1、2 档追加「补强提示」)。
 *
 * @param props 翻译函数与当前密码。
 * @returns 强度条。
 */
export function PwMeter({ t, pw }: PwMeterIn) {
  const lv = pwStrength(pw)
  const lvCls: Record<number, string> = {
    0: cssOf(css.lv0),
    1: cssOf(css.lv1),
    2: cssOf(css.lv2),
    3: cssOf(css.lv3),
  }
  const segs = []
  for (let i = 1; i <= 3; i = i + 1) {
    let segCls = css.meterSeg
    if (i <= lv) {
      segCls = `${css.meterSeg} ${css.meterOn}`
    }
    segs.push(<div key={i} className={segCls} />)
  }
  const key = PW_METER_KEYS[lv]
  return (
    <div className={`${css.meter} ${lvCls[lv]}`}>
      <div className={css.meterRow}>{segs}</div>
      <div className={css.meterText}>
        {key != null && t(key)}
        {lv > 0 && lv < 3 && <span className={css.meterHint}>{PW_HINT_SEP}{t('acct.pw.hint')}</span>}
      </div>
    </div>
  )
}
