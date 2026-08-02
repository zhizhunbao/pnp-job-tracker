// 列宽 cookie 的读写约定:**服务端和客户端都要用**,所以单独放这一个不带 hook 的文件
// (colWidths.ts 里有 useEffect,服务端 page.tsx 一 import 就报「Server Component 不能引 hook」)。
// 规则本身仍只在 colWidths.ts 一处,这里只有「cookie 叫什么、怎么解析」两件事。

export const COLW_COOKIE = 'jt.colw.v1'

/** cookie 里存的「上次算出来的列宽比例」:keys 对得上才敢用(列集变了就作废) */
export type ColWidthSeed = { keys: string; pct: number[] }

/**
 * 头回来的人没有 cookie(88% 流量来自搜索,大多是头回),给一份默认比例兜底:
 * 首屏就按它定版式,水合后换成真量出来的像素——差几个像素,不会像「自动布局→固定布局」
 * 那样整表抻一下(实测 CLS 0.087 → 0.008)。
 * 数值 = 2026-08-03 默认列集在 1440 视口实测比例;**keys 必须与 DEFAULT_COLS 一致**,
 * 对不上会被 useColWidths 直接忽略(退回今天的行为),所以改列集这里忘了改也不会出错。
 */
export const DEFAULT_COLW_SEED: ColWidthSeed = {
  keys: 'datePosted,broad,company,title,province,city,salary,salaryYr,vsMedian,actions',
  pct: [6.69, 9.83, 20.77, 14.79, 9.6, 9.36, 8.26, 5.82, 7.32, 7.55],
}

/** 解析 cookie 值 → 种子;脏数据/对不上一律当没有 */
export function parseColWidthSeed(raw: string | undefined | null): ColWidthSeed | null {
  if (!raw) return null
  try {
    const s = JSON.parse(decodeURIComponent(raw))
    if (typeof s?.keys === 'string' && Array.isArray(s?.pct) && s.pct.length === s.keys.split(',').length
      && s.pct.every((n: unknown) => typeof n === 'number' && n > 0 && n < 100)) return s as ColWidthSeed
  } catch { /* ignore */ }
  return null
}
