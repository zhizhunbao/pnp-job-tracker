/**
 * pnp 域(省提名与联邦 EE 的事实区块)的自足形状:事实行的只读子集、各件的 props 契约、
 * 派生函数的入参、洗好的展示行,以及状态机器交回的面板。
 * 宪法 08-25「types 自声明」:形状本域自己声明,不从别的域取 —— 只声明本域真正读的那几项,
 * 上游多一个字段不必跟着改,真读不到会当场 tsc 红。喂给 lib/jobs 的 match 引擎那两张
 * (PnpProfile / PnpMatchJob)按「亲手构造后喂外域引擎的形状全格照抄」写全,少一项引擎就收不下。
 * 🔴 本文件**不带 `'use client'`**:它只有形状,服务端与客户端两边都要读得到。
 * 2026-08-28 换装批自 Pnp.tsx 的行内 props 与两个局部 type 拆户而来。
 *
 * @author Frank
 * @time 2026-08-28 17:59:16
 */

/**
 * 界面语言(三字面量各域自抄;职业译名跟它走)。
 */
export type PnpLang = 'zh' | 'en' | 'ko'

/**
 * 界面语取词函数(与 lib/i18n 的 TFn 同形:键 + 可选插值 —— 真参数是 lib/i18n 那个带附加成员的
 * 交叉类型,结构上兜得住)。
 */
export type TFn = (key: string, vars?: Record<string, string | number>) => string

/**
 * 无参无返的点击手柄(折叠、展开、埋点跳转都用它)。
 */
export type ClickFn = () => void

/**
 * 逐项手柄工厂:按键给一只点击手柄(折叠清单一条一只)。
 */
export type ToggleOfFn = (key: string) => ClickFn

/**
 * 高亮行的 ref 盒(命中行滚进视野用;只认 current 这一格)。
 */
export type HitRef = {
  /**
   * 当前登记的那一行;null=这一屏没有命中行。
   */
  current: HTMLDivElement | null
}

/**
 * 挂到命中行上的回调 ref(非命中行拿到同一只但不登记)。
 */
export type HitRefFn = (el: HTMLDivElement | null) => void

/**
 * 职业名字典:职业码 → 官方名行(译名从这里取)。
 */
export type NocRowMap = Map<string, PnpNocDesc>

/**
 * 类别历史轮次:类别键 → 该类别的历次抽选(降序)。
 */
export type HistMap = Map<string, PnpDraw[]>

/**
 * 判定药丸的色档:ok 绿=能走 / warn 琥珀 / fail 红=排除 / na 灰=走不了。
 */
export type PnpTone = 'ok' | 'warn' | 'fail' | 'na'

/**
 * 依据链每条的判定档(与 match 引擎同名同义)。
 */
export type MmTone = 'pass' | 'warn' | 'fail' | 'na'

/**
 * 匹配总档(高/中/低/不适用)。
 */
export type PnpMatchLevel = 'high' | 'mid' | 'low' | 'na'

/**
 * 担保引流卡的来源:pnp = 省提名弹框(有凭证才出),company = 公司页(内容已随货架页下架,整卡不出)。
 */
export type SponsorSrc = 'pnp' | 'company'

/**
 * AIP 通道直判的三态:on=雇主在指定名单 / miss=大西洋省但雇主不在名单 / na=非大西洋省不适用。
 */
export type AipVerdict = 'on' | 'miss' | 'na'

/**
 * 岗位事实里本域真正读的那几项(上游 lib/jobs 的 JobRow 是几十项的整行,这里只声明读到的)。
 */
export type PnpJob = {
  /**
   * 主键(判定卡入口把它拼进决策页地址)。
   */
  id: string | number

  /**
   * 省码;''=库里没记。
   */
  province: string

  /**
   * 职业码;''=未匹配 NOC。
   */
  noc: string

  /**
   * 技能层级;null=未分类。
   */
  teer: number | null

  /**
   * 服务端算好的粗筛信号(**单一真相**:弹框只解释「凭什么」,不自行判定能不能走)。
   */
  pnpEligible: boolean

  /**
   * 具名省清单命中标签。
   */
  pnpStream: string

  /**
   * EE 类别命中。
   */
  eeCategory: string

  /**
   * 公司名(担保引流卡按它去职位板搜同雇主的岗)。
   */
  company: string

  /**
   * AIP 指定雇主标记。
   */
  aip: boolean

  /**
   * 年薪;null=没写。
   */
  salaryAnnual: number | null

  /**
   * 当地中位年薪;null=未收录。
   */
  wageMedAnnual: number | null

  /**
   * 雇主近两年 LMIA 获批数;null=无记录。
   */
  lmiaPositions: number | null

  /**
   * 技能股获批数;null=列未回填,0=确认纯农业/低薪股。
   */
  lmiaPositionsSkilled: number | null

  /**
   * 最近获批季度;''=无。
   */
  lmiaLastQuarter: string
}

/**
 * 一次抽选(省抽选与联邦轮次同住一张表:province=FED 的行就是 EE 轮次,label=类别键)。
 */
export type PnpDraw = {
  /**
   * 省码;FED=联邦轮次。
   */
  province: string

  /**
   * 行类别:draw=抽选,notice=通告(如改制公告)。
   */
  kind: string

  /**
   * 抽选日期(`YYYY-MM-DD`)。
   */
  drawDate: string

  /**
   * 通道英文名。
   */
  stream: string

  /**
   * 通道中文名;''=还没翻到(不出灰注,不是报错)。
   */
  streamZh: string

  /**
   * 分数线(省自评分制 SIRS/WEOI/MPNP EOI,非 CRS);null=该轮未公布。
   */
  score: number | null

  /**
   * 邀请数;null=未公布。
   */
  invitations: number | null

  /**
   * 官方通告原文(#153:通告行优先直接渲染它,缺了才退回旧模板)。
   */
  note: string

  /**
   * 展示标签(省抽选=通道名;联邦行=类别键)。
   */
  label: string
}

/**
 * 省提名/AIP 清单里的一条职业(扁平维度表,按 label 分组成通道)。
 */
