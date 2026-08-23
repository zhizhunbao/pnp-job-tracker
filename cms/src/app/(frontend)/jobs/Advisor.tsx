'use client'
// 字段顾问弹框:点表格里的一格 → 开这一格背后的事实。
// 由三部分组成 ——(1)按字段/按组装配事实块的机制(FieldFacts*),(2)分类与地点两个专属面板,
// (3)浮层本体(可拖可拉可全屏,尺寸记 localStorage)。ActModal 是它的同族:JD 快看浮层。
// E8-10 收编的教训写在 GROUP_SECTIONS 上:一套组件伺候 24 种字段必漏,所以字段→分组是张明表,不是 if 链。
import { useEffect, useRef, useState } from 'react'

import { IconCompass, IconMap, IconMaximize, IconMinimize } from '../Icons'
import { Grid, Row } from '../ui'
// FactsBox 只有本文件用 —— 2026-08-17 从退役的 jobs/Facts 收回宿主(一处用的东西不该住在共享叶子里)
function FactsBox({ children, note }: { children: React.ReactNode; note?: React.ReactNode }) {
  // Frank 走查#8:去掉卡片底部横线(borderBottom+paddingBottom 退役);组间留白靠 marginBottom
  return (
    <div className="factsBox">
      {children}
      {note ? <div className="factsNote">{note}</div> : null}
    </div>
  )
}
import { CompanyAiSection, CompanyPanel } from './Company'
import { JdTextView, JobBody, NocDutiesView, SUG_MARK, extractSug, fetchJobText, renderAI } from './Jd'
import { EeCategorySection, MeansForMe, NewsLatestBlock, PnpDrawsBlock, PnpListSection, STREAM_REFORM, VerdictPill, aipBlockOf, aipVerdictOf, normName } from './Pnp'
import { LockedText } from './Lock'
import { CARD, SCRIM, iconBtnS, useIsNarrow } from './Modal'
import { useOverlayClose } from './overlay'
import { makeT, type Lang, type TFn } from '@/lib/i18n'
import { streamDisplay } from '@/lib/jobs'
import { type ColKey, type FieldGroup, type Plan, type DesigEmp, type EeOcc, type FieldSource, type JobRow, type NewsSlim, type NocDesc, type PnpDraw, type PnpOcc, type ProvInfo, blockedSrc, isDirect, sourceLabel } from '@/lib/jobs'
import { isExemptSector, lmiaWageClass } from '@/lib/lmia'
import { mapQuery, mapsUrl, parseLoc } from '@/lib/location'
import { catName, nocLocalTitle } from '@/lib/noc'
import { track } from '@/lib/track'

function TitleFacts({ job, lang, loggedIn }: { job: JobRow; lang: Lang; loggedIn: boolean }) {
  const t = makeT(lang)
  const [jd, setJd] = useState<string | null>(null)  // null=loading · ''=无正文
  const [limited, setLimited] = useState(false)      // #201:429=JD 宽松防滥用闸偶发(JD 已免费,非付费墙)
  useEffect(() => {
    const ctrl = new AbortController()
    ;(async () => {
      try {
        const r = await fetchJobText(job.applyUrl || '', ctrl.signal)
        if (r.status === 'limited') { setLimited(true); setJd(''); return }
        setJd(r.text)
      } catch { if (!ctrl.signal.aborted) setJd('') }
    })()
    return () => ctrl.abort()
  }, [job])
  return (
    <FactsBox>
      {/* 雇佣形态 + 入职要求(E6-06/E6-07A):详情页结构化标注原文,零 LLM。
          J1(2026-07-19 Frank):工时/雇佣期拆两行(禁「·」杂糅);未标注显灰字不再整行消失;证书一行一条 */}
      <Row k={t('col.empHours')}>{job.employmentHours ? t('emp.' + job.employmentHours) : <span className="advMuted">{t('fact.unstated')}</span>}</Row>
      <Row k={t('col.empTerm')}>{job.employmentTerm ? t('term.' + job.employmentTerm) : <span className="advMuted">{t('fact.unstated')}</span>}</Row>
      <Row k={t('fact.edu')}>{job.education || null}</Row>
      <Row k={t('fact.cert')}>{job.certificates?.length ? <>{job.certificates.map((c, i) => <div key={i}>{c}</div>)}</> : null}</Row>
      {/* 职位字段只做职位的事(07-06 用户拍板):职位名已在弹窗标题,NOC/TEER 归分类弹窗 —— 这里就是真实 JD */}
      <div className={'advExcerptHead' + ((job.employmentHours || job.education || job.certificates?.length) ? ' gap' : '')}>{t('fact.jdExcerpt')}</div>
      {limited ? <div className="advExcerpt">{t('jd.busy')}</div>
        : jd === null ? <div className="advExcerpt">{t('act.loadingText')}</div>
        : jd ? <JdTextView text={jd} />
        : <div className="advExcerpt">
            {/* 空态解释原因(第 9 轮 #26);原帖链接不再内联(2026-07-11 用户指出与下方来源行重复,来源行=同一 applyUrl) */}
            {blockedSrc(job) ? t('act.noTextBlocked', { src: blockedSrc(job) }) : t('act.noText')}
          </div>}
    </FactsBox>
  )
}

const LOC_FIELDS = new Set<ColKey>(['country', 'province', 'city', 'district', 'address'])
const SAL_FIELDS = new Set<ColKey>(['salary', 'salaryYr', 'wageMedHr', 'wageMedYr', 'vsMedian'])
const CLS_FIELDS = new Set<ColKey>(['noc', 'teer', 'broad', 'mid', 'fine'])
const SRC_FIELDS = new Set<ColKey>(['source', 'origin', 'direct'])
const TIME_FIELDS = new Set<ColKey>(['status', 'datePosted', 'lastSeen', 'closedAt'])
// 每个字段来源各归其源(07-06 用户拍板:不能都链 jobbank 列表根):
// 帖内字段 → 记录级 applyUrl(这一岗的原帖,每岗不同);第三方数据字段 → field_sources 注册表里各自的
// 官方数据集页(分类=StatCan NOC、中位=ESDC 工资、AIP/PNP/EE=IRCC、LMIA=ESDC 名录);
// 本站派生(评分/匹配)与公司(官网行即出处)不挂。vsMedian=对比字段,帖子+ESDC 两个输入都给。
const DATASET_SRC_FIELDS = new Set<ColKey>(['noc', 'teer', 'broad', 'mid', 'fine', 'wageMedHr', 'wageMedYr', 'aip', 'pilot', 'lmia', 'pnp', 'ee'])

// 来源行极简版(2026-07-06 用户拍板):「来源: 完整 applyUrl」一行可点击,**紧跟事实/JD 内容、在 AI 区之前**
// (出处跟着对应内容走,不吊在弹窗底部);发布方/抓取时间/标签全不带 —— 合规已在 footer 统一声明。
// pnp/ee 字段例外:清单内容来自政策页,各通道行已带自己的 ↗ 官方链接,不加岗位帖来源行。
// field_sources 维度与 /sources 解释页照旧保留(E4-04 出处能力后置到解释页)。
// ═══ E8-10 S6:事实块按**分组**铺开(2026-07-21)═════════════════════════════════════
// 收编前:点「通道」列只渲通道一条 —— 弹框标题写着「移民」,里面却只有一个字段,
// 用户还得退出去再点 PNP、再点 EE、再点 AIP,每点一次烧一次额度。这正是 24 个弹框的病根。
// 收编后:一个分组一次把该组事实全铺出来。**复用既有 FieldFactsSection 当积木**(它=某字段事实+其来源行),
// 不重写任何渲染逻辑 —— 顺序即阅读顺序,先结论后依据。
const GROUP_SECTIONS: Record<FieldGroup, ColKey[]> = {
  // 2026-07-25 Frank 拆弹框(#176 五合一退役):移民价值做薄=通道卡(+依据链/顾问在 AdvisorModal 直渲);
  // PNP/EE/AIP/薪资 各回各家——「xx 的内容只放 xx 的弹框」,与依据链结论行不再重复
  immigration: ['score'],
  pnp: ['pnp'],
  ee: ['ee'],
  aip: ['aip'],
  pilot: ['pilot'],
  salary: ['salary', 'vsMedian', 'wageMedHr'],   // 批A 三卡:帖面(原文+折算) + vs中位(ESDC中位+直判) + ESDC表(低中高一行一条)
  category: ['noc'],
  company: [],   // 2026-07-21:公司组走专用 CompanyPanel(平级卡),不经 GroupFactsSection
  location: [],  // E8-12:地点组走专用 LocationPanel(五卡两列),不经 GroupFactsSection
}
// 有没有这块事实 —— 没有就整块跳过,**绝不留孤儿小标题**(既有规范 §2「空段规则」)
function hasFacts(k: ColKey, job: JobRow): boolean {
  switch (k) {
    case 'score': return job.gradeChannel != null || job.score != null
    case 'pnp': return true          // 未命中也要说「未命中」,是结论不是空
    case 'ee': return true           // 同上(#155 已收成一行+折叠)
    case 'aip': return true          // 批A:同上——原 !!job.aip 让未命中岗点开整框空壳(第25轮 AIP P3)
    case 'pilot': return true        // E6-11:同上,未命中也给「不在试点社区」的结论行
    case 'noc': return !!job.noc
    case 'vsMedian': return job.salaryAnnual != null || job.wageMedAnnual != null
    case 'wageMedHr': return job.wageMedHourly != null || job.wageMedAnnual != null   // 批A ESDC 表卡:无中位=整卡不出
    case 'salary': return !!(job.salaryText || job.salary)
    case 'accessibility': return !!job.accessibility
    case 'title': return true
    case 'company': return !!job.company
    default: return true
  }
}

