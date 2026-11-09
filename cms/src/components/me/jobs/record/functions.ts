/**
 * 导出求职记录的行为:拼 CSV、触发下载。
 *
 * @author Frank
 * @time 2026-11-09 01:00:00
 */
import {
  CSV_BOM, CSV_EOL, CSV_FORMULA_RE, CSV_MIME, CSV_QUOTE, CSV_QUOTE_ESC, CSV_QUOTE_RE, CSV_SEP, CSV_TEXT_MARK, FILE_HEAD,
  FILE_TAIL, TAG_ANCHOR,
} from './constants'
import type { HasSentIn, RecordCsvIn, RecordDownloadIn, RecordRow } from './types'

/**
 * 一格:防公式注入,再加引号。
 *
 * @param v 原值。
 * @returns CSV 的一格。
 */
export function csvCellOf(v: string): string {
  let safe = v
  if (CSV_FORMULA_RE.test(safe)) {
    safe = CSV_TEXT_MARK + safe
  }
  return CSV_QUOTE + safe.replace(CSV_QUOTE_RE, CSV_QUOTE_ESC) + CSV_QUOTE
}

/**
 * 一行。
 *
 * @param r 一条记录。
 * @returns CSV 的一行。
 */
export function csvLineOf(r: RecordRow): string {
  return [csvCellOf(r.date), csvCellOf(r.title), csvCellOf(r.company), csvCellOf(r.status)].join(CSV_SEP)
}

/**
 * 整份 CSV。
 *
 * @param x 表头与各行。
 * @returns 文件内容。
 */
export function recordCsvOf(x: RecordCsvIn): string {
  const lines = [csvLineOf(x.head)]
  for (const r of x.rows) {
    lines.push(csvLineOf(r))
  }
  return CSV_BOM + lines.join(CSV_EOL) + CSV_EOL
}

/**
 * 触发浏览器下载。
 *
 * @param x 文件内容与日期。
 * @returns 无。
 */
export function downloadRecord(x: RecordDownloadIn): void {
  const url = URL.createObjectURL(new Blob([x.csv], { type: CSV_MIME }))
  const a = document.createElement(TAG_ANCHOR)
  a.href = url
  a.download = FILE_HEAD + x.day + FILE_TAIL
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * 有没有发出过的投递(决定导出钮出不出)。
 *
 * @param x 投递清单与草稿的状态值。
 * @returns 有至少一条。
 */
export function hasSentOf(x: HasSentIn): boolean {
  for (const it of x.items) {
    if (it.stage !== x.draft) {
      return true
    }
  }
  return false
}
