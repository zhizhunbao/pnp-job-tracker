'use client'
// 我的求职(E9-01 最小求职看板):收藏岗位列表 + 状态下拉(想投/已投/面试中/offer)+ 移除。
// 数据=Payload REST /api/saved-jobs(access 本人);title/company 用快照,岗位下架后仍可读。
// #62A:variant='favs' = 「我的收藏」独立节——同一份收藏数据的纯列表视图(无状态下拉/周报开关)。
import { useEffect, useState } from 'react'
import type { makeT } from '../jobs/i18n'

type Row = { id: number | string; title?: string; company?: string; status?: string }
const STATUSES = ['wish', 'applied', 'interview', 'offer'] as const

export function SavedJobsList({ t, userId, weeklyOptOut, variant }: { t: ReturnType<typeof makeT>; userId?: number | string; weeklyOptOut?: boolean; variant?: 'favs' }) {
  const favs = variant === 'favs'
  const [items, setItems] = useState<Row[] | null>(null)
  const [optOut, setOptOut] = useState(!!weeklyOptOut)   // 周报开关(E9-02b):显示语义取反(勾=订阅)
  useEffect(() => {
    fetch('/api/saved-jobs?limit=200&depth=0&sort=-updatedAt', { credentials: 'include' })
      .then((r) => r.json()).then((d) => setItems(d?.docs || [])).catch(() => setItems([]))
  }, [])

  const setStatus = async (id: Row['id'], status: string) => {
    setItems((xs) => (xs || []).map((x) => (x.id === id ? { ...x, status } : x)))
    await fetch(`/api/saved-jobs/${id}`, {
      method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    }).catch(() => {})
  }
  const remove = async (id: Row['id']) => {
    setItems((xs) => (xs || []).filter((x) => x.id !== id))
    await fetch(`/api/saved-jobs/${id}`, { method: 'DELETE', credentials: 'include' }).catch(() => {})
  }

  return (
    <div>
      <div style={{ fontSize: 13.5, fontWeight: 600, color: '#374151' }}>{t(favs ? 'fav.title' : 'sj.title')}</div>
      <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>{t(favs ? 'fav.note' : 'sj.note')}</div>
      {items === null ? null : items.length === 0 ? (
        <div style={{ fontSize: 12.5, color: '#9ca3af', marginTop: 12 }}>{t('sj.empty')}</div>
      ) : (
        <div style={{ marginTop: 10 }}>
          {items.map((x) => (
            <div key={String(x.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderTop: '1px solid #f3f4f6', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 160 }}>
                <div style={{ fontSize: 13.5, color: '#1f2937', fontWeight: 600 }}>{x.title || '—'}</div>
                <div style={{ fontSize: 12, color: '#9ca3af' }}>
                  {x.company || ''}
                  {x.title && <>{' · '}<a href={`/?q=${encodeURIComponent(x.title)}`} style={{ color: '#2563eb', textDecoration: 'none' }}>{t('sj.view')}</a></>}
                </div>
              </div>
              {/* #53:下拉与 × 包成不换行小组,窄屏换行时一起走(× 单飞到卡片左下角与行脱节) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                {!favs && <select value={x.status || 'wish'} onChange={(e) => setStatus(x.id, e.target.value)}
                  style={{ padding: '4px 8px', fontSize: 12.5, border: '1px solid #d1d5db', borderRadius: 6 }}>
                  {STATUSES.map((st) => <option key={st} value={st}>{t('sj.st.' + st)}</option>)}
                </select>}
                <button onClick={() => remove(x.id)} title={t('sj.del')}
                  style={{ border: 'none', background: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 14, padding: '0 2px' }}>×</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* 周报开关暂藏(2026-07-19 Frank「不完美的先关」):Resend 测试模式发不了外部邮箱,承诺兑现不了;
          域名邮箱接好+首封真发验证后把 false 删掉亮回(weeklyOptOut 字段/游标逻辑原样保留) */}
      {false && !favs && userId != null && (
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, paddingTop: 10, borderTop: '1px solid #f3f4f6', fontSize: 12.5, color: '#6b7280', cursor: 'pointer' }}>
          <input type="checkbox" checked={!optOut} onChange={async (e) => {
            const v = !e.target.checked
            setOptOut(v)
            await fetch(`/api/users/${userId}`, {
              method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ weeklyOptOut: v }),
            }).catch(() => {})
          }} />
          {t('sj.weekly')}
        </label>
      )}
    </div>
  )
}
