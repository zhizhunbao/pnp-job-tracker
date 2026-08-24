/**
 * backlink 域的纯函数(零 JSX 零 hook)。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */

/**
 * 「浏览器返回」的统一行为(2026-07-28 Frank 实报「职位板返回有时候老慢了,而且还不生效」)。
 * 不生效的根因:详情页/公司页站内一律 target="_blank" 打开,新标签页里
 * `history.length === 1` 且 rel="noreferrer" 抹掉 referrer —— `history.back()` 是**空操作**,
 * 用户点了页面纹丝不动(生产实测:history_length=1、点后 URL 不变)。
 * 无处可回时落回 fallback;职位板带 ?back=1 回放筛选快照(与详情页 × 同一口径,
 * 快照存 localStorage 跨标签页通用)。
 *
 * @param fallback 无历史可回时跳转的地址。
 * @returns 无。
 */
export function goBackOr(fallback: string) {
  if (typeof window === 'undefined') {
    return
  }
  if (window.history.length > 1) {
    window.history.back()
  } else {
    window.location.href = fallback
  }
}
