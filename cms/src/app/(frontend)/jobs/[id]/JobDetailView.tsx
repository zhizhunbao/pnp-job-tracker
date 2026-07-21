'use client'
// E8-07 A 件:职位详情页客户端视图 —— 单栏内容骨架(标题→meta→面包屑→chips→事实块→JD 五节→顾问→通道节→相关职位)。
// 组件全部复用 JobsTable 的 export(抽取策略=只加 export 不搬代码,零回归);配色=现行浅色 token 零新增。
// meta 行公司名可点=开公司弹框(AdvisorModal field='company',与主表公司格同款;Frank 拍板「公司名、职位名手机都可点」)。
import { useEffect, useState } from 'react'

import { makeT, LANG_KEY, LANGS, type Lang, type TFn } from '../i18n'
import {
  AdvisorModal, blockedSrc, catName, EeCategorySection, FactRow, FactsBox, fetchJobText, JdAdvisorSection, JdFormattedView, JdTextView,
  LockedText, MeansForMe, nocLocalTitle, PnpListSection, provName, UpgradeCard,
  type DesigEmp, type EeOcc, type FieldSource, type JobRow, type NewsSlim, type NocDesc, type Plan, type PnpDraw, type PnpOcc,
} from '../JobsTable'
import type { RelatedJob } from '@/lib/jobsSql'
import { SiteHeader } from '../../SiteHeader'
import { SiteFooter } from '../../SiteFooter'
import { Notice, PageShell } from '../../ui/primitives'
import { UpgradeCta } from '../UpgradeModal'

type Dims = { pnpOcc: PnpOcc[]; pnpDraws: PnpDraw[]; eeOcc: EeOcc[]; desigEmp: DesigEmp[]; nocDesc: NocDesc[]; fieldSources: FieldSource[]; news: NewsSlim[]; cityZh?: string; cityKo?: string }

const chip: React.CSSProperties = { display: 'inline-block', fontSize: 11.5, padding: '2px 9px', borderRadius: 999, border: '1px solid #e5e7eb', background: '#fafafa', color: '#4b5563', marginRight: 6, whiteSpace: 'nowrap' }
const chipBlue: React.CSSProperties = { ...chip, background: '#eff6ff', borderColor: '#bfdbfe', color: '#1d4ed8' }
const sec: React.CSSProperties = { border: '1px solid #e5e7eb', borderRadius: 12, background: '#fff', padding: '12px 16px', marginBottom: 14 }
const secHead: React.CSSProperties = { fontSize: 13.5, fontWeight: 700, color: '#111827', marginBottom: 6 }
// metaK(meta 行的灰色标签样式)已随 #166 标签全删退役 —— 值自证身份就不需要标签。
// 死代码不留:要恢复标签请连同「两个同类型值并排才需标签」那条规则一起重新论证。
const aLink: React.CSSProperties = { color: '#2563eb', textDecoration: 'none' }

