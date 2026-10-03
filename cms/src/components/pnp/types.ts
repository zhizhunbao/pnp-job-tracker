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
   * 走不了省提名的原因码(数据层判;'' = 走得了;2026-09-29「本岗不满足的门槛」卡读它)。
   */
  pnpBlock: string

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

  /**
   * 官方页(数据层抓这一行的那一页;2026-09-26 起事实卡底部的官方链接读它)。
   * 同晚起三种抽选卡标题那一行右端的「来源」读它(每省一页:各通道的轮次都在同一页上)。
   */
  url: string

  /**
   * 同一组同一天几行各是哪一项选取(数据层短码 occ / top:N / franco / grad / wage:H:Y / points / path:a+b;
   * 认不出空串;2026-09-27 Frank「照改,加这一列」)。
   */
  selection: string

  /**
   * 这一轮的人数属于哪个项目(PNP / AIP / PNP+AIP 同池;认不出空串;2026-09-29 抽选卡重排:本省抽选、AIP 抽选两张卡按它分)。
   */
  program: string

  /**
   * 人数数的是什么(invitation / selection / application;2026-09-29 抽选卡重排:「份邀请 / 人入选 / 份申请入选」按它写)。
   */
  unit: string

  /**
   * 官方人数只写上限时的上限(AB「Less than 10」→ 10);确数行为 null(2026-09-29 抽选卡重排:行上写「少于 N 份邀请」)。
   */
  invitationsBelow: number | null
}

/**
 * 全国通道对照表的一行(库表 pathways,etl/pathways 人工核定 + 每轮对 raw/pnp 自校;2026-09-28 通道表批二起,
 * 本岗走哪条通道、它对应哪几组抽选 / 哪几条门槛流 / 配额表哪一行,都读它,前端五张对照常量退役)。只声明本域真读的格。
 */
export type PnpPathway = {
  /**
   * 省码(联邦项目写 FED)。
   */
  province: string

  /**
   * 岗位上挂的通道名(= 数据层 pnp_stream 取值);省默认通道为 null。
   */
  boardLabel: string | null

  /**
   * 省默认通道:本省可提名但没挂具名通道的岗落它。
   */
  isDefault: boolean

  /**
   * 官方用来邀请它的抽选组(抽选行 stream 原值;没有给空列)。
   */
  drawStreams: string[]

  /**
   * 门槛表里的流(门槛行 stream 原值;门槛卡没接的省给空列)。
   */
  reqStreams: string[]

  /**
   * 配额行的通道键(与配额行 streamKey 同一个归一);没有通道级配额为 null。
   */
  quotaKey: string | null

  /**
   * 官方英文原名(「本岗能走的通道」卡的灰字;库里缺了是空串)。
   */
  officialName: string

  /**
   * 我们的编号(通道条目的列表键;2026-09-30 通道补全批二)。
   */
  key: string

  /**
   * 我们的中文直白名(中文界面灰字)。
   */
  plainZh: string

  /**
   * 我们的韩文直白名(韩文界面灰字)。
   */
  plainKo: string

  /**
   * 跟这个岗有没有关系:要本省 offer 或本省工作经验 = true(通道卡上段);不看工作 = false(下段)。
   */
  jobLinked: boolean

  /**
   * 条件标签键(etl/pathways 的 TAG_KEYS 词表)。
   */
  tags: string[]

  /**
   * 本岗 TEER 在内才列上段;空 = 不限。
   */
  teers: number[]

  /**
   * 本岗职业码在内才列上段;空 = 不限。
   */
  nocs: string[]

  /**
   * 雇主名(归一后小写)命中才列上段;空 = 不限。
   */
  employers: string[]

  /**
   * 职业清单名(本岗职业码在其中任一张才列上段);空 = 不限。
   */
  occLabels: string[]

  /**
   * 通道自己那一页(2026-09-30 资讯页「通道与门槛」:门槛表一行没收录的通道,卡上来源退到它)。
   */
  url: string

  /**
   * 登没登申请步骤(2026-10-02 申请步骤批 1;格子能不能点把它也算有卡)。
   */
  hasSteps: boolean
}

/**
 * pnpChannelOf 的入参。
 */
export type PnpChannelOfIn = {
  /**
   * 本岗(读具名通道、可提名与省码)。
   */
  job: PnpJob

  /**
   * 全国通道对照(整表)。
   */
  pathways: PnpPathway[]
}

/**
 * genDrawOf 的入参。
 */
export type GenDrawIn = {
  /**
   * 省码。
   */
  province: string

  /**
   * 全国通道对照(整表)。
   */
  pathways: PnpPathway[]
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

  /**
   * 清单管哪几条子类(官方原文;'' = 全项目)。SK 主线不合格表是「OID/EE」,不管带 offer 的岗(2026-09-27)。
   */
  appliesTo: string
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
   * 官方英文类别名(ee_categories.name_en,2026-10-02 起;换版到重灌之间为空)。
   */
  nameEn: string

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
   * 官方英文类别名;'' = 库里还没有(退回站内英文名)。
   */
  nameEn: string

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
}

/**
 * EE 分数线对比(本岗类别最近一轮 vs CEC 最近一轮;2026-09-23)。
 */
export type EeCmp = {
  /**
   * 分组:本岗类别在前,CEC、法语殿后(2026-09-23 第二版:三组分开列,组头 = 最近一轮,点开列全部轮次)。
   */
  groups: EeCmpGroup[]

  /**
   * 分差行:活跃且有分的类别各一行。
   */
  lines: EeCmpLine[]
}

/**
 * 分数线卡的一组(本岗类别 / CEC / 法语)。
 */
export type EeCmpGroup = {
  /**
   * 类别键(=联邦轮次 label;React 列表键与折叠键)。
   */
  key: string

  /**
   * 显示名。
   */
  name: string

  /**
   * 名字下的灰字译名(省抽选组:中文界面出通道中文名,只在组头出一次;''=不出)。
   */
  sub: string

  /**
   * 组头悬停说明;''=不出。
   */
  tip: string

  /**
   * 最近一轮的最低分文案(从没抽过写「暂无抽选」)。
   */
  score: string

  /**
   * 最近一轮日期;''=从没抽过。
   */
  date: string

  /**
   * 轮数文案;''=一轮都没有(2026-09-23 前是不到两轮就空)。
   */
  rounds: string

  /**
   * 压不压暗(休眠或从没抽过的类别)。
   */
  dim: boolean

  /**
   * 全部轮次(降序,照抄省抽选表的行)。
   */
  rows: DrawRowSpec[]

  /**
   * 能不能展开(有轮次就给;一轮都没有不给假入口。2026-09-23 前是两轮起才给)。
   */
  expandable: boolean

  /**
   * 分数格写的不是分数(没公布分写邀请数、从没抽过写「暂无抽选」;换成常规字重次级灰)。
   */
  noScore: boolean

  /**
   * 本岗对应这一组(点进来的那个格子写的就是它):琥珀高亮;省抽选卡里还排最前。
   */
  hit: boolean

  /**
   * 组头第三行:这一组的本年合计(「共 7,465 份邀请」「至少 198 份邀请」;全是只写上限的轮次写上限那一句;'' = 不出这一行;
   * EE 分数线卡的组恒为 '';2026-09-29 Frank「每一个通道也需要一个总数吧」,选「单独一行靠右」)。
   */
  total: string
}

/**
 * cmpScoreClsOf 的入参。
 */
export type CmpScoreClsIn = {
  /**
   * 分数格写的不是分数。
   */
  noScore: boolean
}

/**
 * 分差一行。
 */
export type EeCmpLine = {
  /**
   * React 列表键(=类别键)。
   */
  key: string

  /**
   * 分差文案。
   */
  text: string

  /**
   * 比 CEC 低吗(低 = 走这一类更容易,绿字)。
   */
  lower: boolean
}

/**
 * 本省抽选卡的形(2026-09-26 /fe 首页 Frank「止血 + 补完整」):groups = 按通道分组(带日期的轮次)、
 * monthly = 按月列选取人数(只到月的汇总行,NS)、status = 改制省的现状(ON)、none = 不出卡。
 */
export type DrawsForm = 'groups' | 'monthly' | 'status' | 'none'

/**
 * 抽选人数的口径:aip = 选中进入审理的申请、sel = 从 EOI 池里选取的人、inv = 发出的邀请。
 */
export type CountKind = 'aip' | 'sel' | 'inv'

/**
 * 「本岗能走的通道」卡的一条(2026-09-26;口径同职位板 PNP 格:具名通道先,可提名退该省通用通道名)。
 */
export type ChannelSpec = {
  /**
   * React 列表键(数据层通道标签或通用通道名的词条键)。
   */
  key: string

  /**
   * 官方英文原名(主文案;2026-09-29 凌晨至下午一度是界面语言直白名)。
   */
  name: string

  /**
   * 界面语言名灰字;''=不出(英文界面、关了译名、或与主文案同字)。
   */
  sub: string

  /**
   * 条件标签(2026-09-30 通道补全批二;没有给空列)。
   */
  tags: ChannelTag[]
}

/**
 * 通道条目上的一枚条件标签(2026-09-30 通道补全批二)。
 */
export type ChannelTag = {
  /**
   * React 列表键(标签键)。
   */
  key: string

  /**
   * 标签文字(界面语言)。
   */
  text: string

  /**
   * 胶囊类名(通用 tag 桶:状态类 warn、其余 gray)。
   */
  cls: string
}

/**
 * 抽选卡标题那一行右端的官方链接(「来源」+ 站名,新开页;三种抽选卡同一处,2026-09-26 晚 Frank 选「标题那一行右端」,问「每个通道 link 不一样吧」—— 抽选数据每省只来自一个官方页,各通道同一个链接)。
 */
export type SourceLink = {
  /**
   * 钮上的字(「来源 ↗」;2026-09-27 Frank「这个来源看着很突兀 按钮」→ 选「描边小钮」,站名不再上钮,原先「来源」标签 + 站名两格并成这一格)。
   */
  text: string

  /**
   * 官方页地址。
   */
  href: string
}

/**
 * 分组形的本省抽选卡(本岗那一组排最前,其余组收在「查看全省 N 组」开关后面)。
 * 2026-09-26 晚 Frank「上面这个高亮是不是格式改成和下面的一样的」:本岗那一组不再单独摊开,与其余组同一种组头行。
 */
export type DrawCard = {
  /**
   * 卡标题(「本省最近抽选」;2026-09-26 晚起轮次标签不再拼进标题)。
   */
  title: string

  /**
   * 轮次标签(官方项目名,如 AAIP;「查看全省 N 组」的英文文案要它)。
   */
  label: string

  /**
   * 本岗对应的组(格子写的通道对得上的那几组;浅蓝组头行,开关收起时也留着;对不上给空列)。
   */
  hits: EeCmpGroup[]

  /**
   * 其余组(照旧组头一行 + 点开列轮次;收在开关后面)。
   */
  others: EeCmpGroup[]

  /**
   * 全省一共几组(开关文案里的 N)。
   */
  total: number

  /**
   * 标题右端的官方来源(本省抽选页);认不出站名给 null(不出)。
   */
  source: SourceLink | null

  /**
   * 标题下的灰字说明(一行一条:NB 不按分数、NS 同池含 AIP、SK 不经抽选、AIP 卡指回本省抽选;2026-09-29 抽选卡重排)。
   */
  lines: string[]

  /**
   * 卡底合计行(「2026 年 80 轮,至少 13,083 份邀请」+「其中 6 轮官方只写少于 10」;轮数数卡里列的,份数读汇装合计;2026-09-29)。
   */
  foot: string[]

  /**
   * 「查看全省 N 组」开关的键(三张抽选卡各一把,分开开合;2026-09-29)。
   */
  allKey: string
}

/**
 * 当年省提名配额的一行(lib/jobs PNP_OPS_QUOTA 洗净后整份透传;本域只声明真读的格,2026-09-27 Frank 勾「2026 名额小表」「全年名额部分也单独弄个框」)。
 */
