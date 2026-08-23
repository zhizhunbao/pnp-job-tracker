'use client'
// 职位主表:有哪些列、列偏好存哪、**每一列显示什么**。
//
// 只管「一格里放什么」,不管表格排版 —— 列宽(./colWidths)、冻结列、拖拽竖线、sticky 仍在 Jobs.tsx。
// 「薪资列该绿还是灰」和「这列多宽」不是一回事,前者属于列,后者属于这一页的布局。
// 🔴 不并进 ui/Table.tsx:那个是「简单表统一壳」(客户端排序、配置式列声明);职位主表是另一套机器
// (服务端排序、冻结列、字段面板、列宽落 cookie)。硬并会把共享组件撑成怪物 —— 旧拍板,别推翻。
import { IconLock } from '../Icons'
import { gradeColor } from '../ui'
import { fmtLocalSec } from '@/lib/time'
import { type TFn } from '@/lib/i18n'
import { eeDisplay, streamDisplay } from '@/lib/jobs'
import { COLS_COOKIE } from './columns.shared'
import { eeIsDormant, eeLastDraw } from './Pnp'
import { type ColKey, type FieldGroup, type Plan, type EeOcc, type JobRow, isDirect, sourceLabel } from '@/lib/jobs'
import { mapQuery, mapsUrl, parseLoc } from '@/lib/location'
import { catName, colorOf } from '@/lib/noc'

// 三档:并(→三个弹框之一)、图(直连地图)、无(不可点)。
// 原设计还有一档「注=悬停小注」,2026-07-21 Frank 拍板不做 —— 它与「无」行为完全一致,
// 留着只是个没兑现的意图,故合并(YAGNI:不为「可能用得上」保留结构)。
type Disposition = FieldGroup | 'map' | 'none'
// #175(Frank「所有的框都去掉可点吧。hover 高亮也去掉,只有 分类 公司 职位 可以点击弹框,
// 地址可以点击跳转」):可点集合大收编——满屏蓝绿都能点=没有重点。
export const FIELD_GROUP: Partial<Record<ColKey, Disposition>> = {
  // ① 分类族 → 职业分类弹框(#176:点分类看分类——「这职业是干嘛的」,轻、快、零额度)
  noc: 'category', teer: 'category', broad: 'category', mid: 'category', fine: 'category',
  // ② 「匹配」列 → 个人化解读弹框(2026-07-26:操作列「移民通道」钮下架后,
  //    「对我意味着什么」改挂它自己的字段;score 键随三维档卡一起退役)
  // ③ 公司 → 公司弹框;职位名不走本表(cellActionable 特判,直开 JD 弹框=职位弹框)
  company: 'company',
  // ④ 省/市/区 → 地点弹框(E8-12;格内文字仍是地图链接,两个动作分开);地址保持地图直连
  address: 'map', province: 'location', city: 'location', district: 'location',
  // ⑤ PNP/EE/AIP → 各自专属弹框(2026-07-25 Frank 拆弹框:「xx 的内容只放 xx 的弹框」,
  //    原并入移民弹框的五合一退役——与移民价值的依据链行重复)
  pnp: 'pnp', ee: 'ee', aip: 'aip', pilot: 'pilot',
  // ⑥ 薪资族 → 薪资弹框(同批拆分:帖面薪资+折算+当地 band+vs 中位一处看全)
  vsMedian: 'salary', salary: 'salary', salaryYr: 'salary', wageMedHr: 'salary', wageMedYr: 'salary',
  // ⑦ 其余一律不可点(Pro 锁位的锁自己链升级弹窗,不走本路由)
  match: 'immigration', eligibility: 'none', empHours: 'none', empTerm: 'none', accessibility: 'none', lmia: 'none',
  country: 'none',
  source: 'none', origin: 'none', direct: 'none', status: 'none',
  datePosted: 'none', lastSeen: 'none', closedAt: 'none',
}

// 这个格子点了有没有反应?——收编后 note/none 两档不再开弹框,若仍渲成 cursor:pointer
// 就成了「看着能点、点了没反应」,比不能点更糟。手型与真实行为绑同一个判据。
// title 例外:它不走 FIELD_GROUP,直开职位描述弹框(2026-07-19 Frank 拍板)。
export const cellActionable = (k: ColKey): boolean => {
  if (k === 'title') return true
  const d = FIELD_GROUP[k]
  return d != null && d !== 'none'
}

