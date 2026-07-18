// 首字母头像(E11-01):有 src 走图;无则名/邮箱首字母 + 由字符串稳定 hash 出的色块(同一人恒定色)。
// v1 不做上传,src 仅来自 OAuth 带回的头像 URL(E11-03 起)。
const PALETTE = ['#2563eb', '#7c3aed', '#db2777', '#059669', '#d97706', '#dc2626', '#0891b2', '#4f46e5']

function stableColor(s: string): string {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return PALETTE[h % PALETTE.length]
}

export function Avatar({ src, name, email, size = 36 }: { src?: string | null; name?: string | null; email?: string | null; size?: number }) {
  const label = (name || email || '?').trim()
  const initial = (label.charAt(0) || '?').toUpperCase()
  if (src) return <img src={src} alt="" width={size} height={size} style={{ borderRadius: '50%', objectFit: 'cover', display: 'block', flexShrink: 0 }} />
  return (
    <span aria-hidden="true" style={{ width: size, height: size, borderRadius: '50%', background: stableColor(label.toLowerCase()), color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: Math.round(size * 0.44), fontWeight: 600, flexShrink: 0, userSelect: 'none' }}>
      {initial}
    </span>
  )
}