export type PnpOps = {
  /**
   * 省码。
   */
  province: string

  /**
   * 指标(allocation / issued / nominations_ytd / remaining / invitations_ytd / selections_ytd)。
   */
  metric: string

  /**
   * 口径层级:'' = 全省,'stream' = 通道级。
   */
  scopeKind: string

  /**
   * 通道键(小写官方通道名);全省行为 ''。
   */
  streamKey: string

  /**
   * 数值;官方只给了区间或文字时为 null(2026-09-30 魁省甄选计划 32,600–35,600,折成一个数 = 替官方编数)。
   */
  value: number | null

  /**
   * value 为 null 时的官方原文(区间等);有数值的行为 ''。
   */
  valueText: string

  /**
   * 截至日(`YYYY-MM-DD`);官方没写给 ''。
   */
  asOf: string

  /**
   * 统计期(如 `2026`、`2026 Jan-Aug`);没有给 ''。
   */
  period: string

  /**
   * 官方页。
   */
  url: string

  /**
   * 口径层级的原名(抽选组合计那一种 = 抽选行 stream 原值,对组键用;2026-09-29 Frank「每一个通道也需要一个总数吧」,选「单独一行靠右」)。
   */
  scope: string
}

/**
 * 「{年} 年配额」卡的一行(全省 / 本岗通道;cells 与卡的 heads 逐格对齐)。
 */
export type QuotaRowSpec = {
  /**
   * React 列表键。
   */
  key: string

  /**
   * 行名(全省 / 本岗通道)。
   */
  label: string

  /**
   * 各列的值(千分位;这一行没有这一项写长横)。
   */
  cells: string[]
}

/**
 * 「{年} 年配额」卡(2026-09-27 Frank 勾「2026 名额小表」「全年名额部分也单独弄个框」)。
 */
export type QuotaCardSpec = {
  /**
   * 卡标题(「2026 年配额」)。
   */
  title: string

  /**
   * 标题右端的官方来源;认不出站名给 null。
   */
  source: SourceLink | null

  /**
   * 列名(总数 / 已发提名 / 剩余,只列这个省官方有的项)。
   * 2026-09-27 Frank「已发和总数放到一个卡片里可以吗」:抽选卡那行全年合计并进来,多「已发邀请 / 已入选」两项。
   */
  heads: string[]

  /**
   * 行(全省一行;阿省这类公布到通道的,本岗通道再一行)。
   */
  rows: QuotaRowSpec[]

  /**
   * 表下右端「截至 {日期}」那几行:各列截至日一致只写一行;不一致逐列写「{列名}截至 {日期}」(2026-09-27 Frank「这个数据怎么回事」「这两个还不一样吗」「这他妈弄的乱七八糟的」,看过效果图选「照改,加这一列」
   * —— 曼省已发提名截至 08 月、已邀请申请截至 09-24,原先只写最右一列的 09-24,读成提名数也截至 09-24;
   * 同日 Frank「这个截止日期放到右下角呢」)。官方都没写截至日给空列。
   */
  asOfLines: string[]

  /**
   * 卡标题的年份(抽选卡只列这一年,与标题同一个来源;2026-09-29 抽选卡重排)。
   */
  year: string
}

/**
 * asOfLinesOf 的入参(列名与各列截至日逐格对齐)。
 */
export type AsOfLinesIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 列名(已取词)。
   */
  heads: string[]

  /**
   * 各列的截至日('' = 官方没写)。
   */
  dates: string[]

  /**
   * 各列认的指标名(认出「已发邀请」那一列;2026-10-02 起截至只写它的日期)。
   */
  cols: string[][]
}

/**
 * colAsOfOf 的入参。
 */
export type ColAsOfIn = {
  /**
   * 这一列认的指标名。
   */
  metrics: string[]

  /**
   * 这一列在全省那一层挑到的配额行。
   */
  row: PnpOps
}

/**
 * selectionLabelOf 的入参。
 */
export type SelectionLabelIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 数据层的 selection 短码(occ / top:N / franco / grad / wage:H:Y / points / path:a+b;'' = 认不出)。
   */
  code: string
}

/**
 * quotaCardOf 的入参。
 */
export type QuotaCardOfIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 省码。
   */
  province: string

  /**
   * 当年省提名配额行。
   */
  ops: PnpOps[]

  /**
   * 本岗对应的抽选组(抽选行 stream 原值;小写后与配额行的通道键对得上才出「本岗通道」那一行)。
   */
  hitStreams: string[]

  /**
   * 本岗通道在配额表里的通道键(通道对照表的 quotaKey;'' = 没有),先于抽选组名查(2026-09-27 起;原 QUOTA_STREAM_KEYS,
   * 2026-09-28 通道表批二改读 pathways)。
   */
  quotaKey: string
}

/**
 * quotaRowOf 的入参。
 */
export type QuotaRowIn = {
  /**
   * 这一省的配额行。
   */
  rows: PnpOps[]

  /**
   * 通道键;'' = 全省那一行。
   */
  streamKey: string

  /**
   * 列(每列认哪几个指标名,与卡的 heads 同序)。
   */
  cols: string[][]

  /**
   * 行名(全省 / 本岗通道)。
   */
  label: string
}

/**
 * quotaStreamKeyOf 的入参。
 */
export type QuotaStreamIn = {
  /**
   * 这一省的配额行。
   */
  rows: PnpOps[]

  /**
   * 本岗通道在配额表里的通道键(通道对照表的 quotaKey;'' = 没有),先查它(2026-09-27 起;原 QUOTA_STREAM_KEYS,
   * 2026-09-28 通道表批二改读 pathways)。
   */
  quotaKey: string

  /**
   * 本岗对应的抽选组(抽选行 stream 原值)。
   */
  hitStreams: string[]
}

/**
 * opsPickOf 的入参(在一省的配额行里按层级 / 通道 / 指标挑一行)。
 */
export type OpsPickIn = {
  /**
   * 这一省的配额行。
   */
  rows: PnpOps[]

  /**
   * 通道键;'' = 全省那一层。
   */
  streamKey: string

  /**
   * 认哪几个指标名(已发提名两省叫法不同,见 OPS_ISSUED_METRICS)。
   */
  metrics: string[]
}

/**
 * PnpQuotaCard(「{年} 年配额」卡)的 props。
 */
export type PnpQuotaCardIn = {
  /**
   * 洗好的卡。
   */
  spec: QuotaCardSpec
}

/**
 * 省提名门槛表的一行(lib/jobs PNP_GATE_REQS 洗净后整份透传;本域只声明真读的格,2026-09-27 Frank 勾「门槛卡」「用本岗通道的门槛」)。
 */
export type PnpReq = {
  /**
   * 省码。
   */
  province: string

  /**
   * 官方流名。
   */
  stream: string

  /**
   * 主体:applicant / employer / offer。
   */
  subject: string

  /**
   * 因素(见 GATE_F)。
   */
  factor: string

  /**
   * 算子。
   */
  op: string

  /**
   * 门槛数值;条文行与编码行是 null。
   */
  value: number | null

  /**
   * 单位;条文行给 ''。
   */
  unit: string

  /**
   * 只对这几档 TEER 生效(逗号串);'' = 不限。
   */
  appliesTeer: string

  /**
   * 只对这几个职业码前缀生效(逗号串);'' = 不限。
   */
  appliesNoc: string

  /**
   * 这几个职业码前缀不适用(逗号串;安省技工档排除 726 / 932、卡车 / 公交司机不适用应届与执照两条);'' = 不排除。
   */
  excludesNoc: string

  /**
   * 只对这个区域生效;'' = 全省。
   */
  appliesArea: string

  /**
   * 非地域的适用条件;'' = 对谁都适用。
   */
  appliesCondition: string

  /**
   * 口径包(`k=v;k=v`)。
   */
  basis: string

  /**
   * 出处页。
   */
  url: string

  /**
   * 项目(PNP / AIP;2026-09-29 抽选卡重排起「不经抽选」那类行也取回,AIP 卡按 AIP 那行写)。
   */
  program: string
}

/**
 * 门槛卡的一行(行名 - 值;值点开看原句)。
 */
export type GateRowSpec = {
  /**
   * 行键(见 GATE_ROW)。
   */
  key: string

  /**
   * 行名(雇主 offer / 语言 …)。
   */
  label: string

  /**
   * 值,一行一条(经验的「或」款另起一行)。
   */
  lines: string[]

  /**
   * 值格下的灰字注,一行一条(2026-09-30 魁省门槛卡:法语行挂考试分数线、执照行挂监管机构);九省各行为空。
   */
  notes: string[]
}

/**
 * 「本岗通道的门槛」卡(2026-09-27 Frank 勾「门槛卡」「用本岗通道的门槛」)。
 */
export type GateCardSpec = {
  /**
   * 卡标题。
   */
  title: string

  /**
   * 标题下一行灰字(2026-09-30 魁省门槛卡:官方原名作标题,这里写界面语言名);'' = 不出(九省门槛卡)。
   * 同日资讯页「通道与门槛」:九省的卡也写(通道的界面语言直白名;英文界面、与原名同字不出)。
   */
  sub: string

  /**
   * 条件标签(2026-09-30 资讯页「通道与门槛」:灰字下一行,同通道卡的标签;弹框两种门槛卡给空列)。
   */
  tags: ChannelTag[]

  /**
   * 标题右端的官方来源;认不出站名给 null。
   */
  source: SourceLink | null

  /**
   * 行。
   */
  rows: GateRowSpec[]

  /**
   * 一行门槛都没有时卡上那句(资讯页「本站未收录门槛」,2026-09-30);'' = 有行(弹框两种门槛卡恒为 '')。
   */
  empty: string
}

/**
 * 门槛卡挑档看的那三格(2026-09-30 通道与门槛批 2:职位弹框传本岗,资讯页传「某省、不看职业、某档 TEER」的探针;
 * 门槛卡各行构造器只读这三格)。
 */
export type GateWho = {
  /**
   * 省码(行里「本省」写它的界面名)。
   */
  province: string

  /**
   * 职业码;'' = 不看职业(资讯页)。
   */
  noc: string

  /**
   * 技能层级;null = 不看档(只挑不分档的门槛行)。
   */
  teer: number | null
}

/**
 * gateCardOf 的入参。
 */
export type GateCardOfIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 本岗。
   */
  job: PnpJob

  /**
   * 门槛表(全国)。
   */
  reqs: PnpReq[]

  /**
   * 本岗走的那条通道(pnpChannelOf 给的;null = 没有):门槛表里认哪几条流看它的 reqStreams。
   */
  channel: PnpPathway | null
}

/**
 * 门槛卡各行构造器的共同入参。
 */
export type GateRowOfIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 本岗(只读省、职业码、TEER 三格;资讯页是探针,见 GateWho)。
   */
  job: GateWho

  /**
   * 本省全部门槛行(offer 形态与雇主三项是全省一份)。
   */
  mine: PnpReq[]

  /**
   * 本岗通道那几条流的门槛行。
   */
  chan: PnpReq[]
}

/**
 * gateUrlOf 的入参。
 */
export type GateUrlIn = {
  /**
   * 本岗通道那几条流的门槛行。
   */
  chan: PnpReq[]

  /**
   * 本岗通道登记的流名(按登记先后取出处;2026-09-29)。
   */
  streams: string[]
}

/**
 * rowOfFactor 的入参。
 */
export type RowOfFactorIn = {
  /**
   * 门槛行。
   */
  rows: PnpReq[]

  /**
   * 因素名。
   */
  factor: string
}

/**
 * drawGroupOpenOf 的入参(2026-10-02)。
 */
export type DrawGroupOpenIn = {
  /**
   * 抽选卡开合的键集合。
   */
  open: Set<string>

  /**
   * 这一组的键。
   */
  key: string

  /**
   * 整张卡是不是只有这一组。
   */
  single: boolean
}

/**
 * wageLowAppliesOf 的入参(2026-10-02 职位页移民相关卡)。
 */
export type WageLowIn = {
  /**
   * 本岗(只读省、职业码、TEER 三格)。
   */
  job: GateWho

  /**
   * 全国门槛行。
   */
  reqs: PnpReq[]
}

/**
 * reqAppliesOf 的入参。
 */