// Pro 专属列(免费用户列位打码,真值本就没进浏览器)。**单一来源就是下面这个 PRO_COLS** ——
// 2026-07-25 Frank「先都显示出来」放开 vs 中位三件套后,锁只剩 match 语义位;
// 原先配套的 lib/plan.PRO_COLUMNS 那时就退役了,这两行一直还指着它(08-19 改名 quota.ts 时顺手清)。
export const PRO_COLS = new Set<ColKey>(['match'])
// #152 锁位统一打码(Frank「应该给他打上马赛克那种」;#130 详情页先例推广到表格):
// 每列一个**写死的假占位数**,blur 掉——传达「这儿有个数」比一把锁更能说明值多少。
// 真值免费态压根不出服务端,占位数是假的,扒开也没用。
export const PRO_MASK: Partial<Record<ColKey, string>> = { vsMedian: '+15%', wageMedHr: '$28/hr', wageMedYr: '$58K/yr' }

// 默认显示 10 列(发布时间·大分类·公司·职位·省·市·薪资·年薪·vs中位·操作);其余用户自选。
// 布局:表格永远满宽不横向滚动,列按内容自适应,内容多行换行(不省略)——见 <table>/<td> 注释。
export const COLUMNS: { key: ColKey; label: string; default: boolean; always?: boolean }[] = [
  { key: 'datePosted', label: '发布时间', default: true },
  { key: 'broad', label: '大分类', default: true },
  { key: 'mid', label: '中分类', default: false },
  { key: 'fine', label: '小分类', default: false },
  { key: 'teer', label: 'TEER', default: false },
  // J1(2026-07-19 Frank):职位类型拆「工时」「雇佣期」两列(禁「·」杂糅),默认藏,字段面板可开
  { key: 'empHours', label: '工时', default: false },
  { key: 'empTerm', label: '雇佣期', default: false },
  { key: 'company', label: '公司', default: true },
  { key: 'title', label: '职位', default: true, always: true },
  { key: 'match', label: '与我的匹配', default: false },  // E5-05:主表不再显示(独立「我的匹配」视图专属列,列选择器也不出)
  { key: 'noc', label: 'NOC', default: false },
  { key: 'accessibility', label: '经验级别', default: false },
  { key: 'country', label: '国家', default: false },
  { key: 'province', label: '省', default: true },
  { key: 'city', label: '市', default: true },
  { key: 'district', label: '区', default: false },
  { key: 'address', label: '地址', default: false },
  { key: 'salary', label: '薪资', default: true },
  { key: 'salaryYr', label: '年薪(折算)', default: true },
  { key: 'wageMedHr', label: '中位时薪', default: false },
  { key: 'wageMedYr', label: '中位年薪', default: false },
  { key: 'vsMedian', label: 'vs 中位', default: true },
  { key: 'source', label: '来源', default: false },
  { key: 'origin', label: '渠道', default: false },
  { key: 'direct', label: '发布', default: false },
  // PNP/EE/AIP 三信号列:2026-07-25 Frank 让它们默认亮(「差异化信号该默认亮」),
  // 2026-08-03 他自己推翻(「页面看着别扭,很多人一进来看这个页面设计就跑路了」)——
  // 首屏 13 列在 1440 上还要横滚,一进来是一张密密麻麻的表格,差异化没被读到就先被劝退了。
  // **信号没丢**:三样都在「操作」列的移民价值弹框里,手机卡片 chips 照旧;字段面板一键调回。
  { key: 'pnp', label: 'PNP', default: false },
  { key: 'ee', label: 'EE 类别', default: false },
  { key: 'aip', label: 'AIP', default: false },
  { key: 'pilot', label: 'RCIP/FCIP', default: false },
  { key: 'lmia', label: '外劳记录', default: false },  // E6-02:雇主近两年 LMIA 获批史(公司级信号)
  { key: 'eligibility', label: '身份预筛', default: false },  // GAP1③:JD 明确不担保/须 PR 红旗(C14/C15)
  { key: 'status', label: '状态', default: false },
  { key: 'lastSeen', label: '更新时间', default: false },
  { key: 'closedAt', label: '下架时间', default: false },
  { key: 'actions', label: '操作', default: true, always: true },  // 固定最后一列:移民价值 + 收藏按钮(#201:「通道」列删除,「通道弱」等档名用户看不懂;移民弹框入口改本列按钮)
]
export const DEFAULT_COLS = COLUMNS.filter((c) => c.default).map((c) => c.key)
// 原子值列:内容单行不换行(日期/金额/百分比/分级等短值,断行会很丑)。其余文本列(职位/公司/地点等)允许多行,
// 以便表格压进容器宽度不横向滚动。表头一律不换行(=该列最小宽度)。
// salary 不在此列:薪资原文可为长文本(如 "40% commission per sale"),要像文本列一样换行;年薪/中位数等计算列恒短值。
export const NOWRAP_COLS = new Set<ColKey>(['datePosted', 'lastSeen', 'closedAt', 'salaryYr', 'wageMedHr', 'wageMedYr', 'vsMedian', 'teer', 'empHours', 'empTerm', 'score', 'status', 'direct', 'aip', 'pilot', 'lmia', 'eligibility', 'match'])
export const PREF_KEY = 'jobs.visibleCols.v11'  // v11:删「通道」列(#201,移民入口改操作列按钮);bump 版本让新默认生效
export const writeColsCookie = (keys: string[]) => {
  try { document.cookie = `${COLS_COOKIE}=${encodeURIComponent(JSON.stringify(keys))}; path=/; max-age=31536000; SameSite=Lax` } catch { /* ignore */ }
}