// 弹框顶部胶囊钮(分类/职位弹框共用:显示中文对照 / AI 速读)
function GroupFactsSection(props: Omit<Parameters<typeof FieldFactsSection>[0], 'field'> & { group: FieldGroup }) {
  const { group, job, lang, ...rest } = props
  const t = makeT(lang)
  const keys = GROUP_SECTIONS[group].filter((k) => hasFacts(k, job))
  return (
    <>
      {/* 批A #134 头牌:移民组置顶三通道直判(通道档卡照旧在下) */}
      {/* 2026-07-26:三行直判卡退役 —— 它是 PNP/EE/AIP 三列的汇总,三列点开各有更具体的弹框
          (一条信息只出现一次);本弹框现只承载个人化解读「对我意味着什么」 */}
      {keys.map((k) => k === 'pnp' || k === 'ee' ? (
        // PNP/EE 节拆多卡(2026-07-25,EE=Frank「拆成三个卡片吧」):Section 自带 判定/抽选/清单 各一卡,
        // 壳卡退役——再包一层就是卡中卡;标题由判定卡自持(#173 每卡必有 title 不破)
        <FieldFactsSection key={k} field={k} job={job} lang={lang} {...rest} />
      ) : (
        <div key={k} className="cardMd">
          {/* 分类卡标题人话化:col.noc 是列名「NOC」,当卡标题裸奔(#176 实测抓到);批A 薪资两卡同理 */}
          <div className="mcardHead">{k === 'noc' ? t('grp.category') : k === 'salary' ? t('sal.cardPosted') : k === 'wageMedHr' ? t('sal.cardEsdc') : t('col.' + k)}</div>
          <FieldFactsSection field={k} job={job} lang={lang} {...rest} />
        </div>
      ))}
    </>
  )
}