export type ReqAppliesIn = {
  /**
   * 一行门槛。
   */
  r: PnpReq

  /**
   * 本岗(资讯页是探针)。
   */
  job: GateWho
}

/**
 * zonedLinesOf 的入参。
 */
export type ZonedLinesIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 分区的雇主门槛行。
   */
  rows: PnpReq[]

  /**
   * 要哪一项(年收入 / 全职员工)。
   */
  factor: string

  /**
   * 这一项的文案键(带 {n} 与 {area})。
   */
  key: string
}

/**
 * langPickOf 的入参。
 */
export type LangPickIn = {
  /**
   * 本岗通道的语言行。
   */
  rows: PnpReq[]

  /**
   * 本岗。
   */
  job: GateWho
}

/**
 * nocHitOf 的入参。
 */
export type NocHitIn = {
  /**
   * 本岗职业码。
   */
  noc: string

  /**
   * 门槛行的职业码前缀(逗号串)。
   */
  applies: string
}

/**
 * teerHitOf 的入参。
 */
export type TeerHitIn = {
  /**
   * 本岗 TEER;null = 未分类。
   */
  teer: number | null

  /**
   * 门槛行的 TEER 档(逗号串)。
   */
  applies: string
}

/**
 * basisValueOf / basisHasOf 的入参。
 */
export type BasisKeyIn = {
  /**
   * 口径包。
   */
  basis: string

  /**
   * 键。
   */
  key: string
}

/**
 * expLineOf 的入参。
 */
export type ExpLineIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 经验行。
   */
  r: PnpReq

  /**
   * 月数(调用方已判过不是 null)。
   */
  n: number
}

/**
 * PnpGateCard 的 props。
 */
export type PnpGateCardIn = {
  /**
   * 洗好的卡。
   */
  spec: GateCardSpec
}

/**
 * PnpGateRows(门槛卡的行)的 props(2026-10-01 三弹框统一)。
 */
export type PnpGateRowsIn = {
  /**
   * 洗好的行。
   */
  rows: GateRowSpec[]
}

/**
 * PnpGateGroupCard(魁省合并门槛卡)的 props(2026-10-01 三弹框统一)。
 */
export type PnpGateGroupCardIn = {
  /**
   * 卡标题(「申请门槛」)。
   */
  title: string

  /**
   * 各通道洗好的门槛卡(一卡一小节)。
   */
  specs: GateCardSpec[]
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
   * 当年省提名配额行(2026-09-27 Frank 勾「2026 名额小表」「全年名额部分也单独弄个框」;给「{年} 年配额」卡与抽选卡「全年已邀请」那一行)。
   */
  ops: PnpOps[]

  /**
   * 省提名门槛表(2026-09-27 Frank 勾「门槛卡」「用本岗通道的门槛」;给「本岗通道的门槛」卡)。
   */
  reqs: PnpReq[]

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

  /**
   * 全国通道对照(整表;本岗走哪条通道、对应的抽选组 / 门槛流 / 配额行都读它,2026-09-28 通道表批二)。
   */
  pathways: PnpPathway[]

  /**
   * 魁省岗这个职业的通道(2026-09-30 魁省门槛弹框;魁省岗每个通道一张门槛卡,其余卡不出)。
   */
  qcChannels: QcChannel[]

  /**
   * 登了步骤的通道(2026-10-02 申请步骤批 1;本岗通道登了就出「申请步骤」卡,替掉抽选卡)。
   */
  steps: PnpStepSet[]

  /**
   * 步骤引用的运营统计(处理时长 + 萨省收件窗口)。
   */
  stepOps: PnpStepOp[]
}

/**
 * 卡头 / 组头的名字两行(2026-10-02 Frank「除了 table 这部分,比如详情页面 英文在上 中文在下灰字」)。
 */
export type HeadNames = {
  /**
   * 主文案:英文官方名。
   */
  name: string

  /**
   * 灰字:界面语言名;'' = 不出(英文界面、关了译名或与主文案同字)。
   */
  sub: string
}

/**
 * streamHeadOf 的入参。
 */
export type StreamHeadIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语言。
   */
  lang: PnpLang

  /**
   * 译名开关。
   */
  showZh: boolean

  /**
   * 这张清单。
   */
  stream: PnpStream
}

/**
 * eeCatHeadOf 的入参。
 */
export type EeCatHeadIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语言。
   */
  lang: PnpLang

  /**
   * 译名开关。
   */
  showZh: boolean

  /**
   * 这个类别。
   */
  cat: PnpEeCat
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
   * 全部抽选行(分数线对比卡取联邦 CEC 最近一轮);可省 = 对比卡不出。
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
 * EeCmpCard(EE 分数线对比卡)的 props。
 */
export type EeCmpCardIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 洗好的对比。
   */
  cmp: EeCmp

  /**
   * 展开着的组(类别键)。
   */
  open: Set<string>

  /**
   * 组的开合手柄工厂。
   */
  toggleOf: ToggleOfFn
}

/**
 * EeCmpGroupView(分数线卡的一组)的 props。
 */
export type EeCmpGroupIn = {
  /**
   * 这一组。
   */
  g: EeCmpGroup

  /**
   * 展开了没有。
   */
  open: boolean

  /**
   * 开合手柄。
   */
  onToggle: ClickFn

  /**
   * 组头排法:省提名抽选卡传 true(合计在原日期格、日期落最下一行;2026-09-30 Frank 选「互换」),EE 分数线卡传 false。
   */
  dateBelow: boolean
}

/**
 * EeCmpHead(组头那一行的文字)的 props。
 */
export type EeCmpHeadIn = {
  /**
   * 这一组。
   */
  g: EeCmpGroup

  /**
   * 展开了没有。
   */
  open: boolean
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

  /**
   * 出不出界面语言译名(「本岗能走的通道」那条的灰字也跟它走)。
   */
  showZh: boolean

  /**
   * 全国通道对照(整表;「本岗能走的通道」卡判本省有没有省默认通道看它)。
   */
  pathways: PnpPathway[]
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
   * 本省抽选卡展开着的组(默认全收:组头一行就是最近一轮)。
   */
  drawOpen: Set<string>

  /**
   * 本省抽选卡组的开合手柄工厂。
   */
  drawToggleOf: ToggleOfFn

  /**
   * 本岗能走的通道(弹框顶上那张卡;2026-09-26)。
   */
  channels: ChannelSpec[]

  /**
   * 走不了省提名的原因词(弹框顶上「本岗不满足的门槛」卡;'' = 走得了;2026-09-29)。
   */
  block: string
}

/**
 * eeChannelsOf 的入参(2026-10-01 三弹框统一)。
 */
export type EeChannelsIn = {
  /**
   * 界面语取词函数。
   */
  t: TFn

  /**
   * 界面语言。
   */
  lang: PnpLang

  /**
   * 出不出灰字。
   */
  showZh: boolean

  /**
   * 本岗职业命中的 EE 类别。
   */
  cats: PnpEeCat[]
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
   * 2026-09-23 全景开关随判定卡撤,只剩命中类别。
   */
  shown: PnpEeCat[]

  /**
   * 展开了清单的类别键(2026-10-01 三弹框统一起清单默认收起,只露本岗那一行;这里记的是被展开的)。
   * 2026-10-02 Frank「EE 这部分默认都展开」:改记被收起的类别键,默认全展开。
   */
  closed: Set<string>

  /**
   * 分数线卡展开着的组(默认全收:组头一行就是最近一轮,三组一眼可比)。
   */
  cmpOpen: Set<string>

  /**
   * 分数线卡组的开合手柄工厂。
   */
  cmpToggleOf: ToggleOfFn

  /**
   * 清单折叠开关工厂。
   */
  listToggleOf: ToggleOfFn
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
 * pnpStreamsOf 的入参。
 */
export type PnpStreamsIn = {
  /**
   * 省码。
   */
  province: string

  /**
   * 省提名与 AIP 的扁平清单。
   */
  occ: PnpOcc[]
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

  /**
   * 数据层判本岗可提名(pnp_eligible;可提名的岗不出排除清单卡 —— 2026-09-26 SK 主线表是参考信号表)。
   */
  eligible: boolean
}

/**
 * 省提名弹框的事实索引(2026-09-26 /fe 首页 Frank:清单与抽选两张整表改成弹框打开才懒取,
 * 首屏只带这三串键,格子凭它判「弹框里有没有卡可出」)。
 */
export type PnpFactsIndex = {
  /**
   * 弹框出得了本省抽选卡的省码(hasProvDraws 为真的那几省)。
   * 2026-09-26「补完整」起抽选卡三种形都算:按通道分组、按月选取人数(NS)、改制省现状(ON),见 drawsFormOf。
   */
  draws: string[]

  /**
   * 弹框认得出的纳入型清单,键 `省码|清单名`(pnpStreamsOf 分出来的非排除清单)。
   */
  lists: string[]

  /**
   * 弹框出得了排除清单卡的职业,键 `省码|NOC`(pnpStreamsOf 分出来的排除清单里点名的职业)。
   * 2026-09-26 起只对不可提名的岗算数(见 pnpFactsShownOf 的 eligible)。
   */
  excluded: string[]

  /**
   * 弹框出得了优待清单卡的职业,键 `省码|NOC`(pnpStreamsOf 分出来的优待清单里点名的职业;2026-10-02 NL 优先处理职位起)。
   */
  priority: string[]

  /**
   * 有省默认通道的省码(通道对照表 isDefault 行的省;职位板格子与手机胶囊写不写省默认通道看它,原 GEN_CHANNEL_PROVS,
   * 2026-09-28 通道表批二改读 pathways)。
   */
  defaults: string[]

  /**
   * 登记了门槛的通道键(键形同 pnpChannelKeyOf:具名通道标签,省默认通道 `pnp.gen.` + 省码)—— 这些通道的岗弹框必出门槛卡,
   * 格子算「有卡可点」(2026-09-29 七省门槛卡:萨省普通岗原先点开只有通道卡,被设成不可点)。
   */
  gated: string[]

  /**
   * 魁省职业 → 第一个通道键(2026-09-30 魁省门槛弹框):格子写「PSTQ 高技能」这类、有键就可点(弹框必出门槛卡)。
   */
  qc: QcCellMap
}

/**
 * pnpFactsIndexOf 的入参。
 */
export type PnpFactsIndexIn = {
  /**
   * 省提名与 AIP 的扁平清单(整表)。
   */
  occ: PnpOcc[]

  /**
   * 全部抽选行(整表)。
   */
  draws: PnpDraw[]

  /**
   * 全国通道对照(整表;算有省默认通道的省码)。
   */
  pathways: PnpPathway[]

  /**
   * 魁省职业 → 第一个通道键(整表,516 行)。
   */
  qcCells: QcCellRow[]
}

/**
 * pnpFactsShownOf 的入参。
 */
export type PnpFactsShownIn = {
  /**
   * 本岗省码。
   */
  province: string

  /**
   * 本岗职业码。
   */
  noc: string

  /**
   * 本岗的数据层通道标签(pnp_stream);''=没命中具名清单。
   */
  stream: string

  /**
   * 数据层判本岗可提名(pnp_eligible;可提名的岗弹框不出排除清单卡,排除那串键不算数)。
   */
  eligible: boolean

  /**
   * 事实索引。
   */
  index: PnpFactsIndex
}

/**
 * factKeyOf 的入参。
 */
export type FactKeyIn = {
  /**
   * 省码。
   */
  province: string

  /**
   * 键尾:清单名(pnp_occupations.label,与数据层 pnp_stream 同一套取值)或职业码。
   */
  tail: string
}

/**
 * 带省码的一行(清单行与抽选行都是;distinctProvsOf 只读这一格)。
 */
export type ProvRow = {
  /**
   * 省码。
   */
  province: string
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
   * 已展开了几个折起来的(2026-10-02 Frank「全站统一 都改成 展开 20 和 收起。全部统一」;收着为 0)。
   */
  extra: number
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
 * eeHitOf 的入参。
 */
export type EeHitIn = {
  /**
   * 分组后的全部类别。
   */
  grouped: PnpEeCat[]

  /**
   * 本岗的 EE 类别标签(数据层给的,多类用 / 连;''=不属任何类)。
   */
  eeCategory: string
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
 * occRowsOf 的入参。
 */
export type OccRowsIn = {
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
 * hasProvDraws 的入参(2026-09-26 由本岗改成省码:首屏事实索引按省算,见 pnpFactsIndexOf)。
 */
export type HasProvDrawsIn = {
  /**
   * 省码。
   */
  province: string

  /**
   * 全部抽选行。
   */
  draws: PnpDraw[]
}

/**
 * provDrawHistOf 的入参。
 */
export type ProvDrawHistIn = {
  /**
   * 省码。
   */
  province: string

  /**
   * 全部抽选行。
   */
  draws: PnpDraw[]
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
 * cmpLineClsOf 的入参。
 */
export type CmpLineClsIn = {
  /**
   * 比 CEC 低吗。
   */
  lower: boolean
}

/**
 * eeCmpOf 的入参。
 */
export type EeCmpIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语言(轮次行的中文名灰注只在中文界面出)。
   */
  lang: PnpLang

  /**
   * 本岗命中的类别。
   */
  cats: PnpEeCat[]

  /**
   * 全部抽选行。
   */
  draws: PnpDraw[]
}

/**
 * 联邦轮次按类别键分组(类别键 → 历次抽选,降序)。
 */
export type DrawHist = Map<string, PnpDraw[]>

/**
 * histAtOf 的入参。
 */
export type HistAtIn = {
  /**
   * 分组表。
   */
  hist: DrawHist

  /**
   * 类别键。
   */
  key: string
}

/**
 * cmpGroupOf 的入参(一组的原料)。
 */
export type CmpGroupIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 最低分缺席时组头写什么(EE:从没抽过写「暂无抽选」;省抽选:那轮没公布分就写发了多少份邀请,邀请数也没有就空着)。
   */
  none: string

  /**
   * 名字下的灰字译名;''=不出。
   */
  sub: string

  /**
   * 界面语言。
   */
  lang: PnpLang

  /**
   * 类别键。
   */
  key: string

  /**
   * 显示名(类别名 / CEC / 法语)。
   */
  name: string

  /**
   * 组头悬停说明;''=不出。
   */
  tip: string

  /**
   * 最近一轮日期;''=从没抽过。
   */
  date: string

  /**
   * 最近一轮最低分;null = 从没抽过。
   */
  score: number | null

  /**
   * 这一组的历次抽选(降序;休眠类别可能已过保留窗而为空)。
   */
  draws: PnpDraw[]

  /**
   * 压不压暗。
   */
  dim: boolean

  /**
   * 本岗对应这一组。
   */
  hit: boolean

  /**
   * 按月公布的那一组(NS;组头计数写「N 个月」不写「N 轮」,2026-09-27)。
   */
  perMonth: boolean

  /**
   * 组头第三行的本年合计('' = 不出;见 EeCmpGroup 同名格)。
   */
  total: string
}

/**
 * invTextOf 的入参(2026-09-23 前叫 HeadInvIn,只给组头用;同日 AIP 文案并进来,抽选行也用)。
 */
export type InvTextIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 这一轮。
   */
  draw: PnpDraw
}

/**
 * zhSubOf 的入参。
 */
export type DrawSubIn = {
  /**
   * 界面语言。
   */
  lang: PnpLang

  /**
   * 组头那一轮。
   */
  draw: PnpDraw
}

/**
 * pnpDrawGroupsOf 的入参。
 */
export type PnpDrawGroupsOfIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语言(展开后各轮的中文灰注只在中文界面出)。
   */
  lang: PnpLang

  /**
   * 省码。
   */
  province: string

  /**
   * 全部抽选行。
   */
  draws: PnpDraw[]

  /**
   * 本岗对应的组(抽选行 stream 原值);空列 = 不高亮。
   */
  hitStreams: string[]

  /**
   * 本省省默认通道的抽选组('' = 没有;安省改制那一组的组键用它,原 GEN_DRAW_STREAM,2026-09-28 通道表批二改读 pathways)。
   */
  genDraw: string

  /**
   * 当年配额行(各组的本年合计读其中抽选组那一种;2026-09-29 Frank「每一个通道也需要一个总数吧」,选「单独一行靠右」)。
   */
  ops: PnpOps[]
}

/**
 * groupTotalOf 的入参(2026-09-29 Frank「每一个通道也需要一个总数吧」,选「单独一行靠右」)。
 */
export type GroupTotalIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 当年配额行(全国一份)。
   */
  ops: PnpOps[]

  /**
   * 省码。
   */
  province: string

  /**
   * 组键(抽选行 stream 原值)。
   */
  stream: string
}

