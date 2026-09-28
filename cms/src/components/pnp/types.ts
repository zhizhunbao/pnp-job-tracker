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
   * 英文官方名(主文案)。
   */
  name: string

  /**
   * 界面语言译名灰字;''=不出(英文界面、关了译名、或与英文同字)。
   */
  sub: string
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
   * 数值。
   */
  value: number

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
   * 本岗 PNP 格的具名通道(数据层 pnp_stream;'' = 省默认通道),配额行的通道键先查 QUOTA_STREAM_KEYS(2026-09-27)。
   */
  pnpStream: string
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
   * 本岗 PNP 格的具名通道(数据层 pnp_stream;'' = 省默认通道),先查 QUOTA_STREAM_KEYS(2026-09-27)。
   */
  pnpStream: string

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
   * 标题右端的官方来源;认不出站名给 null。
   */
  source: SourceLink | null

  /**
   * 行。
   */
  rows: GateRowSpec[]
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
   * 本岗。
   */
  job: PnpJob

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
  job: PnpJob
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
   * 收起了的清单键(2026-09-23 Frank「这个默认展开吧」:清单默认全展开,记的是收起的那些;此前记展开的)。
   */
  closed: Set<string>

  /**
   * 折叠开关工厂。
   */
  toggleOf: ToggleOfFn

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
   * 收起了清单的类别键(清单一律默认展开,这里记的是被收起来的)。
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
   * 本岗对应的组(抽选行 stream 原值);空列 = 不高亮。
   */
  hitStreams: string[]

  /**
   * 展开着的组(通道名;「查看全省 N 组」那个开关的键是 DRAWS_ALL_KEY)。
   */
  open: Set<string>

  /**
   * 组的开合手柄工厂。
   */
  toggleOf: ToggleOfFn
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
   * 通道条目(现在单值,结构可放多条)。
   */
  channels: ChannelSpec[]
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
   * 其余组展开了没有。
   */
  open: boolean

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
 * channelsOf 的入参。
 */
export type ChannelsIn = {
  /**
   * 界面语取词函数(译名灰字)。
   */
  t: TFn

  /**
   * 英文取词函数(主文案一律英文官方名)。
   */
  tEn: TFn

  /**
   * 界面语言。
   */
  lang: PnpLang

  /**
   * 出不出界面语言译名。
   */
  showZh: boolean

  /**
   * 本岗。
   */
  job: PnpJob
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
   * 英文名。
   */
  en: string

  /**
   * 界面语言名。
   */
  local: string
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