function FieldFactsSection({ field, job, jobs, lang, isPro, loggedIn, pnpOcc, pnpDraws, news, profileClb, eeOcc, desigEmp, nocDesc, fieldSources, onOpenJob, showZh }: { field: ColKey; job: JobRow; jobs: JobRow[]; lang: Lang; isPro: boolean; loggedIn: boolean; pnpOcc: PnpOcc[]; pnpDraws: PnpDraw[]; news: NewsSlim[]; profileClb: number | null; eeOcc: EeOcc[]; desigEmp: DesigEmp[]; nocDesc: NocDesc[]; fieldSources: FieldSource[]; onOpenJob?: (j: JobRow) => void; showZh?: boolean }) {
  const t = makeT(lang)
  return (
    <>
      <FieldFactsInner field={field} job={job} jobs={jobs} lang={lang} isPro={isPro} loggedIn={loggedIn} pnpOcc={pnpOcc} pnpDraws={pnpDraws} news={news} profileClb={profileClb} eeOcc={eeOcc} desigEmp={desigEmp} nocDesc={nocDesc} onOpenJob={onOpenJob} showZh={showZh} />
      {/* #106 撤官方外链;2026-07-25 Frank「这些都是废话」:「来源: 本站算法」派生注也退役 */}
    </>
  )
}
// CompanyJobsList 退役(E8-11 B1):在招职位富行(NOC 对照+薪资+通道档)收编进 CompanyBody,弹框页面同款
function FieldFactsInner({ field, job, jobs, lang, isPro, loggedIn, pnpOcc, pnpDraws, news, profileClb, eeOcc, desigEmp, nocDesc, onOpenJob, showZh }: { field: ColKey; job: JobRow; jobs: JobRow[]; lang: Lang; isPro: boolean; loggedIn: boolean; pnpOcc: PnpOcc[]; pnpDraws: PnpDraw[]; news: NewsSlim[]; profileClb: number | null; eeOcc: EeOcc[]; desigEmp: DesigEmp[]; nocDesc: NocDesc[]; onOpenJob?: (j: JobRow) => void; showZh?: boolean }) {
  const t = makeT(lang)
  const noc = nocDesc.find((d) => d.noc === job.noc) || null
  if (field === 'pnp') return <PnpListSection job={job} lang={lang} occ={pnpOcc} draws={pnpDraws} news={news} profileClb={profileClb} nocDesc={nocDesc} showZh={showZh} />
  if (field === 'ee') return <EeCategorySection job={job} lang={lang} cats={eeOcc} draws={pnpDraws} nocDesc={nocDesc} showZh={showZh} />
  if (field === 'title') return <TitleFacts job={job} lang={lang} loggedIn={loggedIn} />
  const day = (s?: string) => (s || '').slice(0, 10)

  // field === 'company' 分支退役(2026-07-21):公司弹框走专用 CompanyPanel(平级卡),不再经本表

  if (field === 'aip') {
    // 批A #134:三态直判(空壳修)——未命中也要说,是结论不是空;来源注删(Frank「名单来源也不需要」)。
    // 命中清单放开跨省(原限本省;同雇主在其他大西洋省上榜=更强信号,一并列出)
    const v = aipVerdictOf(job)
    const cn = normName(job.company)
    const matches = job.aip && cn ? desigEmp.filter((e) => normName(e.name) === cn) : []
    // E6-09:省里逐条点名「这些职业的 AIP 背书不受理」——与雇主是否指定雇主是两件事,两条都要说
    const blocked = aipBlockOf(job, pnpOcc)
    return (
      <FactsBox>
        <Row k={t('fact.verdict')}>
          {blocked ? <VerdictPill tone="fail">{t(v === 'on' ? 'ch.aip.onBlocked' : 'ch.aip.blocked')}</VerdictPill>
            : <VerdictPill tone={v === 'on' ? 'ok' : 'na'}>{t('ch.aip.' + v)}</VerdictPill>}
        </Row>
        {blocked ? (
          <Row k={streamDisplay({ t, label: blocked.label })}>
            {t('fact.aipBlockedHit', { name: blocked.occupations.find((o) => o.noc === job.noc)?.name || job.noc, noc: job.noc })}
          </Row>
        ) : null}
        {matches.map((e, i) => (
          <Row key={i} k={e.name}>{[e.location, e.province, e.isTech ? t('fact.aipTech') : null].filter(Boolean).join('、')}</Row>
        ))}
      </FactsBox>
    )
  }

  if (field === 'pilot') {
    // E6-11:三态直判 —— 城市在 RCIP/FCIP 参与社区=命中(粗筛),否则「不在试点社区」。
    // 口径红线走 note:试点是社区推荐制且雇主须先被社区**指定**,命中≠可走;
    // 出处行由 DATASET_SRC_FIELDS + field_sources('pilot'→IRCC 官方名单页)自动挂
    const on = !!job.pilot
    return (
      <FactsBox note={t('fact.pilotGate')}>
        <Row k={t('fact.verdict')}>
          <VerdictPill tone={on ? 'ok' : 'na'}>{t(on ? 'ch.pilot.on' : 'ch.pilot.na')}</VerdictPill>
        </Row>
        {on ? <Row k={job.pilotCommunity || job.city}>{job.pilot}</Row> : null}
        {/* 批B:雇主已获社区指定(强一级信号)。只做正向展示 —— false 可能只是名单未公布,不写反话 */}
        {on && job.pilotEmployer ? <Row k={job.company}>{t('fact.pilotEmp')}</Row> : null}
        {/* 批C 尾巴:职业 × 社区在收清单。no 可写(RCIP 制度要求 offer 职业在清单内,官方清单为据);
            '' = 判不了(岗无 NOC/清单无 NOC),照红线不硬判 */}
        {on && job.pilotOcc ? (
          <Row k={`NOC ${job.noc}`}>{t(job.pilotOcc === 'yes' ? 'fact.pilotOccYes' : 'fact.pilotOccNo')}</Row>
        ) : null}
      </FactsBox>
    )
  }

  if (field === 'eligibility') {  // GAP1③:红旗 + JD 命中原句(可核验);「—」口径=未检出≠保证担保
    return (
      <FactsBox note={t('fact.eligNote')}>
        <Row k={t('fact.elig')}>{job.eligibilityFlag ? t('cell.elig.' + job.eligibilityFlag) : '—'}</Row>
        {job.eligibilityQuote ? <Row k={t('fact.eligQuote')}>“{job.eligibilityQuote}”</Row> : null}
      </FactsBox>
    )
  }

  if (field === 'lmia') {  // E6-02:公司级 LMIA 获批史(ESDC 近 8 季聚合)——纯事实,股别/季度语境必带
    // E8-04:把「历史记录」升级为「今天这条路通不通」——按本岗高/低薪 + 豁免行业判前瞻可行性(数据:lib/lmia)
    const wc = lmiaWageClass({ province: job.province, salaryAnnual: job.salaryAnnual })
    const exempt = isExemptSector(job.noc)
    const feasible = wc === 'high' ? { tone: '#15803d', txt: t('lmia.high') }        // 高薪类:不受冻结
      : wc === 'low' && exempt ? { tone: '#15803d', txt: t('lmia.exempt') }          // 低薪但豁免行业
      : wc === 'low' ? { tone: '#b45309', txt: t('lmia.lowFrozen') }                  // 低薪非豁免:大城市可能冻结
      : null                                                                          // 缺工资/门槛:不猜
    return (
      <FactsBox note={t('fact.lmiaNote')}>
        <Row k={t('col.lmia')}>{job.lmiaPositions ? t('cell.lmiaYes', { n: job.lmiaPositions, q: job.lmiaLastQuarter }) : '—'}</Row>
        <Row k={t('fact.lmiaStreams')}>{job.lmiaStreams || null}</Row>
        <Row k={t('col.company')}>{job.company}</Row>
        {feasible && (
          <Row k={t('lmia.route')}>
            {/* #106:LMIA 官方来源外链撤(归拢到 /resources) */}
            <span className="advBold" style={{ color: feasible.tone, fontWeight: 500 }}>{feasible.txt}</span>
          </Row>
        )}
      </FactsBox>
    )
  }

  if (LOC_FIELDS.has(field)) {
    // 点哪级只看哪级(含上级路径,07-06 用户拍板);地图链接按所看层级拼查询词(点省=省的地图,不带街址)
    const L = parseLoc(job)
    const depth = field === 'country' ? 1 : field === 'province' ? 2 : field === 'city' ? 3 : field === 'district' ? 4 : 5
    const mapQ = [depth >= 5 ? job.address : '', depth >= 4 ? L.district : '', depth >= 3 ? L.city : '', depth >= 2 ? L.prov : ''].filter(Boolean).join(', ')
    // 点「省」= 移民视角高价值内容(用户拍板:每字段要有料):该省具名通道数 + 最近抽选(数据已有,复用)
    const provStreams = field === 'province' && job.province && job.province !== 'QC'
      ? new Set(pnpOcc.filter((o) => o.province === job.province && o.type !== 'ineligible').map((o) => o.label)).size : 0
    return (
      // 缺地址/区时口径注明说(E8-04 诚实降级):留空=源帖没给,不猜;有值时无注(值即事实)
      <FactsBox note={field === 'address' && !job.address ? t('fact.noAddrNote')
        : field === 'district' && !L.district ? t('fact.noDistrictNote') : undefined}>
        {/* 省弹窗不再摆「国家 Canada」凑数行(2026-07-12 用户反馈「说明没看懂」——重复行是噪音);
            地图行给明确标签「地图 · 在 Google 地图查看」,不再用裸图标当行名+重复地名当链接文案 */}
        {field !== 'province' && <Row k={t('col.country')}>{L.country || 'Canada'}</Row>}
        {depth >= 2 && <Row k={t('col.province')}>{L.prov}</Row>}
        {depth >= 3 && <Row k={t('col.city')}>{L.city}</Row>}
        {depth >= 4 && <Row k={t('col.district')}>{L.district}</Row>}
        {depth >= 5 && <Row k={t('col.address')}>{job.address}</Row>}
        {mapQ ? <Row k={t('fact.map')}><a href={mapsUrl(mapQ)} target="_blank" rel="noreferrer" className="advMapLink link"><IconMap /> {t('fact.mapView')}({mapQ})↗</a></Row> : null}
        {field === 'province' && job.province === 'QC' && <Row k={t('col.pnp')}>{t('pnplist.qc')}</Row>}
        {provStreams > 0 && <Row k={t('col.pnp')}>{t('fact.provStreams', { n: provStreams })}</Row>}
        {field === 'province' && job.province && <PnpDrawsBlock province={job.province} lang={lang} draws={pnpDraws} limit={1} />}
      </FactsBox>
    )
  }
  if (SAL_FIELDS.has(field)) {
    // 批A #134 薪资整框三卡(Frank「就显示一个中位数,下面把 ESDC 的列表列出来」):
    // 帖面卡=原文+折算 / vs 中位卡=ESDC 中位一行+直判药丸 / ESDC 表卡=低中高一行一条(横杠串退役)
    const a = job.salaryAnnual, mHr = job.wageMedHourly, mYr = job.wageMedAnnual
    const lHr = job.wageLowHourly, hHr = job.wageHighHourly, lYr = job.wageLowAnnual, hYr = job.wageHighAnnual
    const vs = a != null && mYr ? Math.round((a / mYr - 1) * 100) : null
    const K = (n: number) => `$${Math.round(n / 1000)}K`
    if (field === 'salary') return (
      <FactsBox>
        <Row k={t('col.salary')}>{job.salaryText || job.salary}</Row>
        <Row k={<span title={t('fact.salYrNote')}>{t('col.salaryYr')}</span>}>{a != null ? `${K(a)}/yr` : null}</Row>
      </FactsBox>
    )
    if (field === 'vsMedian') return (
      <FactsBox note={mHr == null && mYr == null ? t('fact.noMedian') : undefined}>
        <Row k={t('sal.esdcMed')}>{mYr != null ? `${K(mYr)}/yr` : mHr != null ? `$${mHr}/hr` : null}</Row>
        <Row k={t('fact.verdict')}>{vs != null ? <VerdictPill tone={vs >= 0 ? 'ok' : 'warn'}>{t(vs >= 0 ? 'sal.above' : 'sal.below', { p: Math.abs(vs) })}</VerdictPill> : null}</Row>
      </FactsBox>
    )
    // ESDC 表卡(挂 wageMedHr 键):三档 × 时薪 + 折算年薪两列(Frank 2026-07-26「换算成年薪,同时显示,多一列」)。
    // 年薪由数据层折算(04d 时薪×2080,单一口径),前端只显示不换算;某档两个值都缺=该行不出(宁缺勿滥)。
    const bands: [string, number | null, number | null][] = [
      [t('sal.low'), lHr, lYr], [t('sal.med'), mHr, mYr], [t('sal.high'), hHr, hYr],
    ]
    // 首行是表头(整行走注格样式)—— 同一列在不同行里角色不同,所以角色类按格写不按列位派
    const cells: React.ReactNode[] = [
      <span key="h0" className="gridN" />, <span key="h1" className="gridN">{t('sal.hrCol')}</span>, <span key="h2" className="gridN">{t('col.salaryYr')}</span>,
    ]
    for (const [k, h, y] of bands) {
      if (h == null && y == null) continue
      cells.push(<span key={k + 'k'} className="gridK">{k}</span>,
        <span key={k + 'h'} className="gridV">{h != null ? `$${h}/hr` : '—'}</span>,
        <span key={k + 'y'} className="gridV">{y != null ? `${K(y)}/yr` : '—'}</span>)
    }
    return <FactsBox><Grid cols={3}>{cells}</Grid></FactsBox>
  }
  if (CLS_FIELDS.has(field)) {
    // 点哪级只看哪级(含上级路径,07-06 用户点名:大分类弹窗不该混进中/小分类):
    // broad=1 级 · mid=2 级 · fine=3 级;NOC 字段=全链 + 官方职责/任职要求(五位码职业级信息只在这)。
    const depth = field === 'broad' ? 1 : field === 'mid' ? 2 : field === 'fine' ? 3 : 0
    return (
      <FactsBox>
        {field === 'noc' ? <>
          <Row k={t('col.noc')}>{job.noc}</Row>
          {noc?.title ? <Row k={t('fact.nocTitle')}>{noc.title}</Row> : null}
        </> : null}
        {(field === 'noc' || field === 'teer') && <Row k={t('col.teer')}>{job.teer != null ? `TEER ${job.teer} (${t('teer.' + job.teer)})` : null}</Row>}
        {(field === 'noc' || depth >= 1) && <Row k={t('col.broad')}>{job.broad && job.broad !== '未分类' ? catName({ t, value: job.broad }) : null}</Row>}
        {(field === 'noc' || depth >= 2) && <Row k={t('col.mid')}>{job.mid && job.mid !== '未分类' ? catName({ t, value: job.mid }) : null}</Row>}
        {/* 官方层级里有 36 个中类只有一个小类(两级同名)——那时小类不再重复一遍,留空 */}
        {(field === 'noc' || depth >= 3) && <Row k={t('col.fine')}>{job.fine && job.fine !== '未分类' && job.fine !== job.mid ? catName({ t, value: job.fine }) : null}</Row>}
        {field === 'noc' && <NocDutiesView noc={noc} lang={lang} />}
      </FactsBox>
    )
  }
  if (SRC_FIELDS.has(field)) {
    // 来源/渠道/发布各看各的一行(07-06 用户拍板);口径注三者共用
    return (
      <FactsBox>
        {field === 'source' && <Row k={t('col.source')}>{job.sourceLabel || job.source}</Row>}
        {field === 'origin' && <Row k={t('col.origin')}>{(() => { const v = t('origin.' + job.origin); return v.startsWith('origin.') ? job.origin : v })()}</Row>}
        {field === 'direct' && <Row k={t('col.direct')}>{isDirect(job) ? t('fact.firstParty') : t('fact.repost')}</Row>}
      </FactsBox>
    )
  }
  if (field === 'accessibility') {
    // 未知时显式写「未知(帖内未写)」——acc.unknown 的列值是「—」会被 Row 隐藏,弹窗只剩孤零零一句口径注(文案审计)
    return <FactsBox note={t('fact.accNote')}><Row k={t('col.accessibility')}>{job.accessibility && job.accessibility !== 'unknown' ? t('acc.' + job.accessibility) : t('acc.none')}</Row></FactsBox>
  }
  if (TIME_FIELDS.has(field)) {
    // 时间四字段各看各的(07-06 用户拍板):状态/下架互为语境成对出现;发布带首次收录;抓取单独。
    // 「下架口径」注只跟状态/下架(发布、抓取时间与下架判定无关)。
    const isStatusish = field === 'status' || field === 'closedAt'
    return (
      <FactsBox>
        {isStatusish && <Row k={t('col.status')}>{t(job.status === 'closed' ? 'cell.closed' : 'cell.open')}</Row>}
        {field === 'datePosted' && <Row k={t('col.datePosted')}>{day(job.datePosted)}</Row>}
        {/* 挂帖时长(痛点盘点 P0 零抓取项):新鲜度信号,弹窗只在客户端开,无水合差异 */}
        {field === 'datePosted' && job.datePosted && (job.status || 'open') !== 'closed' && (() => {
          const d = Math.max(0, Math.floor((Date.now() - new Date(job.datePosted).getTime()) / 86400000))
          return <Row k={t('fact.daysUp')}>{t('fact.daysUpVal', { n: d })}</Row>
        })()}
        {field === 'datePosted' && <Row k={t('col.firstSeen')}>{day(job.firstSeen)}</Row>}
        {field === 'lastSeen' && <Row k={t('col.lastSeen')}>{day(job.lastSeen)}</Row>}
        {isStatusish && <Row k={t('col.closedAt')}>{job.closedAt ? day(job.closedAt) : null}</Row>}
      </FactsBox>
    )
  }
  return null  // title/company/noc-职责/aip/score 等依赖 Part B 抓取或 wiring,后续填
}

// ── AI 顾问弹框 ────────────────────────────────────────────────
// 所有字段都走本地大模型流式生成(按所选语言);前端只给极简头部 + 链接,正文由模型生成。
// Frank 走查#15(2026-07-25):AI 顾问(移民弹框【移民信号/分步走/怎么准备】长文)整体可逆下架——
// 「目前看着是废话,没什么实际价值;以后可能再用,看情况」。置 false=不渲卡+不发请求(省额度/朋友 qwen)+页眉不挂「AI 顾问」名;
// 翻回 true 即复活(/api/advisor、etl 底子未删)。
const AI_ADVISOR_ON = false
const ADV_PREF = 'adv_modal_pref'  // 记忆 {full, w, h}(位置每次打开居中,避免窗口缩小后跑出屏外)
const JD_PREF = 'jd_modal_pref'    // 职位描述弹框同款记忆(独立键:两框常用尺寸不同)

