'use client'
// 职位描述(JD):抓正文 → 解析分节 → 渲染(原文/AI 整理版/中文对照)→ AI 速读 → 投递栏。
// JobBody 是**详情页与弹框共用的同一副身体**(/jobs/[id] 整页 与 ActModal 浮层渲的是同一棵树)。
// 正文一律懒取(fetchJobText 带同岗会话缓存),原站拦抓取的走空态说事实,不绕过访问控制。
import { useEffect, useState } from 'react'

import { IconCompass } from '@/components/icons'

import { LockedText } from './Lock'
import { AuthModal } from '@/components/auth'
import { Modal, useIsNarrow } from '@/components/modal'
import { OnboardingWizard, OB_SEEN_KEY } from './OnboardingWizard'
import { ResumeMatchModal } from './ResumeMatchModal'   // G3 简历对照(入口在 ApplyBar)
import { makeT, type Lang, type TFn } from '@/lib/i18n'
import { type Plan, type JobRow, type NocDesc, hasProfile, normalizeProfile, type MatchProfile, blockedSrc } from '@/lib/jobs'
import { track } from '@/lib/track'

// 职位事实块:标题 + 匹配 NOC + 抓取的 JD 正文摘录(走 /api/jobs/text,同 ActModal desc;列表 SQL 不带 description)
// NOC 官方主要职责 / 任职要求(StatCan Elements);noc 来自 noc-descriptions 维度,无则不渲染
export function NocDutiesView({ noc, lang }: { noc: NocDesc | null; lang: Lang }) {
  const t = makeT(lang)
  if (!noc || (!noc.duties && !noc.requirements)) return null
  const block = (label: string, text: string) => text ? (
    <>
      <div className="jdNocHead">{label}{noc.fetched ? `(${noc.fetched})` : ''}</div>
      <ul className="jdNocList">
        {text.split('\n').filter(Boolean).map((d, i) => <li key={i}>{d}</li>)}
      </ul>
    </>
  ) : null
  return <>{block(t('fact.nocDuties'), noc.duties)}{block(t('fact.nocReqs'), noc.requirements)}</>
}

// 抓取的 JD 正文 → Job Bank 原版式(2026-07-06 用户拍板「按人家的格式」):
// 大节头(Overview/Responsibilities…)加粗放大、子节头(Tasks/Languages…)加粗,内容行缩进纯文本;
// 源头自带的 •/· 圆点剥掉(否则双圆点);全部展开不做内层滚动(弹窗整体滚)。
// 节头用白名单识别(Job Bank 固定小节),白名单外一律当内容行 —— 「English」这类单词值不会被误判成标题。
const JD_TOP_HEADS = new Set(['overview', 'responsibilities', 'requirements', 'experience and specialization', 'additional information', 'benefits', 'employment groups', 'who can apply for this job', 'who can apply to this job'])
const JD_SUB_HEADS = new Set(['languages', 'education', 'experience', 'on site', 'on the road', 'work setting', 'work site environment', 'tasks', 'supervision', 'credentials', 'certificates, licences, memberships, and courses', 'computer and technology knowledge', 'area of specialization', 'area of work experience', 'security and safety', 'transportation/travel information', 'work conditions and physical capabilities', 'weight handling', 'own tools/equipment', 'personal suitability', 'health benefits', 'financial benefits', 'long term benefits', 'other benefits', 'screening questions', 'green job'])
// Indeed/ATS 尾巴的内联标签(源头丢换行,如 "Job Type: Part-time Pay: $20 Benefits: * A * B"):
// 白名单标签前补换行 + 「* 」项拆行 —— 只认这些词,不会切碎正文散文段落。
const JD_INLINE_LABELS = ['Job Types', 'Job Type', 'Pay', 'Salary', 'Benefits', 'Schedule', 'Expected hours', 'Supplemental pay types', 'Flexible language requirement', 'Experience', 'Education', 'Language', 'Work Location', 'Licence/Certification', 'Ability to commute/relocate', 'Application question(s)', 'Application deadline', 'Expected start date', 'Shift availability']
// 第三套版式(2026-07-07 用户第三例):医疗/政府 HR 系统导出(SHA/SAHO 等)——整段「Label: value Label: value」
// 粘连,且有无空格粘边(「YesEducation- Bachelor」)和「Label- 值」破折号变体。照旧全白名单制,不碰散文。
const JD_HR_LABELS = ['Position #', 'Expected Start Date', 'Union', 'Facility', 'City/Town', 'Department', 'Type', 'FTE',
  'Shift Information', 'Number of Hours per Rotation', 'Relief', 'Float', 'Hours of Work', 'Salary or Pay Band',
  'Travel Required', 'Job Description', 'Human Resources Exemption', 'Multi-Cost', 'Licenses', 'Other Information',
  'About Us', 'About The Team']
