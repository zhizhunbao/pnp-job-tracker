// 全站统一返回按钮(Frank 2026-07-18:「返回按钮应该有统一的样式吧 全网站」)。
// 药丸幽灵样式;箭头由组件渲染,label 不要自带「←」。新增返回入口一律用它,不许裸 <a>。
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <a href={href}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: '1px solid #e5e7eb', background: '#fff', color: '#2563eb', borderRadius: 999, padding: '4px 14px', fontSize: 12.5, textDecoration: 'none', whiteSpace: 'nowrap' }}>
      ← {label}
    </a>
  )
}