export type PnpOcc = {
  /**
   * 省码。
   */
  province: string

  /**
   * 通道 slug。
   */
  stream: string

  /**
   * 通道人话名。
   */
  label: string

  /**
   * 清单类型(indemand/ineligible/…)。
   */
  type: string

  /**
   * 项目归属:PNP / AIP(空档在映射时落 PNP)。
   */
  program: string

  /**
   * 职业码。
   */
  noc: string

  /**
   * 职业名。
   */
  name: string

  /**
   * GTA 限制(OINP 部分通道)。
   */
  gtaRestricted: boolean

  /**
   * 官方清单页。
   */
  url: string

  /**
   * 抓取时刻。
   */
  fetched: string
}

/**
 * 一条通道点名的职业。
 */
export type PnpStreamOcc = {
  /**
   * 职业码。
   */
  noc: string

  /**
   * 职业名。
   */
  name: string

  /**
   * GTA 限制。
   */
  gtaRestricted: boolean
}

/**
 * 一条通道(按 label 把扁平清单分组之后的形状)。
 */
export type PnpStream = {
  /**
   * 通道 slug。
   */
  stream: string

  /**
   * 通道人话名。
   */
  label: string

  /**
   * 清单类型(ineligible=排除清单,其余为纳入清单)。
   */
  type: string

  /**
   * 官方页。
   */
  url: string

  /**
   * 抓取时刻。
   */
  fetched: string

  /**
   * 点名职业。
   */
  occupations: PnpStreamOcc[]
}

/**
 * EE 类别清单里的一条职业(扁平维度表)。
 */
export type PnpEeOcc = {
  /**
   * 类别 slug。
   */
  category: string

  /**
   * 类别人话名。
   */
  label: string

  /**
   * 职业码。
   */
  noc: string

  /**
   * 技能层级;null=未标。
   */
  teer: number | null

  /**
   * 职业名。
   */
  title: string

  /**
   * 上次类别抽选 CRS 分数线;null=无记录。
   */
  drawCrs: number | null

  /**
   * 上次抽选日期;''=无记录。
   */
  drawDate: string

  /**
   * 上次抽选邀请数;null=无记录。
   */
  drawSize: number | null

  /**
   * 官方页(原样透传给 match 引擎的维度包)。
   */
  url: string

  /**
   * 抓取时刻(原样透传给 match 引擎的维度包)。
   */
  fetched: string
}

/**
 * EE 类别涵盖的一条职业。
 */
export type PnpEeCatOcc = {
  /**
   * 职业码。
   */
  noc: string

  /**
   * 技能层级;null=未标。
   */
  teer: number | null

  /**
   * 职业名。
   */
  title: string
}

/**
 * 一个 EE 类别(按 label 把扁平清单分组之后的形状)。
 */
export type PnpEeCat = {
  /**
   * 类别 slug。
   */
  key: string

  /**
   * 类别人话名。
   */
  label: string

  /**
   * 上次抽选 CRS;null=无记录。
   */
  drawCrs: number | null

  /**
   * 上次抽选日期;''=无记录。
   */
  drawDate: string

  /**
   * 上次邀请数;null=无记录。
   */
  drawSize: number | null

  /**
   * 涵盖职业。
   */
  occupations: PnpEeCatOcc[]
}

/**
 * 一条官方动态(本省最新公告只摆标题与日期)。
 */
export type PnpNewsSlim = {
  /**
   * 地区码(省码或联邦)。
   */
  region: string

  /**
   * 官方原标题。
   */
  title: string

  /**
   * 官方发布日期。
   */
  date: string

  /**
   * 详情页地址的最后一段。
   */
  slug: string
}

/**
 * 职业官方名行(译名从这里取;字典缺词就不出灰注)。
 */
export type PnpNocDesc = {
  /**
   * 职业码。
   */
  noc: string

  /**
   * NOC 官方英文名。
   */
  title: string

  /**
   * 中文名;''=没收录。
   */
  titleZh: string

  /**
   * 韩文名;''=没收录。
   */
  titleKo: string
}

/**
 * 用户档案(全格照抄 match 引擎的入参:亲手构造后要原样喂进去,少一格引擎收不下)。
 */
export type PnpProfile = {
  /**
   * 自报职业码。
   */
  nocCodes: string[]

  /**
   * 语言 CLB;null=未填。
   */
  clb: number | null

  /**
   * 自报 CRS;null=未填。
   */
  crs: number | null

  /**
   * 目标省(偏好不是资格)。
   */
  targetProvinces: string[]

  /**
   * PGWP 剩余月数;null=未填。
   */
  pgwpMonthsLeft: number | null

  /**
   * 身份分型;null=未填。
   */
  currentStatus: 'overseas' | 'studying' | 'working' | 'jobhunting' | 'pr' | null
}

/**
 * 身份与档案(本域只读登录态、建档态与档案本身)。
 */
export type PnpPlan = {
  /**
   * 登录态。
   */
  loggedIn: boolean

  /**
   * 建档可用。
   */
  profileOk: boolean

  /**
   * 规范化档案;null=未建档。
   */
  profile: PnpProfile | null
}

/**
 * 喂给 match 引擎的岗位侧字段(全格照抄:引擎按这张形状算依据链)。
 */
export type PnpMatchJob = {
  /**
   * 职业码。
   */
  noc: string

  /**
   * 技能层级;null=未分类。
   */
  teer: number | null

  /**
   * 省码。
   */
  province: string

  /**
   * 粗筛信号。
   */
  pnpEligible: boolean

  /**
   * 具名省清单命中。
   */
  pnpStream: string

  /**
   * EE 类别命中。
   */
  eeCategory: string

  /**
   * 年薪;null=没写。
   */
  salaryAnnual: number | null

  /**
   * 当地中位年薪;null=未收录。
   */
  wageMedAnnual: number | null

  /**
   * 雇主近两年 LMIA 获批数;null=无记录。
   */
  lmiaPositions: number | null

  /**
   * 技能股获批数;null=列未回填。
   */
  lmiaPositionsSkilled: number | null

  /**
   * 最近获批季度。
   */
  lmiaLastQuarter: string
}

/**
 * 依据链的一条(match 引擎交回来的;本域只读这四项 —— 官方来源 ↗ 外链 #106 已撤,归拢到 /resources)。
 */