const jdEsc = (s: string) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')
const JD_ALL_ALTS = [...JD_INLINE_LABELS, ...JD_HR_LABELS].map(jdEsc).join('|')
const JD_INLINE_RE = new RegExp(`\\s+(?=(?:${JD_ALL_ALTS}):)`, 'g')
const JD_HR_DASH_RE = new RegExp(`\\s+(?=(?:${JD_ALL_ALTS})-\\s)`, 'g')                                // 「 Education- Bachelor」
const JD_GLUE_RE = new RegExp(`(?<=[a-z)])(?=(?:${JD_ALL_ALTS})[:-])`, 'g')                            // 「YesEducation-」无空格粘边
const JD_HR_LINE_RE = new RegExp(`^(${JD_ALL_ALTS})-\\s*`)                                             // 行首「Label- 」→「Label: 」
// 2026-07-16 用户拍板:JD 弹窗去表格,原汁原味逐行显示——第 16 轮「键值段表格化+规则解读列」
// (c4e6f59/369aac0)整体退役(多张表的抽象感 + 解读列大量留空,读起来不如原文)。
// 双轨渲染:数据层给了真实换行(05b 块级序列化,原帖分段/列表/标题保真)→ 按原换行渲染,空行=段距;
// 压平老坨帖(Job Bank 聚合时丢格式,0 换行)→ 才走猜测式断行(粘连断行/bullet 拆行/一句一行,历轮拍板)。
export function JdTextView({ text, max = 4000 }: { text: string; max?: number }) {
  const clipped = text.slice(0, max)
  const hasBreaks = clipped.includes('\n')
  const lines = (hasBreaks
    ? clipped
      .replace(/[*\\_]{2,}/g, ' ')      // markdown 强调残渣照剥(第 12 轮 #31)
      .split('\n')
      .map((s) => s.trim().replace(/\s{2,}/g, ' '))
    : clipped
      .replace(JD_GLUE_RE, '\n')        // 无空格粘边先断(YesEducation- → Yes\nEducation-)
      .replace(JD_INLINE_RE, '\n')      // 已知标签前断行
      .replace(JD_HR_DASH_RE, '\n')     // HR「Label- 值」变体前断行
      .replace(/\s+\*\s+/g, '\n')       // "* 项" 拆行(星号本身在下方统一剥掉)
      // 行内圆点 bullet 拆行(2026-07-10 用户第四例,CER 帖:「decision making;• Design」——源头丢换行,
      // 圆点前可无空格;圆点后必有空格才算列表项,防误伤小数/代码;圆点在下方统一剥掉)
      .replace(/\s*[•▪◦‣]\s+/g, '\n')
      // markdown 强调残渣(第 12 轮 #31,第 5 套版式:Indeed 富文本转义,如「*Administrator *to」
      // 「*Key Responsibilities:*」「\**_*…*_」)——先拍掉连堆的 */_/\,再清孤立 */\;
      // 下划线只在连堆里清(URL/邮箱残件可能带合法下划线);真实 JD 不用星号行文,误伤面≈0。
      // 注意顺序:必须在上面「 * 项」拆行之后,别抢了列表拆行的星号。
      .replace(/[*\\_]{2,}/g, ' ')
      .replace(/[*\\]/g, ' ')
      .split('\n')
      // 一句一行(07-06 用户拍板):句末标点(前一字符是小写/数字/右括号,防 $20.00、U.S. 误拆)
      // + 可选空格 + 大写开头 → 断行;兼容 Job Bank 抓取的无空格粘连("asset.Core")
      .flatMap((l) => l.split(/(?<=[a-z0-9)][.!?])\s*(?=[A-Z])/))
      .map((s) => s.trim().replace(/^[•·▪◦‣*-]+\s*/, '').replace(/\s{2,}/g, ' '))
      .filter(Boolean)
  ).map((l) => l.replace(JD_HR_LINE_RE, '$1: '))  // HR「Label- 值」归一成「Label: 值」
    // 相邻重复行去重(2026-07-19 Frank 报障:ZipRecruiter 帖「Job Description」连出两遍,库内 349 帖同款
    // 模板节头重复)——跳过空行比较、只收 ≤80 字符短行(节头/标签),正文长句不碰;保留首次出现
    .filter((function () { let prev = ''; return (l: string) => { if (!l) return true; const dup = l === prev && l.length <= 80; prev = l; return !dup } })())
  // 保真轨保留空行作段距;行首「• 」保留(数据层给的列表符),只在猜测轨剥
  const renderLine = (l: string, i: number) => {
    if (!l) return <div key={i} className="jdGap" />
    if (l.startsWith('• ')) return <div key={i} className="jdBullet">{l}</div>
    const low = l.toLowerCase()
    if (JD_TOP_HEADS.has(low)) return <div key={i} className="jdH1">{l}</div>
    if (JD_SUB_HEADS.has(low)) return <div key={i} className="jdH2">{l}</div>
    const bare = l.match(/^([A-Z][A-Za-z ()/#&'-]{1,40}):$/)  // 裸标签行(如 "Benefits:")→ 小节头
    if (bare) return <div key={i} className="jdH2">{bare[1]}</div>
    const m = l.match(/^([A-Z][A-Za-z ()/#&'-]{1,40}):\s*(.+)$/)
    if (m) return <div key={i} className="jdIndent"><strong className="jdLabel">{m[1]}:</strong> {m[2]}</div>
    return <div key={i} className="jdIndent">{l}</div>
  }
  return (
    <div className="jdRaw">
      {lines.map(renderLine)}
    </div>
  )
}
// J3 五节整理版渲染(2026-07-19 Frank 批):[ROLE]/[REQS]/[PAY]/[WORKHOURS]/[APPLY] 标记文本 → 节头加粗独立行,
// 节内一条一行(W 规范:禁「·」「/」杂糅);(not stated) → 「原帖未提及」灰字,缺节不脑补。
// trans=同结构译文(jd-translate 行位保真)→ 节内按行号逐句对照,样式与资讯页对照同规范(蓝条+深蓝字)
const jdParseSecs = (s: string): Record<string, string> => {
  const parts = s.split(/\[(ROLE|REQS|PAY|WORKHOURS|APPLY)\]/)
  const secs: Record<string, string> = {}
  for (let i = 1; i + 1 < parts.length + 1; i += 2) { const pk = parts[i]; if (pk != null) secs[pk] = (parts[i + 1] || '').trim() }
  return secs
}
// 「缺节」判定放宽(Frank 2026-07-22「不需要加括号吧」):模型指令要 (not stated),但实测会漂成
// (none stated)/(not specified)/(not mentioned)…,严格只认 (not stated) → 变体被当正文渲成「(none stated) ↗」。
// 括号可有可无,not/none + stated/specified/mentioned/provided/available/applicable 一律算缺节。
const JD_NONE_RE = /^\(?\s*(not|none|n\/a)(\s+(stated|specified|mentioned|provided|available|applicable|listed))?\s*\)?$/i
// #198(Frank「这句话删掉」指 "Not stated in the results."):模型偶尔写整句而非 (not stated)——
// 起手是「not/none/no + stated/specified/…/information」且短句(<50)即当缺项(不占行)。
const JD_NONE_LOOSE = /^\(?\s*(not|none|no)\s+(stated|specified|mentioned|provided|available|applicable|listed|information)\b/i
// 先剥「- 」bullet 前缀再判(#186:变体常以「- (not stated)」bullet 形式混在有内容的节里)
export const isJdNone = (s?: string) => { const b = (s || '').trim().replace(/^-\s*/, ''); return !b || JD_NONE_RE.test(b) || (b.length < 50 && JD_NONE_LOOSE.test(b)) }
// 值在 main.css 第 15 段。要改字号/上距就 className={JD_ZH_LINE} + style={{...}} —— 行内压得过类。
export const JD_ZH_LINE = 'jdZh'
export function JdFormattedView({ text, t, fallbackPay, applyUrl, applyEmail, underTitle, trans }: { text: string; t: TFn; fallbackPay?: string; applyUrl?: string; applyEmail?: string; underTitle?: boolean; trans?: string }) {
  const SECS: [string, string][] = [['ROLE', 'act.f.role'], ['REQS', 'act.f.reqs'], ['PAY', 'act.f.pay'], ['WORKHOURS', 'act.f.hours'], ['APPLY', 'act.f.apply']]
  const secs = jdParseSecs(text)
  const tSecs = trans ? jdParseSecs(trans) : null
  return (
    <div className="jdFmt">
      {SECS.map(([m, key]) => {
        const body = (secs[m] || '').trim()
        const rawEn = body.split('\n').map((s) => s.trim()).filter(Boolean)
        const rawZh = tSecs ? (tSecs[m] || '').split('\n').map((s) => s.trim()).filter(Boolean) : []
        // #186(Frank「上面已有信息就别再加一个 (not stated)」):节内逐行丢掉 (not stated) 变体行——
        // 模型偶发在有真内容的节里也补一条 "(not stated)"(如 薪资列了时薪又挂一条),那是噪音。
        // 丢完为空=整节缺(走 原帖未提及/URL/兜底)。译文按丢完后的行位对齐。
        const pairs = rawEn.map((en, i) => ({ en, zh: rawZh[i] })).filter((p) => !isJdNone(p.en))
        const lines = pairs.map((p) => p.en)
        const none = lines.length === 0
        const zh = (i: number) => { const z = pairs[i]?.zh; return z && z !== lines[i] && !isJdNone(z) ? <div className={JD_ZH_LINE}>{z.replace(/^-\s*/, '')}</div> : null }
        const hasBullets = lines.some((l) => l.startsWith('- '))
        return (
          <div key={m} className="jdSec">
            {/* #155(Frank「这两个字也是重复的」):首节 ROLE 的小标题「这活干什么」紧贴大标题「职位描述」,
                两行说同一件事 —— 首节不出小标题,正文直接跟在「职位描述」下面;其余四节照旧有小标题分区。
                #161(Frank「这个地方缺 title 吧」):#155 的作用域开大了 —— 该组件另有一个容器(ActModal)
                上方只有「✨ AI 整理…」一行灰注、**没有大标题**,砍掉首节小标题后正文就裸奔了。
                改成按容器决定:underTitle=紧跟大标题(详情页)才省略,默认照常出小标题。 */}
            {m === 'ROLE' && underTitle ? null : <div className="jdSecHead">{t(key)}</div>}
            {/* #125(Frank「重复」):「怎么投」整节文本直接渲成官方原帖链接——一处内容一处链接,
                不再额外附按钮行(与底部合规来源行重复);「Click Here」类废句自身变成可点出口 */}
            {m === 'APPLY' && applyUrl ? (
              /* dd24-#110:抽到投递邮箱(applyhow/正文正则)优先显示邮箱人话行;没邮箱且原帖也没写投递方式
                 → 原先整条裸 URL 换短链文案(URL 又长又丑还与下方投递栏重复,出处仍是同一官方原帖) */
              none
                ? (applyEmail
                  ? <div className="jdIndent wrap">{applyEmail}</div>
                  : <div className="jdIndent"><a href={applyUrl} target="_blank" rel="noreferrer" className="jdLink">{t('act.seeOfficial')}</a></div>)
                : <>
                    {applyEmail && <div className="jdIndent wrap">{applyEmail}</div>}
                    {lines.map((l, i) => <div key={i} className="jdIndent"><a href={applyUrl} target="_blank" rel="noreferrer" className="jdLink">{l.replace(/^-\s*/, '')} ↗</a>{zh(i)}</div>)}
                  </>
            ) : /* #123c(Frank「每个职位都有薪资吧」):原帖正文没写薪资但帖面字段有 → 兜底显示帖面薪资+来源灰注
                (仍是搬运原帖信息——JB 列表字段也是雇主自报,非编造) */
            none && m === 'PAY' && fallbackPay ? (
              <div className="jdIndent">{fallbackPay}</div>
            ) : none ? <div className="jdIndent none">{t('act.f.none')}</div>
              : <>
                  {/* Frank 2026-07-31「整理后的怎么薪资没显示」:模型抄了福利漏了钱数(#123c 只管整节空)——
                      PAY 节一行都不含数字=视为缺薪资,帖面薪资字段照 #123c 口径顶到节首(真数不靠 LLM 抄) */}
                  {m === 'PAY' && fallbackPay && !lines.some((l) => /[$€£]\s?\d|\d[\d,]{2,}/.test(l)) &&
                    <div className="jdIndent">{fallbackPay}</div>}
                  {hasBullets ? <ul className="jdBullets">{lines.map((l, i) => <li key={i}>{l.replace(/^-\s*/, '')}{zh(i)}</li>)}</ul>
                    : lines.map((l, i) => <div key={i} className="jdIndent">{l}{zh(i)}</div>)}
                </>}
          </div>
        )
      })}
    </div>
  )
}

// JD 框内嵌 AI 顾问初判(2026-07-19 Frank:「像公司顾问一样自动生成,不要再点一下」)——
// 打开职位描述即自动流式生成,不用再点「AI 顾问」钮;额度闸照走(402 升级卡/429 说人话);
// 同岗会话内缓存,反复开关不重复烧额度。深挖(对比表+追问对话)仍在「AI 顾问」钮的完整弹框里。
const jdAdvCache = new Map<string, string>()
// field:'title'=顾问初判(详情页,含移民路径);'jdRead'=纯 JD 速读(职位弹框,2026-07-21 Frank
// 「只速读这个 job 的内容即可,不需要过度解读移民信号」)
export function JdAdvisorSection({ job, lang, plan, title, field = 'title' }: { job: JobRow; lang: Lang; plan: Plan; title?: string; field?: 'title' | 'jdRead' | 'coRead' }) {
  const t = makeT(lang)
  const ck = `${field}:${job.id}`
  const [text, setText] = useState(jdAdvCache.get(ck) || '')
  const [status, setStatus] = useState<'loading' | 'streaming' | 'done' | 'error' | 'upgrade' | 'limited'>(jdAdvCache.has(ck) ? 'done' : 'loading')
  const [freeLeft, setFreeLeft] = useState<number | null>(null)
  const [tick, setTick] = useState(0)   // 2026-07-25 用户:解析失败要能重试——tick+1 重跑生成
  useEffect(() => {
    if (jdAdvCache.has(ck)) return
    const ctrl = new AbortController()
    setText(''); setStatus('loading')
    ;(async () => {
      try {
        const res = await fetch('/api/advisor', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ctrl.signal,
          // 2026-08-23 契约换 id 制:事实服务端现查,job 包不再上传
          body: JSON.stringify({ field, id: String(job.id), lang }),
        })
        const left = res.headers.get('X-Free-Left')
        if (left != null) setFreeLeft(Number(left))
        if (res.status === 402) { setStatus('upgrade'); return }
        if (res.status === 429) { setStatus('limited'); return }
        if (!res.ok || !res.body) { setStatus('error'); return }
        setStatus('streaming')
        const reader = res.body.getReader(); const dec = new TextDecoder()
        let acc = ''
        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          acc += dec.decode(value, { stream: true })
          setText(acc)
        }
        const { body } = extractSug(acc, job.company, lang)   // 尾行建议问题不在内嵌区展示(追问在完整弹框)
        jdAdvCache.set(String(job.id), body)
        setText(body); setStatus('done')
      } catch { if (!ctrl.signal.aborted) setStatus('error') }
    })()
    return () => ctrl.abort()
  }, [job, lang, tick])
  return (
    /* 壳=裸段(Frank「AI 顾问和职位描述分成两个卡片」「不要卡片套卡片」):组件自己不带壳,
       详情页包进独立 sec 卡、JD 弹框包分隔线段——间隔样式归消费方。
       标题=卡标题级(每卡必有 title);「·」杂糅退役——剩余次数改空格灰注 */
    <div>
      <div className="jdAdvHead">
        <IconCompass /> {title || t('advisor.tag')}{freeLeft != null ? <span className="jdAdvLeft">{t('advisor.left', { n: freeLeft })}</span> : null}
      </div>
      {status === 'upgrade' ? <LockedText t={t} loggedIn={plan.loggedIn} />
        : status === 'limited' ? (
          /* #175:429 黄条退役 → 打码+锁行(限额内容不留空白也不占黄条,失去感靠打码传达) */
          <LockedText t={t} loggedIn={plan.loggedIn} msg={t('advisor.limit429')} ctaLabel={!plan.loggedIn ? t('advisor.limitCta') : undefined} />
        )
        : status === 'loading' ? <p className="jdAdvNote">{t('advisor.loading')}</p>
        : status === 'error' ? (
          <p className="jdAdvNote">
            {t('advisor.unavail')}
            <button onClick={() => setTick((n) => n + 1)} className="jdRetry">{t('ai.retry')}</button>
          </p>
        )
        : <div className="jdAdvBody">{renderAI(text)}{status === 'streaming' && <span className="jdCaret">▋</span>}</div>}
    </div>
  )
}

// #126 同岗 jobtext 会话缓存:三处调用点(事实块/JD 弹框/详情页 JD 区)共用,同一岗反复开关不重复
// 打端点烧额度(统一池 #124 下一次白开=一次额度)。只缓存 200 非空正文;402/空/失败不缓存,
// 服务端负缓存(10min)照管懒抓重试节奏。命中缓存时 freeLeft=null(没消耗,额度行不刷新)。
const jobTextCache = new Map<string, string>()
// #134(Frank 报障「点了一些工作发现都是空的」):429 曾掉进「空」分支——额度一用完,之后每个岗都显示
// 「本站暂未收录正文」,把限流谎报成缺数据(最恶的一种静默失败:用户以为站没数据)。三态分明:
// 402=免费额度用完(升级卡) · 429=匿名 IP 池用完(说人话+引导注册) · 其它非 2xx=取数失败(不是「没有」)。
export async function fetchJobText(applyUrl: string, signal?: AbortSignal): Promise<{ status: 'ok' | 'gated' | 'limited' | 'error' | 'empty'; text: string; freeLeft: number | null }> {
  const hit = jobTextCache.get(applyUrl)
  if (hit != null) return { status: 'ok', text: hit, freeLeft: null }
  const res = await fetch('/api/jobs/text?url=' + encodeURIComponent(applyUrl), { signal })
  const left = res.headers.get('X-Free-Left')
  const freeLeft = left != null ? Number(left) : null
  if (res.status === 402) return { status: 'gated', text: '', freeLeft }
  if (res.status === 429) return { status: 'limited', text: '', freeLeft }
  if (!res.ok) return { status: 'error', text: '', freeLeft }
  const text = (await res.text()).trim()
  if (text) jobTextCache.set(applyUrl, text)
  return { status: text ? 'ok' : 'empty', text, freeLeft }
}

// ── 建议问题提取(❓协议)──────────────────────────────────────
// ❓ 建议行协议(第 15 轮 #36,用户点名「基于具体内容生成问题」):模型每次回复结尾附一行「❓问题」,
// 打字机 drain 时截住不显示,完成后取出做建议 chip。
export const SUG_MARK = '❓'
// 从完整回复里摘建议问题:① ❓ 标记行(协议);② 兜底=末行是独立短问句(模型偶发漏打标记,
// 问题裸奔在正文结尾 —— 2026-07-11 用户实机撞到)。都没有 → 原文返回,chip 走罐头池。
// 建议问题长度红线(2026-07-11 用户拍板「不要太长」):>60 字裁到首个问号;还收不住 → 弃用退罐头
// #49(第 19 轮):#44 的 prompt 约束(雇主用「这家公司」指代)模型不稳定遵守,缓存换血即复发
// (「TABOCHE TECHNOLOGY过去是否…」「ERA是否…」实拍)——前端兜底:占位里把公司名(含去后缀核心名)统一替换成指代词
const scrubCompany = (q: string, company?: string, lang: Lang = 'zh'): string => {
  if (!company) return q
  const generic = makeT(lang)('jd.sugGeneric')
  const core = company.replace(/\b(incorporated|inc|ltd|limited|llp|llc|corp|corporation|co)\.?\s*$/i, '').trim()
  for (const n of [...new Set([company.trim(), core])].sort((a, b) => b.length - a.length)) {
    if (n.length >= 3) q = q.replace(new RegExp(n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), generic)
  }
  return q.replace(new RegExp(`(${generic})(的?\\s*\\1)+`, 'g'), '$1')  // 相邻重复合一
}
const capSug = (q: string, company?: string, lang?: Lang): string => {
  q = scrubCompany(q.replace(/\*{2,}/g, ''), company, lang)  // 剥 **(#43)+ 公司名指代(#49)
  if (q.length <= 60) return q
  const m = q.match(/^[^?？]{0,59}[?？]/)
  return m ? m[0] : ''
}
export const extractSug = (s: string, company?: string, lang?: Lang): { body: string; sug: string } => {
  const i = s.lastIndexOf(SUG_MARK)
  if (i >= 0 && s.length - i <= 300) return { body: s.slice(0, i).replace(/\s+$/, ''), sug: capSug(s.slice(i + SUG_MARK.length).trim(), company, lang) }
  const t = s.replace(/\s+$/, '')
  const nl = t.lastIndexOf('\n')
  const last = t.slice(nl + 1).trim()
  if (nl > 0 && last.length >= 8 && last.length <= 70 && /[?？]$/.test(last) && !last.startsWith('【')) {
    return { body: t.slice(0, nl).replace(/\s+$/, ''), sug: capSug(last, company, lang) }  // 兜底分支同过 capSug(第 16 轮它绕过了)
  }
  return { body: t, sug: '' }
}

// ── E9-04 投递栏(B11,2026-07-24 拍板):详情底部常驻;注册闸设在投递=全站意愿最强瞬间 ──
// 邮箱岗(投递邮箱从已拉 jobtext 正则抽,懒查询零预抓)→ mailto 预填;无邮箱 → 外跳原帖。
// 未登录 → 注册框 → 求职意向(复用 OnboardingWizard,不新造表单;跳过/关闭都继续投递,投递必须丝滑)。
// 首版=替他备好一切他自己发,不代发(邮箱授权/简历存储/发信信誉全后置)。
const APPLY_RESUME_KEY = 'apply_resume_v1'   // OAuth 整页跳转后的续投意图:`jobId|时间戳`
const APPLY_MAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/g
const applyEmailOf = (text: string): string => {
  for (const m of text.match(APPLY_MAIL_RE) || []) {
    const d = (m.split('@')[1] || '').toLowerCase()
    if (d && !d.includes('jobbank') && !d.endsWith('gc.ca') && !d.endsWith('canada.ca')) return m
  }
  return ''
}

function ApplyBar({ job, email, emailDone, t, plan, onPage }: { job: JobRow; email: string; emailDone: boolean; t: TFn; plan: Plan; onPage?: boolean }) {
  const [stage, setStage] = useState<'idle' | 'auth' | 'intent'>('idle')
  // 整页窄屏投递栏跑偏(Frank 2026-08-05 实拍):sticky bottom 只在**父容器盒内**吸底,整页版的
  // 父级是白卡,卡下面还有 ~150px 的 Footer —— 滚进页脚段,栏就跟着卡边上滑(弹框里滚动容器
  // 就是父级,没这回事)。窄屏整页改 fixed 常驻视口底(页脚那一屏浮在其上),占位 div 补回文档流高度;
  // 桌面整页维持 sticky 原样(卡居中 1320,fixed 全宽会破卡片版式,且桌面没有这条投诉)。
  const narrow = useIsNarrow()
  const fixedBar = !!onPage && narrow
  // G3 简历对照(设计 docs/design/G3-简历对照JD-20260803.md):JD 文本走既有懒抓缓存(fetchJobText),
  // 拿不到全文就不开弹框空转 —— 直接用 t('rm.noJd') 提示
  const [matchJd, setMatchJd] = useState<string | null>(null)   // null=未开;''=拿不到 JD
  const openMatch = async () => {
    track('jd-match-open', {})
    const r = await fetchJobText(job.applyUrl || '').catch(() => null)
    setMatchJd(r?.text || '')
  }
  const [authed, setAuthed] = useState(false)  // 流程内放行(不整页 reload,SSR plan 下次导航自然更新)
  const [freshProfile, setFreshProfile] = useState<MatchProfile | null>(null)  // 流程内登录后拉到的真实档案
  // 已投递记录:已有收藏行 → 状态改 applied,没有 → 新建;失败不打扰投递
  const record = () =>
    fetch(`/api/saved-jobs?where[job][equals]=${job.id}&limit=1&depth=0`, { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        const cur = d?.docs?.[0]
        if (cur?.id != null) return fetch(`/api/saved-jobs/${cur.id}`, { method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'applied' }) })
        return fetch('/api/saved-jobs', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ job: job.id, title: job.title, company: job.company, status: 'applied' }) })
      }).catch(() => {})
  const launch = async () => {
    try { localStorage.removeItem(APPLY_RESUME_KEY) } catch { /* ignore */ }  // 原地流程走完=意图清账,防下次进页误续投
    try { (window as any).umami?.track('apply', { mode: email ? 'email' : 'web' }) } catch { /* E9-04:投递事件 */ }
    // dd24-#108:先落库再唤邮件——mailto 触发的导航态会掐死在途 fetch,「已投」记录曾竞态丢失
    await record()
    if (email) {
      const subject = `Application for ${job.title}${job.company ? ` - ${job.company}` : ''}`
      const loc = [job.city, job.province].filter(Boolean).join(', ')
      const body = [
        'Hello,', '',
        `I would like to apply for the position of "${job.title}"${job.company ? ` at ${job.company}` : ''}${loc ? ` in ${loc}` : ''}.`,
        `Job posting: ${job.applyUrl}`, '',
        'Please find my resume attached.', '',
        'Best regards,',
      ].join('\r\n')
      window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    } else if (job.applyUrl) window.open(job.applyUrl, '_blank', 'noopener')
  }
  const onApply = () => {
    if (!plan.loggedIn && !authed) {
      // Google 登录=整页 OAuth 跳转,组件状态全丢 → 投递意图落地,回跳本页后自动续投(下方 resume effect)
      try { localStorage.setItem(APPLY_RESUME_KEY, `${job.id}|${Date.now()}`) } catch { /* ignore */ }
      setStage('auth'); return
    }
    let intentPending = !plan.profileOk
    try { if (localStorage.getItem(OB_SEEN_KEY)) intentPending = false } catch { /* ignore */ }
    if (intentPending && !authed) { setStage('intent'); return }  // authed=刚注册,onDone 已走过 intent
    launch()
  }
  // OAuth 回跳续投:登录态 + 落地意图是本岗 + 10 分钟内 → 接着走意向表单/直接投,不让用户再点一次
  useEffect(() => {
    if (!plan.loggedIn || !emailDone) return
    try {
      const [id, ts] = (localStorage.getItem(APPLY_RESUME_KEY) || '').split('|')
      if (id !== String(job.id) || Date.now() - Number(ts) > 10 * 60_000) return
      localStorage.removeItem(APPLY_RESUME_KEY)
      if (!plan.profileOk && !localStorage.getItem(OB_SEEN_KEY)) { setStage('intent'); return }
      launch()
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan.loggedIn, emailDone])
  if (!job.applyUrl) return null
  return (
    <>
      {/* 2026-07-25 用户:全宽大蓝钮「太吓人」→ 右对齐紧凑钮;同日「复制要点」钮撤除,只留投递单钮;
          底 padding 14px = 吸底栏自带留白(容器底 padding 已归 0,补「穿墙」) */}
      {/* 占位:fixed 抽离文档流后补回高度,免得来源行被压住 */}
      {fixedBar && <div className="jdBarPad" />}
      <div className={fixedBar ? 'jdBar fixed' : 'jdBar'}>
        {/* G3 简历对照:AI 靛蓝钮(色语义:靛=AI 功能),在投递钮左侧;下架岗照给(改简历不受岗位死活影响) */}
        <button onClick={openMatch} className="jdBtnMatch">
          {t('rm.btn')}
        </button>
        {/* 已下架岗(2026-08-03):主钮还写「前往投递」等于继续把人往死链上送 —— 降级成灰色的「查看官方页」。
            不直接禁掉:closed 有一部分来自「本次未见+30天」的推断(非逐帖实测),留个口子让用户自己核。 */}
        {job.status === 'closed' ? (
          <a href={job.applyUrl} target="_blank" rel="noreferrer" className="jdBtnClosed">
            {t('act.seeOfficial')}
          </a>
        ) : (
          <button onClick={onApply} className="jdBtnApply">
            {/* applyhow 在途时用中性「投递」占位——别先显「前往投递」再闪成「邮件投递」(Frank 问「为什么有的是前往有的是邮箱」,闪变加剧困惑) */}
            {email ? t('apply.email') : emailDone ? t('apply.web') : t('apply.plain')}
          </button>
        )}
      </div>
      {matchJd != null && (matchJd
        ? <ResumeMatchModal jobId={job.id} jd={matchJd} loggedIn={plan.loggedIn || authed} onClose={() => setMatchJd(null)} />
        : <Modal onClose={() => setMatchJd(null)} size="sm"><div className="jdNoJd">{t('rm.noJd')}</div></Modal>)}
      {stage === 'auth' && (
        /* returnTo 一律指本岗详情页(Frank「登录没有弹出之前的 job」):列表弹框里发起的 Google 登录,
           回跳「当前页」=列表,弹框状态不在 URL 里回不来——详情页挂着 ApplyBar,续投机制自动接手 */
        <AuthModal t={t} mode="register" z={70} hero={t('apply.authHero')} returnTo={`/jobs/${job.id}`} onClose={() => setStage('idle')}
          onDone={async () => {
            // 注册闸放行前拉一次真实档案:老用户流程内登录时 SSR plan 还是匿名态,
            // 直接弹向导会以空 initial 覆盖已有档案(跳过=存空档) → 有档案直接投,没档案才进向导
            setAuthed(true)
            try {
              const d = await fetch('/api/users/me', { credentials: 'include' }).then((r) => r.json())
              const p = normalizeProfile(d?.user?.profile || null)
              if (hasProfile(p)) { setStage('idle'); launch(); return }
              setFreshProfile(p)
            } catch { /* 拉不到按无档案走向导,不卡投递 */ }
            setStage('intent')
          }} />
      )}
      {stage === 'intent' && (
        <OnboardingWizard t={t} initial={freshProfile || plan.profile} z={70}
          onClose={() => { setStage('idle'); launch() }}
          onFinished={() => { setStage('idle'); launch() }} />
      )}
    </>
  )
}