// JD 区(ActModal 正文同款管线:/api/jobtext 原文 + /api/jdformat 五节整理版懒生成,整理版默认可切换)
function JdSection({ job, lang, plan, t }: { job: JobRow; lang: Lang; plan: Plan; t: TFn }) {
  const [text, setText] = useState('')
  const [status, setStatus] = useState<'loading' | 'done' | 'empty' | 'upgrade' | 'limited'>('loading')   // #134
  const [fmt, setFmt] = useState<string | null | undefined>(undefined)
  const [showOrig, setShowOrig] = useState(false)
  useEffect(() => {
    const ctrl = new AbortController()
    setStatus('loading'); setText('')
    ;(async () => {
      try {
        const r = await fetchJobText(job.applyUrl || '', ctrl.signal)   // #126 同岗会话缓存(JobsTable 共用)
        if (r.status === 'gated') { setStatus('upgrade'); return }
        if (r.status === 'limited') { setStatus('limited'); return }   // #134:429 ≠ 没数据
        setText(r.text); setStatus(r.text ? 'done' : 'empty')
      } catch { if (!ctrl.signal.aborted) setStatus('empty') }
    })()
    return () => ctrl.abort()
  }, [job])
  useEffect(() => {
    const ctrl = new AbortController()
    setFmt(undefined); setShowOrig(false)
    fetch('/api/jdformat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: job.applyUrl || '' }), signal: ctrl.signal })
      .then((r) => (r.status === 200 ? r.text() : ''))
      .then((tx) => setFmt(tx.trim() ? tx : null))
      .catch(() => { if (!ctrl.signal.aborted) setFmt(null) })
    return () => ctrl.abort()
  }, [job])
  return (
    <div style={sec}>
      <div style={{ ...secHead, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
        <span>{t('act.descTitle')}</span>
        {fmt ? (
          <button onClick={() => setShowOrig((o) => !o)} style={{ border: 'none', background: 'none', padding: 0, color: '#2563eb', cursor: 'pointer', fontSize: 11.5, fontWeight: 600 }}>{showOrig ? t('act.seeFmt') : t('act.seeOrig')}</button>
        ) : fmt === undefined ? <span style={{ fontSize: 11.5, color: '#9ca3af', fontWeight: 400 }}>✨ {t('act.aiWorking')}</span> : null}
      </div>
      {status === 'loading' ? <p style={{ margin: 0, color: '#9ca3af', fontSize: 13 }}>{t('act.loadingText')}</p>
        : status === 'upgrade' ? <LockedText t={t} loggedIn={plan.loggedIn} lines={4} />
        : status === 'limited' ? (   /* #134:限流说人话 */
          <Notice kind="warn" action={!plan.loggedIn ? <a href="/account" style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}>{t('advisor.limitCta')}</a> : undefined}>
            {t('advisor.limit429')}
          </Notice>
        )
        : status === 'empty' ? (
          <div>
            <p style={{ color: '#9ca3af', margin: '0 0 10px', fontSize: 13 }}>{blockedSrc(job) ? t('act.noTextBlocked', { src: blockedSrc(job) }) : t('act.noText')}</p>
            {job.applyUrl && <a href={job.applyUrl} target="_blank" rel="noreferrer" style={{ ...aLink, fontSize: 13, fontWeight: 600 }}>{t('act.seeOfficial')}</a>}
          </div>
        ) : (fmt && !showOrig ? <JdFormattedView text={fmt} t={t} fallbackPay={job.salaryText || job.salary || undefined} applyUrl={job.applyUrl || undefined} underTitle /> : <JdTextView text={text} max={4000} />)}
      {job.applyUrl && (
        <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #f3f4f6', fontSize: 11.5, color: '#9ca3af', overflowWrap: 'anywhere' }}>
          {t('src.label')}: <a href={job.applyUrl} target="_blank" rel="noreferrer" style={{ color: '#6b7280', textDecoration: 'none' }}>{job.applyUrl}</a>
        </div>
      )}
      {/* AI 顾问初判(#102 同款自动生成,额度闸照走) */}
      {status !== 'loading' && <JdAdvisorSection job={job} lang={lang} plan={plan} />}
    </div>
  )
}

export default function JobDetailView({ job, plan, dims, related }: {
  job: JobRow; plan: Plan; dims: Dims; related: { sameCompany: RelatedJob[]; sameOcc: RelatedJob[] }
}) {
  // 语言:与全站同一 localStorage 键;SSR 首帧 zh,水合后纠正(二级页惯例)
  const [lang, setLangState] = useState<Lang>('zh')
  useEffect(() => {
    try { const s = localStorage.getItem(LANG_KEY); if (s && LANGS.some((l) => l.code === s)) setLangState(s as Lang) } catch { /* ignore */ }
  }, [])
  const setLang = (l: Lang) => { setLangState(l); try { localStorage.setItem(LANG_KEY, l) } catch { /* ignore */ } }
  const t = makeT(lang)
  const [companyOpen, setCompanyOpen] = useState(false)

  const provFull = provName(t, job.province || '')   // #146:中韩界面「Ontario(安大略省)」,英文界面只出英文
  const nocRow = dims.nocDesc.find((d) => d.noc === job.noc) || null
  const nocTitle = nocRow?.title || ''
  const nocZh = nocLocalTitle(nocRow, lang)   // #147:界面语言译名(英文界面为空=不渲染)
  const cityLoc = lang === 'zh' ? (dims.cityZh || '') : lang === 'ko' ? (dims.cityKo || '') : ''   // #151 同款
  // #157:职业分类三级(大/中/小)—— 并进面包屑当路径段,未分类的级跳过;每段链去按该级筛的职位板
  const catSegs = (([
    job.broad && job.broad !== '未分类' ? { txt: t('broad.' + job.broad), href: `/?broad=${encodeURIComponent(job.broad)}` } : null,
    job.mid && job.mid !== '未分类' ? { txt: catName(t, job.mid), href: `/?broad=${encodeURIComponent(job.broad || '')}&mid=${encodeURIComponent(job.mid)}` } : null,
    job.fine && job.fine !== '未分类' ? { txt: catName(t, job.fine), href: `/?fine=${encodeURIComponent(job.fine)}` } : null,
  ].filter(Boolean)) as { txt: string; href: string }[])
    // #158(Frank 截图「商务 › 商务 › 商务」):三级同名时(NOC 里不少大类=中类=小类)铺三遍纯噪音 ——
    // 与上一段同名就跳过,只留最细那一级的链接(路径语义不变,视觉不重复)
    .filter((s, i, arr) => i === 0 || s.txt !== arr[i - 1].txt)
  const day = (s: string) => (s || '').slice(0, 10)
  const relRow = (r: RelatedJob, note: string) => (
    <div key={r.id} style={{ fontSize: 13, padding: '3px 0' }}>
      <a href={`/jobs/${r.id}`} style={aLink}>{r.title} — {r.company}</a>
      <span style={{ color: '#9ca3af', fontSize: 11.5, marginLeft: 8 }}>{note}{r.city ? ` · ${r.city}` : ''}</span>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f9fafb' }}>
      <SiteHeader lang={lang} setLang={setLang} t={t} loggedIn={plan.loggedIn} />
      <PageShell pad="14px 1.25rem 32px">
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          {/* #157(Frank「这两个可以合并吧」):面包屑与「职业分类」行本来就都是路径,分两行是重复排版 ——
              合成一条完整路径:职位板 › 省 › 大类 › 中类 › 小类 › 本岗。每段各链各的筛选(省=?prov、
              分类三级=?broad/?mid/?fine),未分类的段自动跳过。省一行,手机上尤其值。 */}
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8, lineHeight: 1.7 }} title={t('detail.catNote')}>
            <a href="/" style={aLink}>{t('detail.crumbHome')}</a>
            {job.province ? <> › <a href={`/?prov=${encodeURIComponent(job.province)}`} style={aLink}>{provFull}</a></> : null}
            {catSegs.map((s) => <span key={s.href}> › <a href={s.href} style={aLink}>{s.txt}</a></span>)}
            {/* #166(Frank「很多信息都叠到一起了」):末段「本岗」退役 —— 它与紧邻其下几个像素的 h1
                必然是同一个词,面包屑的作用是给上级路径,当前位置由大标题承担。#157 加它是为路径完整,
                但完整不等于重复。 */}
          </div>

          {/* #150(Frank「这部分也需要设计卡片吧」):头部(标题/meta/chips/职业分类)原先裸浮在灰底上,
              下面每节都是白卡 → 视觉不成体系。包成同款卡(白底+描边+r12),面包屑留在卡外(导航在卡上方是惯例)。
              卡内末元素去掉下外距,免得卡底空一截。 */}
          <div style={{ ...sec, paddingBottom: 12 }}>
          <h1 style={{ margin: '0 0 8px', fontSize: 22, lineHeight: 1.35, color: '#111827' }}>{job.title}</h1>

          {/* meta:一格一事(W 规矩),公司名可点开公司弹框 */}
          <div style={{ fontSize: 13, color: '#374151', display: 'flex', flexWrap: 'wrap', gap: '2px 18px', marginBottom: 8 }}>
            {job.company ? (
              <span>
                <button onClick={() => setCompanyOpen(true)} style={{ border: 'none', background: 'none', padding: 0, font: 'inherit', color: '#2563eb', cursor: 'pointer' }}>{job.company}</button>
                {/* E12-08:担保档药丸(公司分承接);无记录不显 */}
                {job.sponsorGrade != null && <span title={t('gr.sponsorTip')} style={{ marginLeft: 6, fontSize: 10.5, padding: '1px 7px', borderRadius: 999, background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', whiteSpace: 'nowrap' }}>{t('gr.sp.' + job.sponsorGrade)}</span>}
              </span>
            ) : null}
            {/* #166 三修(Frank:「不需要显示 key 只显示 value 用户也能知道吧」——手机卡片就是自证,
                它一个标签都没有照样看得懂):
                ①**标签全删**。公司名、城市、日期,值本身就说明了自己是什么,标签纯占地方。
                  (例外规则:仅当两个**同类型**值并排才需标签区分 —— 发布时间 vs 更新时间、
                   年薪(折算) vs 中位年薪,那种不标等于没给信息。此处三项各不同类,无需标签。)
                ②**市行不再拼省**。面包屑已有省且**可点跳筛选**,原样重复一遍「Prince Edward Island
                  (爱德华王子岛省)」纯噪音(Frank 早前也点过「所在省与下方省重复」)。
                ③**来源退役**。页面底部本就有合规来源行「来源: 完整 URL」,头部这枚是第三次说同一件事。 */}
            {(job.city || cityLoc) ? (
              <span>{job.city}{cityLoc ? <span style={{ color: '#9ca3af' }}>　{cityLoc}</span> : null}</span>
            ) : null}
            {job.datePosted ? <span>{day(job.datePosted)}</span> : null}
          </div>

          {/* chips:代码不裸奔(NOC 带职业名、TEER 带说明) */}
          <div style={{ marginBottom: 10 }}>
            {/* #157(Frank「一个胶囊包含多个信息,需要拆成多个胶囊吧」):一枚药丸只放一条事实 ——
                原先「NOC 64100 Retail salespersons…」把编号与职业名塞一枚、「TEER 4(高中/在职培训)」
                把等级与学历门槛塞一枚。现拆:编号 / 职业名(带译名灰注)/ 等级 / 学历门槛 各一枚。 */}
            {/* #166④:移民信号与职业分类**分组** —— 原先五枚平铺、粗细一样,
                但「可省提名」是本站的判断(移民价值),NOC/职业名/TEER/门槛是官方分类事实,
                两类东西长得一模一样就等于没分。中间加一道间距分开,不加边框不加小标题(留白即分组)。 */}
            {job.pnpEligible ? <span style={{ ...chipBlue, marginRight: 18 }}>{t('cell.pnpYes')}</span> : null}
            {job.noc ? <span style={chip}>NOC {job.noc}</span> : null}
            {nocTitle ? (
              <span style={chip}>{nocTitle}{nocZh ? <span style={{ color: '#9ca3af' }}>　{nocZh}</span> : null}</span>
            ) : null}
            {job.teer != null ? <span style={chip}>TEER {job.teer}</span> : null}
            {job.teer != null ? <span style={chip}>{t('teer.' + job.teer)}</span> : null}
          </div>
          </div>{/* /头部卡 */}

          {job.status === 'closed' && (
            <Notice kind="info" style={{ marginBottom: 12 }}>{t('detail.closedNote')}{job.closedAt ? ` · ${day(job.closedAt)}` : ''}</Notice>
          )}

          {/* 与我的匹配(建档用户;依据链同 match(),弹框同款组件) */}
          {plan.loggedIn && plan.profileOk && (
            <MeansForMe job={job} lang={lang} plan={plan} pnpOcc={dims.pnpOcc} eeOcc={dims.eeOcc} nocDesc={dims.nocDesc} />
          )}

          {/* 事实块:薪资/工时/雇佣期/学历/证书;vs 中位=Pro 维度(免费=引导,真值不出服务端) */}
          <div style={sec}>
            {/* #154(Frank「这个文字没必要显示」):换算口径注常驻一整行=每个岗都在重复同一句话。
                改挂「年薪(折算)」标签的悬停提示——要查得到,不占版面(口径透明不等于必须常驻) */}
            <FactsBox>
              <FactRow k={t('col.salary')}>{job.salaryText || job.salary || null}</FactRow>
              <FactRow k={<span title={t('fact.salYrNote')}>{t('col.salaryYr')}</span>}>{job.salaryAnnual != null ? `$${Math.round(job.salaryAnnual / 1000)}K/yr` : null}</FactRow>
              <FactRow k={t('col.empHours')}>{job.employmentHours ? t('emp.' + job.employmentHours) : null}</FactRow>
              <FactRow k={t('col.empTerm')}>{job.employmentTerm ? t('term.' + job.employmentTerm) : null}</FactRow>
              <FactRow k={t('fact.edu')}>{job.education || null}</FactRow>
              <FactRow k={t('fact.cert')}>{job.certificates?.length ? <>{job.certificates.map((c, i) => <div key={i}>{c}</div>)}</> : null}</FactRow>
              <FactRow k={t('col.vsMedian')}>
                {plan.isPro
                  ? (job.salaryAnnual != null && job.wageMedAnnual ? `${Math.round((job.salaryAnnual / job.wageMedAnnual - 1) * 100) >= 0 ? '+' : ''}${Math.round((job.salaryAnnual / job.wageMedAnnual - 1) * 100)}%` : null)
                  : (
                    /* #130(Frank「打上马赛克那种,别写那么长」):锁位=打码占位数+四字短注(⑤ compare 模糊示例同款);
                       占位是写死的假数(真值免费态本就不出服务端),blur 只传「这里有个数」 */
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <span aria-hidden style={{ filter: 'blur(5px)', userSelect: 'none' }}>+15%</span>
                      <span style={{ color: '#92400e', fontSize: 12 }}>{t('up.proShort')}</span>
                    </span>
                  )}
              </FactRow>
            </FactsBox>
            {!plan.isPro && <UpgradeCta t={t} loggedIn={plan.loggedIn} />}
          </div>

          <JdSection job={job} lang={lang} plan={plan} t={t} />

          {/* 省提名通道(粗筛信号,非资格认定)+ 联邦 EE 类别 */}
          <div style={sec}>
            <div style={secHead}>{t('detail.pnpSec')}<span style={{ fontWeight: 400, color: '#9ca3af', fontSize: 11.5, marginLeft: 8 }}>{t('detail.pnpSecNote')}</span></div>
            <PnpListSection job={job} lang={lang} occ={dims.pnpOcc} draws={dims.pnpDraws} news={dims.news} />
          </div>
          <div style={sec}>
            <div style={secHead}>{t('detail.eeSec')}</div>
            <EeCategorySection job={job} lang={lang} cats={dims.eeOcc} draws={dims.pnpDraws} />
          </div>

          {(related.sameCompany.length || related.sameOcc.length) ? (
            <div style={sec}>
              <div style={secHead}>{t('detail.related')}</div>
              {related.sameCompany.map((r) => relRow(r, t('detail.sameCo')))}
              {related.sameOcc.map((r) => relRow(r, t('detail.sameOcc')))}
            </div>
          ) : null}

          {/* #130(Frank「怎么有三个查看原文」):底部官方原帖链接删——出口收敛为「怎么投」节整节链接(#125①)+JD 尾部来源小注,一页一个动作出口 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, justifyContent: 'center', padding: '6px 0 2px' }}>
            <a href="/" style={{ display: 'inline-block', border: '1px solid #d1d5db', borderRadius: 8, padding: '7px 20px', fontSize: 13, color: '#374151', textDecoration: 'none', background: '#fff' }}>← {t('detail.back')}</a>
          </div>
        </div>
      </PageShell>
      <SiteFooter t={t} />
      {companyOpen && (
        <AdvisorModal group="company" field="company" job={job} title={job.company} lang={lang} plan={plan}
          pnpOcc={dims.pnpOcc} pnpDraws={dims.pnpDraws} news={dims.news} eeOcc={dims.eeOcc}
          desigEmp={dims.desigEmp} nocDesc={dims.nocDesc} fieldSources={dims.fieldSources}
          onClose={() => setCompanyOpen(false)} />
      )}
    </div>
  )
}
