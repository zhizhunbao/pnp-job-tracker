'use client'
/**
 * coop 组件域的状态机器:useCoop 一台管校内板正文(取词 + 洗行 + 副题);零可变状态(全量在 SSR 行里,
 * 排序 / 分页交给通用表格件)。体内不留函数体,步骤全在 ./functions。
 *
 * @author Frank
 * @time 2026-09-13 20:30:00
 */
import { useLang } from '@/components/i18n'
import { coopSubOf, toCoopCellRows } from './functions'
import type { CoopIn, CoopPanel } from './types'

/**
 * 校内板整机:取词 + 展示行 + 副题 + 空态。
 *
 * @param x SSR 行与更新时刻。
 * @returns 视图要的整块面板。
 */
export function useCoop(x: CoopIn): CoopPanel {
  const [, , t] = useLang()
  return {
    t,
    rows: toCoopCellRows({ rows: x.rows, t }),
    sub: coopSubOf({ t, n: x.rows.length }),
    empty: t('coop.empty'),
    updatedAt: x.updatedAt,
  }
}
