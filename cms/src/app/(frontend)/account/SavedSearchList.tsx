'use client'
// 已保存筛选管理(E5-03):列表+删除。数据走 Payload REST(access 已限本人)。
import { useEffect, useState } from 'react'
import type { TFn } from '../jobs/i18n'
import { IconMail } from '../Icons'

type SS = { id: string | number; name: string; lastNotifiedAt?: string | null }

export function SavedSearchList({ t }: { t: TFn }) {
  const [items, setItems] = useState<SS[] | null>(null)
  const load = () => fetch('/api/saved-searches?limit=20&depth=0', { credentials: 'include' })
    .then((r) => r.json()).then((d) => setItems(d?.docs ?? [])).catch(() => setItems([]))
  useEffect(() => { load() }, [])

  const del = async (id: SS['id']) => {
    await fetch(`/api/saved-searches/${id}`, { method: 'DELETE', credentials: 'include' }).catch(() => {})
    load()
  }

  return (
    <div>
      <div style={{ fontSize: 13.5, fontWeight: 600, color: '#374151' }}><IconMail /> {t('ss.title')}</div>
      <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>{t('ss.note')}</div>
      {items === null ? null : items.length === 0 ? (
        <div style={{ fontSize: 12.5, color: '#9ca3af', marginTop: 8 }}>{t('ss.none')}</div>
      ) : (
        <div style={{ marginTop: 8 }}>
          {items.map((x) => (
            <div key={x.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid #f9fafb', fontSize: 13 }}>
              <span style={{ flex: 1, color: '#374151' }}><IconMail /> {x.name}</span>
              {x.lastNotifiedAt ? <span style={{ fontSize: 11, color: '#c4c4c8' }}>{(x.lastNotifiedAt || '').slice(0, 10)}</span> : null}
              <button onClick={() => del(x.id)}
                style={{ border: 'none', background: '#fef2f2', color: '#b91c1c', borderRadius: 6, padding: '3px 10px', fontSize: 12, cursor: 'pointer' }}>
                {t('ss.del')}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
