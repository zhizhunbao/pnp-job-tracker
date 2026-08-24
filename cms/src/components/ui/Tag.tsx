'use client'
// Tag(状态,不可点):省 / 联邦 / 重要 / 关注 / 通过 / Pro。
import { UI } from './colors'

const TAG_VARIANT: Record<string, React.CSSProperties> = {
  region: { background: '#eef2ff', color: '#3730a3' },
  federal: { background: '#fee2e2', color: '#b91c1c' },
  imp: { background: UI.danger, color: '#fff', fontWeight: 700 },
  warn: { background: '#fef3c7', color: UI.warn, fontWeight: 700 },
  ok: { background: '#dcfce7', color: UI.ok },
  pro: { background: '#fffbeb', color: '#92400e', border: '1px solid #fde68a' },
}

export function Tag({ variant = 'region', title, children }: { variant?: keyof typeof TAG_VARIANT; title?: string; children: React.ReactNode }) {
  return <span title={title} style={{ ...TAG_VARIANT[variant], borderRadius: 6, padding: '1px 7px', fontSize: 11.5, fontWeight: 600, whiteSpace: 'nowrap' }}>{children}</span>
}