/**
 * PnpDrawGroups(省提名弹框的本省抽选卡)的 props。
 */
export type PnpDrawGroupsIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 这张抽选卡(本省抽选 / 改制前的抽选 / AIP 抽选三张同一个形,2026-09-29 抽选卡重排起卡在 PnpListSection 里算好递进来)。
   */
  card: DrawCard

  /**
   * 展开着的组(通道名;「查看全省 N 组」那个开关的键是卡上的 allKey)。
   */
  open: Set<string>

  /**
   * 组的开合手柄工厂。
   */
  toggleOf: ToggleOfFn
}

/**
 * PnpBlockCard(本岗不满足的门槛)的 props。
 */
export type PnpBlockCardIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 原因词('' = 走得了,卡不出)。
   */
  text: string
}

/**
 * pnpBlockOf 读的岗位格(职位板的行与弹框的岗都带它)。
 */
export type PnpBlockJob = {
  /**
   * 数据层给的原因码;'' = 走得了。
   */
  pnpBlock: string
}

/**
 * pnpBlockOf 的入参。
 */
export type PnpBlockIn = {
  /**
   * 本岗。
   */
  job: PnpBlockJob

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * PnpChannelCard(本岗能走的通道)的 props。
 */
export type PnpChannelCardIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 通道条目(现在单值,结构可放多条)。2026-09-30 起 = 本岗通道 + 上段其余几条(channelListOf)。
   */
  channels: ChannelSpec[]
}

/**
 * ChannelRow(通道卡里的一条)的 props。
 */
export type ChannelRowIn = {
  /**
   * 这一条。
   */
  c: ChannelSpec

  /**
   * 高亮(「你有 PGWP 吗」选中的那一边;2026-10-01)。
   */
  hit: boolean
}

/**
 * useChannelPick 的入参(2026-10-01 通道卡拆子卡片 +「你有 PGWP 吗」)。
 */
export type ChannelPickHookIn = {
  /**
   * 卡里的通道条目。
   */
  channels: ChannelSpec[]
}

/**
 * useChannelPick 交给通道卡的东西。
 */
export type ChannelPickPanel = {
  /**
   * 出不出「你有 PGWP 吗」(卡里同时有 PGWP 互补的两条才出)。
   */
  show: boolean

  /**
   * 当前选的那一边(PICK_PGWP / PICK_NO_PGWP;没选 = PICK_NONE)。
   */
  pick: string

  /**
   * 点某一段的手柄工厂(再点一次取消)。
   */
  pickOf: ToggleOfFn
}

/**
 * makePickOf 的入参。
 */
export type PickSetIn = {
  /**
   * 选项的写入口。
   */
  setPick: React.Dispatch<React.SetStateAction<string>>
}

/**
 * channelHitOf 的入参。
 */
export type ChannelHitIn = {
  /**
   * 这一条。
   */
  c: ChannelSpec

  /**
   * 当前选的那一边。
   */
  pick: string
}

/**
 * DrawsHead(抽选卡标题那一行:左标题、右来源,三种卡共用)的 props。
 */
export type DrawsHeadIn = {
  /**
   * 卡标题。
   */
  title: string

  /**
   * 官方来源;null = 不出。
   */
  source: SourceLink | null
}

/**
 * sourceLinkOf 的入参(2026-09-26 晚改名,原 SourceCellIn)。
 */
export type SourceLinkIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 数据层记的官方页地址。
   */
  url: string
}

/**
 * aipSectionOf 的入参(2026-10-01 AIP 搬家)。
 */
export type AipSectionOfIn = {
  /**
   * 界面语取词函数。
   */
  t: TFn

  /**
   * 英文取词函数。
   */
  tEn: TFn

  /**
   * 界面语言。
   */
  lang: PnpLang

  /**
   * 出不出灰字。
   */
  showZh: boolean

  /**
   * 本岗。
   */
  job: PnpJob

  /**
   * 职业清单行。
   */
  occ: PnpOcc[]

  /**
   * 全部抽选行。
   */
  draws: PnpDraw[]

  /**
   * 当年配额行。
   */
  ops: PnpOps[]

  /**
   * 门槛行。
   */
  reqs: PnpReq[]

  /**
   * 全国通道对照(整表)。
   */
  pathways: PnpPathway[]
}

/**
 * aipSectionOf 的出参。
 */
export type AipSectionSpec = {
  /**
   * 走不了 AIP 的原因词(2026-10-01 三弹框统一,出「本岗不满足的门槛」卡);'' = 走得了。
   */
  block: string

  /**
   * AIP 那条通道(本岗能走才有一条)。
   */
  channels: ChannelSpec[]

  /**
   * AIP 抽选卡;null = 不出。
   */
  card: DrawCard | null

  /**
   * AIP 门槛卡(2026-10-01;本岗能走 AIP 才出);null = 不出。
   */
  gate: GateCardSpec | null
}

/**
 * aipBlockTextOf 的入参(2026-10-01 三弹框统一)。
 */
export type AipBlockTextIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 本岗(读省码、NOC 与走不了的原因码)。
   */
  job: PnpJob

  /**
   * 职业清单整表(找省里点名 AIP 不受理的那份)。
   */
  occ: PnpOcc[]
}

/**
 * aipGateCardOf 的入参(2026-10-01 AIP 门槛卡)。
 */
export type AipGateCardIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 本岗(读 TEER)。
   */
  job: PnpJob

  /**
   * 门槛表(整表)。
   */
  reqs: PnpReq[]
}

/**
 * AIP 门槛卡各行构造器的共同入参。
 */
export type AipRowOfIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 挑好的 AIP 门槛行(各档都适用的 + 本岗那一档)。
   */
  rows: PnpReq[]
}

/**
 * aipTierHitOf 的入参。
 */
export type AipTierHitIn = {
  /**
   * 门槛行的流名('' 或 `teer-0-3` 这类分档名)。
   */
  stream: string

  /**
   * 本岗 TEER。
   */
  teer: number
}

/**
 * drawCtxOf 的入参(2026-10-01 自 PnpListSection 收进来)。
 */
export type DrawCtxIn = {
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
   * 全部抽选行。
   */
  draws: PnpDraw[]

  /**
   * 当年配额行。
   */
  ops: PnpOps[]

  /**
   * 门槛行。
   */
  reqs: PnpReq[]

  /**
   * 全国通道对照(整表)。
   */
  pathways: PnpPathway[]

  /**
   * 魁省岗这个职业的通道(AIP 弹框给空列)。
   */
  qcChannels: QcChannel[]
}

/**
 * drawCtxOf 的出参。
 */
export type DrawCtx = {
  /**
   * 「{年} 年配额」卡;null = 不出。
   */
  quota: QuotaCardSpec | null

  /**
   * 三张抽选卡的公共入参。
   */
  dx: DrawCardOfIn
}

/**
 * drawCardOf 的入参。
 */
export type DrawCardOfIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语言。
   */
  lang: PnpLang

  /**
   * 省码。
   */
  province: string

  /**
   * 全部抽选行。
   */
  draws: PnpDraw[]

  /**
   * 本岗对应的组(抽选行 stream 原值);空列 = 没有本岗那一组。
   */
  hitStreams: string[]

  /**
   * 本省省默认通道的抽选组('' = 没有;见 PnpDrawGroupsOfIn 同名格)。
   */
  genDraw: string

  /**
   * 当年配额行(卡底合计读汇装的全年合计;2026-09-29 抽选卡重排)。
   */
  ops: PnpOps[]

  /**
   * 门槛行(「不经抽选」那类行:SK 持 offer 直接申请、PE 的 AIP 由指定雇主递背书申请;2026-09-29)。
   */
  reqs: PnpReq[]

  /**
   * 卡只列这一年的轮次(与配额卡标题同一个来源,见 cardYearOf;'' = 不筛)。
   */
  year: string
}

