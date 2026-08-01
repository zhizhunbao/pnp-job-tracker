'use client'
// 选职业 = **控件**,不是问卷题(2026-07-31 Frank「统一一下答题功能,不需要弹框答题了」)。
//
// 为什么单独抽出来:三问里「处境」「目标省」是四选一,能并进 SurveyJS 答题器;而「选职业」是
// 搜索 + 多选的控件,SurveyJS 没有这种题型。硬塞成题型 = 为了统一而造轮子。所以拆成两半:
// 四选一的题归答题器,选职业归这个控件,全站共用一份(答题器的职业 chip、职位板、详情页都用它)。
//
// 数据口径照旧(与三问同源,不新写端点):热门清单 = 库里在招量前 24(/api/quiz?top=24),
// 拿不到退回内置常用清单;搜索 = /api/quiz?q=(≥2 字、250ms 防抖);chip 上挂真在招数。
import { useEffect, useRef, useState } from 'react'

import { POPULAR_NOCS } from '../account/profileOptions'
import { Button, chipStyle, UI } from '../ui/primitives'
import { shortOcc } from './EntryQuiz'
import type { TFn } from '../jobs/i18n'

type Cand = { noc: string; title: string; titleZh: string }
type Top = Cand & { open: number; broad?: string }

export function OccPicker({ t, lang, initial, onDone, onClose }: {
  t: TFn
  lang: string
  initial: string[]
  onDone: (nocs: string[]) => void
  onClose: () => void
}) {
  const [nocs, setNocs] = useState<string[]>(initial)
  const [titles, setTitles] = useState<Record<string, string>>({})
  const [q, setQ] = useState('')
  const [cands, setCands] = useState<Cand[]>([])
  const [top, setTop] = useState<Top[]>([])
  const [more, setMore] = useState(false)
  const [cat, setCat] = useState('')     // 大类筛选(空=热门)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 热门清单:库里在招量前 24;拿不到(慢/挂了)退回内置常用清单 —— 控件不能因为一个可选请求就变空壳
  useEffect(() => {
    let dead = false
    fetch('/api/quiz?top=200')
      .then((r) => r.json())
      .then((d) => { if (!dead) setTop(Array.isArray(d?.top) && d.top.length ? d.top : []) })
      .catch(() => { /* 用兜底清单 */ })
    return () => { dead = true }
  }, [])
  // 大类清单按在招量排(有货的类排前面),与职位板的分类同一套 —— 不另造一套分类名
  const cats: string[] = Object.entries(
    top.reduce<Record<string, number>>((m, x) => (x.broad && x.broad !== '未分类' ? { ...m, [x.broad]: (m[x.broad] || 0) + x.open } : m), {}),
  ).sort((a, b) => b[1] - a[1]).map(([k]) => k)
  const base: Top[] = top.length
    ? top
    : POPULAR_NOCS.map((x) => ({ noc: x.noc, title: t(x.key), titleZh: t(x.key), open: 0 }))
  const list: Top[] = cat ? base.filter((x) => x.broad === cat) : base

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current)
    if (q.trim().length < 2) { setCands([]); return }
    timer.current = setTimeout(() => {
      fetch(`/api/quiz?q=${encodeURIComponent(q.trim())}`)
        .then((r) => r.json()).then((d) => setCands(Array.isArray(d?.candidates) ? d.candidates : []))
        .catch(() => setCands([]))
    }, 250)
    return () => { if (timer.current) clearTimeout(timer.current) }
  }, [q])

  const label = (x: { title: string; titleZh: string }) => (lang === 'zh' && x.titleZh ? x.titleZh : x.title)
  const toggle = (noc: string, name: string) => {
    setTitles((m) => ({ ...m, [noc]: name }))
    setNocs((cur) => (cur.includes(noc) ? cur.filter((n) => n !== noc) : [...cur, noc]))
  }

  // 库里会出现同名不同码(中文都叫「厨师」= 63200 Cooks 与 62200 Chefs)——重名时挂英文官方名区分,
  // 不重名的什么都不挂(甩个 5 位码只添噪音,2026-07-27 拍板)
  const dupCount = new Map<string, number>()
  for (const x of list) { const l = label(x); dupCount.set(l, (dupCount.get(l) || 0) + 1) }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(17,24,39,.45)', zIndex: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 520, maxHeight: '86vh', overflow: 'auto', padding: '18px 18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
          <div style={{ fontSize: 19, fontWeight: 700 }}>{t('quiz.q2')}</div>
          <button onClick={onClose} aria-label="close" style={{ border: 'none', background: 'none', color: UI.text3, fontSize: 18, cursor: 'pointer', padding: 0 }}>×</button>
        </div>

        {nocs.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
            {nocs.map((n) => (
              <button key={n} onClick={() => toggle(n, titles[n] || n)} style={{ ...chipStyle(true), display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                {shortOcc(titles[n] || n)}<span style={{ opacity: .7 }}>×</span>
              </button>
            ))}
          </div>
        )}

        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('quiz.q2ph')} enterKeyHint="search"
          style={{ width: '100%', boxSizing: 'border-box', height: 42, padding: '0 12px', border: `1px solid ${UI.border}`, borderRadius: 10, fontSize: 14.5, background: '#fafafa', marginBottom: 10 }} />

        {cands.length > 0 && (
          <div style={{ marginBottom: 10 }}>
            {cands.map((c) => (
              <button key={c.noc} onClick={() => { toggle(c.noc, label(c)); setQ(''); setCands([]) }}
                style={{ display: 'block', width: '100%', textAlign: 'left', border: `1px solid ${UI.border}`, borderRadius: 10, background: nocs.includes(c.noc) ? '#eff6ff' : '#fff', padding: '9px 12px', marginBottom: 6, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
                {shortOcc(label(c))}<span style={{ color: UI.text3, fontSize: 12, marginLeft: 6 }}>{c.noc}</span>
              </button>
            ))}
          </div>
        )}

        {/* 先分类再选(Frank 2026-07-31「那么多职业用户怎么选」):一行大类 chip,
            默认「热门」= 在招量前列;选中某类就在下面铺这一类的职业 */}
        {/* 分类是**导航**,下面的职业才是**选项**(Frank 2026-07-31「这个分类和下面的职位不应该有明显的界限吗」):
            两排都做成药丸,视觉上分不出层级 —— 分类改成文字标签页(选中站蓝加粗带下划线),
            再用一条发丝线与职业区隔开 */}
        {cats.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, paddingBottom: 10, marginBottom: 12, borderBottom: `1px solid ${UI.border}` }}>
            {['', ...cats].map((c) => (
              <button key={c || 'hot'} onClick={() => { setCat(c); setMore(Boolean(c)) }}
                style={{
                  border: 'none', background: 'none', padding: '2px 0', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13.5,
                  color: cat === c ? UI.primary : UI.text2, fontWeight: cat === c ? 700 : 400,
                  borderBottom: cat === c ? `2px solid ${UI.primary}` : '2px solid transparent',
                }}>
                {c ? t('broad.' + c) : t('occ.cat.hot')}
              </button>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
          {list.slice(0, more ? 99 : 8).map((x) => {
            const l = label(x)
            const hint = (dupCount.get(l) || 0) > 1 ? (x.title && x.title !== l ? x.title : x.noc) : ''
            return (
              <button key={x.noc} title={l} onClick={() => toggle(x.noc, l)}
                style={{ ...chipStyle(nocs.includes(x.noc)), display: 'inline-flex', alignItems: 'baseline', gap: 6, maxWidth: '100%' }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 190 }}>{shortOcc(l)}</span>
                {hint ? <span style={{ fontSize: 11, color: UI.text3, flexShrink: 0 }}>{hint}</span> : null}
                {x.open ? <span style={{ fontSize: 11.5, color: UI.text3, flexShrink: 0 }}>{t('quiz.openN', { n: x.open.toLocaleString('en-CA') })}</span> : null}
              </button>
            )
          })}
        </div>
        {list.length > 8 && !more && (
          <button onClick={() => setMore(true)} style={{ border: 'none', background: 'none', padding: '8px 0 0', color: UI.primary, cursor: 'pointer', fontSize: 12.5, fontFamily: 'inherit' }}>▾ {t('quiz.moreNocs')}</button>
        )}

        {nocs.length > 0 && (
          <Button kind="primary" onClick={() => onDone(nocs)} style={{ width: '100%', padding: '11px 0', fontSize: 15, marginTop: 14 }}>
            {t('quiz.nextN', { n: nocs.length })}
          </Button>
        )}
      </div>
    </div>
  )
}
