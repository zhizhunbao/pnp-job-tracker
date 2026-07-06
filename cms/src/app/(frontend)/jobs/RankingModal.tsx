'use client'
// 榜单弹窗(E8-02,2026-07-06 拍板「所有都弹窗」):/jobs 站内入口按需拉 /api/rankings-data;
// 表格与 /rankings/[slug] 页同一份 RankingTable(页面保留给 SEO/直链)。两榜单弹窗内 tab 切换,不跳页。
import { useEffect, useState } from 'react'
import type { TFn } from './i18n'
import { Modal } from './Modal'
import { RankingTable, type RankRow } from '../rankings/RankingView'

const SLUGS = ['weekly-top', 'sponsor-likely'] as const
type Slug = (typeof SLUGS)[number]

export function RankingModal({ t, onClose }: { t: TFn; onClose: () => void }) {
  const [slug, setSlug] = useState<Slug>('weekly-top')
  const [cache, setCache] = useState<Partial<Record<Slug, RankRow[]>>>({})
  const items = cache[slug]
  useEffect(() => {
    if (cache[slug]) return
    let dead = false
    ;(async () => {
      try {
        const r = await fetch(`/api/rankings-data?slug=${slug}`, { credentials: 'include' })
        if (!r.ok) return
        const d = await r.json()
        if (!dead && Array.isArray(d.items)) setCache((c) => ({ ...c, [slug]: d.items }))
      } catch { /* 网络失败留加载态,重开可重试 */ }
    })()
    return () => { dead = true }
  }, [slug, cache])
  return (
    <Modal onClose={onClose} size="lg">
      <div style={{ display: 'flex', gap: 14, paddingRight: 44, marginBottom: 4 }}>
        {SLUGS.map((s) => (
          <button key={s} onClick={() => setSlug(s)}
            style={{ border: 'none', background: 'none', padding: 0, fontSize: 15, cursor: 'pointer', fontWeight: slug === s ? 700 : 400, color: slug === s ? '#111827' : '#2563eb' }}>
            {t('rank.title.' + s)}
          </button>
        ))}
      </div>
      {items ? <RankingTable slug={slug} items={items} t={t} />
        : <p style={{ margin: '14px 0', fontSize: 13.5, color: '#9ca3af' }}>{t('act.loadingText')}</p>}
    </Modal>
  )
}