/**
 * yearDrawsOf 的入参(2026-09-29 抽选卡重排)。
 */
export type YearDrawsIn = {
  /**
   * 省码。
   */
  province: string

  /**
   * 全部抽选行。
   */
  draws: PnpDraw[]

  /**
   * 只列这一年('' = 不筛)。
   */
  year: string

  /**
   * true = 只要 AIP 的轮次(AIP 卡);false = 只要不属 AIP 的(本省抽选卡:省提名、同池与认不出的)。
   */
  aip: boolean
}

/**
 * reformSplitOf 的出参:这一年的抽选轮次按改制生效日一分为二(2026-09-29 抽选卡重排)。
 */
export type ReformSplitOut = {
  /**
   * 改制前的轮次(「改制前的抽选」卡列它们)。
   */
  before: PnpDraw[]

  /**
   * 改制后的轮次(本省抽选卡那一组列它们)。
   */
  after: PnpDraw[]
}

/**
 * reformSplitOf 的入参(2026-09-29 抽选卡重排)。
 */
export type ReformSplitIn = {
  /**
   * 这一年本省的抽选行(yearDrawsOf 筛过的)。
   */
  rows: PnpDraw[]

  /**
   * 改制生效日(`YYYY-MM-DD`)。
   */
  since: string
}

/**
 * footLinesOf 的入参(2026-09-29 抽选卡重排)。
 */
export type FootLinesIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 省码(配额行是全国一份,按它挑本省那一行)。
   */
  province: string

  /**
   * 卡只列的那一年。
   */
  year: string

  /**
   * 卡里列出的轮次(轮数数它们;按月那一组数月份)。
   */
  rows: PnpDraw[]

  /**
   * 本省当年配额行(合计份数读其中汇装的全年合计)。
   */
  ops: PnpOps[]

  /**
   * 合计那一行的口径层级('' = 省提名那一份,program = AIP 那一份)。
   */
  scopeKind: string

  /**
   * 合计份数能不能写:汇装那一份恰好就是卡里列的这些轮次才写(安省改制前后分两张卡时,另一张有轮次就只写轮数)。
   */
  total: boolean
}

/**
 * ytdPickOf 的入参(2026-09-29 抽选卡重排)。
 */
export type YtdPickIn = {
  /**
   * 当年配额行(全国一份)。
   */
  ops: PnpOps[]

  /**
   * 省码。
   */
  province: string

  /**
   * 口径层级('' = 省提名那一份,program = AIP 那一份)。
   */
  scopeKind: string
}

/**
 * noDrawReqOf 的入参(2026-09-29 抽选卡重排)。
 */
export type NoDrawReqIn = {
  /**
   * 门槛行。
   */
  reqs: PnpReq[]

  /**
   * 省码。
   */
  province: string

  /**
   * 项目(PNP = SK 持 offer 直接申请;AIP = PE 由指定雇主递背书申请)。
   */
  program: string
}

/**
 * lineCardOf 的入参:没有轮次可列、只写一行说明的抽选卡(2026-09-29 抽选卡重排)。
 */
export type LineCardIn = {
  /**
   * 卡标题。
   */
  title: string

  /**
   * 说明行。
   */
  lines: string[]

  /**
   * 标题右端的官方来源;没有给 null。
   */
  source: SourceLink | null

  /**
   * 「查看全省 N 组」开关的键(这种卡没有组,只为形状齐全)。
   */
  allKey: string
}

/**
 * groupsCardOf 的入参:有轮次可列的抽选卡(本岗那组排前,其余收在开关后;2026-09-29 抽选卡重排)。
 */
export type GroupsCardIn = {
  /**
   * 卡标题。
   */
  title: string

  /**
   * 轮次标签(「查看全省 N 组」英文文案要它)。
   */
  label: string

  /**
   * 各组。
   */
  groups: EeCmpGroup[]

  /**
   * 标题右端的官方来源;没有给 null。
   */
  source: SourceLink | null

  /**
   * 标题下的灰字说明。
   */
  lines: string[]

  /**
   * 卡底合计行。
   */
  foot: string[]

  /**
   * 「查看全省 N 组」开关的键。
   */
  allKey: string

  /**
   * 本岗那几组之外的收进开关(本省抽选、改制前两张卡);false = 全部摊开、不设开关(AIP 卡:组少,也没有「本岗那一组」;
   * 2026-09-29 线上验收:NL / NB 的 AIP 卡只有一组还带「收起」)。
   */
  fold: boolean
}

/**
 * emptyPnpCardOf 的入参:本省抽选卡这一年一组都分不出来时(2026-09-29 抽选卡重排)。
 */
export type EmptyCardIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 省码。
   */
  province: string

  /**
   * 全部抽选行(往年有没有轮次)。
   */
  draws: PnpDraw[]

  /**
   * 门槛行(「不经抽选」那一行)。
   */
  reqs: PnpReq[]

  /**
   * 卡只列的那一年。
   */
  year: string

  /**
   * 已有的灰字说明(原 drawLinesOf;2026-10-01 三弹框统一起本省抽选卡不再写说明,恒为空列)。
   */
  lines: string[]
}

/**
 * countKeyOf 的入参(2026-09-29 抽选卡重排线上验收)。
 */
export type CountKeyIn = {
  /**
   * 人数口径。
   */
  kind: CountKind

  /**
   * 人数。
   */
  n: number
}

/**
 * ytdCountTextOf 的入参(2026-09-29 抽选卡重排)。
 */
export type YtdCountIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 挑到的合计行;没有给 null。
   */
  row: PnpOps | null
}

/**
 * roundsTextOf 的入参(2026-09-29 抽选卡重排)。
 */
export type RoundsTextIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 卡里列的轮次(按月那一组写「N 个月」)。
   */
  rows: PnpDraw[]

  /**
   * 轮数。
   */
  n: number
}

/**
 * cardYearOf 的入参(2026-09-29 抽选卡重排)。
 */
export type CardYearIn = {
  /**
   * 配额卡(有就用它标题的年份)。
   */
  quota: QuotaCardSpec | null

  /**
   * 省码。
   */
  province: string

  /**
   * 全部抽选行(没有配额卡时取本省最近一轮的年份)。
   */
  draws: PnpDraw[]
}

/**
 * roundRowsOf 的入参。
 */
export type RoundRowsIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语言。
   */
  lang: PnpLang

  /**
   * 这一组的历次抽选(降序)。
   */
  draws: PnpDraw[]
}

/**
 * allGroupsLabelOf 的入参。
 */
export type AllGroupsLabelIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 全省一共几组。
   */
  total: number

  /**
   * 轮次标签(官方项目名)。
   */
  label: string
}

/**
 * monthRowsOf 的入参。
 */
export type MonthRowsIn = {
  /**
   * 省码。
   */
  province: string

  /**
   * 全部抽选行。
   */
  draws: PnpDraw[]
}

/**
 * latestSinceOf 的入参。
 */
export type LatestSinceIn = {
  /**
   * 省码。
   */
  province: string

  /**
   * 全部抽选行。
   */
  draws: PnpDraw[]

  /**
   * 起算日(`YYYY-MM-DD`,改制生效日;这一天及以后的才算)。
   */
  since: string

  /**
   * 行类别(notice = 官方公告、draw = 抽选)。
   */
  kind: string
}

/**
 * channelListOf / extraChannelsOf 的入参(2026-09-30 通道补全批二:channelsOf 的入参 + 职业清单)。
 */
export type ChannelListIn = {
  /**
   * 界面语取词函数。
   */
  t: TFn

  /**
   * 英文取词函数。
   */
  tEn: TFn

  /**
   * 界面语言。
   */
  lang: PnpLang

  /**
   * 出不出灰字。
   */
  showZh: boolean

  /**
   * 本岗。
   */
  job: PnpJob

  /**
   * 有省默认通道的省码。
   */
  defaults: string[]

  /**
   * 全国通道对照(整表)。
   */
  pathways: PnpPathway[]

  /**
   * 职业清单行(判本岗职业码在不在通道的清单里)。
   */
  occ: PnpOcc[]
}

/**
 * isExtraChannelOf 的入参(2026-09-30 通道补全批二)。
 */
export type ExtraFitsIn = {
  /**
   * 这条通道。
   */
  p: PnpPathway

  /**
   * 本岗。
   */
  job: PnpJob

  /**
   * 职业清单行。
   */
  occ: PnpOcc[]

  /**
   * 本岗自己那条通道的标签(没有那条给空列;判互补的人的条件,2026-10-01)。
   */
  ownTags: string[]
}

/**
 * isJobDecidedOf 的入参(2026-10-01 加本岗那条的标签,判互补的人的条件)。
 */
export type JobDecidedIn = {
  /**
   * 这条通道的条件标签键。
   */
  tags: string[]

  /**
   * 本岗自己那条通道的标签。
   */
  ownTags: string[]
}

/**
 * isListedOf 的入参。
 */
export type ListedIn = {
  /**
   * 清单名。
   */
  labels: string[]

  /**
   * 本岗职业码。
   */
  noc: string

  /**
   * 职业清单行。
   */
  occ: PnpOcc[]
}

/**
 * isEmployerOf 的入参。
 */
export type EmployerHitIn = {
  /**
   * 雇主名单(归一后小写)。
   */
  names: string[]

  /**
   * 本岗公司名(原样)。
   */
  company: string
}

/**
 * pathwayChannelOf 的入参。
 */
export type PathwayChannelIn = {
  /**
   * 取词函数(标签文字)。
   */
  t: TFn

  /**
   * 界面语言(挑哪一语的直白名作灰字)。
   */
  lang: PnpLang

  /**
   * 出不出灰字。
   */
  showZh: boolean

  /**
   * 这条通道。
   */
  p: PnpPathway
}

/**
 * localNameOf 的入参。
 */
export type LocalNameIn = {
  /**
   * 界面语言。
   */
  lang: PnpLang

  /**
   * 这条通道。
   */
  p: PnpPathway
}

/**
 * channelTagsOf 的入参。
 */
export type ChannelTagsIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 标签键。
   */
  tags: string[]
}

/**
 * channelsOf 的入参。
 */
export type ChannelsIn = {
  /**
   * 界面语取词函数(灰字;2026-09-29 凌晨至下午取的是主文案直白名)。
   */
  t: TFn

  /**
   * 英文取词函数(官方原名缺时的主文案;2026-09-29 下午 Frank「默认显示英文,灰字中文」)。
   */
  tEn: TFn

  /**
   * 界面语言。
   */
  lang: PnpLang

  /**
   * 出不出灰字(非英文界面才出官方原名)。
   */
  showZh: boolean

  /**
   * 本岗。
   */
  job: PnpJob

  /**
   * 有省默认通道的省码(通道对照表算的,见 pnpDefaultProvsOf)。
   */
  defaults: string[]

  /**
   * 全国通道对照(整表;灰字的官方原名从本岗那一行取)。
   */
  pathways: PnpPathway[]
}

/**
 * channelOf 的入参。
 */
export type ChannelOfIn = {
  /**
   * 界面语言。
   */
  lang: PnpLang

  /**
   * 出不出界面语言译名。
   */
  showZh: boolean

  /**
   * React 列表键。
   */
  key: string

  /**
   * 界面语言名。
   */
  local: string

  /**
   * 英文词条名(官方原名缺时的主文案)。
   */
  en: string

  /**
   * 官方英文原名('' = 库里没有)。
   */
  official: string

  /**
   * 条件标签(本岗那条通道的;2026-09-30 通道补全批二)。
   */
  tags: ChannelTag[]
}

/**
 * expScopeLinesOf 的入参(2026-10-01 工作经验说清楚)。
 */
export type ExpScopeIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 经验主行。
   */
  r: PnpReq

  /**
   * 本省界面名(「须是在新斯科舍省的工作经验」)。
   */
  prov: string
}

/**
 * statusLinesOf 的入参(2026-09-30 通道与门槛批 1)。
 */