// ── 操作列弹框:职位描述快看(读真实抓取正文;公司信息已并入顾问公司弹窗,C1)────
// ── E8-11 B2(Frank「以弹框为准,job 只留 job 相关」):职位域唯一骨架 JobBody ──
// JD 弹框正文原样抽出(行为零变化,红线:弹框内容 Frank 已满意),/jobs/[id] 页面同渲。
// 内容=三钮行(中文对照/AI 速读/完整页-仅弹框)+ AI 整理五节/看原文 + 兜底来源行。
export function JobBody({ job, lang, plan, inModal, onFreeLeft }: { job: JobRow; lang: Lang; plan: Plan; inModal?: boolean; onFreeLeft?: (n: number) => void }) {
  const t = makeT(lang)
  const [text, setText] = useState('')
  const [status, setStatus] = useState<'loading' | 'done' | 'empty' | 'limited'>('loading')   // #201:JD 已免费,付费墙态(upgrade)退役;limited=宽松防滥用闸偶发
  // J3(2026-07-19 Frank 批):AI 五节整理版懒生成——undefined=整理中,null=没有(降级原文),string=整理版
  const [fmt, setFmt] = useState<string | null | undefined>(undefined)
  // 第25轮 #114:失败态拆三种——quota=额度用完(重试无用不给钮)/fail=生成失败(可重试)/notext=无正文(不显示失败行)
  const [fmtWhy, setFmtWhy] = useState<'quota' | 'fail' | 'notext'>('fail')
  const [showOrig, setShowOrig] = useState(false)
  // 2026-07-21 Frank「参考类别」:AI 速读点了才生成(不点不烧,额度闸在 JdAdvisorSection 内照走)
  const [aiOn, setAiOn] = useState(false)
  // 中文对照(参考分类弹框):整理版逐句翻(/api/jobs/jd-translate 行位保真);拿到后前端存一份,切换零延迟
  const [showTrans, setShowTrans] = useState(false)
  const [trans, setTrans] = useState<string | null>(null)
  const [transStatus, setTransStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const toggleTrans = async () => {
    if (trans) { setShowTrans((v) => !v); return }
    track('jd-translate')   // #129:首次拉取才计(纯开合不计)
    setTransStatus('loading')
    try {
      const r = await fetch('/api/jobs/jd-translate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: job.applyUrl || '', lang }) })
      const d = await r.json().catch(() => null)
      if (d?.ok && d.text) { setTrans(d.text); setShowTrans(true); setTransStatus('idle') }
      else setTransStatus('error')
    } catch { setTransStatus('error') }
  }
  useEffect(() => {
    const ctrl = new AbortController()
    setStatus('loading'); setText('')
    ;(async () => {
      try {
        const r = await fetchJobText(job.applyUrl || '', ctrl.signal)   // #126 同岗会话缓存
        if (r.freeLeft != null) onFreeLeft?.(r.freeLeft)   // 额度可见化回传(弹框页眉;页面不挂)
        if (r.status === 'limited') { setStatus('limited'); return }  // #201:JD 宽松防滥用闸偶发(非付费墙)
        setText(r.text); setStatus(r.text ? 'done' : 'empty')
      } catch { if (!ctrl.signal.aborted) setStatus('empty') }
    })()
    return () => ctrl.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job])
  // 投递邮箱(E9-04,dd24-#110 从 ApplyBar 上提):JB 岗藏在「Show how to apply」JSF 后 → 懒查 /api/jobs/applyhow;
  // URL → 域名(#239):来源行只报出处,不铺整条链接;解析失败退原串(宁可原样也不吞)
const hostOf = (u: string) => { try { return new URL(u).host.replace(/^www\./, '') } catch { return u } }
// 非 JB 岗正文常直接带邮箱 → 正则兜底。「怎么投」节与投递栏共用同一份结果。
  const [jbEmail, setJbEmail] = useState('')
  const [jbDone, setJbDone] = useState(false)   // 出结果(成败都算);OAuth 回跳续投要等它,别把邮箱岗投成外跳
  useEffect(() => {
    setJbEmail('')
    if (!/jobbank\.gc\.ca\/jobsearch\/jobposting\//.test(job.applyUrl || '')) { setJbDone(true); return }
    setJbDone(false)
    const ctrl = new AbortController()
    fetch('/api/jobs/applyhow?url=' + encodeURIComponent(job.applyUrl), { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null)).then((d) => { if (d?.email) setJbEmail(d.email) }).catch(() => {})
      .finally(() => { if (!ctrl.signal.aborted) setJbDone(true) })
    return () => ctrl.abort()
  }, [job.applyUrl])
  const applyEmail = jbEmail || applyEmailOf(text || '')
  // 2026-07-25 用户「有时候 AI 解析会失败,需要有重试按钮」:拉取抽成 loadFmt,失败态(fmt=null)挂重试钮
  const loadFmt = (signal?: AbortSignal) => {
    setFmt(undefined)
    fetch('/api/jobs/jdformat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: job.applyUrl || '' }), signal })
      .then((r) => {
        setFmtWhy(r.status === 402 || r.status === 429 ? 'quota' : r.status === 204 ? 'notext' : 'fail')
        return r.status === 200 ? r.text() : ''
      })
      .then((tx) => setFmt(tx.trim() ? tx : null))
      .catch(() => { if (!signal?.aborted) { setFmtWhy('fail'); setFmt(null) } })
  }
  useEffect(() => {
    // 整理版与原文并行拉:命中缓存秒回;首次生成慢(模型现算),期间正文照常显示原文
    const ctrl = new AbortController()
    setShowOrig(false)
    setAiOn(false); setShowTrans(false); setTrans(null); setTransStatus('idle')
    loadFmt(ctrl.signal)
    return () => ctrl.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job])
  return (
    <>
      {/* 已下架横幅(2026-08-03):closed 岗页面照旧保留可访问(已收录不 404),但必须当面说清 ——
          Google 招聘富结果把人直接送到详情页,他不经列表、看不到「状态」列,点了申请才撞过期页。
          文案 detail.closedNote 早就写好了,一直没人挂上去。弹框与整页同源,挂这一处两边都有。 */}
      {job.status === 'closed' ? (
        <div className="jdClosed">
          {t('detail.closedNote')}
        </div>
      ) : null}
      {/* 顶部钮行(2026-07-21 Frank「参考类别」):中文对照(英文界面不出;整理版在屏才可翻)+
          AI 速读(点了才生成,不点不烧)+ 打开完整页(仅弹框;页面自己就是完整页) */}
      <div className="jdActs">
        {status !== 'loading' && lang !== 'en' && fmt && !showOrig ? (
          <button onClick={toggleTrans} disabled={transStatus === 'loading'} className={`${transStatus === 'loading' ? 'jdPill busy' : 'jdPill'} pill`}>
            {transStatus === 'loading' ? t('cat.translating') : transStatus === 'error' ? t('cat.transErr') : showTrans ? t('cat.hideZh') : t('cat.showZh')}
          </button>
        ) : null}
        {/* AI 速读=常驻折叠开关(Frank 2026-07-22「按钮怎么没了」「可以折叠的」):点开点收都是它,
            不再点一次就消失;内容 jdAdvCache 缓存,收起再开秒回不重烧额度。▾=展开 ▸=收起 */}
        {status !== 'loading' && <button onClick={() => { if (!aiOn) track('ai-read-jd'); setAiOn((v) => !v) }} className="pill" style={{ ...(aiOn ? { background: '#eff6ff', borderColor: '#bfdbfe', color: '#1d4ed8' } : {}) }}><IconCompass /> {t('cat.aiRead')} {aiOn ? '▾' : '▸'}</button>}
        {inModal ? <a href={`/jobs/${job.id}`} target="_blank" rel="noreferrer" className="jdPill asLink pill">{t('detail.openFull')} ↗</a> : null}
      </div>
      {/* AI 速读卡(点了才出;置顶=点完不用往下翻,与分类弹框同规范;jdRead=纯 JD 速读不带移民解读) */}
      {aiOn && (
        <div className="cardMd">
          <JdAdvisorSection job={job} lang={lang} plan={plan} title={t('cat.aiRead')} field="jdRead" />
        </div>
      )}
      {status === 'loading' ? <p className="jdMuted">{t('act.loadingText')}</p>
        : status === 'limited' ? (   /* #201:JD 已免费;429=宽松防滥用闸偶发,素文案不引流 Pro */
          <p className="jdMuted m4">{t('jd.busy')}</p>
        )
        : status === 'empty' ? (
          <div>
            <p className="jdMuted m4b">{blockedSrc(job) ? t('act.noTextBlocked', { src: blockedSrc(job) }) : t('act.noText')}</p>
            {job.applyUrl && <a href={job.applyUrl} target="_blank" rel="noreferrer" className="jdEmptyBtn">{t('act.seeOfficial')}</a>}
          </div>
        )
          : (
            <>
              {/* J3:整理版默认在上,原文一键切换;生成中/没有整理版 → 原文照旧 */}
              {fmt ? (
                <div className="jdAiNote" title={t('act.aiNote')}>
                  ✨ {t('act.ai')}
                  <button onClick={() => setShowOrig((o) => !o)} className="jdAiBtn">{showOrig ? t('act.seeFmt') : t('act.seeOrig')}</button>
                </div>
              ) : fmt === undefined ? (
                <div className="jdAiNote">✨ {t('act.aiWorking')}</div>
              ) : fmtWhy === 'notext' ? null : (
                /* fmt=null:按 fmtWhy 分说——额度用完(重试无用,不给钮)/生成失败(可重试);无正文不出失败行(空态自己解释) */
                <div className="jdAiNote">
                  ✨ {fmtWhy === 'quota' ? t('act.aiQuota') : t('act.aiFail')}
                  {fmtWhy === 'fail' && <button onClick={() => loadFmt()} className="jdAiBtn">{t('ai.retry')}</button>}
                  {/* Frank 走查#20:额度用完时,匿名用户补一句登录提额说明(登录态额度更高;登录入口在页头) */}
                  {fmtWhy === 'quota' && !plan.loggedIn && <span className="jdQuotaLogin">{t('act.aiQuotaLogin')}</span>}
                </div>
              )}
              {fmt && !showOrig ? <JdFormattedView text={fmt} t={t} fallbackPay={job.salaryText || job.salary || undefined} applyUrl={job.applyUrl || undefined} applyEmail={applyEmail || undefined} trans={showTrans && trans ? trans : undefined} /> : <JdTextView text={text} max={4000} />}
            </>
          )}
      {/* 底部来源行(republish 合规)只在整理版**没渲出**时兜底(#167③;2026-07-21 Frank
          「去掉 source 链接」)——整理版在屏时「怎么投」整节已链官方原帖,出处不丢 */}
      {job.applyUrl && !(status === 'done' && fmt && !showOrig) && status !== 'empty' && (
        <div className="jdSrc">
          {/* #239(第 30 轮体检):原来整条 URL 直铺,375 上折两行又长又丑(#110 只治了详情页「怎么投」)。
              改显**域名**——出处照样看得见、点得开,合规不受影响,行内一行放得下。 */}
          {t('src.label')}: <a href={job.applyUrl} target="_blank" rel="noreferrer" className="jdSrcLink">{hostOf(job.applyUrl)} ↗</a>
        </div>
      )}
      {/* E9-04 投递栏:正文之后常驻(弹框与页面同渲;sticky 吸底)。
          2026-07-25 用户「AI 整理的时候不要显示这个按钮,等整理完了再显示」:整理进行中(fmt===undefined)先藏,
          有结果(整理版 string / 失败 null / 空态)才出——fmt 各路径都会落定,不会永久不显 */}
      {fmt !== undefined && <ApplyBar job={job} email={applyEmail} emailDone={jbDone} t={t} plan={plan} onPage={!inModal} />}
    </>
  )
}

// 把 AI 文本里的【小标题】加粗,保留换行;markdown 强调残渣 ** 先剥(第 16 轮 #43:正文 pre-wrap
// 纯文本渲染,模型写的 **加粗** 不会变粗只碍眼;流式期间跨帧的孤 * 下一帧凑齐即消,无需处理边界)
export function renderAI(text: string): React.ReactNode {
  return text.replace(/\*{2,}/g, '').split(/(【[^】]+】)/g).map((seg, i) => {
    if (/^【[^】]+】$/.test(seg)) return <strong key={i} className="jdAiH" style={{ marginTop: i ? 10 : 0 }}>{seg}</strong>
    const body = seg.replace(/^\n+/, '').replace(/\n+$/, '').replace(/\n{3,}/g, '\n\n')  // 去段首尾空行+压多余空行,免大空隙
    return body ? <span key={i} className="jdAiP">{body}</span> : null
  })
}