export type PnpMatchReason = {
  /**
   * 规则名。
   */
  rule: string

  /**
   * 判定档。
   */
  verdict: MmTone

  /**
   * 文案键(match.r.*)。
   */
  key: string

  /**
   * 渲染参数。
   */
  params: Record<string, string | number>
}

/**
 * match 引擎的结论(本域只读总档与依据链)。
 */
export type PnpMatchResult = {
  /**
   * 匹配总档。
   */
  level: PnpMatchLevel

  /**
   * 依据链。
   */
  reasons: PnpMatchReason[]
}

/**
 * 依据链每条 reason 的渲染参数,按「哪条 rule 带哪几项」列全 —— 值由 match() 保证有,
 * 取哪几项看各 rule 的行构造分支。
 * 上游是 `Record<string, string | number>`;索引签名在 noUncheckedIndexedAccess 下取回来一律
 * 多一个 undefined,而 t() 的参数不收 undefined,所以在取值那一行一次性收窄成这张表(单向断言)。
 */
export type ReasonParams = Record<
  'cat' | 'crs' | 'date' | 'diff' | 'draw' | 'gap' | 'label' | 'n' | 'pct' | 'prov' | 'q' | 'stream' | 'yours',
  string | number
>

/**
 * 一个省的通道改制登记(改制日之前的抽选属已关闭通道,不再列出;改列现行规则)。
 */
export type PnpReform = {
  /**
   * 改制生效日(`YYYY-MM-DD`)。
   */
  since: string

  /**
   * 现行规则的文案键对(项 · 内容)。
   */
  rules: [string, string][]
}

/**
 * PNP 命中计算的结论(清单块与通道直判块共用,改一处两边同变)。
 */
export type PnpMatchOut = {
  /**
   * 本省的全部通道(魁省与缺省码的岗给空列)。
   */
  streams: PnpStream[]

  /**
   * 命中的纳入清单;null=没命中。
   */
  matched: PnpStream | null

  /**
   * 是否被某张排除清单点名。
   */
  excluded: boolean

  /**
   * 点名排除本岗的那张清单;null=没有。
   */
  excludedBy: PnpStream | null

  /**
   * 本省有没有纳入型清单(有清单可比才谈得上「没覆盖」)。
   */
  hasInclusion: boolean
}

/**
 * 判定卡要显示的内容(判定行 + 两条「凭什么」)。
 */
export type PnpVerdictSpec = {
  /**
   * 药丸色档。
   */
  tone: PnpTone

  /**
   * 药丸里的结论话术(措辞红线:只说符合与否,永不说「你能/不能移民」)。
   */
  text: string

  /**
   * 通用档的「凭什么」;''=不出这一行。
   */
  why: string

  /**
   * 魁省的制度说明;''=不出这一行。
   */
  qcWhy: string
}

/**
 * 洗好的一行抽选(展示行:类名与文案都算完了,组件只渲)。
 */
export type DrawRowSpec = {
  /**
   * React 列表键。
   */
  key: string

  /**
   * 抽选日期。
   */
  date: string

  /**
   * 日期格的类名(改制日之前的旧轮次压暗)。
   */
  dateCls: string

  /**
   * 通道格的类名。
   */
  streamCls: string

  /**
   * 通道英文名。
   */
  stream: string

  /**
   * 通道中文灰注;''=不出(zh 界面之外、或还没翻到)。
   */
  streamZh: string

  /**
   * 悬停提示(有备注给备注,没有给通道名)。
   */
  title: string

  /**
   * 最低分文案;''=该轮未公布。
   */
  score: string

  /**
   * 邀请数文案;''=该轮未公布。
   */
  inv: string
}

/**
 * 洗好的一条公告行。
 */
export type NewsRowSpec = {
  /**
   * React 列表键(=slug)。
   */
  key: string

  /**
   * 官方发布日期。
   */
  date: string

  /**
   * 详情页地址。
   */
  href: string

  /**
   * 官方原标题(也做悬停提示 —— 名字不截断,窄位才靠省略号收尾)。
   */
  title: string
}

/**
 * 洗好的一行省清单职业。
 */
export type StreamRowSpec = {
  /**
   * React 列表键。
   */
  key: string

  /**
   * 是不是本岗那一条(命中行高亮并滚进视野)。
   */
  hit: boolean

  /**
   * 职业码。
   */
  noc: string

  /**
   * 职业名。
   */
  name: string

  /**
   * 界面语言译名;''=不出(字典缺词或译名与英文同字)。
   */
  zh: string

  /**
   * 「你的职业」标;''=不是本岗那一条。
   */
  yourTag: string

  /**
   * GTA 限制标;''=这一条没有限制。
   */
  gtaTag: string
}

/**
 * 洗好的一行 EE 类别职业。
 */
export type OccRowSpec = {
  /**
   * React 列表键(=职业码)。
   */
  key: string

  /**
   * 是不是本岗那一条。
   */
  hit: boolean

  /**
   * 职业码。
   */
  noc: string

  /**
   * 职业名。
   */
  title: string

  /**
   * 界面语言译名;''=不出。
   */
  zh: string

  /**
   * 技能层级文案;''=这条没标 TEER。
   */
  teer: string

  /**
   * 「你的职业」标;''=不是本岗那一条。
   */
  yourTag: string
}

/**
 * 洗好的一行历史轮次。
 */
export type HistRowSpec = {
  /**
   * React 列表键。
   */
  key: string

  /**
   * 抽选日期(交给 TimeText 渲);null=没有日期。
   */
  iso: string | null

  /**
   * 分数线文案。
   */
  crs: string

  /**
   * 邀请数文案。
   */
  ita: string
}

/**
 * 洗好的一行联邦轮次。
 */
export type FedRowSpec = {
  /**
   * React 列表键。
   */
  key: string

  /**
   * 抽选日期(交给 TimeText 渲)。
   */
  iso: string

  /**
   * 轮次类型的人话名。
   */
  type: string

  /**
   * 轮次类型的色(一类一色,数据不是版式)。
   */
  color: string

  /**
   * 悬停提示(通道原文)。
   */
  title: string

  /**
   * 分数线文案。
   */
  crs: string

  /**
   * 邀请数文案。
   */
  ita: string
}