// ── 浮动面板机器(标题栏拖动/八向拉伸/全屏/尺寸记忆)——顾问弹框与职位描述弹框共用 ──
const PANEL_EDGES: { dir: string; cursor: string; style: React.CSSProperties }[] = [
  { dir: 'n', cursor: 'ns-resize', style: { top: 0, left: 14, right: 14, height: 6 } },
  { dir: 's', cursor: 'ns-resize', style: { bottom: 0, left: 14, right: 14, height: 6 } },
  { dir: 'w', cursor: 'ew-resize', style: { left: 0, top: 14, bottom: 14, width: 6 } },
  { dir: 'e', cursor: 'ew-resize', style: { right: 0, top: 14, bottom: 14, width: 6 } },
  { dir: 'nw', cursor: 'nwse-resize', style: { top: 0, left: 0, width: 14, height: 14 } },
  { dir: 'ne', cursor: 'nesw-resize', style: { top: 0, right: 0, width: 14, height: 14 } },
  { dir: 'sw', cursor: 'nesw-resize', style: { bottom: 0, left: 0, width: 14, height: 14 } },
  { dir: 'se', cursor: 'nwse-resize', style: { bottom: 0, right: 0, width: 14, height: 14 } },
]
// 窄屏(E8-03):强制全屏,禁拖拽/拉伸/全屏切换钮
function useFloatPanel(prefKey: string, defW: number, defH: number) {
  const narrow = useIsNarrow()
  const [fullPref, setFullPref] = useState(false)
  const full = fullPref || narrow
  const [size, setSize] = useState({ w: defW, h: defH })
  const [pos, setPos] = useState(() => {
    if (typeof window === 'undefined') return { x: 80, y: 60 }
    const w = Math.min(defW, window.innerWidth - 24), h = Math.min(defH, window.innerHeight - 24)
    return { x: Math.max(12, (window.innerWidth - w) / 2), y: Math.max(12, (window.innerHeight - h) / 2) }
  })
  const sizeRef = useRef(size); sizeRef.current = size
  useEffect(() => {  // 载入记忆的尺寸/全屏,并按记忆尺寸重新居中
    try {
      const p = JSON.parse(localStorage.getItem(prefKey) || '{}')
      if (p.full) setFullPref(true)
      if (p.w && p.h) {
        const w = Math.min(p.w, window.innerWidth - 24), h = Math.min(p.h, window.innerHeight - 24)
        setSize({ w: p.w, h: p.h })
        setPos({ x: Math.max(12, (window.innerWidth - w) / 2), y: Math.max(12, (window.innerHeight - h) / 2) })
      }
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const savePref = (next: Record<string, unknown>) => {
    try { localStorage.setItem(prefKey, JSON.stringify({ ...JSON.parse(localStorage.getItem(prefKey) || '{}'), ...next })) } catch { /* ignore */ }
  }
  // 拖动(标题栏)—— 原生 pointer 事件,无依赖
  const startDrag = (e: React.PointerEvent) => {
    if (full) return
    e.preventDefault()
    const ox = e.clientX - pos.x, oy = e.clientY - pos.y
    const move = (ev: PointerEvent) => setPos({ x: ev.clientX - ox, y: ev.clientY - oy })
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up)
  }
  // 八方向拉伸(用户点名:上下左右都可放大缩小);西/北向同时移动位置,右/下边固定
  const MIN_W = 360, MIN_H = 280
  const startResize = (e: React.PointerEvent, dir: string) => {
    if (full) return
    e.preventDefault(); e.stopPropagation()
    const sx = e.clientX, sy = e.clientY, sw = size.w, sh = size.h, spx = pos.x, spy = pos.y
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - sx, dy = ev.clientY - sy
      let w = sw, h = sh, x = spx, y = spy
      if (dir.includes('e')) w = sw + dx
      if (dir.includes('s')) h = sh + dy
      if (dir.includes('w')) { w = sw - dx; x = spx + dx }
      if (dir.includes('n')) { h = sh - dy; y = spy + dy }
      if (w < MIN_W) { if (dir.includes('w')) x = spx + sw - MIN_W; w = MIN_W }
      if (h < MIN_H) { if (dir.includes('n')) y = spy + sh - MIN_H; h = MIN_H }
      setSize({ w, h }); setPos({ x, y })
    }
    const up = () => { savePref({ w: sizeRef.current.w, h: sizeRef.current.h }); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up)
  }
  const toggleFull = () => setFullPref((f) => { savePref({ full: !f }); return !f })
  const panel: React.CSSProperties = full
    ? { position: 'fixed', inset: 0, borderRadius: 0 }
    : { position: 'fixed', left: pos.x, top: pos.y, width: size.w, height: size.h }
  return { narrow, full, toggleFull, panel, startDrag, startResize }
}

// 分类弹框主体(#176 分类=「这职业是干嘛的」;Frank 2026-07-21 三卡改版):
// 三张带 title 的卡 —— ① 职业分类(NOC/职业名/TEER/三级;点哪个字段该行高亮=「点哪个字段就显示哪个字段」
// 在「始终出完整三卡」下的落地)② 官方主要职责 ③ 任职要求。顶部两钮:
//  · 显示中文对照:职责/要求实时翻(/api/noc/translate 懒调朋友 qwen,进程缓存;数据层只存英文)。英文界面不出。
//  · AI 速读:点了才生成(复用 /api/advisor 免费额度 field=occRead,按 NOC 缓存)——不点不烧,#176 零成本默认不破。
function CategoryPanel({ job, lang, plan, nocDesc, srcField }: { job: JobRow; lang: Lang; plan: Plan; nocDesc: NocDesc[]; srcField: ColKey }) {
  const t = makeT(lang)
  const noc = nocDesc.find((d) => d.noc === job.noc) || null

  // 中文对照:首次点才调翻译;拿到后前端存一份,切换英/中零延迟
  const [showTrans, setShowTrans] = useState(false)
  const [trans, setTrans] = useState<{ duties: string; requirements: string } | null>(null)
  const [transStatus, setTransStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const toggleTrans = async () => {
    if (trans) { setShowTrans((v) => !v); return }
    track('cat-translate')   // #129
    setTransStatus('loading')
    try {
      const r = await fetch('/api/noc/translate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ noc: job.noc, lang }) })
      const d = await r.json().catch(() => null)
      if (d?.ok) { setTrans({ duties: d.duties || '', requirements: d.requirements || '' }); setShowTrans(true); setTransStatus('idle') }
      else setTransStatus('error')
    } catch { setTransStatus('error') }
  }

  // AI 速读:点了才生成,流式(复用顾问额度 = /api/advisor field=occRead,按 NOC 缓存)
  const [ai, setAi] = useState('')
  const [aiStatus, setAiStatus] = useState<'idle' | 'loading' | 'streaming' | 'done' | 'error' | 'upgrade' | 'limited'>('idle')
  // Frank 走查一致性#A:AI 速读改常驻折叠开关(与职位/公司/地点弹框一致,▾/▸ 点开点收都是它,内容留 state 不重烧)
  const [aiOn, setAiOn] = useState(false)
  const toggleAi = () => { if (aiStatus === 'idle') runAi(); setAiOn((v) => !v) }
  const runAi = async () => {
    setAiStatus('loading'); setAi('')
    try {
      const res = await fetch('/api/advisor', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        // 2026-08-23 契约换 id 制:职责/要求由服务端按 NOC 现查(loadNocDuties),不再整包上传
        body: JSON.stringify({ field: 'occRead', id: job.noc, lang }),
      })
      if (res.status === 402) { setAiStatus('upgrade'); return }
      if (res.status === 429) { setAiStatus('limited'); return }
      if (!res.ok || !res.body) { setAiStatus('error'); return }
      const reader = res.body.getReader(); const dec = new TextDecoder()
      setAiStatus('streaming')
      for (;;) { const { done, value } = await reader.read(); if (done) break; setAi((p) => p + dec.decode(value, { stream: true })) }
      setAiStatus('done')
    } catch { setAiStatus('error') }
  }

  // 身份卡各行(点击字段=该行高亮);NOC 与职业名同属 'noc' 字段,点 NOC 两行齐亮
  const rows: { f: ColKey; k: string; v: React.ReactNode }[] = [
    { f: 'noc', k: t('col.noc'), v: job.noc || null },
    { f: 'noc', k: t('fact.nocTitle'), v: noc?.title || null },
    { f: 'teer', k: t('col.teer'), v: job.teer != null ? `TEER ${job.teer} (${t('teer.' + job.teer)})` : null },
    { f: 'broad', k: t('col.broad'), v: job.broad && job.broad !== '未分类' ? t('broad.' + job.broad) : null },
    { f: 'mid', k: t('col.mid'), v: job.mid && job.mid !== '未分类' ? catName({ t, value: job.mid }) : null },
    { f: 'fine', k: t('col.fine'), v: job.fine && job.fine !== '未分类' && job.fine !== job.mid ? catName({ t, value: job.fine }) : null },
  ]

  // 逐行 duties/requirements;中文对照开 → **逐句对照**:英文行下跟译文行(noc-translate 按行编号对位,行数恒等)
  const listBlock = (title: string, en?: string, zh?: string) => {
    const items = (en || '').split('\n').map((s) => s.trim()).filter(Boolean)
    if (!items.length) return null
    const zhItems = showTrans && zh ? zh.split('\n').map((s) => s.trim()).filter(Boolean) : []
    return (
      <div className="cardMd">
        {/* #191 对齐:抓取日期全角括号退役 → 空格灰注(与公司简介检索日期同款) */}
        <div className="mcardHead">{title}{noc?.fetched ? <span className="advFetched">{noc.fetched}</span> : null}</div>
        <ul className="advDuties">
          {items.map((d, i) => (
            <li key={i}>
              {d}
              {/* 同文=该行没翻到(#181 部分容错保留英文)→ 不重复渲 */}
              {zhItems[i] && zhItems[i] !== d ? <div className="advZh">{zhItems[i]}</div> : null}
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <>
      {/* 两钮:中文对照(英文界面无需=不出)+ AI 速读(点前只是一枚钮,不烧额度) */}
      <div className="advActsRow">
        {lang !== 'en' && (
          <button onClick={toggleTrans} disabled={transStatus === 'loading'} className={transStatus === 'loading' ? 'pill advPillBusy' : 'pill'}>
            {transStatus === 'loading' ? t('cat.translating') : transStatus === 'error' ? t('cat.transErr') : showTrans ? t('cat.hideZh') : t('cat.showZh')}
          </button>
        )}
        <button onClick={toggleAi} className="pill" style={{ ...(aiOn ? { background: '#eff6ff', borderColor: '#bfdbfe', color: '#1d4ed8' } : {}) }}><IconCompass /> {t('cat.aiRead')} {aiOn ? '▾' : '▸'}</button>
      </div>

      {/* AI 速读卡(点了才出;置顶=点完不用往下翻;#A:常驻开关收起时隐藏不清 state) */}
      {aiOn && aiStatus !== 'idle' && (
        <div className="cardMd">
          <div className="mcardHead"><IconCompass /> {t('cat.aiRead')}</div>
          {aiStatus === 'upgrade' ? <LockedText t={t} loggedIn={plan.loggedIn} />
            : aiStatus === 'limited' ? <LockedText t={t} loggedIn={plan.loggedIn} msg={t('advisor.limit429')} ctaLabel={!plan.loggedIn ? t('advisor.limitCta') : undefined} />
            : aiStatus === 'error' ? <p className="advNote sm">{t('cat.aiErr')}</p>
            : aiStatus === 'loading' ? <p className="advNote">{t('advisor.loading')}</p>
            : <div className="advAi">{renderAI(ai.split('❓')[0])}{aiStatus === 'streaming' && <span className="advCaret">▋</span>}</div>}
        </div>
      )}

      {/* 卡①:职业分类(点击字段该行高亮) */}
      <div className="cardMd">
        <div className="mcardHead">{t('grp.category')}</div>
        {rows.filter((r) => r.v != null).map((r, i) => {
          const on = r.f === srcField
          return (
            <div key={i} className={on ? 'advKv hl on' : 'advKv hl'}>
              <span className="advKvK w88">{r.k}</span>
              <span className="advKvV brk">{r.v}</span>
            </div>
          )
        })}
        {/* #198(Frank「这部分删掉」):NOC/TEER 解释注撤(枚举值已人话化,不必每次复述定义) */}
      </div>

      {/* 卡②③:官方主要职责 / 任职要求 */}
      {listBlock(t('fact.nocDuties'), noc?.duties, trans?.duties)}
      {listBlock(t('fact.nocReqs'), noc?.requirements, trans?.requirements)}
    </>
  )
}

const DIFF_TAG: Record<string, { bg: string; fg: string; bd: string }> = {
  easy: { bg: '#dcfce7', fg: '#166534', bd: '#bbf7d0' }, mid: { bg: '#fef3c7', fg: '#b45309', bd: '#fde68a' }, tight: { bg: '#eef2ff', fg: '#3730a3', bd: '#e0e7ff' },
}

function LocationPanel({ job, lang, plan, srcField, pnpDraws, news, desigEmp = [] }: { job: JobRow; lang: Lang; plan: Plan; srcField: ColKey; pnpDraws: PnpDraw[]; news: NewsSlim[]; desigEmp?: DesigEmp[] }) {
  const t = makeT(lang)
  const L = parseLoc(job)
  // 入口语义=内容(Frank「点省看省,点市看市」+「点区看区」):省格=省卡组,市格=市卡组,区格=区卡组
  // (区列点开但该岗无区值 → 退回市级,不出空面板)
  const level: 'province' | 'city' | 'district' = srcField === 'province' ? 'province' : (srcField === 'district' && L.district) ? 'district' : 'city'
  const [prov, setProv] = useState<{ info: ProvInfo | null; difficulty: { tier?: string; factors?: any[] } | null } | null>(null)
  useEffect(() => {
    if (level !== 'province' || !job.province) { setProv(null); return }
    let dead = false
    fetch('/api/jobs/province?code=' + encodeURIComponent(job.province))
      .then((r) => (r.ok ? r.json() : null)).then((d) => { if (!dead && d?.ok) setProv({ info: d.info, difficulty: d.difficulty }) }).catch(() => {})
    return () => { dead = true }
  }, [level, job.province])
  type AreaStats = { openJobs: number; new7d: number; medSalary: number | null; topBroads: { broad: string; n: number }[] }
  type CityInfo = AreaStats & { dli: { count: number; top: { name: string; isPublic: boolean }[] }; aipEmployers: number; district: (AreaStats & { topEmployers: { name: string; slug: string; n: number }[] }) | null }
  const [cityInfo, setCityInfo] = useState<CityInfo | null>(null)
  useEffect(() => {
    if (level === 'province' || !L.city || !job.province) { setCityInfo(null); return }
    let dead = false
    const q = new URLSearchParams({ city: L.city, prov: job.province })
    if (level === 'district' && L.district) q.set('district', L.district)
    fetch('/api/jobs/city?' + q.toString())
      .then((r) => (r.ok ? r.json() : null)).then((d) => { if (!dead && d?.ok) setCityInfo(d) }).catch(() => {})
    return () => { dead = true }
  }, [level, L.city, L.district, job.province])

  const isQc = job.province === 'QC'
  const num = (n: number) => Number(n).toLocaleString()

  // AI 解读(Frank 2026-07-23「AI 解读呢?」):分类弹框 AI 速读同款——点了才生成、流式、统一额度池;
  // 事实块=面板同源数字(provRead 按省缓存 / cityRead 按市|区缓存),模型被禁越出事实(advisor 路由 GROUNDING_RULES)。
  const [ai, setAi] = useState('')
  const [aiStatus, setAiStatus] = useState<'idle' | 'loading' | 'streaming' | 'done' | 'error' | 'upgrade' | 'limited'>('idle')
  // aiFacts()(客户端拼地点事实块)2026-08-23 随契约换 id 制退役 —— 同一文案在
  // lib/advisor 的 provFactsOf/cityFactsOf 逐字保形,服务端用面板同一取数函数重建。
  const runAi = async () => {
    setAiStatus('loading'); setAi('')
    try {
      const aiField = level === 'province' ? 'provRead' : 'cityRead'
      const id = level === 'province' ? (job.province || '') : [L.city, job.province, level === 'district' ? L.district : ''].join('|')
      const res = await fetch('/api/advisor', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        // 2026-08-23 契约换 id 制:地点事实块由服务端用面板同一取数函数重建(provFactsOf/cityFactsOf)
        body: JSON.stringify({ field: aiField, id, lang }),
      })
      if (res.status === 402) { setAiStatus('upgrade'); return }
      if (res.status === 429) { setAiStatus('limited'); return }
      if (!res.ok || !res.body) { setAiStatus('error'); return }
      const reader = res.body.getReader(); const dec = new TextDecoder()
      setAiStatus('streaming')
      for (;;) { const { done, value } = await reader.read(); if (done) break; setAi((p) => p + dec.decode(value, { stream: true })) }
      setAiStatus('done')
    } catch { setAiStatus('error') }
  }
  const factsReady = level === 'province' ? !!prov : !!cityInfo
  // #183 同款(Frank「点完按钮怎么没了」):AI 速读=常驻折叠开关,点开点收都是它;内容留在 state,收起再开不重烧
  const [aiOn, setAiOn] = useState(false)
  const toggleAi = () => { if (aiStatus === 'idle') runAi(); if (!aiOn) track('ai-read-co'); setAiOn((v) => !v) }
  // Frank 走查#2:中文对照按钮统一上所有弹框(地点内容现已本地化,此为「以后加英文」的前置占位——切换态在,待英文正文接入即生效)
  const [showZh, setShowZh] = useState(false)

  // 卡① 地点:与分类卡①同款行(点进来的字段行高亮);有值行值文字=地图链接(与表格格同一规则)
  const locRows: { f: ColKey; k: string; v: string; map: boolean }[] = [
    { f: 'country', k: t('col.country'), v: L.country, map: false },
    { f: 'province', k: t('col.province'), v: L.prov, map: true },
    { f: 'city', k: t('col.city'), v: L.city, map: true },
    { f: 'district', k: t('col.district'), v: L.district, map: true },
    { f: 'address', k: t('col.address'), v: job.address || '', map: true },
  ]

  // 卡② 移民难度(/stats DifficultyCard 同源渲染,复用 diff.* 文案)
  const d = prov?.difficulty
  const fac = (k: string) => (d?.factors || []).find((x: any) => x.key === k)
  const comp = fac('comp'), trend = fac('quotaTrend'), act = fac('activity'), score = fac('scoreLevel')
  const pctS = (v: number) => `${v > 0 ? '+' : ''}${Math.round(v * 100)}%`
  // Frank 走查#5:竞争比等难度行改两列 grid(值 | 口径),跨行对齐、不再 flex 换行
  const drow: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'max-content 1fr', alignItems: 'baseline', columnGap: 10, fontSize: 13, color: '#374151', marginTop: 6 }

  // 卡③ 体量行(人话名主文案 + 代码灰注:Frank「TFWP/IMP 用户都不知道是什么」)
  const info = prov?.info
  // Frank 走查#6:体量卡改三列对齐(标签 | 数值 | 年份注)——数值单列右对齐,故拆出 note 独立字段
  const volRows: { k: React.ReactNode; v: React.ReactNode; note: React.ReactNode }[] = []
  if (info?.study) volRows.push({ k: t('loc.study'), v: num(info.study.n), note: t('loc.asOf', { y: info.study.year }) })
  if (info?.tfwp) volRows.push({ k: <>{t('loc.tfwp')} <span className="advGnote s">TFWP</span></>, v: num(info.tfwp.n), note: t('loc.asOf', { y: info.tfwp.year }) })
  if (info?.imp) volRows.push({ k: <>{t('loc.imp')} <span className="advGnote s">{t('loc.impNote')}</span></>, v: num(info.imp.n), note: t('loc.asOf', { y: info.imp.year }) })
  if (!isQc && info?.alloc && (info.alloc.y2026 != null || info.alloc.y2025 != null)) {
    const a = info.alloc
    volRows.push({ k: t('loc.alloc'),
      v: a.y2026 != null ? num(a.y2026) : num(a.y2025 as number),
      note: a.y2026 != null ? (a.y2025 != null ? t('loc.allocBoth', { b: num(a.y2025) }) : t('loc.allocY26')) : t('loc.allocY25') })
  }
  if (!isQc && info?.pnpPr) volRows.push({ k: t('loc.pnpPr'), v: num(info.pnpPr.n), note: t('loc.prNote', { y: info.pnpPr.year }) })

  // 竖排单列(Frank 2026-07-23「别横着排列,其他的弹框都是竖着排列的」——两列版当天推翻,与全弹框族一致)
  return (
    <>
      {/* 顶部钮行(Frank 走查#2「只要弹框就直接显示这三个按钮」):三钮统一——
          中文对照(地点内容现本地化,为「以后加英文」占位)/ AI 速读 / 打开完整页(=该省地区统计页,地点弹框有专属 SEO 页) */}
      {job.province && (
        <div className="advActs2">
          {lang !== 'en' && <button onClick={() => setShowZh((v) => !v)} className="pill" style={{ ...(showZh ? { background: '#eff6ff', borderColor: '#bfdbfe', color: '#1d4ed8' } : {}) }}>{showZh ? t('cat.hideZh') : t('cat.showZh')}</button>}
          {factsReady && <button onClick={toggleAi} className="pill" style={{ ...(aiOn ? { background: '#eff6ff', borderColor: '#bfdbfe', color: '#1d4ed8' } : {}) }}><IconCompass /> {t('cat.aiRead')} {aiOn ? '▾' : '▸'}</button>}
          <a href={`/stats/${job.province.toLowerCase()}`} target="_blank" rel="noreferrer" className="advPillLink pill">{t('detail.openFull')} ↗</a>
        </div>
      )}

      {/* AI 解读卡(点了才出;置顶=点完不用往下翻;开关收起时隐藏不清 state) */}
      {aiOn && aiStatus !== 'idle' && (
        <div className="cardMd">
          <div className="mcardHead"><IconCompass /> {t('cat.aiRead')}</div>
          {aiStatus === 'upgrade' ? <LockedText t={t} loggedIn={plan.loggedIn} />
            : aiStatus === 'limited' ? <LockedText t={t} loggedIn={plan.loggedIn} msg={t('advisor.limit429')} ctaLabel={!plan.loggedIn ? t('advisor.limitCta') : undefined} />
            : aiStatus === 'error' ? <p className="advNote sm">{t('cat.aiErr')}</p>
            : aiStatus === 'loading' ? <p className="advNote">{t('advisor.loading')}</p>
            : <div className="advAi">{renderAI(ai.split('❓')[0])}{aiStatus === 'streaming' && <span className="advCaret">▋</span>}</div>}
        </div>
      )}
      <div className="cardMd">
        <div className="mcardHead">{t('grp.location')}</div>
        {locRows.filter((r) => r.v).map((r, i) => {
          const on = r.f === srcField
          return (
            <div key={i} className={on ? 'advKv hl on' : 'advKv hl'}>
              <span className="advKvK w64">{r.k}</span>
              <span className="advKvV brk">
                {r.map ? <a href={mapsUrl(mapQuery({ field: r.f, job: job }))} target="_blank" rel="noreferrer" className="advLink">{r.v}</a> : r.v}
              </span>
            </div>
          )
        })}
      </div>

      {/* ── 省级卡组(仅点省进来;Frank「点省看省,点市看市」)────────── */}
      {level === 'province' && d?.tier && (
        <div className="cardMd">
          <div className="mcardHead advCardHeadRow">
            {t('diff.title')}
            <span className="advDiff" style={{ '--dbg': DIFF_TAG[d.tier]?.bg, '--dfg': DIFF_TAG[d.tier]?.fg, '--dbd': DIFF_TAG[d.tier]?.bd } as React.CSSProperties}>{t('diff.' + d.tier)}</span>
          </div>
          {/* Frank 2026-07-26 走查:三列(标签 | 值 | 注)跨行对齐,每列左对齐 —— 原来一行一整句,读不快也对不齐 */}
          <Grid cols={3}>
            {[
              comp && [t('diff.k.comp'), t('diff.v.comp', { v: comp.value }), t('diff.compNote', { pool: num(comp.pool), quota: num(comp.quota), y: comp.quotaYear, py: comp.asOf ?? '' })],
              trend && [t('diff.k.trend'), pctS(trend.value), ''],
              // 改制省(ON)近 180 天的抽选全在改制之前 —— 不加注就与下方「旧 8 条流已关闭」自相矛盾。
              // 判定走同一份 pnpDraws:改制日之后一条都没有才加注,新 EOI 一开抽注自动消失。
              act && [t('diff.k.act'), t('diff.v.act', { n: act.value }),
                t(STREAM_REFORM[job.province || ''] && !pnpDraws.some((x) => x.province === job.province && x.kind !== 'notice' && x.drawDate >= STREAM_REFORM[job.province || ''].since)
                  ? 'diff.n.actOld' : 'diff.n.act', { m: num(act.invitations || 0) })],
              score && [t('diff.k.score'), t('diff.v.score', { s: score.latestScore }), t('diff.n.score', { p: score.value, sc: score.scale || '—' })],
            ].filter(Boolean).flatMap((r, i) => {
              const [k, v, n] = r as string[]
              return [<span key={i + 'k'} className="gridK">{k}</span>, <span key={i + 'v'} className="gridV advBold">{v}</span>, <span key={i + 'n'} className="gridN">{n}</span>]
            })}
          </Grid>
          {/* Frank 走查#3:「口径:竞争基数=…」整句删(粗口径已在数字旁,长解释=废话) */}
        </div>
      )}

      {level === 'province' && volRows.length > 0 && (
        <div className="cardMd">
          <div className="mcardHead">{t('loc.vol')} <span className="advGnote m">{t('loc.volTag')}</span></div>
          <div className="advVol">
            {/* Frank 2026-07-26「每列都保证左对齐」:数值列原为右对齐,与其他卡不一致 */}
            {volRows.flatMap((r, i) => [
              <span key={i + 'k'} className="advMuted">{r.k}</span>,
              <span key={i + 'v'} className="gridV advBold">{r.v}</span>,
              <span key={i + 'n'} className="advGnote">{r.note}</span>,
            ])}
          </div>
          {/* Frank 走查#4:非 QC 的「来源:IRCC 开放数据…」删(footer 已统一声明);QC 独立体系说明是实义,保留 */}
          {isQc && <div className="advQc">{t('loc.qc')}</div>}
        </div>
      )}

      {/* ④⑤ 复用既有块;块自身无数据返回 null → 外层卡也不渲(不出空壳) */}
      {level === 'province' && job.province && !isQc && pnpDraws.some((x) => x.province === job.province) && (
        <div className="cardMd"><PnpDrawsBlock province={job.province} lang={lang} draws={pnpDraws} limit={3} /></div>
      )}
      {level === 'province' && job.province && news.some((n) => n.region === job.province) && (
        <div className="cardMd"><NewsLatestBlock province={job.province} lang={lang} news={news} /></div>
      )}

      {/* ── 市级卡组(点市/区进来;/api/jobs/city 现算,本站口径)────────── */}
      {level === 'city' && cityInfo && (
        <div className="cardMd">
          <div className="mcardHead">{t('loc.cityJobs')} <span className="advGnote m">{L.city}</span></div>
          {([
            [t('loc.openJobs'), num(cityInfo.openJobs)],
            [t('loc.new7d'), num(cityInfo.new7d)],
            ...(cityInfo.medSalary != null ? [[t('loc.medSal'), `$${Math.round(cityInfo.medSalary / 1000)}K/yr`]] : []),
            ...(cityInfo.topBroads.length ? [[t('loc.topBroads'), cityInfo.topBroads.map((b) => `${t('broad.' + b.broad)} ${num(b.n)}`).join('、')]] : []),
          ] as [string, string][]).map(([k, v], i) => (
            <div key={i} className="advKv">
              <span className="advKvK w128">{k}</span>
              <span className="advKvV">{v}</span>
            </div>
          ))}
        </div>
      )}
      {level === 'city' && cityInfo && cityInfo.dli.count > 0 && (
        <div className="cardMd">
          <div className="mcardHead">{t('loc.dli')} <span className="advGnote m">{t('loc.dliN', { n: cityInfo.dli.count })}</span></div>
          {cityInfo.dli.top.map((s, i) => (
            <div key={i} className="advKv tight">
              <span className="advKvV advListName">{s.name}</span>
              {s.isPublic && <span className="advGnote">{t('loc.dliPublic')}</span>}
            </div>
          ))}
        </div>
      )}
      {/* Frank 走查#7:AIP 卡直接内联列出指定雇主名单(不再「雇主名录 →」点过去);
          客户端筛已加载的 desigEmp,口径对齐后端(province + location ILIKE '%city%') */}
      {level === 'city' && (() => {
        const aipList = desigEmp.filter((e) => e.province === job.province && (e.location || '').toLowerCase().includes((job.city || '').toLowerCase()))
        if (!aipList.length) return null
        return (
          <div className="cardMd">
            <div className="mcardHead">{t('loc.aip')} <span className="advGnote m">{t('loc.aipN', { n: aipList.length })}</span></div>
            <div className="advList">
              {aipList.map((e, i) => (
                <div key={i} className="advListRow">
                  <span className="advListName">{e.name}</span>
                  {e.isTech && <span className="advListTag">{t('fact.aipTech')}</span>}
                </div>
              ))}
            </div>
          </div>
        )
      })()}

      {/* ── 区级卡组(点区进来;Frank「点区看区的信息」)────────── */}
      {level === 'district' && cityInfo?.district && (
        <div className="cardMd">
          <div className="mcardHead">{t('loc.distJobs')} <span className="advGnote m">{L.district}</span></div>
          {([
            [t('loc.openJobs'), num(cityInfo.district.openJobs)],
            [t('loc.new7d'), num(cityInfo.district.new7d)],
            ...(cityInfo.district.medSalary != null ? [[t('loc.medSal'), `$${Math.round(cityInfo.district.medSalary / 1000)}K/yr`]] : []),
            ...(cityInfo.district.topBroads.length ? [[t('loc.topBroads'), cityInfo.district.topBroads.map((b) => `${t('broad.' + b.broad)} ${num(b.n)}`).join('、')]] : []),
          ] as [string, string][]).map(([k, v], i) => (
            <div key={i} className="advKv">
              <span className="advKvK w128">{k}</span>
              <span className="advKvV">{v}</span>
            </div>
          ))}
        </div>
      )}
      {level === 'district' && cityInfo?.district && cityInfo.district.topEmployers.length > 0 && (
        <div className="cardMd">
          <div className="mcardHead">{t('loc.distEmployers')}</div>
          {cityInfo.district.topEmployers.map((e, i) => (
            <div key={i} className="advKv tight">
              {e.slug
                ? <a href={`/companies/${e.slug}`} className="advLink advListName">{e.name}</a>
                : <span className="advKvV advListName">{e.name}</span>}
              <span className="advGnote">{t('loc.nJobs', { n: num(e.n) })}</span>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

// E8-10:入参从 24 值的 field 改为 3 值的 group;field 保留仅用于「打开时锚到哪一节」,不再参与内容分支。
export function AdvisorModal({ group, field, job, title, lang, plan, pnpOcc, pnpDraws, news, eeOcc, desigEmp, nocDesc, fieldSources, onClose, onOpenJob }: { group: FieldGroup; field: ColKey; job: JobRow; title?: string; lang: Lang; plan: Plan; pnpOcc: PnpOcc[]; pnpDraws: PnpDraw[]; news: NewsSlim[]; eeOcc: EeOcc[]; desigEmp: DesigEmp[]; nocDesc: NocDesc[]; fieldSources: FieldSource[]; onClose: () => void; onOpenJob?: (j: JobRow) => void }) {
  const t = makeT(lang)
  const overlayClose = useOverlayClose(onClose)
  const a = advHeader(field, job, t)
  const [text, setText] = useState('')
  const [status, setStatus] = useState<'loading' | 'streaming' | 'done' | 'error' | 'upgrade' | 'limited'>('loading')
  // 2026-07-25 Frank「和上面的中文翻译按钮联动」:移民弹框清单译名开关(zh/ko 默认开,en 不出钮)
  // Frank 走查:中文对照默认关,点了才显/才翻(原 lang!=='en' 默认开 → 中文界面一打开就是对照态,推翻)
  const [showZh, setShowZh] = useState(false)
  // #129 功能级埋点:四类弹框打开各记一事件(modal-immigration/company/category/location),field=入口格
  useEffect(() => { track('modal-' + group, { field: String(field) }) }, [])  // eslint-disable-line react-hooks/exhaustive-deps
  // 同公司在榜岗(E10-01 P3:blob 没了 → 打开公司弹窗时按公司名从 /api/jobs 拉,不再靠父级全量列表)
  const [companyJobs, setCompanyJobs] = useState<JobRow[]>([])
  useEffect(() => {
    if (group !== 'company' || !job.company) { setCompanyJobs([]); return }
    let dead = false
    fetch('/api/jobs?company=' + encodeURIComponent(job.company) + '&page=0', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null)).then((d) => { if (!dead && d) setCompanyJobs(d.rows || []) }).catch(() => {})
    return () => { dead = true }
  }, [group, job.company])

  // 打字机(用户拍板:AI 内容必须流式感,不许整段蹦出来):网络块先进 pending,固定节奏吐字。
  // 覆盖三种「整段到达」场景:公司初判 web_fetch 工具阶段后快速吐完、服务端缓存命中、代理缓冲。
  // 吐字速率与积压成正比(每帧 1/12),整段大文本几秒内追平,不会无限拖尾。
  const pendingRef = useRef('')
  const doneRef = useRef(false)
  const textRef = useRef('')          // 已吐正文镜像(完成时和 pending 拼回完整回复摘建议)
  const [sug, setSug] = useState('')  // #36:初判结尾建议问题 → 传给对话框做首个 chip
  useEffect(() => {
    const id = setInterval(() => {
      // ❓ 标记后的内容截住不吐(建议行不进正文);完成时对完整回复统一摘取(含无标记兜底)
      const cut = pendingRef.current.indexOf(SUG_MARK)
      const avail = cut >= 0 ? pendingRef.current.slice(0, cut) : pendingRef.current
      if (avail) {
        const n = Math.max(2, Math.ceil(avail.length / 12))
        const chunk = avail.slice(0, n)
        pendingRef.current = pendingRef.current.slice(n)
        textRef.current += chunk
        setText((prev) => prev + chunk)
      } else if (doneRef.current) {
        doneRef.current = false
        const full = textRef.current + pendingRef.current
        pendingRef.current = ''
        const { body, sug: q } = extractSug(full, job.company, lang)
        textRef.current = body
        setText(body)
        if (q) setSug(q)
        setStatus('done')
      }
    }, 33)
    return () => clearInterval(id)
  }, [])

  // 弹框尺寸/全屏/位置 —— 默认更大(900×760,2026-07-10 用户反馈「弹框不够大,内容显示不全」再加档);
  // 拖动/拉伸/全屏/记忆 = 共用浮动面板机器(useFloatPanel,与职位描述弹框同款)
  const { narrow, full, toggleFull, panel, startDrag, startResize } = useFloatPanel(ADV_PREF, 900, 760)

  // 试用额度可见化(第 5 轮 #16):服务端 X-Free-Left 头,免费用户看得见剩几次,402 不再是惊吓
  const [freeLeft, setFreeLeft] = useState<number | null>(null)
  const [tick, setTick] = useState(0)   // 2026-07-25 用户:解析失败要能重试——tick+1 重跑初判
  useEffect(() => {
    const ctrl = new AbortController()
    // AI 段只归移民弹框(分步方案)。公司弹框撤 AI 段=#167⑨(CompanyAiSection 结构化卡是唯一 AI 内容);
    // 分类弹框纯官方事实,零生成零额度(#176)。不发请求 = 不烧额度、不占朋友那台 qwen、不让用户干等。
    if (group !== 'immigration' || !AI_ADVISOR_ON) { setStatus('done'); setText(''); return }   // 走查#15:AI 顾问关时不发请求
    setText(''); setStatus('loading'); setSug(''); pendingRef.current = ''; textRef.current = ''; doneRef.current = false
    ;(async () => {
      try {
        const res = await fetch('/api/advisor', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ctrl.signal,
          body: JSON.stringify({ field: group, id: String(job.id), lang }),   // E8-10:后端按分组取提示词;2026-08-23 起事实服务端现查,job 包不再上传
        })
        const left = res.headers.get('X-Free-Left')
        if (left != null) setFreeLeft(Number(left))
        if (res.status === 402) { setStatus('upgrade'); return }  // 免费试用用完(E3-05)→ 升级卡
        if (res.status === 429) { setStatus('limited'); return }  // 匿名 IP 限/日上限:说人话+给出路,不甩状态码(第 9 轮 #25)
        if (!res.ok || !res.body) { setStatus('error'); setText(t('advisor.unavail')); return }
        const reader = res.body.getReader(); const dec = new TextDecoder()
        setStatus('streaming')
        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          pendingRef.current += dec.decode(value, { stream: true })  // 进打字机队列,不直接上屏
        }
        doneRef.current = true  // 吐完 pending 后打字机自己切 done
      } catch {
        if (!ctrl.signal.aborted) { pendingRef.current = ''; setStatus('error'); setText(t('advisor.offline')) }
      }
    })()
    return () => ctrl.abort()
  }, [group, job, lang, tick])

  const iconBtn = iconBtnS

  return (
    <div {...overlayClose} className="advScrim" style={SCRIM}>
      <div onClick={(e) => e.stopPropagation()} className="advPanel" style={{ ...CARD, ...panel }}>
        {/* 标题栏 = 拖动手柄 */}
        <div onPointerDown={startDrag} className={full ? 'advHead full' : 'advHead'}>
          <div className="advHeadL">
            {/* 标题后不挂「思考中」后缀(Frank 2026-07-18);流式等待态由正文区「努力思考中」占位承担 */}
            {/* E8-10 S6:页眉改「分组名」、大标题改**岗位/公司名** —— 收编前取的是被点单元格的值,
                于是点「通道」列开出来的弹框标题写着「技能岗」:一个胶囊的值当不了一屏内容的标题。
                现在:公司弹框=公司名、职位与移民弹框=岗位名,与弹框里铺开的整组事实对得上。 */}
            {/* #174:「AI 顾问 · 移民 · 免费今日剩 N 次」两个「·」退役——分组名与次数改空格灰注
                (#171 详情页同款手法);靛色随 #108 杂色归一改灰 */}
            {/* 页眉三弹框统一(Frank 2026-07-21「这三个也要保持一致」):灰色小标+纯名称,与职位弹框
                「职位描述」同款。「AI 顾问」标只留移民弹框(唯一真在流式生成顾问内容的;#176 分类零 AI,
                公司弹框的 AI 段 #167⑨ 已撤、只剩检索卡,挂「AI 顾问」名不副实)。 */}
            {/* #189 公司组额度注已随 E8-11 B1 退役:公司数据走 /api/jobs/company 免额度(与页面同口径),没烧池无可显 */}
            <div className="advKicker">{group !== 'immigration' || !AI_ADVISOR_ON
              ? t('grp.' + group)
              : <><IconCompass /> {t('advisor.tag')}<span className="advKickerSub">{t('grp.' + group)}</span>{freeLeft != null ? <span className="advKickerSub">{t('advisor.left', { n: freeLeft })}</span> : null}</>}
              {/* #185:公司弹框「打开完整页」移入正文顶部钮行(与职位弹框同款),页眉不再重复 */}</div>
            <h3 className="advTitle">{group === 'company' ? (job.company || title || a.title) : (job.title || title || a.title)}</h3>
            {/* 公司名下的中文行业行删除(Frank 2026-07-24「公司名下面的中文还是删掉」;了解公司改靠知名/政府章) */}
            {/* Frank 2026-07-26「所有弹框的 job 名称下面都应该有中文翻译,像点击 job 弹框一样」:
                岗位名弹框补 NOC 界面语译名(与职位弹框 ActModal 同一函数、同一「与英文标题相同则不重复」规则);
                公司弹框不加(公司名没有译名,上面那条 2026-07-24 的决定不动)。 */}
            {group !== 'company' && (() => {
              const zh = nocLocalTitle({ row: nocDesc.find((d) => d.noc === job.noc) || null, lang })
              return zh && zh.toLowerCase() !== (job.title || '').toLowerCase()
                ? <div className="advSub">{zh}</div>
                : null
            })()}
          </div>
          <div className="advWinActs">
            {!narrow && <button onClick={toggleFull} title={t(full ? 'advisor.exitFull' : 'advisor.full')} style={iconBtn}>{full ? <IconMinimize /> : <IconMaximize />}</button>}
            <button onClick={onClose} style={iconBtn}>×</button>
          </div>
        </div>
        {/* 正文(可滚动):上半真实清单 + 下半 AI 建议 */}
        <div className="advBody">
          {/* 对我意味着什么(E5-00):个人相关性放最上;依据链同源 match()。
              #161(Frank「公司显示这些信息也不合适吧」):公司面板不渲 —— 表里七个维度里
              职业方向/所在省/省提名粗筛/EE/技能层级/薪资 全是**岗位级**事实,挂在「Agilent Technologies」
              这个标题下答非所问(用户点公司是想了解公司)。岗位级判定留在岗位面板。 */}
          {/* Frank 走查#2(2026-07-25「把按钮摆上,之后可能加新内容」):字段事实弹框(非 category/location/company——
              那三个自带钮栏)统一摆三按钮栏。中文对照即时可用(pnp/ee 有译文;余为「以后加英文」占位);
              AI 速读 / 打开完整页 = 前置占位(灰显 disabled,待该弹框接入 AI/专属页后点亮)。 */}
          {group !== 'category' && group !== 'location' && group !== 'company' && (
            <div className="advActs2">
              {lang !== 'en' && <button onClick={() => { if (!showZh) track('imm-translate'); setShowZh((v) => !v) }} className="pill" style={{ ...(showZh ? { background: '#eff6ff', borderColor: '#bfdbfe', color: '#1d4ed8' } : {}) }}>{showZh ? t('cat.hideZh') : t('cat.showZh')}</button>}
              <button disabled title={t('cat.aiRead')} className="advPillOff pill"><IconCompass /> {t('cat.aiRead')}</button>
              <button disabled title={t('detail.openFull')} className="advPillOff pill">{t('detail.openFull')}</button>
            </div>
          )}
          {group === 'immigration' && <MeansForMe job={job} lang={lang} plan={plan} pnpOcc={pnpOcc} eeOcc={eeOcc} nocDesc={nocDesc} />}
          {/* 分类组走专用三卡面板(Frank 2026-07-21:三卡 + 中文对照 + AI 速读);公司组走专用平级卡面板
              (同日「参考类别重新设计」);其余组照旧铺全组事实 */}
          {group === 'category'
            ? <CategoryPanel job={job} lang={lang} plan={plan} nocDesc={nocDesc} srcField={field} />
            : group === 'location'
            ? <LocationPanel job={job} lang={lang} plan={plan} srcField={field} pnpDraws={pnpDraws} news={news} desigEmp={desigEmp} />
            : group === 'company'
            ? <CompanyPanel job={job} jobs={companyJobs} lang={lang} plan={plan} onOpenJob={onOpenJob} />
            : <GroupFactsSection group={group} job={job} jobs={companyJobs} lang={lang} isPro={plan.isPro} loggedIn={plan.loggedIn} pnpOcc={pnpOcc} pnpDraws={pnpDraws} news={news} profileClb={plan.profile?.clb ?? null} eeOcc={eeOcc} desigEmp={desigEmp} nocDesc={nocDesc} fieldSources={fieldSources} onOpenJob={onOpenJob} showZh={showZh} />}
          {/* 建档 CTA 删(2026-07-25 Frank「这个去掉没什么意义」;原第 5 轮 #17 弹框规范 D1) */}
          {/* 免责/AI 声明不进弹框(2026-07-06 用户拍板:合规统一在 footer 说明) */}
          {/* #174:AI 解读收进自己的卡(每卡必有 title)——只有移民组会请求 AI,
              职位/公司组(status 直置 done、text 空)不渲,免得出一张空卡孤儿标题 */}
          {AI_ADVISOR_ON && group === 'immigration' && (
            <div className="cardMd">
              <div className="mcardHead"><IconCompass /> {t('advisor.tag')}</div>
              {status === 'upgrade' ? (
                <LockedText t={t} loggedIn={plan.loggedIn} />
              ) : status === 'limited' ? (
                /* #175:429 黄条退役 → 打码+锁行(转化靠失去感,不靠警示框) */
                <LockedText t={t} loggedIn={plan.loggedIn} msg={t('advisor.limit429')} ctaLabel={!plan.loggedIn ? t('advisor.limitCta') : undefined} />
              ) : status === 'loading' ? (
                <p className="advNote">{t('advisor.loading')}</p>
              ) : status === 'error' ? (
                /* 2026-07-25 用户:解析失败要能重试——error 态文案(unavail/offline 已在 text 里)后挂重试钮 */
                <p className="advNote">
                  {text}
                  <button onClick={() => setTick((n) => n + 1)} className="advRetry">{t('ai.retry')}</button>
                </p>
              ) : (
                <div className="advAi">{renderAI(text)}{status === 'streaming' && <span className="advCaret">▋</span>}</div>
              )}
            </div>
          )}
          {/* 来源行已随事实块走(FieldFactsSection 内,紧跟内容、在 AI 区之前)—— 底部不再重复 */}
        </div>
        {/* 八方向拉伸手柄(透明边条+角块;右下角保留视觉提示三角) */}
        {!full && <div className="advGrip" />}
        {!full && PANEL_EDGES.map((h) => (
          <div key={h.dir} onPointerDown={(e) => startResize(e, h.dir)}
            className="advHandle" style={{ cursor: h.cursor, ...h.style }} />
        ))}
      </div>
    </div>
  )
}

export function ActModal({ job, lang, plan, nocDesc, onClose }: { job: JobRow; lang: Lang; plan: Plan; nocDesc: NocDesc[]; onClose: () => void }) {
  // C1 后只剩 JD 快看;E8-11 B2:正文抽为 JobBody(与 /jobs/[id] 页面同源),本组件只剩浮层壳。
  // #112(2026-07-20 Frank):标题栏「AI 顾问」钮摘除——点钮会关本框跳顾问弹框,描述/整理版一去不回。
  const t = makeT(lang)
  // #199(Frank「chiropractor 怎么没有翻译呢」):标题下挂 NOC 官方职业名译名(与详情页 H1 同款,英文界面不出)
  const nocZh = nocLocalTitle({ row: nocDesc.find((d) => d.noc === job.noc) || null, lang })
  const overlayClose = useOverlayClose(onClose)
  const { narrow, full, toggleFull, panel, startDrag, startResize } = useFloatPanel(JD_PREF, 760, 640)
  const [freeLeft, setFreeLeft] = useState<number | null>(null)  // 第 5 轮 #16:试用额度可见化(JobBody 回传)
  useEffect(() => { track('modal-jd', { kind: 'modal' }) }, [])  // #129 埋点 + 漏斗第 1 步(kind 分开弹框与整页)
  return (
    <div {...overlayClose} className="advScrim" style={SCRIM}>
      <div onClick={(e) => e.stopPropagation()} className="advPanel" style={{ ...CARD, ...panel }}>
        {/* 标题栏 = 拖动手柄(与顾问弹框同款) */}
        <div onPointerDown={startDrag} className={full ? 'advHead tight full' : 'advHead tight'}>
          <div className="advHeadL">
            {/* 页眉与其余弹框统一灰(Frank 2026-07-21;「打开完整页」在 JobBody 胶囊钮行) */}
            <div className="advKicker">
              {t('act.descTitle')}{freeLeft != null ? <span className="advKickerSub">{t('advisor.left', { n: freeLeft })}</span> : null}
            </div>
            <h3 className="advTitle">{job.title || '—'}</h3>
            {nocZh && nocZh.toLowerCase() !== (job.title || '').toLowerCase() ? <div className="advSub">{nocZh}</div> : null}
          </div>
          <div className="advWinActs" onPointerDown={(e) => e.stopPropagation()}>
            {!narrow && <button onClick={toggleFull} title={t(full ? 'advisor.exitFull' : 'advisor.full')} style={iconBtnS}>{full ? <IconMinimize /> : <IconMaximize />}</button>}
            <button onClick={onClose} style={iconBtnS}>×</button>
          </div>
        </div>
        {/* 2026-07-25 用户「穿墙」:底部原 20px padding 在 sticky 投递栏下方留缝,滚动到底 JD 从缝里透出卡片圆角外 → 底 padding 归 0,底部留白改由投递栏自带 */}
        {/* Frank 走查#22:滚动容器改 flex 列,让投递栏 marginTop:auto 在内容短时也贴底 */}
        <div className="advBody jd">
          <JobBody job={job} lang={lang} plan={plan} inModal onFreeLeft={setFreeLeft} />
        </div>
        {/* 八方向拉伸手柄(透明边条+角块;右下角保留视觉提示三角) */}
        {!full && <div className="advGrip" />}
        {!full && PANEL_EDGES.map((h) => (
          <div key={h.dir} onPointerDown={(e) => startResize(e, h.dir)}
            className="advHandle" style={{ cursor: h.cursor, ...h.style }} />
        ))}
      </div>
    </div>
  )
}

// ── 按字段类型生成顾问解读(基于该行数据;无需 API) ─────────────
// AI 顾问头部:标签(三语,复用列名)+ 上下文标题 + 链接;正文全部由 /api/advisor 大模型按所选语言生成。
function advHeader(field: ColKey, j: JobRow, t: TFn): { tag: string; title: string } {
  return { tag: t('col.' + field), title: j.title || j.company || '—' }
}

