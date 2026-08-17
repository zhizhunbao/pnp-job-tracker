'use client'
// 全站统一正文轨。
// ── Shell(全站统一正文轨:1320 与 Header 头轨同宽——Frank 2026-07-18「每个页面的宽度应该
//    是一样的,新的页面按这个宽度套壳」;新页面一律用它,存量页迁移随 #65 余批)────────────
export function Shell({ pad = '4px 1.25rem 32px', children }: { pad?: string; children: React.ReactNode }) {
  return <div style={{ maxWidth: 1320, margin: '0 auto', padding: pad, width: '100%', boxSizing: 'border-box' }}>{children}</div>
}