/**
 * 口径注里的一个轮次类型桶(按轮数降序,零轮的桶不出现)。
 */
export type FedBucket = {
  /**
   * React 列表键(=类型键)。
   */
  key: string

  /**
   * 前面的分隔记号;''=第一个桶。
   */
  sep: string

  /**
   * 类型人话名。
   */
  label: string

  /**
   * 这一类占了几轮。
   */
  count: number

  /**
   * 这一类的色。
   */
  color: string
}

/**
 * 依据链一格的一行(主文案 + 灰注 + 行尾灰注)。
 */
export type MmLine = {
  /**
   * React 列表键。
   */
  key: string

  /**
   * 主文案(人话名做主,代码不裸奔)。
   */
  main: string

  /**
   * 跟在主文案后的灰注(译名/口径注);''=不出。
   */
  note: string

  /**
   * 行尾灰注(NOC 码);''=不出。
   */
  tail: string
}

/**
 * 依据链的一格(本岗 / 我的各一格;多行时逐行成块)。
 */
export type MmCellSpec = {
  /**
   * 是不是 TEER 格(同屏可能出现两次,灰注只随首次出现 —— 清重复时按它认)。
   */
  teer: boolean

  /**
   * 这一格的各行。
   */
  lines: MmLine[]
}

/**
 * 依据链的一行(一个维度一段:维度名 + 判定药丸 + 本岗/我的两格)。
 */
export type MmRowSpec = {
  /**
   * React 列表键。
   */
  key: string

  /**
   * 维度名。
   */
  dim: string

  /**
   * 本岗这一格。
   */
  job: MmCellSpec

  /**
   * 我的那一格;null=这条没有「我的」可比(原来的横杠行)。
   */
  you: MmCellSpec | null

  /**
   * 判定档。
   */
  tone: MmTone

  /**
   * 判定话术;''=这条不给判定(渲空值符)。
   */
  text: string

  /**
   * 判定的悬停提示;''=没有提示。
   */
  tip: string
}

/**
 * PnpDrawsBlock(本省最近抽选)的 props。
 */
export type PnpDrawsBlockIn = {
  /**
   * 省码。
   */
  province: string

  /**
   * 界面语言。
   */
  lang: PnpLang

  /**
   * 全部抽选行(本省那些在体内筛)。
   */
  draws: PnpDraw[]

  /**
   * 最多留几条(C2 走查拍板:省弹窗只留最近 1 条摘要,全量归 PNP 弹窗,消跨弹窗重复);
   * 可省 = 不截断。
   */
  limit?: number
}

/**
 * ReformRules(改制省现行规则两列表)的 props。
 */
export type ReformRulesIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 本省的改制登记。
   */
  reform: PnpReform
}

/**
 * DrawNotice(通告行)的 props。
 */
export type DrawNoticeIn = {
  /**
   * 通告全文(#153:有官方原文就是原文,缺了才是模板句)。
   */
  text: string
}

/**
 * StreamRow(省清单一行)的 props。
 */
export type StreamRowIn = {
  /**
   * 洗好的这一行。
   */
  r: StreamRowSpec

  /**
   * 命中行的 ref 盒(非命中行不登记)。
   */
  matchRef: HitRef
}

/**
 * DrawRow(抽选一行)的 props。
 */
export type DrawRowViewIn = {
  /**
   * 洗好的这一行。
   */
  r: DrawRowSpec
}

/**
 * NewsRow(公告一行)的 props。
 */
export type NewsRowViewIn = {
  /**
   * 洗好的这一行。
   */
  r: NewsRowSpec
}

/**
 * EeHistRow(历史轮次一行)的 props。
 */
export type HistRowViewIn = {
  /**
   * 洗好的这一行。
   */
  r: HistRowSpec
}

/**
 * FedRow(联邦轮次一行)的 props。
 */
export type FedRowViewIn = {
  /**
   * 洗好的这一行。
   */
  r: FedRowSpec
}

/**
 * MmCell(依据链一格)的 props。
 */
export type MmCellIn = {
  /**
   * 洗好的这一格。
   */
  cell: MmCellSpec
}

/**
 * MmLineText(依据链一格里的一行)的 props。
 */
export type MmLineTextIn = {
  /**
   * 洗好的这一行。
   */
  line: MmLine
}

/**
 * VerdictIcon(依据链判定的图标)的 props。
 */
export type VerdictIconIn = {
  /**
   * 判定档。
   */
  tone: MmTone
}

/**
 * NewsLatestBlock(本省最新公告)的 props。
 */
export type NewsLatestBlockIn = {
  /**
   * 省码。
   */
  province: string

  /**
   * 界面语言。
   */
  lang: PnpLang

  /**
   * 全部动态(本省那些在体内筛)。
   */
  news: PnpNewsSlim[]
}

/**
 * SponsorLeadCard(在招担保雇主)的 props。
 */
export type SponsorLeadCardIn = {
  /**
   * 本岗(读凭证与公司名)。
   */
  job: PnpJob

  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 从哪儿弹出来的。
   */
  src: SponsorSrc
}

/**
 * VerdictPill(判定药丸)的 props。
 */
export type VerdictPillIn = {
  /**
   * 色档。
   */
  tone: PnpTone

  /**
   * 药丸里的话。
   */
  children: React.ReactNode
}

/**
 * PnpListSection(省提名清单整块)的 props。
 */
export type PnpListSectionIn = {
  /**
   * 本岗。
   */
  job: PnpJob

  /**
   * 界面语言。
   */
  lang: PnpLang

  /**
   * 省提名与 AIP 的扁平清单。
   */
  occ: PnpOcc[]

  /**
   * 全部抽选行。
   */
  draws: PnpDraw[]

  /**
   * 全部动态。
   */
  news: PnpNewsSlim[]

  /**
   * 档案语言分(调用方仍在传,本块**不读** —— E12-09 自评打分已迁到「移民路径」页,
   * 这一格随消费页换装批一起摘;先收下,免得调用点当场 tsc 红)。
   */
  profileClb?: number | null

  /**
   * 职业名字典;可省 = 不出译名灰注。
   */
  nocDesc?: PnpNocDesc[]

  /**
   * 出不出界面语言译名;可省 = 出。
   */
  showZh?: boolean
}