export type StatusLinesIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 一条身份行。
   */
  r: PnpReq

  /**
   * 本省界面名(「申请时须在阿尔伯塔省工作」)。
   */
  prov: string
}

/**
 * provGateCardsOf 的入参(2026-09-30 资讯页「通道与门槛」)。
 */
export type ProvGateCardsIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语言(卡头灰字的直白名挑哪一语)。
   */
  lang: PnpLang

  /**
   * 省码。
   */
  province: string

  /**
   * 全国通道对照(库表 pathways,停办的不在里面)。
   */
  pathways: PnpPathway[]

  /**
   * 门槛表(全国)。
   */
  reqs: PnpReq[]
}

/**
 * provStreamCardOf 的入参。
 */
export type ProvStreamCardIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语言。
   */
  lang: PnpLang

  /**
   * 这条通道。
   */
  p: PnpPathway

  /**
   * 本省全部门槛行(offer 形态是全省一份)。
   */
  mine: PnpReq[]
}

/**
 * provStreamRowsOf 的入参。
 */
export type ProvStreamRowsIn = {
  /**
   * 这条通道(读它看不看工作)。
   */
  p: PnpPathway

  /**
   * 各行构造器的共同入参(探针不看档)。
   */
  one: GateRowOfIn
}

/**
 * 门槛卡一行的构造器(资讯页按 TEER 档逐档调它;2026-09-30)。
 */
export type GateRowFn = (x: GateRowOfIn) => GateRowSpec | null

/**
 * bandRowOf 的入参。
 */
export type BandRowIn = {
  /**
   * 各行构造器的共同入参(探针不看档)。
   */
  one: GateRowOfIn

  /**
   * 这一行读哪几个因素(按它们的 TEER 档分档)。
   */
  factors: string[]

  /**
   * 这一行的构造器。
   */
  build: GateRowFn
}

/**
 * teerBandsOf 的入参。
 */
export type TeerBandsIn = {
  /**
   * 门槛行。
   */
  rows: PnpReq[]

  /**
   * 只看这几个因素的行。
   */
  factors: string[]
}

/**
 * langTierLineOf 的入参。
 */
export type LangTierLineIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 一条不点名职业的语言行。
   */
  r: PnpReq
}

/**
 * tierLineOf 的入参。
 */
export type TierLineIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * TEER 档逗号串(门槛表 applies_teer 原值);'' = 不分档。
   */
  applies: string

  /**
   * 文案。
   */
  line: string
}

/**
 * namedLangOf 的入参。
 */
export type NamedLangIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 点名职业的语言行(都带分数)。
   */
  rows: PnpReq[]
}

/**
 * namedLangOf 的出参。
 */
export type NamedLangOut = {
  /**
   * 那一行;'' = 拼不出。
   */
  line: string

  /**
   * 灰字(职业码;列不下给空列)。
   */
  notes: string[]
}

/**
 * cmpHeadClsOf 的入参。
 */
export type CmpHeadClsIn = {
  /**
   * 压不压暗。
   */
  dim: boolean

  /**
   * 本岗对应这一组(琥珀高亮)。
   */
  hit: boolean

  /**
   * 可不可点(有轮次才可展开)。
   */
  button: boolean

  /**
   * 省提名抽选卡的组头:合计在原日期那一格、日期落最下一行(2026-09-30 Frank「我觉得这个 日期 和 总数 互换一下位置是不是好一些」,
   * 看过效果图选「互换」;原「有没有本年合计」一格随 cmpHasTotal 撤)。
   */
  dateBelow: boolean
}

/**
 * cmpLineOf 的入参。
 */
export type CmpLineIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 行键。
   */
  key: string

  /**
   * 类别显示名。
   */
  cat: string

  /**
   * CEC 显示名。
   */
  cec: string

  /**
   * 分差(类别最低分 - CEC 最低分)。
   */
  diff: number
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
 * 卸下旗子(取数回来时弹框已经关了就不落格)。
 */
export type DeadFlag = {
  /**
   * 卸下了没有。
   */
  dead: boolean
}

/**
 * effect 里调用的取数函数(带卸下旗子)。
 */
export type LoadFn = (flag: DeadFlag) => void

/**
 * 省提名几张整表(2026-09-26 起弹框打开才懒取,见 usePnpData;2026-09-28 自 advisor 迁入)。
 */
export type PnpData = {
  /**
   * 省提名职业清单。
   */
  occ: PnpOcc[]

  /**
   * 各省抽选记录。
   */
  draws: PnpDraw[]

  /**
   * 当年配额行(2026-09-27 Frank 勾「2026 名额小表」「全年名额部分也单独弄个框」;老服务端没给 = 空列,那张卡不出)。
   */
  ops: PnpOps[]

  /**
   * 门槛行(2026-09-27 Frank 勾「门槛卡」「用本岗通道的门槛」;老服务端没给 = 空列,门槛卡不出)。
   */
  reqs: PnpReq[]

  /**
   * 全国通道对照(2026-09-28 通道表批二;老服务端没给 = 空列)。
   */
  pathways: PnpPathway[]

  /**
   * 登了步骤的通道(2026-10-02 申请步骤批 1;老服务端没给、或生产还没加列 = 空列,弹框照旧出抽选卡)。
   */
  steps: PnpStepSet[]

  /**
   * 步骤引用的运营统计(处理时长 + 萨省收件窗口;同上)。
   */
  stepOps: PnpStepOp[]
}

/**
 * `/api/jobs/pnp` 的响应(线格式:缺席 = 服务端没给那张表;null = 请求没成)。
 */
export type PnpDataJson = {
  /**
   * 省提名职业清单。
   */
  pnpOccupations?: PnpOcc[]

  /**
   * 各省抽选记录。
   */
  pnpDraws?: PnpDraw[]

  /**
   * 当年配额行(2026-09-27 起;换版窗口里老服务端没给)。
   */
  pnpOps?: PnpOps[]

  /**
   * 门槛行(2026-09-27 门槛卡批一起;换版窗口里老服务端没给)。
   */
  pnpReqs?: PnpReq[]

  /**
   * 全国通道对照(2026-09-28 通道表批二起;换版窗口里老服务端没给)。
   */
  pathways?: PnpPathway[]

  /**
   * 登了步骤的通道(2026-10-02 申请步骤批 1 起;换版窗口里老服务端没给)。
   */
  pnpSteps?: PnpStepSet[]

  /**
   * 步骤引用的运营统计(同上)。
   */
  pnpStepOps?: PnpStepOp[]
} | null

/**
 * PnpProvStreams 的 props(2026-09-30 资讯页「通道与门槛」)。
 */
export type PnpProvStreamsIn = {
  /**
   * 界面语言。
   */
  lang: PnpLang

  /**
   * 省码。
   */
  province: string
}

/**
 * usePnpProvStreams 的入参。
 */
export type PnpProvStreamsHookIn = {
  /**
   * 界面语言。
   */
  lang: PnpLang

  /**
   * 省码。
   */
  province: string
}

/**
 * usePnpProvStreams 交回的面板。
 */
export type PnpProvStreamsPanel = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 整表到了没。
   */
  ready: boolean

  /**
   * 懒取失败(改出「加载失败」那句,不拿空表冒充「官方没有」)。
   */
  failed: boolean

  /**
   * 这一省的门槛卡(整表还没到给空列)。
   */
  cards: GateCardSpec[]
}

/**
 * 清单卡的一行(洗好)。
 */
export type AipEmpRowSpec = {
  /**
   * React 列表键。
   */
  key: string

  /**
   * 是本岗雇主(高亮)。
   */
  hit: boolean

  /**
   * 招牌(主文案)。
   */
  trade: string

  /**
   * 门店;认不出写长横(表格一格不空着)。
   */
  store: string

  /**
   * 法人。
   */
  legal: string

  /**
   * 对上的雇主池键;'' = 没对上(招牌不可点)。
   */
  poolKey: string

  /**
   * 中文译名;'' = 没有。
   */
  aliasZh: string

  /**
   * 韩文译名;'' = 没有。
   */
  aliasKo: string
}

/**
 * /api/jobs/aip 回来的一行(2026-10-02 三弹框统一第 3 步(Frank「这是不是 拆成人能看懂表格比较好」「不需要一次查询 1574 家吧」「可以,做吧」);接口自家的形,lib/jobs
 * AipEmpFact 照抄真读的格)。
 */
export type AipEmpRowJson = {
  /**
   * 招牌。
   */
  trade: string

  /**
   * 门店;'' = 认不出。
   */
  store: string

  /**
   * 法人。
   */
  legal: string

  /**
   * 是本岗雇主那一行。
   */
  hit: boolean

  /**
   * 对上的雇主池键(2026-10-02;'' = 没对上,不可点)。
   */
  poolKey: string

  /**
   * 中文译名;'' = 没有。
   */
  aliasZh: string

  /**
   * 韩文译名;'' = 没有。
   */
  aliasKo: string
}

/**
 * 指定雇主卡要的全部(/api/jobs/aip 的响应体洗好)。
 */
export type AipEmpData = {
  /**
   * 本省 AIP 指定雇主总家数。
   */
  total: number

  /**
   * 本岗雇主招牌的同招牌法人家数;0 = 对不上本岗雇主。
   */
  brandN: number

  /**
   * 本岗雇主那一行与同招牌的几家。
   */
  rows: AipEmpRowJson[]
}

/**
 * /api/jobs/aip 的响应体(取挂了 / 不是 200 给 null)。
 */
export type AipEmpJson = {
  /**
   * 本省总家数。
   */
  total?: number

  /**
   * 同招牌法人家数。
   */
  brandN?: number

  /**
   * 行。
   */
  rows?: AipEmpRowJson[]
} | null

/**
 * makeLoadAipEmp 的入参。
 */
export type LoadAipEmpIn = {
  /**
   * 省码。
   */
  province: string

  /**
   * 本岗公司的归一名。
   */
  key: string

  /**
   * 数据到齐的落格。
   */
  setData: (d: AipEmpData) => void

  /**
   * 懒取失败的落格。
   */
  setFailed: (v: boolean) => void
}

/**
 * aipEmpUrlOf 的入参。
 */
export type AipEmpUrlIn = {
  /**
   * 省码。
   */
  province: string

  /**
   * 本岗公司的归一名。
   */
  key: string
}

/**
 * AipEmpCard 的 props。
 */
export type AipEmpCardIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 本岗(读省码与公司名)。
   */
  job: PnpJob

  /**
   * 界面语言(灰字译名挑哪一语)。
   */
  lang: PnpLang

  /**
   * 点招牌:叠开公司弹框;没给 = 招牌不可点。
   */
  onOpenCompany?: PnpOpenCompanyFn
}

/**
 * AipSection(AIP 弹框里的通道卡与抽选卡)的 props。
 */
export type AipSectionIn = {
  /**
   * 本岗。
   */
  job: PnpJob

  /**
   * 界面语言。
   */
  lang: PnpLang

  /**
   * 指定雇主名单里点招牌:叠开公司弹框;没给 = 招牌不可点(2026-10-02)。
   */
  onOpenCompany?: PnpOpenCompanyFn
}

/**
 * useAipSection 的入参。
 */
export type AipSectionHookIn = {
  /**
   * 本岗。
   */
  job: PnpJob

  /**
   * 界面语言。
   */
  lang: PnpLang
}

/**
 * useAipSection 交给组件的东西。
 */
export type AipSectionPanel = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 整表到了没。
   */
  ready: boolean

  /**
   * 懒取失败。
   */
  failed: boolean

  /**
   * AIP 那条通道与 AIP 抽选卡(整表没到给空列与 null)。
   */
  section: AipSectionSpec

  /**
   * 抽选卡展开着的组。
   */
  drawOpen: Set<string>

  /**
   * 抽选卡组的开合手柄工厂。
   */
  drawToggleOf: ToggleOfFn
}

/**
 * AipEmpRow 的 props。
 */
