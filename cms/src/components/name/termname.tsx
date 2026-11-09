'use client'
/**
 * 雇佣期两行(2026-10-11 批 4):Permanent / Fixed-term / Seasonal / Casual 英文黑字 + 界面语灰字(数据层归一值);
 * 职位板手机卡、职位框信息卡共用。
 * 2026-10-13 Frank「这两个 中文灰字 去掉吧」:工时 / 雇佣期全站只出英文一行,不出界面语灰字(myjobs 表格 10-12 已先撤)。
 *
 * @author Frank
 * @time 2026-10-11 10:00:00
 */
import { useLang } from '@/components/i18n'
import { TEXT_NONE } from './constants'
import { termNameOf } from './functions'
import { Name } from './name'
import type { KindNameProps } from './types'

/**
 * 雇佣期两行。
 *
 * @param props 归一值。
 * @returns 两行;没标不渲。
 */
export function TermName({ v }: KindNameProps) {
  const [lang, , t] = useLang()
  const n = termNameOf({ v, lang, t })
  if (n.en === TEXT_NONE) {
    return null
  }
  return <Name en={n.en} sub={TEXT_NONE} />
}