/**
 * PnpVerdictCard(省提名判定卡)的 props。
 */
export type PnpVerdictCardIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 判定卡的内容。
   */
  verdict: PnpVerdictSpec
}

/**
 * StreamCard(一张通道清单卡)的 props。
 */
export type StreamCardIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语言。
   */
  lang: PnpLang

  /**
   * 出不出译名灰注。
   */
  showZh: boolean

  /**
   * 这张清单。
   */
  stream: PnpStream

  /**
   * 本岗职业码。
   */
  noc: string

  /**
   * 职业名字典。
   */
  nocRows: NocRowMap

  /**
   * 展开了没有(默认只显命中本岗那一条)。
   */
  open: boolean

  /**
   * 折叠开关。
   */
  onToggle: ClickFn

  /**
   * 命中行的 ref 盒。
   */
  matchRef: HitRef
}

/**
 * EeCategorySection(联邦 EE 类别整块)的 props。
 */
export type EeCategorySectionIn = {
  /**
   * 本岗。
   */
  job: PnpJob

  /**
   * 界面语言。
   */
  lang: PnpLang

  /**
   * EE 类别的扁平清单。
   */
  cats: PnpEeOcc[]

  /**
   * 全部抽选行(联邦轮次在其中);可省 = 无轮次可列。
   */
  draws?: PnpDraw[]

  /**
   * 职业名字典;可省 = 不出译名灰注。
   */
  nocDesc?: PnpNocDesc[]

  /**
   * 出不出界面语言译名;可省 = 出。
   */
  showZh?: boolean
}

/**
 * EeVerdictCard(EE 判定卡)的 props。
 */
export type EeVerdictCardIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 结论行的话术。
   */
  text: string

  /**
   * 命中了没有(命中出对勾并变蓝)。
   */
  hit: boolean

  /**
   * 全类别展开钮的文案;''=不出这颗钮(命中时不需要全景)。
   */
  allLabel: string

  /**
   * 全类别展开钮的折叠记号。
   */
  caret: string

  /**
   * 全类别展开开关。
   */
  onToggle: ClickFn
}

/**
 * EeDrawsCard(EE 最近抽选卡)的 props。
 */
export type EeDrawsCardIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 有抽选记录的类别。
   */
  cats: PnpEeCat[]

  /**
   * 出不出类别名(只有一个类别时不出 —— 卡头已经说清是谁)。
   */
  showName: boolean

  /**
   * 各类别的历史轮次。
   */
  histOf: HistMap

  /**
   * 展开了历史的那个类别键;null=都收着。
   */
  openCat: string | null

  /**
   * 历史折叠开关工厂(按类别键给一只)。
   */
  toggleOf: ToggleOfFn
}

/**
 * EeCatDraw(一个类别的最近抽选行 + 历史)的 props。
 */
export type EeCatDrawIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 这个类别。
   */
  cat: PnpEeCat

  /**
   * 出不出类别名。
   */
  showName: boolean

  /**
   * 这个类别的历史轮次。
   */
  hist: PnpDraw[]

  /**
   * 历史展开了没有。
   */
  open: boolean

  /**
   * 历史折叠开关。
   */
  onToggle: ClickFn
}

/**
 * EeDrawText(最近抽选那一行的文字)的 props。
 */
export type EeDrawTextIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 这个类别。
   */
  cat: PnpEeCat

  /**
   * 历史轮次条数(够多才出折叠记号)。
   */
  histCount: number

  /**
   * 历史展开了没有。
   */
  open: boolean

  /**
   * 有没有历史可展开。
   */
  expandable: boolean
}

/**
 * EeCatList(一个类别的职业清单卡)的 props。
 */
export type EeCatListIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语言。
   */
  lang: PnpLang

  /**
   * 出不出译名灰注。
   */
  showZh: boolean

  /**
   * 这个类别。
   */
  cat: PnpEeCat

  /**
   * 本岗职业码。
   */
  noc: string

  /**
   * 职业名字典。
   */
  nocRows: NocRowMap

  /**
   * 清单展开了没有(一律默认展开,想收再点头折)。
   */
  open: boolean

  /**
   * 折叠开关。
   */
  onToggle: ClickFn

  /**
   * 命中行的 ref 盒。
   */
  matchRef: HitRef
}

/**
 * EeOccRow(EE 类别清单一行)的 props。
 */
export type EeOccRowIn = {
  /**
   * 洗好的这一行。
   */
  r: OccRowSpec

  /**
   * 命中行的 ref 盒。
   */
  matchRef: HitRef
}

/**
 * FederalRoundsCard(联邦抽选近况)的 props。
 */
export type FederalRoundsCardIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 全部抽选行(联邦轮次在其中)。
   */
  draws: PnpDraw[]
}

/**
 * FedMix(轮次结构口径注)的 props。
 */
export type FedMixIn = {
  /**
   * 打头的那句话(近 N 轮里各类各占几轮)。
   */
  head: string

  /**
   * 各类型的桶。
   */
  buckets: FedBucket[]
}

/**
 * MeansForMe(对我意味着什么)的 props。
 */
export type MeansForMeIn = {
  /**
   * 本岗。
   */
  job: PnpJob

  /**
   * 界面语言。
   */
  lang: PnpLang

  /**
   * 身份与档案。
   */
  plan: PnpPlan

  /**
   * 省提名清单(喂给 match 引擎当维度包)。
   */
  pnpOcc: PnpOcc[]

  /**
   * EE 类别清单(喂给 match 引擎当维度包)。
   */
  eeOcc: PnpEeOcc[]

  /**
   * 职业名字典。
   */
  nocDesc: PnpNocDesc[]
}

/**
 * MmRow(依据链一行)的 props。
 */
export type MmRowIn = {
  /**
   * 洗好的这一行。
   */
  r: MmRowSpec

  /**
   * 「本岗」那一列的标签。
   */
  jobLabel: string

  /**
   * 「我的」那一列的标签。
   */
  youLabel: string
}

/**
 * MmVerdict(依据链的判定药丸)的 props。
 */
export type MmVerdictIn = {
  /**
   * 判定档。
   */
  tone: MmTone

  /**
   * 判定话术;''=渲空值符。
   */
  text: string

  /**
   * 悬停提示;''=没有提示。
   */
  tip: string
}

