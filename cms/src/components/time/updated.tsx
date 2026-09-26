'use client'
/**
 * time 域的「更新时间 …」那一行:全站表格与会更新的数据区右上角**唯一**的更新时间形
 * (2026-09-03 Frank「所有的 table 和可以更新数据的地方,右上角都应该有一个更新时间」)。
 * 时间源全站一个:ETL 心跳 `checkedAt`(每轮跑完时刻,页面门 SSR 取好经 props 递到这)——
 * 2026-07-26 Frank 拍板的口径,不按各表自算「最新一行」(凌晨无新数据时冻住像站死了)。
 * 空串 = 还没拿到,整行不出(不渲「更新时间 —」这种半句)。
 * 收拢前:jobs 筛选行 / rankings 榜头两处各写各的句与灰,其余 18 处 Table 干脆没有。
 * 2026-09-26 /fe 首页 Frank 看效果图点头(手机职位板头一行「Updated 12:57」):加窄屏短写档(narrowShort)——
 * 两句同出、按断点各显一句(CSS 双渲染,零水合差异);不传照旧只出写全的那一句。
 *
 * @author Frank
 * @time 2026-09-03 16:00:00
 */
import { fmtLocal, fmtLocalShort } from '@/lib/time'
import { EMPTY_ISO, KEY_UPDATED } from './constants'
import type { UpdatedIn } from './types'
import css from './time.module.css'

/**
 * 「更新时间 YYYY-MM-DD HH:mm」一行(靠右、灰小字、不折行);开了窄屏短写,窄屏换成「更新时间 HH:mm」
 * (不是当天写「月-日 时刻」)。
 *
 * @param props ISO 串、取词函数与窄屏短写开没开。
 * @returns 一行文本;还没拿到时间时不渲。
 */
export function Updated({ iso, t, narrowShort = false }: UpdatedIn) {
  if (iso === EMPTY_ISO) {
    return null
  }
  const full = t(KEY_UPDATED, { t: fmtLocal(iso) })
  if (narrowShort === false) {
    return (
      <div className={css.updated} suppressHydrationWarning>{full}</div>
    )
  }
  // eslint-disable-next-line react-hooks/purity -- 分钟粒度的事实:Date.now 渲染间漂移只在跨零点那一下改输出,由两句各自的 suppressHydrationWarning 兜住
  const short = t(KEY_UPDATED, { t: fmtLocalShort({ iso, now: Date.now() }) })
  return (
    <div className={css.updated}>
      <span className={css.updatedFull} suppressHydrationWarning>{full}</span>
      <span className={css.updatedShort} suppressHydrationWarning>{short}</span>
    </div>
  )
}
