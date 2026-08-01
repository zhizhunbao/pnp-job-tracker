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

const HOT = 24   // 热门页签展示的职业数(库里在招量前 24,与最初的 /api/quiz?top=24 口径同)

type Cand = { noc: string; title: string; titleZh: string }
type Top = Cand & { open: number; broad?: string }

// inline=true:不套弹层,直接铺在答题卡里(2026-07-31 Frank「选职业和其他问题都放到一个方式,
// 不要只有职业是弹框」)—— 职业是第一题,就该和别的题长一个样,而不是另开一层。
export function OccPicker({ t, lang, initial, onDone, onClose, inline, doneLabel }: {
  t: TFn
  lang: string
  initial: string[]
  onDone: (nocs: string[]) => void
  onClose?: () => void
  inline?: boolean
  doneLabel?: string
}) {
  const [nocs, setNocs] = useState<string[]>(initial)
  const [titles, setTitles] = useState<Record<string, string>>({})
  const [q, setQ] = useState('')
  const [cands, setCands] = useState<Cand[]>([])
  // null=还在拉(不是空清单!)。分清这两态才不会「先渲一套内置清单、两秒后整块换成分类版」——
  // Frank 2026-08-01 实拍「点找工作为什么会切换一下」就是这个:兜底清单被当成首屏内容渲了出去。
  const [top, setTop] = useState<Top[] | null>(null)
  const [cat, setCat] = useState('')     // 大类筛选(空=热门)
  // A–Z 索引**只在英文界面出**(2026-08-01 Frank 拍板照建议走):英文界面的标签本身就是拉丁字母,
  // 官方职业名又长又相似(Retail sales supervisors / Retail and wholesale trade managers),按首字母切一刀好扫;
  // 中/韩界面标签是中文/韩文,头顶挂 A/B/C 对不上眼睛看到的字,那件事交给搜索框。
  const [letter, setLetter] = useState('')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 热门清单:库里在招量前 24;拿不到(慢/挂了)退回内置常用清单 —— 控件不能因为一个可选请求就变空壳
  useEffect(() => {
    let dead = false
    fetch('/api/quiz?top=200')
      .then((r) => r.json())
      .then((d) => { if (!dead) setTop(Array.isArray(d?.top) && d.top.length ? d.top : []) })
      .catch(() => { if (!dead) setTop([]) })   // 失败才落到内置兜底清单(这时换内容是对的:没别的可显示)
    return () => { dead = true }
  }, [])
  // 大类清单按在招量排(有货的类排前面),与职位板的分类同一套 —— 不另造一套分类名
  const loading = top === null
  const cats: string[] = Object.entries(
    (top ?? []).reduce<Record<string, number>>((m, x) => (x.broad && x.broad !== '未分类' ? { ...m, [x.broad]: (m[x.broad] || 0) + x.open } : m), {}),
  ).sort((a, b) => b[1] - a[1]).map(([k]) => k)
  const base: Top[] = top?.length
    ? top
    : POPULAR_NOCS.map((x) => ({ noc: x.noc, title: t(x.key), titleZh: t(x.key), open: 0 }))
  // 「热门」= 在招量前 HOT 个(拉回来的 200 条是**分类浏览**的料,不是热门本身)。
  // 2026-08-01 Frank「热门没有多少职业吧,可以都展示出来吧」——所以热门是短清单、一次摊开,
  // 不再折成 8 个 +「更多职业」;想看全的走上面的分类页签或搜索。
  const azOn = lang === 'en'
  const scoped: Top[] = cat ? base.filter((x) => x.broad === cat) : base
  const initial1 = (x: Top) => (x.title || '').trim().charAt(0).toUpperCase()
  // 只列真有职业的字母(空字母格点了什么也不出,是死键)
  const letters: string[] = azOn
    ? Array.from(new Set(scoped.map(initial1).filter((c) => /[A-Z]/.test(c)))).sort()
    : []
  // 选了字母 = 在**全量**里按首字母找(热门那 24 个是「逛」的入口,不该限制「找」);没选就照旧
  const list: Top[] = letter
    ? scoped.filter((x) => initial1(x) === letter)
    : (cat ? scoped : scoped.slice(0, HOT))

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

  const body = (
    <>
        {!inline && (
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
            <div style={{ fontSize: 19, fontWeight: 700 }}>{t('quiz.q2')}</div>
            <button onClick={onClose} aria-label="close" style={{ border: 'none', background: 'none', color: UI.text3, fontSize: 18, cursor: 'pointer', padding: 0 }}>×</button>
          </div>
        )}

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
        {/* 加载中:分类行与 chip 区各渲同高占位,拉回来直接就位 —— 不先渲一套再换掉(防跳版) */}
        {loading ? (
          <>
            <div style={{ display: 'flex', gap: 14, paddingBottom: 10, marginBottom: 12, borderBottom: `1px solid ${UI.border}` }}>
              {[54, 40, 40, 40, 40, 40].map((w, i) => <span key={i} style={{ width: w, height: 17, borderRadius: 4, background: UI.hairline }} />)}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {[128, 104, 150, 118, 96, 140, 110, 126].map((w, i) => <span key={i} style={{ width: w, height: 32, borderRadius: 999, background: UI.hairline }} />)}
            </div>
          </>
        ) : null}
        {!loading && cats.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, paddingBottom: 10, marginBottom: 12, borderBottom: `1px solid ${UI.border}` }}>
            {['', ...cats].map((c) => (
              <button key={c || 'hot'} onClick={() => { setCat(c); setLetter('') }}
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

        {/* A–Z 索引条(仅英文界面):与分类页签并列的第二个入口,再点一次同一个字母=取消 */}
        {!loading && azOn && letters.length > 1 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
            <button onClick={() => setLetter('')}
              style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12.5,
                color: letter ? UI.text2 : UI.primary, fontWeight: letter ? 400 : 700 }}>{t('occ.az.all')}</button>
            {letters.map((c) => (
              <button key={c} onClick={() => setLetter(letter === c ? '' : c)}
                style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12.5,
                  color: letter === c ? UI.primary : UI.text2, fontWeight: letter === c ? 700 : 400 }}>{c}</button>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
          {(loading ? [] : list).map((x) => {
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

        {nocs.length > 0 && (
          inline
            // 内联时用与问卷同一套动作区:上边框断开 + 主按钮靠右(和「下一题」一个样)
            ? <div style={{ borderTop: `1px solid ${UI.hairline}`, marginTop: 18, paddingTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
                <Button kind="primary" onClick={() => onDone(nocs)}>{doneLabel || t('quiz.nextN', { n: nocs.length })}</Button>
              </div>
            : <Button kind="primary" onClick={() => onDone(nocs)} style={{ width: '100%', padding: '11px 0', fontSize: 15, marginTop: 14 }}>
                {t('quiz.nextN', { n: nocs.length })}
              </Button>
        )}
    </>
  )

  if (inline) return body
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(17,24,39,.45)', zIndex: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 520, maxHeight: '86vh', overflow: 'auto', padding: '18px 18px 20px' }}>
        {body}
      </div>
    </div>
  )
}