/**
 * usePnpList 的入参。
 */
export type PnpListHookIn = {
  /**
   * 本岗。
   */
  job: PnpJob

  /**
   * 界面语言。
   */
  lang: PnpLang

  /**
   * 省提名与 AIP 的扁平清单。
   */
  occ: PnpOcc[]

  /**
   * 职业名字典。
   */
  nocDesc: PnpNocDesc[]
}

/**
 * usePnpList 交回的面板。
 */
export type PnpListPanel = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 命中行的 ref 盒。
   */
  matchRef: HitRef

  /**
   * 职业名字典。
   */
  nocRows: NocRowMap

  /**
   * PNP 命中计算的结论。
   */
  match: PnpMatchOut

  /**
   * 展开了的清单键。
   */
  open: Set<string>

  /**
   * 折叠开关工厂。
   */
  toggleOf: ToggleOfFn
}

/**
 * useEeCategory 的入参。
 */
export type EeHookIn = {
  /**
   * 本岗。
   */
  job: PnpJob

  /**
   * 界面语言。
   */
  lang: PnpLang

  /**
   * EE 类别的扁平清单。
   */
  cats: PnpEeOcc[]

  /**
   * 全部抽选行。
   */
  draws: PnpDraw[]

  /**
   * 职业名字典。
   */
  nocDesc: PnpNocDesc[]
}

/**
 * useEeCategory 交回的面板。
 */
export type EePanel = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 命中行的 ref 盒。
   */
  matchRef: HitRef

  /**
   * 职业名字典。
   */
  nocRows: NocRowMap

  /**
   * 分组后的全部类别。
   */
  grouped: PnpEeCat[]

  /**
   * 命中本岗的类别。
   */
  hit: PnpEeCat[]

  /**
   * 这一屏要展示的类别(命中优先;未命中时看展不展开全景)。
   */
  shown: PnpEeCat[]

  /**
   * 各类别的历史轮次。
   */
  histOf: HistMap

  /**
   * 展开了历史的那个类别键;null=都收着。
   */
  openCat: string | null

  /**
   * 历史折叠开关工厂。
   */
  catToggleOf: ToggleOfFn

  /**
   * 收起了清单的类别键(清单一律默认展开,这里记的是被收起来的)。
   */
  closed: Set<string>

  /**
   * 清单折叠开关工厂。
   */
  listToggleOf: ToggleOfFn

  /**
   * 全类别全景展开了没有。
   */
  showAll: boolean

  /**
   * 全类别全景开关。
   */
  onShowAll: ClickFn
}

/**
 * useFederalRounds 的入参。
 */
export type FedHookIn = {
  /**
   * 全部抽选行。
   */
  draws: PnpDraw[]
}

/**
 * useFederalRounds 交回的面板。
 */
export type FedPanel = {
  /**
   * 展开了没有。
   */
  open: boolean

  /**
   * 展开开关。
   */
  onToggle: ClickFn

  /**
   * 联邦轮次(降序,最多 FED_MAX 轮)。
   */
  rounds: PnpDraw[]
}

/**
 * useMeansForMe 的入参。
 */
export type MmHookIn = {
  /**
   * 本岗。
   */
  job: PnpJob

  /**
   * 界面语言。
   */
  lang: PnpLang

  /**
   * 身份与档案。
   */
  plan: PnpPlan

  /**
   * 省提名清单。
   */
  pnpOcc: PnpOcc[]

  /**
   * EE 类别清单。
   */
  eeOcc: PnpEeOcc[]
}

/**
 * useMeansForMe 交回的面板。
 */
export type MmPanel = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * match 引擎的结论;null=未登录/未建档(整卡不出)。
   */
  result: PnpMatchResult | null
}

/**
 * reformOf 的入参。
 */
export type ReformOfIn = {
  /**
   * 省码。
   */
  province: string
}

/**
 * drawRowsOf 的入参。
 */
export type DrawRowsIn = {
  /**
   * 省码。
   */
  province: string

  /**
   * 全部抽选行。
   */
  draws: PnpDraw[]

  /**
   * 本省的改制登记;null=没改制。
   */
  reform: PnpReform | null

  /**
   * 最多留几条;null=不截断。
   */
  limit: number | null
}

/**
 * drawsTitleOf 的入参。
 */
export type DrawsTitleIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 本省的改制登记;null=没改制。
   */
  reform: PnpReform | null

  /**
   * 打头那一行抽选;null=一条都没有。
   */
  first: PnpDraw | null
}

/**
 * toDrawRow 的入参。
 */
export type DrawRowIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语言。
   */
  lang: PnpLang

  /**
   * 这一行抽选。
   */
  draw: PnpDraw

  /**
   * 这一行在列表里的序号(拼 React 列表键)。
   */
  index: number

  /**
   * 本省的改制登记;null=没改制。
   */
  reform: PnpReform | null
}

/**
 * drawNoticeTextOf 的入参。
 */
export type DrawNoticeTextIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 这一行通告。
   */
  draw: PnpDraw
}

/**
 * newsRowsOf 的入参。
 */
export type NewsRowsIn = {
  /**
   * 省码。
   */
  province: string

  /**
   * 全部动态。
   */
  news: PnpNewsSlim[]
}

/**
 * sponsorLinesOf 的入参。
 */
export type SponsorLinesIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 本岗。
   */
  job: PnpJob
}

/**
 * sponsorShows 的入参。
 */
export type SponsorShowIn = {
  /**
   * 本岗(读凭证)。
   */
  job: PnpJob

  /**
   * 从哪儿弹出来的。
   */
  src: SponsorSrc
}

/**
 * provLabelOf 的入参。
 */
export type ProvLabelIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 两位省码。
   */
  code: string
}

/**
 * makeTrackClick 的入参。
 */
export type TrackClickIn = {
  /**
   * 埋点名。
   */
  event: string

  /**
   * 埋点的 kind 值。
   */
  kind: string
}

/**
 * makeTvOpen 的入参。
 */
export type TvOpenIn = {
  /**
   * 本岗主键(拼进决策页地址)。
   */
  id: string | number
}