// ── 每列单元格 ────────────────────────────────────────────────────────────
// 一格三件:显示什么(node)、格子样式(extra)、点文字去哪(href,只有地点几列有)。
// 这条链是「本站怎么解读一条岗位」的全部 —— 薪资绿不绿看 salaryText 不看 salary(源头填错的行不敢背书)、
// PNP 三档强弱、EE 休眠、AIP 被官方清单挡下……都在这儿。它属于「列」,不属于页面排版,故随列定义同住。
// 按词换行(不逐字断词);不设 wordBreak 以免列被挤成 1 字符宽。
// 2026-08-03:去掉原来的 maxWidth 上限 —— 列宽已由 useColWidths 统一分配,格子再自设上限
// 就会出现「列有 250px、格子卡在 190px」→ 文字被 overflow:hidden 齐刷刷切掉(Frank 实拍公司名被截)
const wrapCell = (): React.CSSProperties => ({ whiteSpace: 'normal', overflowWrap: 'break-word', wordBreak: 'normal' })

export type CellCtx = {
  t: TFn
  plan: Plan
  eeCats: EeOcc[]                                  // 维度表里的 EE 类别(算「休眠」要看最近抽选日)
  blocked: { pnp: Set<string>; aip: Set<string> }  // 官方具名排除清单,键 '省码|NOC'
  onUpsell: () => void                             // 锁标点击 → 开升级弹框
}
export type Cell = { node: React.ReactNode; extra: React.CSSProperties; href: string | null }

                      // #175:hover 高亮只随可点格(可点必有态,不可点必无——E8-08 规范本来就这么写)
                      // 批A 追拍(Frank「走不了的就别给点了」):PNP/EE/AIP 的「—」格(无信号)摘可点——点开只会看到「走不了」,没有意义
                      // 2026-07-26 Frank「恢复可点」:命中官方具名清单的走不了=有依据可看,重新可点(泛判定的「—」仍不可点)
export const cellActive = (k: ColKey, j: JobRow, blocked: CellCtx['blocked']): boolean =>
  cellActionable(k) && (k === 'pnp' ? (!!j.pnpEligible || blocked.pnp.has(j.province + '|' + j.noc))
    : k === 'ee' ? !!j.eeCategory : k === 'aip' ? (!!j.aip || blocked.aip.has(j.province + '|' + j.noc)) : k === 'pilot' ? !!j.pilot : true)