export type AipEmpRowIn = {
  /**
   * 洗好的这一行。
   */
  r: AipEmpRowSpec

  /**
   * 命中行的 ref 盒(非命中行不登记)。
   */
  matchRef: HitRef

  /**
   * 界面语言(灰字译名挑哪一语)。
   */
  lang: PnpLang

  /**
   * 点招牌:叠开公司弹框;没给 = 招牌不可点。
   */
  onOpenCompany?: PnpOpenCompanyFn
}

/**
 * 叠开公司弹框时递的那一家(advisor / companies 的 CompanyPeek 同形,本域自声明)。
 */
export type PnpCompanyPeek = {
  /**
   * 公司页 slug 或雇主池键。
   */
  slug: string

  /**
   * 公司名。
   */
  name: string
}

/**
 * 叠开公司弹框的回调(宿主给)。
 */
export type PnpOpenCompanyFn = (peek: PnpCompanyPeek) => void

/**
 * makeOpenAipCo 的入参。
 */
export type OpenAipCoIn = {
  /**
   * 叠开公司弹框的回调。
   */
  onOpenCompany: PnpOpenCompanyFn

  /**
   * 这一行。
   */
  r: AipEmpRowSpec
}

/**
 * aipEmpAliasOf 的入参。
 */
export type AipEmpAliasIn = {
  /**
   * 这一行。
   */
  r: AipEmpRowSpec

  /**
   * 界面语言。
   */
  lang: PnpLang
}

/**
 * useAipEmpCard 的入参。
 */
export type AipEmpCardHookIn = {
  /**
   * 取词函数(卡底开关的文案)。
   */
  t: TFn

  /**
   * 本岗(读省码与公司名)。
   */
  job: PnpJob
}

/**
 * useAipEmpCard 交回的面板。
 */
export type AipEmpCardPanel = {
  /**
   * 命中行的 ref 盒。
   */
  matchRef: HitRef

  /**
   * 能渲了没(懒取到了,或本岗没有公司名不用取)。
   */
  ready: boolean

  /**
   * 懒取失败。
   */
  failed: boolean

  /**
   * 本岗雇主那一行与同招牌的几家(2026-10-02 三弹框统一第 3 步(Frank「这是不是 拆成人能看懂表格比较好」「不需要一次查询 1574 家吧」「可以,做吧」);不再是全省清单)。
   */
  rows: AipEmpRowSpec[]

  /**
   * 同招牌法人家数(> 1 才在卡底写一行)。
   */
  brandN: number

  /**
   * 本省总家数。
   */
  total: number

  /**
   * 折起来的家数(本省总家数减去本岗雇主与同招牌那几家;2026-10-02 Frank「全站统一 都改成 展开 20 和 收起。全部统一」:卡底两只钮走 pager 桶 FoldLine)。
   */
  hidden: number

  /**
   * 已展开的家数(收着为 0;收起后再展开直接用已取到的)。
   */
  extra: number

  /**
   * 下一页取数中。
   */
  busy: boolean

  /**
   * 那只钮的手柄。
   */
  onMore: ClickFn

  /**
   * 「收起」的手柄。
   */
  onFold: ClickFn
}

/**
 * usePnpData 的入参。
 */
export type PnpDataHookIn = {
  /**
   * 要不要取(省提名弹框恒要;advisor 的别的组按它自己的分组表定)。
   */
  enabled: boolean
}

/**
 * usePnpData 交回的面板。
 */
export type PnpDataPanel = {
  /**
   * 正文能渲了没(不取的恒为 true;要取的等整表到齐)。
   */
  ready: boolean

  /**
   * 懒取失败(弹框改出「加载失败」那句,不拿空表冒充「官方没有」)。
   */
  failed: boolean

  /**
   * 省提名职业清单(还没到给空列 —— 那时 ready 为 false,正文不渲)。
   */
  occ: PnpOcc[]

  /**
   * 各省抽选记录(同上)。
   */
  draws: PnpDraw[]

  /**
   * 当年配额行(同上)。
   */
  ops: PnpOps[]

  /**
   * 门槛行(同上)。
   */
  reqs: PnpReq[]

  /**
   * 全国通道对照(同上)。
   */
  pathways: PnpPathway[]

  /**
   * 登了步骤的通道(同上;2026-10-02 申请步骤批 1)。
   */
  steps: PnpStepSet[]

  /**
   * 步骤引用的运营统计(同上)。
   */
  stepOps: PnpStepOp[]
}

/**
 * makeLoadPnpData 的入参。
 */
export type LoadPnpDataIn = {
  /**
   * 整表到齐的落格。
   */
  setData: (d: PnpData) => void

  /**
   * 懒取失败的落格。
   */
  setFailed: (v: boolean) => void
}

/**
 * 省提名弹框的那一岗:清单块读的格 + 页眉要的岗名与库里存好的两语译名。
 */
export type PnpModalJob = PnpJob & {
  /**
   * 岗名(页眉大标题)。
   */
  title: string

  /**
   * 库里存好的中文岗名译名;'' = 没有。
   */
  titleZh: string

  /**
   * 库里存好的韩文岗名译名;'' = 没有。
   */
  titleKo: string
}

/**
 * PnpModal 的 props。
 */
export type PnpModalIn = {
  /**
   * 这一岗。
   */
  job: PnpModalJob

  /**
   * 界面语言。
   */
  lang: PnpLang

  /**
   * 调用方给的标题(岗名空时的候补)。
   */
  title: string

  /**
   * 从哪一格点进来的(只进打开埋点)。
   */
  field: string

  /**
   * 职业名字典(清单卡的职业译名灰注)。
   */
  nocDesc: PnpNocDesc[]

  /**
   * 关弹框。
   */
  onClose: ClickFn
}

/**
 * usePnpModal 的入参。
 */
export type PnpModalHookIn = {
  /**
   * 这一岗。
   */
  job: PnpModalJob

  /**
   * 界面语言。
   */
  lang: PnpLang

  /**
   * 从哪一格点进来的(只进打开埋点)。
   */
  field: string
}

/**
 * usePnpModal 交回的面板。
 */
export type PnpModalPanel = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 整表(懒取)。
   */
  data: PnpDataPanel

  /**
   * 魁省岗这个职业的通道(懒取;非魁省岗恒就绪、空列)。
   */
  qc: QcChannelsPanel

  /**
   * 岗名下那行灰字(标题译名);'' = 还没有 / 英文界面。
   */
  sub: string
}

/**
 * pnpKickerOf 的入参。
 */
export type PnpKickerIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 本岗省码。
   */
  province: string
}

/**
 * pnpTitleOf 的入参。
 */
export type PnpTitleIn = {
  /**
   * 这一岗。
   */
  job: PnpModalJob

  /**
   * 调用方给的标题。
   */
  title: string
}

/**
 * 省提名格 / 胶囊 / 通道卡判「写什么、能不能点」要读的四格(职位板的库行整行递进来,只读这几格)。
 */
export type PnpCellJob = {
  /**
   * 省码。
   */
  province: string

  /**
   * 职业码。
   */
  noc: string

  /**
   * 数据层给的具名通道标签;'' = 没有。
   */
  pnpStream: string

  /**
   * 走不了省提名的原因码;'' = 走得了(有原因的格子也可点,弹框讲原因;2026-09-29)。
   */
  pnpBlock: string

  /**
   * 数据层判的可提名。
   */
  pnpEligible: boolean
}

/**
 * pnpChannelKeyOf 的入参。
 */
export type PnpChannelKeyIn = {
  /**
   * 这一岗(读具名通道、可提名与省码)。
   */
  job: PnpCellJob

  /**
   * 有省默认通道的省码(职位板从事实索引的 defaults 递、弹框从通道对照表现算,同一份来源)。
   */
  defaults: string[]
}

/**
 * pnpNameOf 的入参。
 */
export type PnpNameIn = {
  /**
   * 通道键(pnpChannelKeyOf 给的:具名通道标签,或 `pnp.gen.` + 省码)。
   */
  key: string

  /**
   * 取哪一种语言的名字(英文行给英文取词,灰字行给界面语言取词)。
   */
  t: TFn
}

/**
 * 官方具名排除清单的两套键集(`省码|NOC`)。
 */
export type PnpBlocked = {
  /**
   * 省提名不受理。
   */
  pnp: Set<string>
}

/**
 * 查排除键的入参。
 */
export type PnpExclIn = {
  /**
   * 这一岗(读省码与职业码)。
   */
  job: PnpCellJob

  /**
   * 两套键集。
   */
  blocked: PnpBlocked
}

/**
 * pnpCellActiveOf 的入参。
 */
export type PnpCellActiveIn = {
  /**
   * 这一岗。
   */
  job: PnpCellJob

  /**
   * 两套排除键集。
   */
  blocked: PnpBlocked

  /**
   * 省提名弹框的事实索引(首屏随板下发)。
   */
  index: PnpFactsIndex
}

/**
 * 魁省职业 → 第一个通道键的一行(首屏维度 qcCells;2026-09-30 魁省门槛弹框)。
 */
export type QcCellRow = {
  /**
   * NOC 五位码。
   */
  noc: string

  /**
   * 第一个通道的稳定键(pstq-1 … / peq-tfw)。
   */
  key: string
}

/**
 * 魁省职业码 → 第一个通道键(事实索引里的查表;随首屏下发)。
 */
export type QcCellMap = Record<string, string>

/**
 * 魁省一个通道(/api/jobs/qc 回的一项;弹框一张门槛卡)。
 */
export type QcChannel = {
  /**
   * 稳定键(pstq-1 … / peq-tfw;三语格子文案与界面语言名按它取词)。
   */
  key: string

  /**
   * 项目(PSTQ / PEQ)。
   */
  program: string

  /**
   * 门槛流名(从门槛表挑行用)。
   */
  stream: string

  /**
   * 官方全名(卡标题)。
   */
  title: string

  /**
   * 细分类(all / citizenOnly / residentOnly / regulated / regulatedQcDiploma / partlyRegulated)。
   */
  kind: string

  /**
   * 适用范围官方原文;整类为 ''。
   */
  scope: string

  /**
   * 适用范围中文(2026-09-30 Frank「适用行也翻成中文吧」);只有部分受监管那类有,其余为 ''。
   */
  scopeZh: string

  /**
   * 适用范围韩文;同上。
   */
  scopeKo: string

  /**
   * 监管机构(法文原文);非受监管通道为空。
   */
  authorities: string[]
}

/**
 * /api/jobs/qc 的响应(线格式:缺席 = 没取到;请求失败 read 给 null)。
 */
export type QcChannelsJson = {
  /**
   * 通道列。
   */
  channels?: QcChannel[]
} | null

/**
 * useQcChannels 的入参。
 */
export type QcChannelsHookIn = {
  /**
   * 本岗职业码。
   */
  noc: string

  /**
   * 要不要取(魁省岗才取)。
   */
  enabled: boolean
}

/**
 * useQcChannels 交回的面板。
 */
export type QcChannelsPanel = {
  /**
   * 能渲了没(不取的恒为 true)。
   */
  ready: boolean

  /**
   * 取挂了没。
   */
  failed: boolean

  /**
   * 通道列(还没到给空列)。
   */
  channels: QcChannel[]
}

/**
 * makeLoadQcChannels 的入参。
 */
export type LoadQcChannelsIn = {
  /**
   * 本岗职业码。
   */
  noc: string

  /**
   * 通道到齐的落格。
   */
  setChannels: (c: QcChannel[]) => void

  /**
   * 懒取失败的落格。
   */
  setFailed: (v: boolean) => void
}

/**
 * hitStreamsOf 的入参(2026-09-30 魁省抽选卡)。
 */
export type HitStreamsIn = {
  /**
   * 本岗走的那条通道(pnpChannelOf 给的;null = 没有,魁省岗恒为 null)。
   */
  channel: PnpPathway | null

  /**
   * 本岗职业能走的魁省通道(非魁省岗为空列)。
   */
  qcChannels: QcChannel[]
}

/**
 * qcGateCardsOf 的入参(2026-09-30 魁省门槛弹框)。
 */
