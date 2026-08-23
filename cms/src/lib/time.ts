/**
 * 时间显示词汇(基建叶子,同 template.ts):库里存 UTC ISO,页面一律按多伦多时区渲染(站点面向加拿大求职者,
 * 不跟随访客本地时区)。解析失败退原串截断 —— 宁可显示得难看,不要显示 Invalid Date。
 *
 * @author Frank
 * @time 2026-08-22 19:27:15
 */

/**
 * 到分(列表「更新时间」页脚等)。
 *
 * @param iso 库里的 UTC ISO 串。
 * @returns 多伦多时区 'YYYY-MM-DD HH:mm';解析不了退原串截断。
 */
export function fmtLocal(iso: string): string {
  try {
    return new Date(iso).toLocaleString('sv-SE', { timeZone: 'America/Toronto', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
  } catch {
    return (iso || '').slice(0, 16).replace('T', ' ')
  }
}

/**
 * 同上但带秒(「最近看到」列要看到时分秒)。
 *
 * @param iso 库里的 UTC ISO 串。
 * @returns 多伦多时区 'YYYY-MM-DD HH:mm:ss';解析不了退原串截断。
 */
export function fmtLocalSec(iso: string): string {
  try {
    return new Date(iso).toLocaleString('sv-SE', { timeZone: 'America/Toronto', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
  } catch {
    return (iso || '').slice(0, 19).replace('T', ' ')
  }
}
