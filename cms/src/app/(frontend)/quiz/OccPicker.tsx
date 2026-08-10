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
import { QuizBar, QuizStyle, QuizTitle } from './QuizUI'
import { Button, chipStyle, UI } from '../ui/primitives'
import { shortOcc } from './EntryQuiz'
import { pickName } from '@/lib/occName'
import type { TFn } from '../jobs/i18n'

const HOT = 24   // 热门页签展示的职业数(库里在招量前 24,与最初的 /api/quiz?top=24 口径同)
// 选职业上限:与 /api/report 的 MAX_NOCS 同一个数(那边超了就 .slice(0,3) 静默丢)。
// 上限**必须在前端也拦一道** —— 否则用户选了 4 个、亮着 4 颗 chip,报告只算前 3 个,他不知道丢了哪个。
const MAX_NOCS = 3

type Cand = { noc: string; title: string; titleZh: string; titleZhShort?: string; titleKoShort?: string; titleEnShort?: string }
type Top = Cand & { open: number; broad?: string }

// inline=true:不套弹层,直接铺在答题卡里(2026-07-31 Frank「选职业和其他问题都放到一个方式,
// 不要只有职业是弹框」)—— 职业是第一题,就该和别的题长一个样,而不是另开一层。
// 名字加载中的占位条(与文字同高,避免拿到名字时行高跳一下)
const Skeleton = () => (
  <span aria-hidden style={{ display: 'inline-block', width: 76, height: '0.85em', borderRadius: 4, background: 'rgba(255,255,255,.45)' }} />
)

