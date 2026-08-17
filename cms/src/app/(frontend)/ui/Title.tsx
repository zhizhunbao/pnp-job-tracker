'use client'
import { UI } from './tokens'

// ── Title(二级标题:文字+右延细线;右槽可挂「更多 →」)──────
export function Title({ right, children }: { right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15.5, fontWeight: 700, color: UI.text, margin: '18px 0 8px' }}>
      {children}{right}<span style={{ flex: 1, height: 1, background: UI.border }} />
    </div>
  )
}