/**
 * pnpMatchOf 的入参。
 */
export type PnpMatchIn = {
  /**
   * 本岗。
   */
  job: PnpJob

  /**
   * 省提名与 AIP 的扁平清单。
   */
  occ: PnpOcc[]
}

/**
 * pnpVerdictOf 的入参。
 */
export type PnpVerdictIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 本岗。
   */
  job: PnpJob

  /**
   * PNP 命中计算的结论。
   */
  match: PnpMatchOut
}

/**
 * shownStreamsOf 的入参。
 */
export type ShownStreamsIn = {
  /**
   * PNP 命中计算的结论。
   */
  match: PnpMatchOut

  /**
   * 本岗职业码。
   */
  noc: string
}

/**
 * streamRowsOf 的入参。
 */
export type StreamRowsIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语言。
   */
  lang: PnpLang

  /**
   * 出不出译名灰注。
   */
  showZh: boolean

  /**
   * 这张清单。
   */
  stream: PnpStream

  /**
   * 本岗职业码。
   */
  noc: string

  /**
   * 职业名字典。
   */
  nocRows: NocRowMap

  /**
   * 展开了没有。
   */
  open: boolean
}

/**
 * hiddenCountOf 的入参。
 */
export type HiddenCountIn = {
  /**
   * 这张清单。
   */
  stream: PnpStream

  /**
   * 本岗职业码。
   */
  noc: string
}

/**
 * foldLabelOf 的入参。
 */
export type FoldLabelIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 展开了没有。
   */
  open: boolean

  /**
   * 折起来的条数。
   */
  hidden: number
}

/**
 * localTitleOf 的入参。
 */
export type LocalTitleIn = {
  /**
   * 界面语言。
   */
  lang: PnpLang

  /**
   * 出不出译名灰注。
   */
  showZh: boolean

  /**
   * 职业名字典。
   */
  nocRows: NocRowMap

  /**
   * 职业码。
   */
  noc: string

  /**
   * 主文案(译名与它同字就不出灰注 —— 一行不说两遍)。
   */
  name: string
}

/**
 * eeGroupOf 的入参。
 */
export type EeGroupIn = {
  /**
   * EE 类别的扁平清单。
   */
  cats: PnpEeOcc[]
}

/**
 * eeHistOf 的入参。
 */
export type EeHistIn = {
  /**
   * 全部抽选行。
   */
  draws: PnpDraw[]
}

/**
 * eeShownOf 的入参。
 */
export type EeShownIn = {
  /**
   * 分组后的全部类别。
   */
  grouped: PnpEeCat[]

  /**
   * 命中本岗的类别。
   */
  hit: PnpEeCat[]

  /**
   * 各类别的历史轮次。
   */
  histOf: HistMap

  /**
   * 全类别全景展开了没有。
   */
  showAll: boolean
}

/**
 * eeHitOf 的入参。
 */
export type EeHitIn = {
  /**
   * 分组后的全部类别。
   */
  grouped: PnpEeCat[]

  /**
   * 本岗职业码。
   */
  noc: string
}

/**
 * eeVerdictTextOf 的入参。
 */
export type EeVerdictTextIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 命中本岗的类别。
   */
  hit: PnpEeCat[]

  /**
   * 本岗职业码。
   */
  noc: string
}

/**
 * eeAllLabelOf 的入参。
 */
export type EeAllLabelIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 命中本岗的类别。
   */
  hit: PnpEeCat[]

  /**
   * 分组后的全部类别。
   */
  grouped: PnpEeCat[]
}

/**
 * eeDrawsCatsOf 的入参。
 */
export type EeDrawsCatsIn = {
  /**
   * 这一屏要展示的类别。
   */
  shown: PnpEeCat[]
}

/**
 * eeLastDraw 只读的那两项(桶门签名冻结,调用方递进来的是各自域的整行)。
 */
export type EeDrawDateRow = {
  /**
   * 类别人话名(与岗位上的 label 逐段比对)。
   */
  label: string

  /**
   * 上次抽选日期;''=从没抽过。
   */
  drawDate: string
}

/**
 * eeDrawTextOf 的入参。
 */
export type EeDrawLineIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 这个类别。
   */
  cat: PnpEeCat
}

/**
 * histRowsOf 的入参。
 */
export type HistRowsIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 这个类别的历史轮次。
   */
  hist: PnpDraw[]
}

/**
 * occRowsOf 的入参。
 */
export type OccRowsIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语言。
   */
  lang: PnpLang

  /**
   * 出不出译名灰注。
   */
  showZh: boolean

  /**
   * 这个类别。
   */
  cat: PnpEeCat

  /**
   * 本岗职业码。
   */
  noc: string

  /**
   * 职业名字典。
   */
  nocRows: NocRowMap
}

/**
 * fedRoundsOf 的入参。
 */
export type FedRoundsIn = {
  /**
   * 全部抽选行。
   */
  draws: PnpDraw[]
}

/**
 * fedBucketsOf 的入参。
 */
export type FedBucketsIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 联邦轮次。
   */
  rounds: PnpDraw[]
}

/**
 * fedLabelOf 的入参。
 */
export type FedLabelIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 轮次类型键。
   */
  key: string
}

/**
 * hasProvDraws 的入参。
 */
export type HasProvDrawsIn = {
  /**
   * 本岗。
   */
  job: PnpJob

  /**
   * 全部抽选行。
   */
  draws: PnpDraw[]
}

/**
 * hasProvNews 的入参。
 */
export type HasProvNewsIn = {
  /**
   * 本岗。
   */
  job: PnpJob

  /**
   * 全部动态。
   */
  news: PnpNewsSlim[]
}

/**
 * tagClsOf 的入参。
 */
export type TagClsIn = {
  /**
   * 弱化档(GTA 限制那种附注标比「你的职业」浅一档)。
   */
  muted: boolean
}

/**
 * mmRowOf 的入参(依据链一行的各项)。
 */
export type MmRowOfIn = {
  /**
   * 这一条依据的文案键(拼 React 列表键)。
   */
  key: string

  /**
   * 维度名。
   */
  dim: string

  /**
   * 本岗这一格。
   */
  job: MmCellSpec

  /**
   * 我的那一格;null=这条没有「我的」可比。
   */
  you: MmCellSpec | null

  /**
   * 判定档。
   */
  tone: MmTone

  /**
   * 判定话术;''=渲空值符。
   */
  text: string

  /**
   * 判定的悬停提示;''=没有提示。
   */
  tip: string
}