export type QcGateCardsIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语言(「适用」行挑哪一语的范围)。
   */
  lang: PnpLang

  /**
   * 本岗。
   */
  job: PnpJob

  /**
   * 门槛表(全国;魁省行 province = QC、program = PSTQ / PEQ)。
   */
  reqs: PnpReq[]

  /**
   * 本岗职业能走的通道(卡片顺序)。
   */
  channels: QcChannel[]
}

/**
 * 魁省门槛卡各行构造器的共同入参。
 */
export type QcRowOfIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语言(「适用」行挑哪一语的范围)。
   */
  lang: PnpLang

  /**
   * 这一张卡的通道。
   */
  chan: QcChannel

  /**
   * 这个通道管得着本岗的门槛行(本通道流 + PSTQ 一般条件;标了 TEER 档的按本岗 TEER 筛过)。
   */
  rows: PnpReq[]
}

/**
 * qcCardOf 的入参。
 */
export type QcCardOfIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语言(「适用」行挑哪一语的范围)。
   */
  lang: PnpLang

  /**
   * 本岗。
   */
  job: PnpJob

  /**
   * 门槛表(全国)。
   */
  reqs: PnpReq[]

  /**
   * 这一张卡的通道。
   */
  chan: QcChannel
}

/**
 * qcTestLineOf 的入参:一个考试的理解 / 表达两格下限拼一句。
 */
export type QcTestLineIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 考试名(TEF / TCF)。
   */
  test: string

  /**
   * 口语行(null = 这个通道没有口语门槛)。
   */
  oral: PnpReq | null

  /**
   * 书面行(null = 没有书面门槛)。
   */
  written: PnpReq | null

  /**
   * 理解那一格在口径包里的键(tefComp / tcfComp)。
   */
  comp: string

  /**
   * 表达那一格的键(tefExpr / tcfExpr)。
   */
  expr: string
}

/**
 * qcReqMineOf 的入参。
 */
export type QcReqMineIn = {
  /**
   * 一行门槛。
   */
  r: PnpReq

  /**
   * 这张卡的通道。
   */
  chan: QcChannel
}

/**
 * qcApplicantRowsOf 的入参。
 */
export type QcFactorIn = {
  /**
   * 这张卡的行。
   */
  rows: PnpReq[]

  /**
   * 因素名(见 QC_F)。
   */
  factor: string
}

/**
 * qcSkillPartOf 的入参:一段技能(口语 / 书面)的分数线。
 */
export type QcSkillPartIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 那一行法语门槛。
   */
  row: PnpReq

  /**
   * 理解那一格的键。
   */
  comp: string

  /**
   * 表达那一格的键。
   */
  expr: string

  /**
   * 两格同分时的词条(「口语 {n}」)。
   */
  same: string

  /**
   * 理解那一格的词条(「听 {n}」)。
   */
  compKey: string

  /**
   * 表达那一格的词条(「说 {n}」)。
   */
  exprKey: string
}

/**
 * qcCellNameOf 的入参。
 */
export type QcCellNameIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 本岗职业码。
   */
  noc: string

  /**
   * 首屏事实索引。
   */
  index: PnpFactsIndex
}

/**
 * qcOwnRowsOf 的入参。
 */
export type QcOwnRowsIn = {
  /**
   * 这张卡挑到的行。
   */
  rows: PnpReq[]

  /**
   * 这张卡的通道。
   */
  chan: QcChannel
}

/**
 * 「申请步骤」卡一行事实的线格式(2026-10-02 申请步骤批 1;etl/pathways 登记,原样经库表 pathways.steps 下来):
 * 引用别的表的写 ref(+ factor / scope),官方原句型的写 key(+ vars / quote / url)—— 两种互斥,缺席 = 这一型没有这格。
 */
export type PnpStepFactJson = {
  /**
   * 引用哪张表(req 门槛行 / processing 处理时长 / intake 收件窗口 / draws 抽选表)。
   */
  ref?: string

  /**
   * 引用门槛行时的因素名(empYears / pointsMin / eeProfile)。
   */
  factor?: string

  /**
   * 引用处理时长时的类别原名(处理统计页那一行)。
   */
  scope?: string

  /**
   * 原句型事实的事实词(三语文案在 i18n pnpstep.f.*)。
   */
  key?: string

  /**
   * 事实词模板里的数(10 天、60 天、6 个月…)。
   */
  vars?: Record<string, number>

  /**
   * 官方原句(数据层逐句对 crawl 缓存核过;卡上不显示,留作出处)。
   */
  quote?: string

  /**
   * 原句出处页。
   */
  url?: string
}

/**
 * 「申请步骤」卡一步的线格式(2026-10-02 申请步骤批 1)。
 */
export type PnpStepJson = {
  /**
   * 步骤词(三语文案在 i18n pnpstep.s.*)。
   */
  step: string

  /**
   * 谁做(you / employer / province / federal)。
   */
  who: string

  /**
   * 这一步不需要(灰字)。
   */
  none: boolean

  /**
   * 卡点(橙点;只给数据说得出的,如官方明写没有排定抽选)。
   */
  stuck: boolean

  /**
   * 事实行。
   */
  facts: PnpStepFactJson[]
}

/**
 * 一条通道的步骤(/api/jobs/pnp 的 pnpSteps 一行)。
 */
export type PnpStepSet = {
  /**
   * 通道编号(= 通道对照行 key)。
   */
  key: string

  /**
   * 步骤。
   */
  steps: PnpStepJson[]
}

/**
 * 步骤引用的运营统计一行(/api/jobs/pnp 的 pnpStepOps 一行;2026-10-02 申请步骤批 1)。
 */
export type PnpStepOp = {
  /**
   * 省码。
   */
  province: string

  /**
   * 指标名(processing_weeks / intake_limit / intake_used / intake_remaining / intake_filled)。
   */
  metric: string

  /**
   * 口径原名(处理时长 = 类别名;收件窗口 = 行业名)。
   */
  scope: string

  /**
   * 口径归一键(收件窗口按它认行业)。
   */
  streamKey: string

  /**
   * 数值;官方 N/A 为 null。
   */
  value: number | null

  /**
   * 文字值(满额日期 ISO)。
   */
  valueText: string

  /**
   * 统计期(处理时长 = 季度 2026Q2;收件窗口 = 开放日)。
   */
  period: string

  /**
   * 截至日。
   */
  asOf: string
}

/**
 * 「申请步骤」卡一步里的一行字。
 */
export type StepLineSpec = {
  /**
   * 这一行。
   */
  text: string

  /**
   * 橙字(限额行业那类卡人的条件)。
   */
  warn: boolean
}

/**
 * 「申请步骤」卡一步下挂的小表(萨省收件窗口;与配额卡同一种小表,走 QuotaGrid)。
 */
export type StepTableSpec = {
  /**
   * 左上角那一格(「9 月窗口」)。
   */
  corner: string

  /**
   * 表头(名额 / 已用 / 满额)。
   */
  heads: string[]

  /**
   * 各行(一个行业一行)。
   */
  rows: QuotaRowSpec[]
}

/**
 * 「申请步骤」卡的一步(洗好的)。
 */
export type StepSpec = {
  /**
   * 列表键。
   */
  key: string

  /**
   * 第几步(从 1 起)。
   */
  n: number

  /**
   * 步骤名。
   */
  name: string

  /**
   * 谁做。
   */
  who: string

  /**
   * 这一步不需要(整步灰字、不出谁做)。
   */
  none: boolean

  /**
   * 卡点(橙点)。
   */
  stuck: boolean

  /**
   * 事实行。
   */
  lines: StepLineSpec[]

  /**
   * 下挂的小表;没有给 null。
   */
  table: StepTableSpec | null
}

/**
 * 「申请步骤」卡(洗好的)。
 */
export type StepsCardSpec = {
  /**
   * 卡标题。
   */
  title: string

  /**
   * 标题行右端的来源(本岗通道那一页);没有给 null。
   */
  source: SourceLink | null

  /**
   * 各步。
   */
  steps: StepSpec[]
}

/**
 * stepsCardOf 的入参。
 */
export type StepsCardOfIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 本岗省码。
   */
  province: string

  /**
   * 本岗走的那条通道;没有给 null。
   */
  channel: PnpPathway | null

  /**
   * 登了步骤的通道。
   */
  sets: PnpStepSet[]

  /**
   * 步骤引用的运营统计。
   */
  stepOps: PnpStepOp[]

  /**
   * 本岗的门槛卡(引用门槛行的事实直接取它算好的那一行);没有给 null。
   */
  gate: GateCardSpec | null
}

/**
 * stepSetOf 的入参。
 */
export type StepSetOfIn = {
  /**
   * 登了步骤的通道。
   */
  sets: PnpStepSet[]

  /**
   * 通道编号。
   */
  key: string
}

/**
 * stepOf 的入参。
 */
export type StepOfIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 本岗省码。
   */
  province: string

  /**
   * 这一步(线格式)。
   */
  step: PnpStepJson

  /**
   * 第几步。
   */
  n: number

  /**
   * 步骤引用的运营统计。
   */
  stepOps: PnpStepOp[]

  /**
   * 本岗的门槛卡;没有给 null。
   */
  gate: GateCardSpec | null
}

/**
 * stepFactLinesOf 的入参。
 */
export type StepFactIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 本岗省码。
   */
  province: string

  /**
   * 这一行事实。
   */
  fact: PnpStepFactJson

  /**
   * 步骤引用的运营统计。
   */
  stepOps: PnpStepOp[]

  /**
   * 本岗的门槛卡;没有给 null。
   */
  gate: GateCardSpec | null
}

/**
 * intakeTableOf 的入参。
 */
export type IntakeTableIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 本岗省码。
   */
  province: string

  /**
   * 步骤引用的运营统计。
   */
  stepOps: PnpStepOp[]
}

/**
 * 收件窗口一个行业的四个数(intakeTableOf 内部攒行用)。
 */
export type IntakeCell = {
  /**
   * 行业原名。
   */
  scope: string

  /**
   * 行业归一键。
   */
  streamKey: string

  /**
   * 名额。
   */
  limit: number | null

  /**
   * 已用。
   */
  used: number | null

  /**
   * 剩余。
   */
  remaining: number | null

  /**
   * 满额日期 ISO;官方没写为空串。
   */
  filled: string
}

/**
 * intakeRowOf 的入参。
 */
export type IntakeRowIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 这个行业的四个数。
   */
  cell: IntakeCell
}

/**
 * PnpStepsCard 的 props。
 */
export type PnpStepsCardIn = {
  /**
   * 洗好的卡。
   */
  spec: StepsCardSpec
}

/**
 * StepItem 的 props。
 */
export type StepItemIn = {
  /**
   * 洗好的一步。
   */
  step: StepSpec
}

/**
 * QuotaGrid 的 props(配额卡与「申请步骤」卡的收件窗口共用这一种小表;2026-10-02 申请步骤批 1 自 PnpQuotaCard 拆出)。
 */
export type QuotaGridIn = {
  /**
   * 左上角那一格;配额卡为空串。
   */
  corner: string

  /**
   * 表头。
   */
  heads: string[]

  /**
   * 各行。
   */
  rows: QuotaRowSpec[]

  /**
   * 第一行最右一格的截至日期(各列不一致逐列一行);没有给空列。
   */
  asOf: string[]
}

/**
 * intakePut 的入参。
 */
export type IntakePutIn = {
  /**
   * 攒行用的表(行业 + 开放日 → 四个数)。
   */
  cells: Map<string, IntakeCell>

  /**
   * 一行运营统计。
   */
  op: PnpStepOp
}

/**
 * quarterTextOf 的入参。
 */
export type QuarterTextIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 统计期(2026Q2)。
   */
  period: string
}

/**
 * sectorRowsOf 的入参(2026-10-02 申请步骤批 1)。
 */
export type SectorRowsIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 这一省的配额行。
   */
  rows: PnpOps[]

  /**
   * 列(每列认的指标名)。
   */
  cols: string[][]
}

/**
 * sectorCellOf 的入参(2026-10-02 申请步骤批 1)。
 */
export type SectorCellIn = {
  /**
   * 这一省的配额行。
   */
  rows: PnpOps[]

  /**
   * 行业官方原名。
   */
  scope: string

  /**
   * 认哪几个指标名。
   */
  metrics: string[]
}