export function cellOf(k: ColKey, j: JobRow, cx: CellCtx): Cell {
  const { t, plan, eeCats, blocked: blockedKeys, onUpsell } = cx
  const L = parseLoc(j)                                                       // 省/市/区
  const cat = colorOf(j.broad)
  const broadLabel = (v?: string) => (v && v !== '未分类' ? catName({ t, value: v }) : t('cell.uncat'))
  const catLabel = (v?: string) => (!v || v === '未分类' ? t('cell.uncat') : catName({ t, value: v }))
  let href: string | null = null
  let node: React.ReactNode
  const extra: React.CSSProperties = {}
  // Pro 专属列(E3-05):免费用户列位显示锁标(数据在服务端已剥离,改偏好/cookie 绕不过)
  if (PRO_COLS.has(k) && !plan.isPro && k !== 'match') {
    {/* ③ lockTip 按列说人话(hover 就知道锁着什么);#152:锁标改打码占位数——
        「这儿有个数」比一把锁更能让人判断值不值,和详情页 #130 同一套 */}
    node = (
      <button title={t('up.lockTip.' + k)} onClick={(e) => { e.stopPropagation(); onUpsell() }}
        className="jtLock">
        <span aria-hidden className="jtLockMask">{PRO_MASK[k] || '—'}</span>
        <IconLock />
      </button>
    )
    Object.assign(extra, { whiteSpace: 'nowrap', textAlign: 'center' as const })
  }
  else if (k === 'match') {  // 与我的匹配(E5-00):高=绿 chip / 中=蓝 / 低=灰 / 不适用=浅;未建档→引导。
    // 匹配全放开(Frank 2026-07-21):所有岗都出真实档位,不再有「超额打码」档——收费只剩 Pro 数据列
    if (j.match) {
      // #207(第 26 轮体检):裸字「高/中/低」无口径 —— 挂 title 说清是什么的高低,点开仍是逐条依据链
      node = <span title={t('match.tip')} className={'jtMatch ' + j.match}>{t('match.' + j.match)}</span>
      Object.assign(extra, { whiteSpace: 'nowrap' })
    } else if (!plan.loggedIn || !plan.profileOk) {
      node = <a href="/account" className="jtNeedProfile" onClick={(e) => e.stopPropagation()}>{t('match.needProfile')} →</a>
    } else {
      node = <span className="jtDash">—</span>; Object.assign(extra, { whiteSpace: 'nowrap', textAlign: 'center' as const })
    }
  }
  else if (k === 'score') { node = j.gradeChannel != null ? t('gr.ch.' + j.gradeChannel) : (j.score ?? '—'); Object.assign(extra, { fontWeight: 500, whiteSpace: 'nowrap', fontSize: 12.5, color: gradeColor(j.gradeChannel) }) }  // #132 档名人话化(Frank「X/5 看不懂」);旧库未回填退 0-100 旧分
  else if (k === 'broad') { node = broadLabel(j.broad); Object.assign(extra, { whiteSpace: 'nowrap', color: cat.fg, fontWeight: 500 }) }
  else if (k === 'mid') { node = (!j.mid || j.mid === '未分类') ? t('cell.uncat') : catLabel(j.mid); Object.assign(extra, { whiteSpace: 'nowrap', color: '#4b5563' }) }
  else if (k === 'fine') { node = (j.mid === '未分类' || !j.mid || j.fine === j.mid) ? '—' : catLabel(j.fine); Object.assign(extra, { whiteSpace: 'nowrap', color: '#4b5563' }) }
  else if (k === 'teer') { node = j.teer == null ? '—' : <span title={t('teer.tip', { n: j.teer, l: t('teer.' + j.teer) })}>{`TEER ${j.teer}`}</span>; Object.assign(extra, { whiteSpace: 'nowrap', color: '#4b5563' }) }
  else if (k === 'empHours') { node = j.employmentHours ? t('emp.' + j.employmentHours) : '—'; Object.assign(extra, { whiteSpace: 'nowrap', color: j.employmentHours ? '#4b5563' : '#d1d5db', fontSize: 12.5 }) }
  else if (k === 'empTerm') { node = j.employmentTerm ? t('term.' + j.employmentTerm) : '—'; Object.assign(extra, { whiteSpace: 'nowrap', color: j.employmentTerm ? '#4b5563' : '#d1d5db', fontSize: 12.5 }) }
  // #175:职位/公司格的外链 href 摘除——点击行为只剩弹框(外链出口在弹框/详情页里,一格一个动作)
  else if (k === 'title') { node = j.title; Object.assign(extra, wrapCell(), { color: '#2563eb' }) }
  else if (k === 'company') { node = j.company; Object.assign(extra, wrapCell(), { color: '#2563eb' }) }
  else if (k === 'noc') node = j.noc || '—'
  else if (k === 'accessibility') node = t('acc.' + (j.accessibility || 'unknown'))
  /* 颜色跟 salaryText 走,不跟 salary(原文)走:护栏判定源头填错的行(如「$295,000.00 daily」)
     原文有值但我们不敢显示 —— 标成绿色等于说「这条有可信薪资」,是误导。2026-08-05 拍板 */
  else if (k === 'salary') { node = <span title={j.salary || ''}>{j.salaryText || '—'}</span>; Object.assign(extra, { color: j.salaryText ? '#15803d' : '#9ca3af' }) }
  else if (k === 'salaryYr') { const a = j.salaryAnnual; node = a != null ? `$${Math.round(a / 1000)}K/yr` : '—'; Object.assign(extra, { whiteSpace: 'nowrap', color: a != null ? '#15803d' : '#9ca3af' }) }
  else if (k === 'wageMedHr') { node = j.wageMedHourly != null ? `$${j.wageMedHourly}/hr` : '—'; Object.assign(extra, { whiteSpace: 'nowrap', color: j.wageMedHourly != null ? '#4b5563' : '#9ca3af' }) }
  else if (k === 'wageMedYr') { const m = j.wageMedAnnual; node = m != null ? `$${Math.round(m / 1000)}K/yr` : '—'; Object.assign(extra, { whiteSpace: 'nowrap', color: m != null ? '#4b5563' : '#9ca3af' }) }
  else if (k === 'vsMedian') { const a = j.salaryAnnual, m = j.wageMedAnnual; if (a != null && m) { const p = Math.round((a / m - 1) * 100); node = `${p >= 0 ? '+' : ''}${p}%`; Object.assign(extra, { whiteSpace: 'nowrap', fontWeight: 600, color: p >= 0 ? '#15803d' : '#b45309' }) } else { node = '—'; Object.assign(extra, { whiteSpace: 'nowrap', color: '#9ca3af' }) } }
  else if (k === 'address') { href = j.address ? mapsUrl(j.address) : null; node = j.address || '—'; Object.assign(extra, wrapCell()) }
  else if (k === 'direct') { const dr = isDirect(j); node = dr ? t('cell.first') : t('cell.repost'); Object.assign(extra, { whiteSpace: 'nowrap', color: dr ? '#15803d' : '#9ca3af', fontSize: 12.5 }) }
  else if (k === 'country') { node = L.country || '—'; Object.assign(extra, { whiteSpace: 'nowrap', color: '#4b5563' }) }
  // 省/市/区 → 文字=地图链接、格子=地点弹框(E8-12 Frank「点文字跳 map,点框弹框」)
  else if (k === 'province') { href = L.prov ? mapsUrl(mapQuery({ field: 'province', job: j })) : null; node = L.prov || '—'; Object.assign(extra, { whiteSpace: 'nowrap', color: '#4b5563' }) }
  else if (k === 'city') { href = L.city ? mapsUrl(mapQuery({ field: 'city', job: j })) : null; node = L.city || '—'; Object.assign(extra, { whiteSpace: 'nowrap', color: '#4b5563' }) }
  else if (k === 'district') { href = L.district ? mapsUrl(mapQuery({ field: 'district', job: j })) : null; node = L.district || '—'; Object.assign(extra, { whiteSpace: 'nowrap', color: '#1f2937' }) }
  else if (k === 'source') { node = sourceLabel(j); Object.assign(extra, { whiteSpace: 'nowrap', color: '#4b5563' }) }
  else if (k === 'origin') { node = j.origin ? t('origin.' + j.origin) : '—'; Object.assign(extra, { whiteSpace: 'nowrap', color: '#4b5563' }) }
  else if (k === 'pnp') {  // 三档强度 + 魁省N/A:强=具名紧缺通道(琥珀底色 chip,500)、中=可提名(绿,500)、弱=不符(灰—,400);魁省=紫,400(独立 N/A)
    const stream = j.pnpStream  // 命中省 inclusion 清单才有,别处看不到的真信号
    if (j.province === 'QC') { node = t('cell.pnpQc'); Object.assign(extra, { whiteSpace: 'normal', color: '#7c3aed', fontSize: 12.5 }) }
    else if (stream) {       // 强:省点名招 → 浅琥珀底色徽章(全列唯一加底色的一档)
      node = <span className="jtStream">{streamDisplay({ t, label: stream })}</span>
      Object.assign(extra, { whiteSpace: 'normal', overflowWrap: 'anywhere' })
    }
    // 中:可提名 —— 带上省码(Frank 2026-07-26「最好是显示 可哪个省的提名」):
    // 省提名是**逐省**的,光写「可提名」会让人以为哪儿都能走;与紧缺徽章「MB 乡镇在需」同款省码前缀
    else if (j.pnpEligible) { node = t('cell.pnpSkilledProv', { p: j.province }); Object.assign(extra, { whiteSpace: 'normal', color: '#15803d', fontWeight: 500, fontSize: 12.5 }) }
    // E6-09:命中官方具名排除清单 → 说结论(红字,格子可点看依据);其余走不了仍是灰「—」
    else if (blockedKeys.pnp.has(j.province + '|' + j.noc)) { node = t('cell.pnpExcl'); Object.assign(extra, { whiteSpace: 'normal', color: '#b91c1c', fontSize: 12.5 }) }
    else { node = '—'; Object.assign(extra, { whiteSpace: 'nowrap', color: '#9ca3af', fontSize: 12.5 }) }  // 弱:不符
  }
  else if (k === 'ee') {  // 联邦 EE 类别抽选(全国单一源,数据层算);命中→蓝,未列入→—;休眠类别→灰+上次抽选
    const lastDraw = j.eeCategory ? eeLastDraw(j.eeCategory, eeCats) : ''
    const dormant = !!j.eeCategory && eeIsDormant(lastDraw)
    node = j.eeCategory
      ? <span title={dormant ? t('ee.dormantTip', { d: lastDraw.slice(0, 7) || '—' }) : undefined}>
          {eeDisplay({ t, label: j.eeCategory })}{dormant ? t('ee.lastDraw', { d: lastDraw.slice(0, 7) || '—' }) : ''}</span>
      : '—'
    Object.assign(extra, { whiteSpace: 'normal', color: j.eeCategory ? (dormant ? '#9ca3af' : '#2563eb') : '#d1d5db', fontSize: 12.5 })
  }
  else if (k === 'pilot') {
    // 试点社区列:值=类型(RCIP/FCIP),社区名进弹框;未命中「—」
    node = j.pilot || '—'
    Object.assign(extra, { color: j.pilot ? '#0e7490' : '#d1d5db', fontSize: 12.5 })
  }
  else if (k === 'aip') {
    // E6-09:省里逐条点名「这些职业不受理背书」→ 结论压过「雇主在指定名单」(官方一律不受理)
    const blocked = blockedKeys.aip.has(j.province + '|' + j.noc)
    node = blocked ? t('cell.aipBlocked') : j.aip ? t('cell.aipYes') : '—'
    Object.assign(extra, { whiteSpace: 'normal', color: blocked ? '#b91c1c' : j.aip ? '#b45309' : '#d1d5db', fontSize: 12.5 })
  }
  else if (k === 'lmia') {  // E6-02:✓ 职位数 · 最近季度(历史事实;详情看弹框事实块)
    node = j.lmiaPositions ? t('cell.lmiaYes', { n: j.lmiaPositions, q: j.lmiaLastQuarter }) : '—'
    Object.assign(extra, { whiteSpace: 'nowrap', color: j.lmiaPositions ? '#0f766e' : '#d1d5db', fontSize: 12.5, fontWeight: j.lmiaPositions ? 500 : 400 })
  }
  else if (k === 'eligibility') {  // GAP1③:红旗=红字;未检出=灰杠(≠保证担保,口径看弹框)
    node = j.eligibilityFlag ? t('cell.elig.' + j.eligibilityFlag) : '—'
    Object.assign(extra, { whiteSpace: 'nowrap', color: j.eligibilityFlag ? '#b91c1c' : '#d1d5db', fontSize: 12.5, fontWeight: j.eligibilityFlag ? 600 : 400 })
  }
  else if (k === 'status') { const cl = j.status === 'closed'; node = cl ? t('cell.closed') : t('cell.open'); Object.assign(extra, { whiteSpace: 'nowrap', color: cl ? '#9ca3af' : '#15803d', fontSize: 12.5 }) }
  else if (k === 'closedAt') { node = j.closedAt ? j.closedAt.slice(0, 10) : '—'; Object.assign(extra, { color: '#9ca3af', fontSize: 12.5, whiteSpace: 'nowrap' }) }
  else if (k === 'datePosted') { node = j.datePosted ? j.datePosted.slice(0, 10) : '—'; Object.assign(extra, { color: '#6b7280', fontSize: 12.5, whiteSpace: 'nowrap' }) }
  else { node = j.lastSeen ? fmtLocalSec(j.lastSeen) : '—'; Object.assign(extra, { color: '#9ca3af', fontSize: 12.5, whiteSpace: 'nowrap' }) }
  return { node, extra, href }
}
