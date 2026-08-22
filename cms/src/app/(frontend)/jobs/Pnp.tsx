'use client'
// 省提名(PNP)与联邦 EE 的事实区块:通道清单、本省抽选、职业类别、AIP 背书、匹配判定。
// 红线在这儿落地——**粗筛信号,不是资格认定**:命中与否都只陈列官方事实与出处,
// 各省自己的职业清单/语言/工资要求不在这里判,更不替用户下结论。
import { useEffect, useMemo, useRef, useState } from 'react'

import { IconCheck, IconTarget, IconWarn, IconX } from '../Icons'
import { Grid } from '../ui'
import { TvEntryCard } from './TripleVerdictModal'
import { makeT, type Lang, type TFn } from '@/lib/i18n'
import { eeDisplay, eeKeyDisplay, streamDisplay } from '@/lib/jobs'
import { type Plan, type EeCat, type EeOcc, type JobRow, type NewsSlim, type NocDesc, type PnpDraw, type PnpOcc, type PnpStream, match as matchJob, type MatchJob, type MatchReason } from '@/lib/jobs'
import { PROV_NAMES, provName } from '@/lib/location'
import { nocLocalTitle } from '@/lib/noc'
import { track } from '@/lib/track'

// 本省最近抽选事实块(E6-04)。score 是省自评分制(SIRS/WEOI/MPNP EOI),非 CRS —— 只陈列事实,不判定资格。
// kind=notice(如 ON 2026-06 改制)渲染通告行;省内无数据(SK/QC 等)整块不出现。
// 通道改制登记。Frank 2026-07-26 二拍:「老的历史记录删了吧,改成最新的打分规则」——
// 上一版是灰化保留改制前的抽选行,实测整块被 8 条已关闭通道的历史占满,新规则反而看不见。
// 现在:**改制日之前的抽选行直接不渲染**(它们属于已不存在的通道,不是本省现在的行情),改列现行规则。
// ON 事实源(ontario.ca 实核 2026-07-26):O.Reg 422/17 修订 2026-06-25 生效,原 8 条流全部废止,
// 只剩 Ontario Workforce Priority 一条(按 job offer 的 TEER 分档,全部 TEER 均有路径,另有自雇医生路径);
// 新 EOI 系统官方称「今夏晚些时候开放」,旧 EOI 池已关闭不再发邀请 → 现阶段无抽选可列。
// 规则行是**人工登记的政策事实**(同 on-workforce-priority.json 的性质);再多一两个省就该下沉数据层。
export const STREAM_REFORM: Record<string, { since: string; rules: [string, string][] }> = {
  ON: {
    since: '2026-06-01',
    rules: [['pnpdraws.on.k1', 'pnpdraws.on.v1'], ['pnpdraws.on.k2', 'pnpdraws.on.v2'],
      ['pnpdraws.on.k3', 'pnpdraws.on.v3'], ['pnpdraws.on.k4', 'pnpdraws.on.v4']],
  },
}

export function PnpDrawsBlock({ province, lang, draws, limit }: { province: string; lang: Lang; draws: PnpDraw[]; limit?: number }) {
  // limit(C2 走查拍板):省弹窗只留最近 1 条摘要(全量归 PNP 弹窗),消跨弹窗重复
  const t = makeT(lang)
  const reform = STREAM_REFORM[province]
  const rows = draws.filter((d) => d.province === province)
    // 脏行过滤:流名/分数/邀请数全空的行没有任何信息量(ON 2026-07-20 实测就是这种),不占位
    .filter((d) => d.kind === 'notice' || d.stream || d.score != null || d.invitations != null)
    // 改制省:改制日之前的抽选属已关闭通道,不再列出(通告行不受影响,它讲的就是改制本身)
    .filter((d) => !reform || d.kind === 'notice' || d.drawDate >= reform.since)
    .slice(0, limit || undefined)
  if (!rows.length && !reform) return null
  const src = rows[0]
  return (
    <div>
      {/* Frank 走查#9:卡要正式 title(原小灰头提为 'mcardHead');#G 去内层 marginBottom(外层卡已有底距) */}
      <div className="mcardHead">{reform ? t('pnpdraws.nowTitle') : t('pnpdraws.title', { label: src?.label })}</div>
      {/* 改制省:列现行规则(项 | 内容 两列左对齐),不再铺已关闭通道的历史 */}
      {reform ? (
        <div className="pnpReform">
          <Grid cols={2}>
            {reform.rules.flatMap(([k, v]) => [
              <span key={k} className="gridK">{t(k)}</span>,
              <span key={v} className="pnpRuleV">{t(v)}</span>,
            ])}
          </Grid>
        </div>
      ) : null}
      {/* 2026-07-25 Frank 走查#12:抽选列表四列对齐(日期/流名/最低分/份邀请)——整块一个 grid,
          列宽跨行对齐(非逐行 flex);SIRS 口径脚注删(#11,「分数只与本省历史比」已是常识噪音)。
          notice 行跨全部列。 */}
      <div className={rows.length ? 'pnpDraws' : 'pnpDraws empty'}>
        {rows.flatMap((d, i) => d.kind === 'notice' ? [
          <div key={i + 'n'} className="pnpNotice">
            {/* #153:直接渲染抓到的官方通告原文(note),缺 note 才退回旧模板 */}
            <IconWarn /> {d.note ? `${d.drawDate} ${d.note}` : t('pnpdraws.notice', { date: d.drawDate })}
          </div>,
        ] : [
          // #268(375 走查):4 列固定网格在窄屏把流名压成 3-4 字母(Fra…/Occ…/Skil…)——
          // 包一层 .pnpDrawRow:桌面 display:contents 原样吃外层 4 列网格(逐行对齐效果不变),
          // ≤640px 改用 grid-template-areas 两行(流名整行不截断,日期/分数/邀请数落次行灰字)
          <div key={i} className="pnpDrawRow">
            <span className={reform && d.drawDate < reform.since ? 'pdDate dim' : 'pdDate'}>{d.drawDate}</span>
            <span className={reform && d.drawDate < reform.since ? 'pdStream dim' : 'pdStream'} title={d.note || d.stream}>
              {d.stream}
              {/* #280:zh 态英文流名+中文灰注(次行,块级子元素天然不受父 span 的 nowrap/ellipsis 约束);
                  streamZh 缺列/还没翻到 = 不出注,纯英文,不是报错 */}
              {lang === 'zh' && d.streamZh
                ? <span className="pdStreamZh">{d.streamZh}</span>
                : null}
            </span>
            <span className="pdScore">{d.score != null ? t('pnpdraws.min', { score: d.score }) : ''}</span>
            <span className="pdInv">{d.invitations != null ? t('pnpdraws.inv', { n: d.invitations }) : ''}</span>
          </div>,
        ])}
      </div>
    </div>
  )
}

