// 时间显示:库里存 UTC ISO,页面一律按多伦多时区渲染(站点面向加拿大求职者,不跟随访客本地时区)。
// 解析失败退原串截断 —— 宁可显示得难看,不要显示 Invalid Date。

/** 到分(列表「更新时间」页脚等) */
export const fmtLocal = (iso: string): string => {
  try {
    return new Date(iso).toLocaleString('sv-SE', { timeZone: 'America/Toronto', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
  } catch { return (iso || '').slice(0, 16).replace('T', ' ') }
}
/** 同上但带秒(「最近看到」列要看到时分秒) */
export const fmtLocalSec = (iso: string): string => {
  try {
    return new Date(iso).toLocaleString('sv-SE', { timeZone: 'America/Toronto', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
  } catch { return (iso || '').slice(0, 19).replace('T', ' ') }
}
