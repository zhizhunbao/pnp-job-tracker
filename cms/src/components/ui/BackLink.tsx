// 全站统一返回按钮(Frank 2026-07-18:「返回按钮应该有统一的样式吧 全网站」)。
// 药丸幽灵样式。**不带箭头**(Frank 2026-07-27「带箭头的按钮,把箭头都删掉,不允许使用箭头」)。
// 新增返回入口一律用它,不许裸 <a>。
// 「浏览器返回」的统一行为(Frank 2026-07-28 实报「职位板返回有时候老慢了,而且还不生效」)。
// 不生效的根因:详情页/公司页站内一律用 target="_blank" 打开(jobs/Jd.tsx 与 jobs/Company.tsx 里的外链),
// 新标签页里 `history.length === 1` 且 rel="noreferrer" 抹掉 referrer —— `history.back()` 是**空操作**,
// 用户点了页面纹丝不动(生产实测:history_length=1、点后 URL 不变)。
// 无处可回时落回 fallback;职位板带 ?back=1 回放筛选快照(与详情页 × 同一口径,快照存 localStorage 跨标签页通用)。
export function goBackOr(fallback: string) {
  if (typeof window === 'undefined') return
  if (window.history.length > 1) window.history.back()
  else window.location.href = fallback
}

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <a href={href}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: '1px solid #e5e7eb', background: '#fff', color: '#2563eb', borderRadius: 999, padding: '4px 14px', fontSize: 12.5, textDecoration: 'none', whiteSpace: 'nowrap' }}>
      {label}
    </a>
  )
}