// 本省最新公告行(E12-06):最新 1-2 条官方新闻标题,链 /news/[slug];无数据整块不出现。
// 只摆标题+日期(事实),不解读——详情页自带 ©四件套与原文链。
export function NewsLatestBlock({ province, lang, news }: { province: string; lang: Lang; news: NewsSlim[] }) {
  const t = makeT(lang)
  const rows = news.filter((n) => n.region === province).slice(0, 2)
  if (!rows.length) return null
  return (
    <div>
      {/* Frank 走查#9 卡要 title + #1 删「全部动态 →」跳转链接;#G 去内层 marginBottom */}
      <div className="mcardHead">{t('news.latest')}</div>
      <div className="pnpBox">
        {rows.map((n) => (
          <div key={n.slug} className="pnpNewsRow">
            <span className="pnpNewsDate">{n.date}</span>
            <a href={`/news/${n.slug}`} className="pnpNewsLink" title={n.title}>{n.title}</a>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── B1 在招担保雇主 · 弹框雇主线入口(docs/implementation/在招担保雇主/01_B1)──────
// 凭证行(AIP 指定/LMIA 获批)有据才出,无凭证整行不出不写「无」。
// 「看该职业的全部担保雇主」链随货架页下架摘除(Frank 08-08)→ company 态无内容可渲,整卡不出。
export function SponsorLeadCard({ job, t, src }: { job: JobRow; t: TFn; src: 'pnp' | 'company' }) {
  const lmiaN = job.lmiaPositions ?? 0
  const hasCred = src === 'pnp' && (job.aip || lmiaN > 0)
  if (!hasCred) return null

  return (
    <div className="cardMd">
      <div className="mcardHead">{t('spl.head')}</div>
      {job.aip ? <div className="pnpSplRow">{t('spl.aip')}</div> : null}
      {lmiaN > 0 ? <div className="pnpSplRow">{lmiaN === 1 ? t('spl.lmia1') : t('spl.lmia', { n: lmiaN })}</div> : null}
      {/* Frank 2026-08-08「按钮风格保持一致」:裸链改站内既有 PILL_BTN(与「打开完整页 ↗」同款;↗=新开页惯例) */}
      {job.company ? (
        <div className="pnpSplActs">
          <a href={'/?q=' + encodeURIComponent(job.company)} target="_blank" rel="noreferrer" className="pnpPillLink pill"
            onClick={() => track('pnp-employer-click', { kind: src })}>{t('spl.coJobs')} ↗</a>
        </div>
      ) : null}
    </div>
  )
}

export function PnpListSection({ job, lang, occ, draws, news, profileClb, nocDesc = [], showZh = true }: { job: JobRow; lang: Lang; occ: PnpOcc[]; draws: PnpDraw[]; news: NewsSlim[]; profileClb?: number | null; nocDesc?: NocDesc[]; showZh?: boolean }) {
  const t = makeT(lang)
  const matchRef = useRef<HTMLDivElement | null>(null)
  // 2026-07-25 Frank:清单可折叠+职业带界面语言译名+展开不内嵌滚动。译名=NOC 官方职业名(noc_descriptions)
  const nocRowOf = useMemo(() => new Map(nocDesc.map((d) => [d.noc, d])), [nocDesc])
  const [foldOpen, setFoldOpen] = useState<Record<string, boolean>>({})
  const isQc = job.province === 'QC'
  // 批A:命中计算抽 pnpMatchOf(与通道直判块共用,改一处两边同变)
  const { streams, matched, excluded, excludedBy, hasInclusion } = useMemo(() => pnpMatchOf(job, occ), [job, occ])
  // 高亮行滚进视野(就近滚,尽量不动整个弹框)
  useEffect(() => { matchRef.current?.scrollIntoView({ block: 'nearest' }) }, [streams])

  const noc = job.noc, teer = job.teer, skilled = teer != null && teer <= 3
  // 判定行(Frank 2026-07-26「有些岗显示可提名 但是点进去却显示走不了」):
  // 根因=两套判定 —— 列表用服务端 pnp_eligible(08_score:排除式省 ON/AB 的 TEER 0-5 默认可),
  // 弹框却自己写死 teer<=3。实测 ON 3,254 / AB 1,328 / SK 106 个岗两边打架。
  // 修:**服务端 pnpEligible 是单一真相**,清单只负责解释「凭什么」,弹框不再自行判定能不能走。
  let verdictPill: React.ReactNode
  let genericWhy = ''
  if (isQc) verdictPill = <VerdictPill tone="na">{t('ch.pnp.qc')}</VerdictPill>
  else if (excludedBy) verdictPill = <VerdictPill tone="fail">{t('ch.pnp.exl', { label: streamDisplay({ t, label: excludedBy.label }) })}</VerdictPill>
  else if (matched) verdictPill = <VerdictPill tone="ok">{t('ch.pnp.on', { label: streamDisplay({ t, label: matched.label }) })}</VerdictPill>
  else if (job.pnpEligible) {
    verdictPill = <VerdictPill tone="ok">{t('ch.pnp.generic')}</VerdictPill>
    // Frank 同批「显示走通用 但是不知道具体走的是什么」:把「凭什么算通用」写出来,别让用户猜。
    // E13-09:TEER4-5 的「凭什么」分三类——排除式省(不设清单)/ NL(offer 即可)/
    // MB·NS·NB·PE 普通通道(先同雇主 6 个月)。省集合镜像 etl/08_score.UNIVERSAL_*_PROVS。
    const provName = t('prov.' + job.province) || job.province
    genericWhy = skilled ? t('ch.pnp.whySkilled', { teer: teer ?? '?' })
      : job.province === 'NL' ? t('ch.pnp.whyDirect')
      : ['MB', 'NS', 'NB', 'PE'].includes(job.province) ? t('ch.pnp.whyCond', { prov: provName })
      : t('ch.pnp.whyOpen', { prov: provName, teer: teer ?? '?' })
  }
  else verdictPill = <VerdictPill tone="na">{t('ch.pnp.no')}</VerdictPill>

  return (
    <>
      {/* 拆多卡(2026-07-25 用户「乱,拆成多个卡片」):原单卡四块堆叠(判定+抽选+公告+清单)挤成一团;
          改 判定/本省最近抽选/本省最新公告/每条通道清单 各一张 CARD_MD——
          同 E8-12 省弹框「每块一卡」先例;块自身无数据返回 null → 外层卡不渲(不出空壳) */}
      <div className="cardMd">
        <div className="mcardHead">{t('col.pnp')}</div>
        <div>{verdictPill}</div>
        {genericWhy ? <div className="pnpWhy">{genericWhy}</div> : null}
        {/* Frank「qc 没有对应的通道 也没有历史」:QC 不参加 PNP 是制度事实,不是缺数 —— 把它走的是什么说清 */}
        {isQc ? <div className="pnpWhy">{t('ch.pnp.qcWhy')}</div> : null}
      </div>
      {/* #287 批D:判定卡入口(设计 §5「modal-pnp 判定卡后」;效果图 se287-entry-pnp-modal) */}
      <TvEntryCard t={t} onOpen={() => { track('tv-entry', { kind: 'pnp' }); window.location.assign(`/plan/pr?job=${job.id}`) }} />
      {/* B1 雇主线:判定卡之后、抽选卡之前——用户点这个弹框问的就是「这雇主/这职业谁能担保我」 */}
      <SponsorLeadCard job={job} t={t} src="pnp" />
      {/* E12-09 自评打分已迁到「移民路径」页(Frank 2026-07-27「应该单独弄个功能吧,不应该放到 pnp 弹框里面」)。
          它算的是**你这个人**够不够分,跟看哪一个岗没关系;这里连跳转链也不留(#198/#199「多余的跳转都删掉」)。 */}
      {!isQc && job.province && draws.some((d) => d.province === job.province) ? (
        <div className="cardMd"><PnpDrawsBlock province={job.province} lang={lang} draws={draws} /></div>
      ) : null}
      {/* 本省最新公告(E12-06);QC 也显——MIFI 部委新闻,资格口径由 /news 声明 */}
      {job.province && news.some((n) => n.region === job.province) ? (
        <div className="cardMd"><NewsLatestBlock province={job.province} lang={lang} news={news} /></div>
      ) : null}
      {/* #125 → 2026-07-25 Frank 收紧「不覆盖就不用显示」:命中 → 只展示命中的清单;被排除 → 只展示排除清单;
          都没有 → 清单整体不渲(原全量铺浏览语境退役)——判定行已说清结论,不相干的清单只是噪音 */}
      {streams.filter((s) => s.occupations.length)
        /* 一省可有多张排除表(NB:通用 14 个 NOC + 餐饮住宿 13 个)→ 只展示真正命中本岗的那张,
           否则会铺一张与本岗无关的清单(兜底行还会随便挑一条),同 #125③ 口径 */
        .filter((s) => (matched ? s === matched : excluded && s.type === 'ineligible' && s.occupations.some((o) => o.noc === noc)))
        .map((s) => {
        const fk = s.label + s.stream
        // Frank 走查#14:默认只显命中「本岗」项(其余折叠),点末尾「展开其他」才全量
        const open = foldOpen[fk] ?? false
        // 命中置顶:本岗排最前,其余保持原序
        const sorted = s.occupations.filter((o) => o.noc === noc).concat(s.occupations.filter((o) => o.noc !== noc))
        const hidden = sorted.filter((o) => o.noc !== noc)
        const shown = open ? sorted : sorted.filter((o) => o.noc === noc)
        const rows = shown.length ? shown : sorted.slice(0, 1)   // 兜底:即便无命中也至少显 1 条
        return (
        <div key={fk} className="cardMd">
          {/* Frank 走查#14:清单头改纯 title(不再作折叠开关);开关移到列表末尾 */}
          <div className="mcardHead">
            {streamDisplay({ t, label: s.label })}
            <span className="pnpCount">{t('eelist.count', { n: s.occupations.length })}</span>
          </div>
          <div className="pnpBox">
            {rows.map((o) => {
              const hit = o.noc === noc
              const zh = showZh ? nocLocalTitle(nocRowOf.get(o.noc) || null, lang) : ''
              return (
                <div key={o.noc + o.name} ref={hit ? matchRef : undefined} className={hit ? 'pnpRow hit' : 'pnpRow'}>
                  <span className="pnpNoc">{o.noc}</span>
                  <span className="pnpFlex1">{o.name}{zh && zh.toLowerCase() !== o.name.toLowerCase() ? <span className="pnpZh">{zh}</span> : null}</span>
                  {hit && <span className="pnpTagS">{t('pnplist.your')}</span>}
                  {o.gtaRestricted && <span className="pnpTagS muted">{t('pnplist.gta')}</span>}
                </div>
              )
            })}
          </div>
          {hidden.length > 0 && (
            <div onClick={() => setFoldOpen((m) => ({ ...m, [fk]: !open }))}
              className="pnpFoldMore">
              {open ? t('pnplist.foldOther') : t('pnplist.showOther', { n: hidden.length })}
            </div>
          )}
        </div>
        )
      })}
      {/* 2026-07-25 Frank 走查#13:「怎么走这个通道」整卡删——①②③ 通用步骤+官方页链 = 废话,无实际价值 */}
    </>
  )
}

// ── 联邦 EE 类别抽选区(点 EE 字段时显示)──────────────────────
// 与 PnpListSection 同理:清单来自 DB 维度表(ee-categories,经 props 传入),全国单一源。
// 命中→只展开该类别清单 + 高亮本岗;未命中→只列出各类别名+数量概览。EE ≠ PNP,独立信号。
// EE 类别「休眠」判定(Frank 2026-07-26「ee stem 好久没有抽人了吧」——实核:STEM 上次 2024-04、运输 2024-03、教育 2025-09)。
// 12 个月内有抽选=活跃;超过=休眠。休眠类别照旧显示(历史归属是事实),但降级变灰并标上次抽选年月,
// 免得用户把两年没抽的类别当活路。判定与展示都走这一处,别再各写一份。
const EE_DORMANT_MONTHS = 12
export function eeLastDraw(label: string, cats: { label: string; drawDate: string }[]): string {
  let best = ''
  for (const seg of (label || '').split('/').map((x) => x.trim())) {
    for (const c of cats) if (c.label === seg && (c.drawDate || '') > best) best = c.drawDate || ''
  }
  return best
}
export function eeIsDormant(lastDraw: string): boolean {
  if (!lastDraw) return true
  const d = new Date(lastDraw + 'T00:00:00')
  if (isNaN(d.getTime())) return true
  return Date.now() - d.getTime() > EE_DORMANT_MONTHS * 30.4 * 86400000
}

// E6-10 · 联邦抽选近况(Frank「现在都是在抽 cec 和法语吧」)。
// 上面的类别卡只讲**本岗那一类**;联邦轮次还有 CEC、法语、省提名、通用 —— 不铺出来,用户拿着 EE 标会误判现在的行情。
// 数据源同一个 build_ee_draws.py:pnp_draws 的 province=FED 行(label=类别 key,零新表)。
// 红线:法语按**语言能力**判定、不按职业,只在这里作通道说明与分数线参考,**绝不挂到岗位上**。
const FED_TYPE_COLOR: Record<string, string> = { cec: '#2563eb', french: '#7c3aed', pnp: '#0f766e', general: '#4b5563', fsw: '#4b5563', fst: '#4b5563' }
const FED_PROGRAM = ['cec', 'french', 'pnp', 'general', 'fsw', 'fst']   // 非「按职业类别」的轮次类型
const FED_SHOW = 6, FED_MAX = 20   // 弹框只给最近 N 轮 + 可展开(#123 教训:别把全量塞进弹框)
function FederalRoundsCard({ t, draws }: { t: TFn; draws: PnpDraw[] }) {
  const [open, setOpen] = useState(false)
  const fed = useMemo(() => draws.filter((d) => d.province === 'FED' && d.kind === 'draw' && d.drawDate)
    .sort((a, b) => (a.drawDate < b.drawDate ? 1 : -1)).slice(0, FED_MAX), [draws])
  // 口径注按真实轮次算(原来是写死的一句「现阶段以 CEC 与法语为主」——轮次结构随政策变,写死就会过期)。
  // 计数说明:FED 行按类别各留 12 轮(build_ee_draws.HIST_PER_CAT),只要窗口内没被截断计数就准
  // (实核这 20 轮跨约 3 个月,CEC 的 12 轮能回溯 6 个月以上,不截断)。桶按轮数降序,零轮的桶不出现。
  const buckets = useMemo(() => {
    const m = new Map<string, number>()
    for (const d of fed) {
      const k = FED_PROGRAM.includes(d.label) ? d.label : '__cat'
      m.set(k, (m.get(k) || 0) + 1)
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }, [fed])
  if (!fed.length) return null
  const rows = open ? fed : fed.slice(0, FED_SHOW)
  return (
    <div className="cardMd">
      <div className="mcardHead">{t('eefed.title')}</div>
      <div className="pnpFedHead">
        {t('eefed.mixHead', { n: fed.length })}
        {buckets.map(([k, n], i) => (
          <span key={k}>{i ? t('sep') : ''}
            <span style={{ color: k === '__cat' ? '#b45309' : (FED_TYPE_COLOR[k] || '#4b5563') }}>
              {k === '__cat' ? t('eefed.cat') : eeKeyDisplay({ t, key: k })} {n}
            </span>
          </span>
        ))}
      </div>
      <div className="pnpBox clip mt">
        {rows.map((d, i) => (
          <div key={`${d.drawDate}-${d.label}-${i}`} className="pnpFedRow">
            <span className="pnpFedDate">{d.drawDate.slice(0, 10)}</span>
            <span title={d.stream} className="pnpFedType" style={{ color: FED_TYPE_COLOR[d.label] || '#b45309' }}>{eeKeyDisplay({ t, key: d.label })}</span>
            <span className="pnpFedCrs">{t('eelist.crsN', { crs: d.score ?? '—' })}</span>
            <span className="pnpFedIta">{t('eefed.ita', { n: d.invitations ?? '—' })}</span>
          </div>
        ))}
      </div>
      {fed.length > FED_SHOW ? (
        <button onClick={() => setOpen((v) => !v)}
          className="pnpMoreBtn">
          {open ? `▴ ${t('eefed.less')}` : `▾ ${t('eefed.more', { n: fed.length - FED_SHOW })}`}
        </button>
      ) : null}
      <div className="pnpFedNote">{t('eefed.french')}</div>
    </div>
  )
}

export function EeCategorySection({ job, lang, cats, draws = [], nocDesc = [], showZh = true }: { job: JobRow; lang: Lang; cats: EeOcc[]; draws?: PnpDraw[]; nocDesc?: NocDesc[]; showZh?: boolean }) {
  const t = makeT(lang)
  const matchRef = useRef<HTMLDivElement | null>(null)
  // 2026-07-25 Frank:每类别可折叠+职业带界面语言译名+展开全量不内嵌滚动(与 PNP 清单同规格)
  const nocRowOf = useMemo(() => new Map(nocDesc.map((d) => [d.noc, d])), [nocDesc])
  const [foldOpen, setFoldOpen] = useState<Record<string, boolean>>({})
  // #135(Frank「应该有个下拉箭头,点开按时间线看每一轮」):该类别历次抽选(pnp_draws 的 province=FED 行,
  // label=类别 key);近 24 月无抽选的类别拿不到行 → 不出箭头(没东西可展开就别给假入口)。
  const [openCat, setOpenCat] = useState<string | null>(null)
  const [showAllCats, setShowAllCats] = useState(false)   // #155:未命中时全类别默认收起
  const histOf = useMemo(() => {
    const m = new Map<string, PnpDraw[]>()
    for (const d of draws) {
      if (d.province !== 'FED' || !d.drawDate) continue
      const arr = m.get(d.label) || []
      arr.push(d); m.set(d.label, arr)
    }
    for (const arr of m.values()) arr.sort((a, b) => (a.drawDate < b.drawDate ? 1 : -1))
    return m
  }, [draws])
  // 扁平维度表按 label 分组
  const grouped = useMemo<EeCat[]>(() => {
    const byLabel = new Map<string, EeCat>()
    for (const r of cats) {
      let c = byLabel.get(r.label)
      if (!c) { c = { key: r.category, label: r.label, drawCrs: r.drawCrs, drawDate: r.drawDate, drawSize: r.drawSize, occupations: [] }; byLabel.set(r.label, c) }
      c.occupations.push({ noc: r.noc, teer: r.teer, title: r.title })
    }
    return [...byLabel.values()]
  }, [cats])
  useEffect(() => { matchRef.current?.scrollIntoView({ block: 'nearest' }) }, [grouped])

  const noc = job.noc
  const hit = grouped.filter((c) => c.occupations.some((o) => o.noc === noc))
  // #155(Frank「这个没有数据还需要列吗」= E8-09 开放问题①拍板):未命中时不再铺全部类别——
  // 本岗跟它们没关系,铺出来只是占屏;收成一行「未列入任何 EE 类别」+ 折叠入口,想看全景才展开。
  // #167⑥(Frank「没有抽签的类别是不是就不要显示了」):展开全景时,把**从未抽过签**的类别滤掉 ——
  // 一个没有任何抽选记录的类别对求职者没有可操作性(不知道分数线、不知道抽没抽、无从判断),
  // 列出来只是让人多读几行(如「军职 3 个职业」「研究 2 个职业」这类)。
  // 本岗**命中**的类别永远显示,哪怕没抽过 —— 那是与本岗直接相关的事实,不能因无抽选就藏。
  const hasDraw = (c: EeCat) => (histOf.get(c.label)?.length ?? 0) > 0 || c.drawDate != null
  const shown = hit.length ? hit : (showAllCats ? grouped.filter(hasDraw) : [])
  const drawsCats = shown.filter((c) => c.drawCrs != null && c.drawDate)
  // 2026-07-25 Frank「拆成三个卡片吧」:原单卡(判定+抽选+清单堆叠)对齐 PNP 弹框「每块一卡」——
  // 判定卡 / 最近抽选卡 / 类别清单卡;块无数据整卡不出(无空壳)
  return (
    <>
      <div className="cardMd">
        <div className="mcardHead">{t('col.ee')}</div>
        <div className={hit.length ? 'pnpEeVerdict on' : 'pnpEeVerdict'}>
          {hit.length ? <><IconCheck /> {t('eelist.in', { noc, cats: hit.map((c) => eeDisplay({ t, label: c.label })).join('/') })}</> : t('eelist.out')}
        </div>
        {/* 2026-07-25 Frank「这两个应该是两行吧」:展开钮从结论行拆出,独立一行 */}
        {!hit.length && grouped.length ? (
          <div className="pnpMt6">
            <button onClick={() => setShowAllCats((v) => !v)} className="pnpLinkBtn">
              {showAllCats ? '▴' : '▾'} {t('eelist.allCats', { n: grouped.length })}
            </button>
          </div>
        ) : null}
      </div>
      {drawsCats.length ? (
        <div className="cardMd">
          <div className="mcardHead">{t('eelist.drawsTitle')}</div>
          {drawsCats.map((c, ci) => {
            const hist = histOf.get(c.key) || []
            const histExpandable = hist.length > 1
            const histOpen = openCat === c.key
            return (
              <div key={c.key} className="pnpCat">
                {shown.length > 1 ? <div className="pnpCatName">{eeDisplay({ t, label: c.label })}</div> : null}
                <div onClick={histExpandable ? () => setOpenCat(histOpen ? null : c.key) : undefined}
                  className={histExpandable ? 'pnpDrawLine clickable' : 'pnpDrawLine'}>
                  {t('eelist.draw', { crs: c.drawCrs ?? '—', date: c.drawDate, size: c.drawSize ?? '—' })}
                  {histExpandable ? <span className="pnpHistTog">{histOpen ? '▴' : '▾'} {t('eelist.hist', { n: hist.length })}</span> : null}
                </div>
                {histExpandable && histOpen ? (
                  <div className="pnpBox clip my">
                    {hist.map((h, i) => (
                      <div key={`${h.drawDate}-${i}`} className="pnpHistRow">
                        <span className="pnpFedDate">{(h.drawDate || '').slice(0, 10)}</span>
                        <span className="pnpFedCrs">{t('eelist.crsN', { crs: h.score ?? '—' })}</span>
                        <span className="pnpHistIta">{t('eelist.itaN', { n: h.invitations ?? '—' })}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      ) : null}
      {/* E6-10:联邦抽选近况(全类型真轮次)。原来这里只有一句写死的口径注,现在给活数据 */}
      <FederalRoundsCard t={t} draws={draws} />
      {shown.length ? (
        <div className="cardMd">
          {/* Frank 走查#16:「类别清单」标签删——类别名(如「医疗社服 37 个职业」)本身即 title(下方粗体名行承担) */}
          {shown.map((c, ci) => {
            const listOpen = foldOpen[c.key] ?? true   // 一律默认展开(「每个职位怎么没了」),想收再点头折
            return (
              <div key={c.key} className="pnpCat">
                <div onClick={() => setFoldOpen((m) => ({ ...m, [c.key]: !listOpen }))} className="pnpCatHead">
                  <span className="pnpCatName lg">{eeDisplay({ t, label: c.label })}</span>
                  <span className="pnpCatN">{t('eelist.count', { n: c.occupations.length })}</span>
                  <span className="pnpCatCaret">{listOpen ? '▴' : '▾'}</span>
                </div>
                {listOpen ? (
                <div className="pnpMt6">
                  {c.occupations.map((o, oi) => {
                    const isHit = o.noc === noc
                    const zh = showZh ? nocLocalTitle(nocRowOf.get(o.noc) || null, lang) : ''
                    return (
                      <div key={o.noc} ref={isHit ? matchRef : undefined} className={isHit ? 'pnpOccRow hit' : 'pnpOccRow'}>
                        <span className="pnpOccNoc">{o.noc}</span>
                        <span className="pnpFlex1">{o.title}{zh && zh.toLowerCase() !== o.title.toLowerCase() ? <span className="pnpZh">{zh}</span> : null}</span>
                        {o.teer != null && <span className="pnpTeer">T{o.teer}</span>}
                        {isHit && <span className="pnpTagS">{t('eelist.your')}</span>}
                      </div>
                    )
                  })}
                </div>
                ) : null}
              </div>
            )
          })}
        </div>
      ) : null}
    </>
  )
}

// 公司名归一(镜像 etl/clean/05c_flag_aip.py 的 norm_name)—— 用于把岗位公司名匹配回 AIP 指定雇主记录
const AIP_SUFFIX = /\b(inc|incorporated|ltd|limited|llp|llc|corp|corporation|co|company|enr|ltee|ltée|holdings?|group|services?|enterprises?)\b\.?/gi
export const normName = (name?: string) => (name || '').toLowerCase()
  .split(/\bo\/a\b|\bdba\b|\bd\/b\/a\b/)[0]
  .replace(AIP_SUFFIX, ' ').replace(/[^a-z0-9& ]/g, ' ').replace(/\s+/g, ' ').trim()
const ATLANTIC = new Set(['NL', 'NB', 'NS', 'PE'])
// ── 批A #134 通道直判(Frank「直接判断这个岗能不能走这个通道」)──────────────
// 三态:on=雇主在指定名单 / miss=大西洋省但雇主不在名单 / na=非大西洋省不适用
export function aipVerdictOf(job: JobRow): 'on' | 'miss' | 'na' {
  if (job.aip) return 'on'
  return ATLANTIC.has(job.province) ? 'miss' : 'na'
}
// E6-09(2026-07-26 Frank「AIP 那个也一起补」):省里逐条点名「这些职业的 AIP 背书不受理」的清单
// (NB 官方两张)。**与雇主是否指定雇主无关** —— 官方明说这些岗一律不受理,故指定雇主也要如实说。
export function aipBlockOf(job: JobRow, occ: PnpOcc[]): PnpStream | null {
  if (!job.noc || !ATLANTIC.has(job.province)) return null
  const r = occ.find((x) => x.program === 'AIP' && x.province === job.province && x.noc === job.noc)
  if (!r) return null
  const occupations = occ.filter((x) => x.program === 'AIP' && x.label === r.label && x.province === r.province)
    .map((x) => ({ noc: x.noc, name: x.name, gtaRestricted: x.gtaRestricted }))
  return { stream: r.stream, label: r.label, type: r.type, url: r.url, fetched: r.fetched, occupations }
}
// 判定药丸(直判行统一件):ok 绿=能走 / warn 琥珀 / fail 红=排除 / na 灰=走不了
export function VerdictPill({ tone, children }: { tone: 'ok' | 'warn' | 'fail' | 'na'; children: React.ReactNode }) {
  return <span className={'pnpVerdict ' + tone}>{children}</span>
}
// PNP 命中计算(PnpListSection 与通道直判块两处共用;纯函数,改一处两边同变)
function pnpMatchOf(job: JobRow, occ: PnpOcc[]): { streams: PnpStream[]; matched: PnpStream | null; excluded: boolean; excludedBy: PnpStream | null; hasInclusion: boolean } {
  const streams: PnpStream[] = []
  if (job.province !== 'QC' && job.province) {
    const byLabel = new Map<string, PnpStream>()
    for (const r of occ) {
      // AIP 清单不参与省提名判定(另一条路,见 aipBlockOf)
      if (r.province !== job.province || (r.program || 'PNP') !== 'PNP') continue
      let s = byLabel.get(r.label)
      if (!s) { s = { stream: r.stream, label: r.label, type: r.type, url: r.url, fetched: r.fetched, occupations: [] }; byLabel.set(r.label, s) }
      s.occupations.push({ noc: r.noc, name: r.name, gtaRestricted: r.gtaRestricted })
    }
    streams.push(...byLabel.values())
  }
  let matched: PnpStream | null = null, excludedBy: PnpStream | null = null, hasInclusion = false
  for (const s of streams) {
    if (s.type === 'ineligible') { if (s.occupations.some((o) => o.noc === job.noc)) excludedBy = s }
    else { hasInclusion = true; if (s.occupations.some((o) => o.noc === job.noc)) matched = s }
  }
  return { streams, matched, excluded: !!excludedBy, excludedBy, hasInclusion }
}
// 2026-07-26：「移民通道」钮下架后，批A #134 的三行直判汇总卡（ChannelVerdicts）随之退役 ——
// 它是 PNP/EE/AIP 三列的汇总，而三列各自点开就有更具体的弹框（命中清单名、清单展开、本省公告）。
// 想拿回来：revert 本次 commit 即可（组件全文在 git 史里）。
// 2026-07-26 Frank「移民通道…没必要显示，内容放到其他字段」：E12-08 三维档拆解弹框整块退役 ——
// 通道档=PNP/EE/AIP 三列已逐条直判、薪资质量=vs 中位列、雇佣质量=雇佣列，三行全是重复
// （一条信息只出现一次）。档位数据照常入库（排序/筛选仍用），只是不再单独占一个弹框与一枚按钮；
// 唯一调用方没了，/api/scoredetail 同批下架（免费额度池少一个消费端，池子本身不变）。

// ── 对我意味着什么(E5-00 §3.5,FieldFactsSection 同级)────────────
// 依据链在弹框端用同一 match() 重算(lib/jobs/match.ts 纯函数,与服务端列一致);每条结论指回维度记录。
// 措辞红线:只说「符合/不符合公开清单条件」「高于/低于抽选线」,永不说「你能/不能移民」;块底带免责短句。
const VERDICT_ICON: Record<string, { icon: React.ReactNode; color: string }> = {
  pass: { icon: <IconCheck />, color: '#15803d' }, warn: { icon: <IconWarn />, color: '#b45309' }, fail: { icon: <IconX />, color: '#dc2626' }, na: { icon: '·', color: '#9ca3af' },
}
export function MeansForMe({ job, lang, plan, pnpOcc, eeOcc, nocDesc }: { job: JobRow; lang: Lang; plan: Plan; pnpOcc: PnpOcc[]; eeOcc: EeOcc[]; nocDesc: NocDesc[] }) {
  const t = makeT(lang)
  const result = useMemo(() => {
    if (!plan.profileOk || !plan.profile) return null
    const mj: MatchJob = {
      noc: job.noc, teer: job.teer, province: job.province, pnpEligible: job.pnpEligible,
      pnpStream: job.pnpStream, eeCategory: job.eeCategory, salaryAnnual: job.salaryAnnual, wageMedAnnual: job.wageMedAnnual,
      lmiaPositions: job.lmiaPositions, lmiaPositionsSkilled: job.lmiaPositionsSkilled, lmiaLastQuarter: job.lmiaLastQuarter,
    }
    return matchJob({ profile: plan.profile, job: mj, dims: {
      pnpOccupations: pnpOcc.map((r) => ({ province: r.province, label: r.label, type: r.type, noc: r.noc, url: r.url, fetched: r.fetched })),
      eeCategories: eeOcc.map((r) => ({ category: r.category, label: r.label, noc: r.noc, drawCrs: r.drawCrs, drawDate: r.drawDate, url: r.url, fetched: r.fetched })),
    } })
  }, [job, plan, pnpOcc, eeOcc])

  // 未登录/未建档:弹框内不再放建档引导(页头横幅 + 列表「建档案 →」列已覆盖;用户拍板:别到处都是)
  if (!plan.loggedIn || !plan.profileOk) return null
  // 匹配全放开(Frank 2026-07-21):匹配结论对所有已建档用户免费全出(本卡 result 本就前端按 profile 现算)——
  // 原「免费限额外整块打码」退役;付费墙只剩表内 Pro 数据列(vs中位/工资中位)。
  // 卡片化(E8-10 §3.5「逐条读判定 → 卡片」,双端统一;Frank 三拍:拆卡 / 值不换行不省略 / 英文在前中文灰注):
  // 依据链同源 match() reasons(1:1 映射,不另起炉灶);措辞红线照旧(只说符合与否)。
  if (!result) return null
  const pf = plan.profile!

  // #175(Frank「这种还是不要用括号了」):译名不再括号包,改灰注跟在英文后(头部卡
  // 「Esthetician…　美容师…」同款);省名同理,不再走 provName 的「En(译名)」字符串拼法
  const provCell = (c: string) => {
    const cc = (c || '').toUpperCase(); const en = PROV_NAMES[cc] || c
    const loc = t('prov.' + cc); const has = loc && loc !== 'prov.' + cc && loc !== en
    return <>{en}{has ? <span className="pnpNote">　{loc}</span> : null}</>
  }
  // NOC:英文官方名主文案 + 界面语言译名灰注(#147),NOC 码作同行行尾灰注——不另起行
  const nocCell = (c: string) => {
    const d = nocDesc.find((x) => x.noc === c); const loc = nocLocalTitle(d, lang)
    return d?.title ? <>{d.title}{loc ? <span className="pnpNote">　{loc}</span> : null} <span className="pnpNote">NOC {c}</span></> : <>NOC {c}</>
  }
  // TEER 值同屏可能出现两次(省提名粗筛 / 技能层级),「0 最高,5 最低」灰注只随首次出现(一事只说一遍)
  let teerNoted = false
  const teerCell = () => {
    if (job.teer == null) return '—'
    const withNote = !teerNoted; teerNoted = true
    return <>TEER {job.teer}{withNote && <> <span className="pnpNote">{t('mm.job.teerNote')}</span></>}</>
  }
  const salaryCell = job.salaryAnnual != null ? `$${Math.round(job.salaryAnnual / 1000)}K/yr` : t('mm.job.noSalary')
  type MMRow = { dim: string; jc: React.ReactNode; yc: React.ReactNode; verdict: 'pass' | 'warn' | 'fail' | 'na'; v: React.ReactNode; vTip?: string; src?: { label: string; url: string; fetched?: string } | null }
  const rows: MMRow[] = []
  for (const r of result.reasons as MatchReason[]) {
    const p: any = r.params || {}
    if (r.rule === 'noc') {
      if (r.key === 'match.r.noc.jobUncat') rows.push({ dim: t('mm.dim.noc'), jc: t('cell.uncat'), yc: '—', verdict: 'na', v: t('mm.v.uncat') })
      else if (r.key === 'match.r.noc.noProfile') rows.push({ dim: t('mm.dim.noc'), jc: nocCell(job.noc!), yc: t('mm.you.noNoc'), verdict: 'na', v: t('mm.v.noProfile') })
      else if (r.key === 'match.r.noc.exact') rows.push({ dim: t('mm.dim.noc'), jc: nocCell(job.noc!), yc: nocCell(job.noc!), verdict: 'pass', v: t('mm.v.match') })
      else if (r.key === 'match.r.noc.minor') rows.push({ dim: t('mm.dim.noc'), jc: nocCell(job.noc!), yc: nocCell(String(p.yours)), verdict: 'pass', v: t('mm.v.minor') })
      else rows.push({ dim: t('mm.dim.noc'), jc: nocCell(job.noc!), yc: <>{pf.nocCodes.map((c: string) => <div key={c}>{nocCell(c)}</div>)}</>, verdict: 'fail', v: t('mm.v.nomatch') })
    } else if (r.rule === 'prov') {
      if (r.key === 'match.r.prov.notTarget') rows.push({ dim: t('mm.dim.prov'), jc: provCell(String(p.prov)), yc: <>{pf.targetProvinces.map((c: string) => <div key={c}>{provCell(c)}</div>)}</>, verdict: 'warn', v: t('mm.v.notTarget') })
      else if (r.key === 'match.r.prov.qc') rows.push({ dim: t('mm.dim.pnp'), jc: provCell('QC'), yc: '—', verdict: 'na', v: t('mm.v.qc') })
      else if (r.key === 'match.r.prov.named') rows.push({ dim: t('mm.dim.pnp'), jc: streamDisplay({ t, label: String(p.label) }), yc: '—', verdict: 'pass', v: t('mm.v.named'), src: r.source })
      else if (r.key === 'match.r.prov.excluded') rows.push({ dim: t('mm.dim.pnp'), jc: streamDisplay({ t, label: String(p.label) }), yc: '—', verdict: 'fail', v: t('mm.v.excluded'), src: r.source })
      else if (r.key === 'match.r.prov.generic') rows.push({ dim: t('mm.dim.pnpPre'), jc: teerCell(), yc: '—', verdict: 'pass', v: t('mm.v.generic') })
      else if (r.key === 'match.r.prov.uncovered') rows.push({ dim: t('mm.dim.pnpPre'), jc: teerCell(), yc: '—', verdict: 'na', v: t('mm.v.uncovered') })
      else rows.push({ dim: t('mm.dim.pnpPre'), jc: teerCell(), yc: '—', verdict: 'fail', v: t('mm.v.provNone') })
    } else if (r.rule === 'ee') {
      if (r.key === 'match.r.ee.none') rows.push({ dim: t('mm.dim.ee'), jc: t('mm.job.eeNone'), yc: '—', verdict: 'na', v: '—' })
      else if (r.key === 'match.r.ee.noDraw') rows.push({ dim: t('mm.dim.ee'), jc: t('mm.job.inCat', { cat: eeDisplay({ t, label: String(p.cat) }) }), yc: '—', verdict: 'na', v: t('mm.v.noDraw') })
      else {
        const noCrs = r.key === 'match.r.ee.noCrs'
        rows.push({ dim: t('mm.dim.ee'), jc: t('mm.job.inCat', { cat: eeDisplay({ t, label: String(p.cat) }) }), yc: noCrs ? t('mm.you.noCrs') : t('mm.you.crs', { crs: p.crs }), verdict: noCrs ? 'warn' : r.verdict as MMRow['verdict'], v: noCrs ? t('mm.v.fillCrs') : r.key === 'match.r.ee.above' ? t('mm.v.crsAbove', { diff: p.diff }) : t('mm.v.crsBelow', { gap: p.gap }) })
        rows.push({ dim: t('mm.dim.eeDraw'), jc: t('mm.job.draw', { draw: p.draw, date: p.date }), yc: '—', verdict: 'na', v: noCrs ? t('mm.v.fillCrsThen') : '—', src: r.source })
      }
    } else if (r.rule === 'teer') {
      if (r.key === 'match.r.teer.ok') rows.push({ dim: t('mm.dim.teer'), jc: teerCell(), yc: '—', verdict: 'pass', v: t('mm.v.teerOk') })
      else if (r.key === 'match.r.teer.channel') rows.push({ dim: t('mm.dim.teer'), jc: teerCell(), yc: '—', verdict: 'pass', v: t('mm.v.teerChannel', { stream: streamDisplay({ t, label: String(p.stream) }) }) })
      else rows.push({ dim: t('mm.dim.teer'), jc: teerCell(), yc: '—', verdict: 'fail', v: t('mm.v.teerLow') })
    } else if (r.rule === 'wage') {
      if (r.key === 'match.r.wage.above') rows.push({ dim: t('mm.dim.wage'), jc: salaryCell, yc: '—', verdict: 'pass', v: t('mm.v.wageAbove', { pct: p.pct }) })
      else if (r.key === 'match.r.wage.near') rows.push({ dim: t('mm.dim.wage'), jc: salaryCell, yc: '—', verdict: 'warn', v: t('mm.v.wageNear', { pct: p.pct }) })
      else if (r.key === 'match.r.wage.below') rows.push({ dim: t('mm.dim.wage'), jc: salaryCell, yc: '—', verdict: 'warn', v: t('mm.v.wageBelow', { pct: p.pct }) })
      else rows.push({ dim: t('mm.dim.wage'), jc: salaryCell, yc: '—', verdict: 'na', v: t('mm.v.wageNa') })
    } else if (r.rule === 'lmia') {
      if (r.key === 'match.r.lmia.na') rows.push({ dim: t('mm.dim.lmia'), jc: t('mm.job.lmiaNone'), yc: '—', verdict: 'na', v: t('mm.v.lmiaNa'), vTip: t('mm.v.lmiaNaTip') })
      else if (r.key === 'match.r.lmia.lowOnly') rows.push({ dim: t('mm.dim.lmia'), jc: t('mm.job.lmia', { n: p.n, q: p.q }), yc: '—', verdict: 'na', v: t('mm.v.lmiaLow'), src: r.source })
      else rows.push({ dim: t('mm.dim.lmia'), jc: t('mm.job.lmia', { n: p.n, q: p.q }), yc: '—', verdict: 'pass', v: t('mm.v.lmiaHas'), src: r.source })
    }
  }
  // 判定药丸:底色随判定(裸色字浮在白底上没有归属感);来源 ↗ 在药丸外
  const vCell = (r: MMRow) => {
    if (r.v === '—') return <span className="pnpDash">—</span>
    const v = VERDICT_ICON[r.verdict]
    return (
      <span className="pnpVwrap">
        <span title={r.vTip} className={'pnpVpill ' + r.verdict}>
          {v.icon} {r.v}{r.vTip ? ' ⓘ' : ''}
        </span>
        {/* #106:依据链官方来源 ↗ 外链撤(归拢到 /resources) */}
      </span>
    )
  }
  return (
    /* 壳=页面统一卡规范(白底 #e5e7eb 描边 r12,详情页 sec 同款;Frank「一个页面统一风格」)——
       老弹框灰壳退役;卡里分组用灰内卡(白壳配灰内卡,不再白套白) */
    <div className="cardMd">
      {/* #C 一致性:换用统一卡常量(值与原手写完全一致) */}
      <div className="mcardHead">
        <IconTarget /> {t('rm.title')}
        <span className={'pnpLevel ' + result.level}>{t('match.levelLine', { level: t('match.' + result.level) })}</span>
      </div>
      {/* 一维度一段,分隔线分组(Frank「不要卡片套卡片更清晰」——#172 的灰内卡铺平):
          维度名左、判定药丸右;「本岗 / 我的」标签列 max-content 自适应,
          值一行放全——长值窄屏悬挂缩进折行,永不截断省略 */}
      <div className="pnpMt4">
        {rows.map((r, i) => (
          <div key={i} className="pnpMmRow">
            <div className="pnpMmHead">
              <span className="pnpMmDim">{r.dim}</span>
              {vCell(r)}
            </div>
            <div className="pnpMmKv">
              <span className="pnpMmK">{t('mm.col.job')}</span><span>{r.jc}</span>
              {r.yc !== '—' && <><span className="pnpMmK">{t('mm.col.you')}</span><span>{r.yc}</span></>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