export function OccPicker({ t, lang, initial, onDone, onChange, onClose, inline, doneLabel, hideDone }: {
  t: TFn
  lang: string
  initial: string[]
  onDone: (nocs: string[]) => void
  // 2026-08-01(Frank「不能同时显示出来吗」):合并成一屏后,选职业不再是独立一步 ——
  // 选中即回传(onChange),自己的动作按钮收起(hideDone),整卷底部只留一个「出报告」。
  onChange?: (nocs: string[]) => void
  onClose?: () => void
  inline?: boolean
  doneLabel?: string
  hideDone?: boolean
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
  // 同族职业(Frank「21231/21232 那种对儿自动挨一起」):选了之后才出 —— 它是**补全**不是浏览入口
  const [kin, setKin] = useState<Top[]>([])
  // 同族请求**自己的**在途标记:骨架条只在它真的在拉的时候占位(热门 200 条那个 loading 与它无关)
  const [kinLoading, setKinLoading] = useState(false)
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
  // 选满上限:未选中的 chip 一律置灰不可点(已选的仍可取消,不然就锁死了)
  const full = nocs.length >= MAX_NOCS
  const lockedOut = (noc: string) => full && !nocs.includes(noc)
  // 置灰态跟着 chipStyle 走,不另调一套颜色 —— 只压透明度 + 换光标
  const lockedStyle = (noc: string): React.CSSProperties =>
    lockedOut(noc) ? { opacity: .4, cursor: 'not-allowed' } : {}
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

  // 已选职业的名字:答过一轮再回到这一步时,存档里只有 5 位码 —— 名字得现拉,
  // 不拉就在 chip 上甩一个「31301」(代码不裸奔,2026-08-01 翻页改回来后实拍撞到)
  useEffect(() => {
    const miss = nocs.filter((n) => !titles[n])
    if (!miss.length) return
    let dead = false
    Promise.all(miss.map((n) => fetch(`/api/quiz?noc=${encodeURIComponent(n)}`)
      .then((r) => r.json())
      .then((d) => [n, pickName(d?.facts, lang) || n] as [string, string])
      .catch(() => [n, n] as [string, string])))
      .then((rows) => { if (!dead) setTitles((m) => ({ ...m, ...Object.fromEntries(rows) })) })
    return () => { dead = true }
  }, [nocs, lang])   // eslint-disable-line react-hooks/exhaustive-deps -- titles 是这个 effect 的产物,进依赖会自己触发自己

  // 同族职业:选中之后按 NOC 前 4 位(官方 unit group)现拉。**选满 3 个就不再拉** ——
  // 报告最多算 3 个职业(/api/report 的 MAX_NOCS),再推就是让他做没用的动作。
  // 服务端查库,不拿热门 200 条筛:那 200 条只覆盖 41% 的职业,冷门职业会静默出不来。
  useEffect(() => {
    if (!nocs.length || nocs.length >= MAX_NOCS) { setKin([]); setKinLoading(false); return }
    let dead = false
    setKinLoading(true)
    fetch(`/api/quiz?kin=${encodeURIComponent(nocs.slice(0, MAX_NOCS).join(','))}`)
      .then((r) => r.json())
      .then((d) => { if (!dead) setKin(Array.isArray(d?.kin) ? d.kin : []) })
      .catch(() => { if (!dead) setKin([]) })   // 拉不到就不出这一行(可选功能不该让控件变空壳)
      .finally(() => { if (!dead) setKinLoading(false) })
    return () => { dead = true }
  }, [nocs])

  // 显示名优先用库里的短名(三语,ETL 04g 产)——前端不自己截字符串,清洗归数据层
  const label = (x: Cand) => pickName(x, lang)
  // onChange 必须在 updater **外面**调:React 的 setState updater 跑在渲染阶段,
  // 在里面回调父组件的 setState = 「渲染 A 的时候更新 B」,控制台会红(2026-08-02 走查在 console 抓到:
  // Cannot update a component `PlanPrView` while rendering a different component `OccPicker`)。
  // 事件处理器里 nocs 就是最新值,不需要 updater 形式。
  const toggle = (noc: string, name: string) => {
    // 选满了就只让**取消**,不让再加(加了也会被 /api/report 悄悄丢掉)。
    // 未选中的 chip 同时置灰不可点 —— 拦截逻辑和视觉状态必须是同一个判断,别让用户点了没反应。
    if (full && !nocs.includes(noc)) return
    setTitles((m) => ({ ...m, [noc]: name }))
    const next = nocs.includes(noc) ? nocs.filter((n) => n !== noc) : [...nocs, noc]
    setNocs(next)
    onChange?.(next)
  }

  // 库里会出现同名不同码(中文都叫「厨师」= 63200 Cooks 与 62200 Chefs)——重名时挂英文官方名区分,
  // 不重名的什么都不挂(甩个 5 位码只添噪音,2026-07-27 拍板)
  const dupCount = new Map<string, number>()
  for (const x of list) { const l = label(x); dupCount.set(l, (dupCount.get(l) || 0) + 1) }

  const body = (
    <>
        {/* 已选/同族两排 chip **换行不横滑**(2026-08-04 Frank 实拍:选到第 4 个,最后那颗被卡片
            右缘切成半透明的一截,桌面既没滚动条也没「还有更多」的提示)。先前的解法是横向滚动
            + 右缘渐隐 mask,但全站铁律是「永不横滚」(CLAUDE.md 展示约定),渐隐本身也读作
            「排版坏了」。改成 flexWrap 让行高自适应:放不下就往下掉一行,一颗也不裁。 */}
        {/* 弹层里用(职位板/详情页)也要带上答题壳的 CSS —— inline 那条路由 PlanPrView 挂了同一份 */}
        {!inline && <QuizStyle />}
        <style>{`.occCatSel{display:none}
@media(max-width:640px){.occCatSel{display:block}.occCatTabs{display:none !important}
/* 触控靶下限(第 33 轮 #260):胶囊按 4px 内边距 + 12.5px 字算出来只有 29px,手机上要点中
   一个得瞄 —— 而这是决定线第一步、漏斗最宽处。只抬手机端的**选项**(职业胶囊、A–Z 字母),
   已选/同族那两排换行后行高自适应,不参与这条(抬了会把两行撑得更高);可访问性不上砧板(CLAUDE.md) */
.occChips button,.occAz button{min-height:44px}
.occAz button{display:inline-flex;align-items:center}}`}</style>
        {!inline && (
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
            <QuizTitle>{t('quiz.q2')}</QuizTitle>
            <button onClick={onClose} aria-label="close" style={{ border: 'none', background: 'none', color: UI.text3, fontSize: 18, cursor: 'pointer', padding: 0 }}>×</button>
          </div>
        )}

        {/* 已选 + 同族 = 一个**常驻** section(2026-08-03 Frank「新生成的胶囊可以放到一个固定的 section 吗,
            要不然整个页面老跳」):先前两块都是「有才渲」,一选中就把搜索框、分类、整片热门 chip 全顶下去,
            眼睛刚点完的位置整个跑掉。现在容器恒在、保底一行 chip 的高度,
            空着的时候放一句空态引导(空态是 CLAUDE.md 允许保留的四类文案之一)。 */}
        {/* 高度**只按当前真有的内容算**(2026-08-04 Frank 实拍:选 4 个职业时 chips 与搜索框之间
            空着一大片)。先前写死 minHeight:102 = 「已选 34 + 间距 8 + 同族 60」两行的高度,
            但选满 3 个后同族那块**根本不发请求**(见上面的 kin effect),第二行永远不渲,102px
            就成了纯白占位。防跳版改由两处兜:① 这个 section 恒在(空时放空态引导),并保底一行
            chip 的高度(34)—— 空态↔一行已选之间不会跳;② 同族在**真的在拉**(kinLoading)时渲
            骨架条,占的正是它自己将要占的高度,拉回来直接就位。没内容 = 不占位。 */}
        {!hideDone && (
          <div style={{ minHeight: 34, marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {nocs.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                {nocs.map((n) => (
                  <button key={n} onClick={() => toggle(n, titles[n] || n)} style={{ ...chipStyle(true), fontSize: 14.5, padding: '10px 14px', display: 'inline-flex', gap: 6, alignItems: 'center', maxWidth: '100%' }}>
                    {/* 名字还没拉回来时**留个占位**,不拿 5 位码顶上去 —— 2026-08-02 Frank
                        「点击跳转为什么先显示的是数字,后变成文字」:码是给机器看的,不该在人眼前闪一下 */}
                    {titles[n] ? shortOcc(titles[n]) : <Skeleton />}<span style={{ opacity: .7 }}>×</span>
                  </button>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 13, color: UI.text3, lineHeight: 1.6 }}>{t('quiz.pickHint')}</div>
            )}

            {/* 选满 3 个的小注:后端 /api/report 的 MAX_NOCS=3 会 .slice(0,3) **静默丢掉**第 4 个,
                而 UI 上 4 颗 chip 全亮着 —— 用户无从知道哪个没算。上限改在前端拦住,并说一句为什么。 */}
            {full && (
              <div style={{ fontSize: 12.5, color: UI.text3, lineHeight: 1.5 }}>{t('occ.max')}</div>
            )}

        {/* 同族职业(Frank「21231/21232 那种对儿自动挨一起」):选了之后才出,一行 chip,点一下即加选。
            官方 unit group(NOC 前 4 位)分族,不用本站的中文大类(那套有杂物桶)。
            **不写「推荐」二字**:这不是我们替他判断哪个更好,只是把官方同一族里还在招的摆出来让他自己认。 */}
            {/* 同族还没拉回来时,这格是**纯白 68px**(第 33 轮 #262:1440 实拍胶囊 250 结束、
                搜索框 330 才开始,中间什么都没有)。骨架条把「空白」变成「在加载」,占的就是
                拉回来之后自己要占的高度 —— 这是**唯一**给最小高度的时机。
                门槛用 kinLoading(同族这个请求自己的在途标记),不是 loading(那是热门 200 条的,
                两件事无关:热门早就回来了、同族还在拉,先前的写法根本渲不出骨架)。 */}
            {kinLoading && kin.length === 0 && (
              <div>
                <div style={{ fontSize: 12.5, color: UI.text3, marginBottom: 6 }}>{t('quiz.kin')}</div>
                <div style={{ display: 'flex', gap: 6, height: 34, alignItems: 'center' }}>
                  {[132, 108, 146].map((w, i) => (
                    <span key={i} style={{ width: w, height: 26, borderRadius: 999, background: UI.hairline }} />
                  ))}
                </div>
              </div>
            )}

            {kin.length > 0 && (
              <div>
                <div style={{ fontSize: 12.5, color: UI.text3, marginBottom: 6 }}>{t('quiz.kin')}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                  {kin.map((x) => (
                    <button key={x.noc} disabled={lockedOut(x.noc)} onClick={() => toggle(x.noc, label(x))} style={{ ...chipStyle(nocs.includes(x.noc)), display: 'inline-flex', gap: 6, alignItems: 'baseline', maxWidth: '100%', ...lockedStyle(x.noc) }}>
                      {shortOcc(label(x))}
                      <span style={{ opacity: .7, fontSize: 11.5 }}>{t('quiz.openN', { n: x.open })}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('quiz.q2ph')} enterKeyHint="search"
          style={{ width: '100%', boxSizing: 'border-box', height: 42, padding: '0 12px', border: `1px solid ${UI.border}`, borderRadius: 10, fontSize: 14.5, background: '#fafafa', marginBottom: 10 }} />

        {cands.length > 0 && (
          <div style={{ marginBottom: 10 }}>
            {cands.map((c) => (
              <button key={c.noc} disabled={lockedOut(c.noc)} onClick={() => { toggle(c.noc, label(c)); setQ(''); setCands([]) }}
                style={{ display: 'block', width: '100%', textAlign: 'left', border: `1px solid ${UI.border}`, borderRadius: 10, background: nocs.includes(c.noc) ? '#eff6ff' : '#fff', padding: '9px 12px', marginBottom: 6, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', ...lockedStyle(c.noc) }}>
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
        {/* 大类名 2026-08-03 换成官方口径的全称(「科技」→「自然与应用科学」:园艺技师、家电维修
            在官方第 2 组里本来就成立,是我们的两字简称把它显得离谱)。Frank「不要改成装得下的名字」——
            所以名字不缩,**换控件**:手机上十个全称要占九行(实拍),把职业列表全顶到屏外,
            于是窄屏走下拉(名字多长都是一行),桌面照旧页签(实测两行,放得下)。 */}
        {!loading && cats.length > 0 && (
          <>
            <select className="occCatSel" value={cat} onChange={(e) => { setCat(e.target.value); setLetter('') }}
              style={{ width: '100%', boxSizing: 'border-box', height: 40, padding: '0 10px', marginBottom: 12,
                border: `1px solid ${UI.border}`, borderRadius: 10, fontSize: 14, fontFamily: 'inherit', background: '#fff', color: UI.text }}>
              <option value="">{t('occ.cat.hot')}</option>
              {cats.map((c) => <option key={c} value={c}>{t('broad.' + c)}</option>)}
            </select>
            <div className="occCatTabs" style={{ display: 'flex', flexWrap: 'wrap', gap: 14, paddingBottom: 10, marginBottom: 12, borderBottom: `1px solid ${UI.border}` }}>
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
          </>
        )}

        {/* A–Z 索引条(仅英文界面):与分类页签并列的第二个入口,再点一次同一个字母=取消 */}
        {!loading && azOn && letters.length > 1 && (
          <div className="occAz" style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
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

        <div className="occChips" style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
          {(loading ? [] : list).map((x) => {
            const l = label(x)
            const hint = (dupCount.get(l) || 0) > 1 ? (x.title && x.title !== l ? x.title : x.noc) : ''
            return (
              <button key={x.noc} title={l} disabled={lockedOut(x.noc)} onClick={() => toggle(x.noc, l)}
                // 字号/高度对齐四选一题的选项行(08-10 Frank「两页字体大小不一致有跳跃」):
                // 14.5px + 10px 竖 padding ≈ qzItem 行高;chipStyle 全局 12.5 不动(时间线筛选等在用)
                style={{ ...chipStyle(nocs.includes(x.noc)), fontSize: 14.5, padding: '10px 14px', display: 'inline-flex', alignItems: 'baseline', gap: 6, maxWidth: '100%', ...lockedStyle(x.noc) }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 190 }}>{shortOcc(l)}</span>
                {hint ? <span style={{ fontSize: 12, color: UI.text3, flexShrink: 0 }}>{hint}</span> : null}
                {x.open ? <span style={{ fontSize: 12.5, color: UI.text3, flexShrink: 0 }}>{t('quiz.openN', { n: x.open.toLocaleString('en-CA') })}</span> : null}
              </button>
            )
          })}
        </div>

        {/* 动作条**永远在**(2026-08-03 Frank「下一题在最下面点不到」「下一题位置还不统一」):
            先前是「选中才出现」——按钮凭空冒出来又把布局顶一下,而且没选中时这一格是空的,
            用户翻到底发现无处可点。现在恒在、粘在视口底,没选中时放一句灰字说明,
            **位置与答题页的「下一题」对齐**(那边同批也改了 sticky),整条决定线的下一步都在同一个地方。 */}
        {inline ? (
          // 动作条与答题页是**同一个组件**(QuizUI 的 QuizBar),不是照着抄的一套样式 ——
          // 「下一题位置不统一」的病根就是各写各的(2026-08-03 Frank「保证所有答题页面一致」)
          <QuizBar hint={nocs.length === 0 ? t('quiz.pickFirst') : undefined}>
            {nocs.length > 0
              ? <Button kind="primary" onClick={() => onDone(nocs)} style={{ padding: '11px 26px', fontSize: 14 }}>{doneLabel || t('quiz.nextN', { n: nocs.length })}</Button>
              : <Button kind="primary" disabled style={{ padding: '11px 26px', fontSize: 14, background: UI.hairline, color: UI.text3, cursor: 'default' }}>{doneLabel || t('plan.next')}</Button>}
          </QuizBar>
        ) : nocs.length > 0 ? (
          <Button kind="primary" onClick={() => onDone(nocs)} style={{ width: '100%', padding: '11px 0', fontSize: 15, marginTop: 14 }}>
            {t('quiz.nextN', { n: nocs.length })}
          </Button>
        ) : null}
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