/**
 * fedRowsOf 的入参。
 */
export type FedRowsIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 联邦轮次。
   */
  rounds: PnpDraw[]

  /**
   * 展开了没有(收着时只给前 FED_SHOW 轮)。
   */
  open: boolean
}

/**
 * fedMoreLabelOf 的入参。
 */
export type FedMoreLabelIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 展开了没有。
   */
  open: boolean

  /**
   * 一共几轮。
   */
  total: number
}

/**
 * matchResultOf 的入参。
 */
export type MatchResultIn = {
  /**
   * 本岗。
   */
  job: PnpJob

  /**
   * 身份与档案。
   */
  plan: PnpPlan

  /**
   * 省提名清单。
   */
  pnpOcc: PnpOcc[]

  /**
   * EE 类别清单。
   */
  eeOcc: PnpEeOcc[]
}

/**
 * mmRowsOf 的入参。
 */
export type MmRowsIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语言。
   */
  lang: PnpLang

  /**
   * 本岗。
   */
  job: PnpJob

  /**
   * 用户档案。
   */
  profile: PnpProfile

  /**
   * 职业名字典。
   */
  nocDesc: PnpNocDesc[]

  /**
   * 依据链。
   */
  reasons: PnpMatchReason[]
}

/**
 * 各条 rule 的行构造入参(一条 reason + 它需要的上下文)。
 */
export type MmRuleIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语言。
   */
  lang: PnpLang

  /**
   * 本岗。
   */
  job: PnpJob

  /**
   * 用户档案。
   */
  profile: PnpProfile

  /**
   * 职业名字典。
   */
  nocDesc: PnpNocDesc[]

  /**
   * 这一条依据。
   */
  reason: PnpMatchReason

  /**
   * 这一条的渲染参数(收窄过的那张表)。
   */
  params: ReasonParams
}

/**
 * mmProvCellOf 的入参。
 */
export type MmProvCellIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 两位省码。
   */
  code: string
}

/**
 * mmProvListCellOf 的入参。
 */
export type MmProvListCellIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 目标省码。
   */
  codes: string[]
}

/**
 * mmNocCellOf 的入参。
 */
export type MmNocCellIn = {
  /**
   * 界面语言。
   */
  lang: PnpLang

  /**
   * 职业名字典。
   */
  nocDesc: PnpNocDesc[]

  /**
   * 职业码。
   */
  code: string
}

/**
 * mmNocListCellOf 的入参。
 */
export type MmNocListCellIn = {
  /**
   * 界面语言。
   */
  lang: PnpLang

  /**
   * 职业名字典。
   */
  nocDesc: PnpNocDesc[]

  /**
   * 职业码。
   */
  codes: string[]
}

/**
 * mmTeerCellOf 的入参。
 */
export type MmTeerCellIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 本岗。
   */
  job: PnpJob
}

/**
 * mmSalaryTextOf 的入参。
 */
export type MmSalaryTextIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 本岗。
   */
  job: PnpJob
}

/**
 * levelClsOf 的入参。
 */
export type LevelClsIn = {
  /**
   * 匹配总档。
   */
  level: PnpMatchLevel
}

/**
 * levelTextOf 的入参。
 */
export type LevelTextIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 匹配总档。
   */
  level: PnpMatchLevel
}

/**
 * drawsClsOf 的入参。
 */
export type DrawsClsIn = {
  /**
   * 一条抽选都没有(整块 display:none,不占位)。
   */
  empty: boolean
}

/**
 * dimClsOf 的入参(改制日之前的旧轮次压暗)。
 */
export type DimClsIn = {
  /**
   * 压不压暗。
   */
  dim: boolean
}

/**
 * hitClsOf 的入参。
 */
export type HitClsIn = {
  /**
   * 是不是命中行。
   */
  hit: boolean
}

/**
 * catNameClsOf 的入参。
 */
export type CatNameClsIn = {
  /**
   * 大一号档(清单卡的类别名比抽选卡的大一档)。
   */
  lg: boolean
}

/**
 * drawLineClsOf 的入参。
 */
export type DrawLineClsIn = {
  /**
   * 可点(有历史可展开时才给手型)。
   */
  clickable: boolean
}

/**
 * eeVerdictClsOf 的入参。
 */
export type EeVerdictClsIn = {
  /**
   * 命中了没有。
   */
  hit: boolean
}

/**
 * boxClsOf 的入参。
 */
export type BoxClsIn = {
  /**
   * 裁掉溢出(斑马纹圆角内不出血)。
   */
  clip: boolean

  /**
   * 上边距档:top=只上,both=上下,none=不留。
   */
  gap: 'none' | 'top' | 'both'
}

/**
 * makeHitRef 的入参。
 */
export type HitRefIn = {
  /**
   * 是不是命中行(不是就不登记,ref 盒仍指着真正命中的那一行)。
   */
  hit: boolean

  /**
   * 命中行的 ref 盒。
   */
  ref: HitRef
}

/**
 * scrollIntoHit 的入参。
 */
export type ScrollIntoHitIn = {
  /**
   * 命中行的 ref 盒。
   */
  ref: HitRef
}

/**
 * makeToggleOf 的入参(折叠一组:按键开合)。
 */
export type ToggleSetIn = {
  /**
   * 折叠状态的写入口。
   */
  setKeys: React.Dispatch<React.SetStateAction<Set<string>>>
}

/**
 * makeCatToggleOf 的入参(单开一个:同一时刻只展开一个类别的历史)。
 */
export type CatToggleIn = {
  /**
   * 当前展开的类别键;null=都收着。
   */
  openCat: string | null

  /**
   * 展开态的写入口。
   */
  setOpenCat: React.Dispatch<React.SetStateAction<string | null>>
}

/**
 * makeFlagToggle 的入参(一个开关的开合)。
 */
export type FlagToggleIn = {
  /**
   * 开关的写入口。
   */
  setOn: React.Dispatch<React.SetStateAction<boolean>>
}
