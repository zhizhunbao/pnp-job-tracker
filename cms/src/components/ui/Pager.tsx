'use client'
// 翻页行(总数 + ‹ x/y ›):Table 内置页脚用,OccBoard 手机卡片列表也复用同一个
export function Pager({ page, max, note, onPage }: {
  page: number; max: number; note?: React.ReactNode; onPage: (p: number) => void
}) {
  // 样式全在 main.css 第 8 段。禁用态走 CSS 的 :disabled —— 原来这里有个返回样式对象的
  // btn(disabled) 函数,做的事 CSS 一条选择器就够(#276 手机触控靶同样在那边按断点抬)。
  return (
    <div className="pager">
      {note != null && <span>{note}</span>}
      {max > 1 && (
        <span className="pagerNav">
          <button aria-label="‹" className="pagerBtn" disabled={page === 0} onClick={() => onPage(Math.max(0, page - 1))}>‹</button>
          <span className="pagerNum">{page + 1} / {max}</span>
          <button aria-label="›" className="pagerBtn" disabled={page >= max - 1} onClick={() => onPage(Math.min(max - 1, page + 1))}>›</button>
        </span>
      )}
    </div>
  )
}
