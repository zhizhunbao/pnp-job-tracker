/**
 * profile 域(移民档案)的契约:档案六格(分型/职业/CLB/EE 分/工签/目标省)的
 * 表单值、点选项、区间归属与表单件 props。2026-08-27 Frank 拍板自 account 域拆出
 * (判据:这批件答的问题是「移民档案怎么问怎么填」,不是「账户页」;第二个消费者
 * jobs/OnboardingWizard 的同构重复已经存在)。形状本域自己声明,不从别的域取。
 *
 * @author Frank
 * @time 2026-08-27 23:30:00
 */

/**
 * 界面语取词函数(与 lib/i18n 的 TFn 同形:键 + 可选插值 —— 宪法 08-25「types 自声明」,
 * 形状本域自己声明,不从别的域取;真参数是 lib/i18n 那个带附加成员的交叉类型,
 * 结构上兜得住)。
 */
export type TFn = (key: string, vars?: Record<string, string | number>) => string

/**
 * makeAddTyped 的入参(原 ProfileForm 体内 addTyped 闭包的三样东西)。
 */
export type AddTypedIn = {
  /**
   * 搜索框里当前敲进去的原字(未 trim;5 位数字按 NOC 码直加)。
   */
  q: string

  /**
   * 当前搜索命中的职业清单;不是码时取第一条加。
   * 只声明本函数真读的那一格(职业码),标题等格不关它的事。
   */
  hits: readonly {
    /**
     * 命中条目的职业码(取第一条加时读的就是它)。
     */
    noc: string
  }[]

  /**
   * 把一个职业码加进已选清单(重复与空串由它自己挡)。
   */
  addNoc: (code: string) => void
}

/**
 * 「加输入框里这一个」的按钮手柄:不带参数,点了就按当前输入加一个职业。
 */
export type AddTypedFn = () => void

/**
 * 大白话点选项:一枚 chip 的 i18n 键与它代表的结构化值(E11-05 ①,§3.4 术语翻译)。
 * 2026-08-27 自 profileOptions.ts 迁入(该文件不在组件域抽屉名单里,值表并回
 * constants、归属函数并回 functions、形状归这里)。
 */
export type Opt = {
  /**
   * chip 面文案的 i18n 键(三语在 lib/i18n)。
   */
  key: string

  /**
   * 点选后存进档案的结构化值;null = 「不确定」档,存空。
   */
  value: number | null
}

/**
 * 移民档案表单的值(users.profile 里表单管的那六格;E5-00 §3.2)。
 * 归一前形状:来自 Payload 的 json 列,键可能缺席也可能存 null,照实声明。
 * 2026-08-27 自 ProfileForm.tsx 迁入(与 ProfileWithResume 的前六格同形 ——
 * 那边多的是本表单不管的简历存档两键)。
 */
export type ProfileValue = {
  /**
   * 分型(E11-04:海外/在读/在职/求职/已 PR);未填 = null。
   */
  currentStatus?: string | null

  /**
   * 目标职业的 NOC 码清单;未填 = null。
   */
  nocCodes?: string[] | null

  /**
   * 英语 CLB 档;未填 = null。
   */
  clb?: number | null

  /**
   * EE 的 CRS 分(存区间下界,见 constants 的 CRS_OPTS);未填 = null。
   */
  crs?: number | null

  /**
   * 目标省码清单;未填 = null。
   */
  targetProvinces?: string[] | null

  /**
   * 工签剩余月数;未填 = null。
   */
  pgwpMonthsLeft?: number | null
}

/**
 * 分型的取值域(E11-04 §2.5 A–E,顺序即 UI 顺序;slug 单一来源在 lib/jobs/match)。
 */
export type StatusSlug = 'overseas' | 'studying' | 'working' | 'jobhunting' | 'pr'

/**
 * 目标省的取值域(QC 走自己的体系,不进目标省)。
 */
export type Prov = 'ON' | 'BC' | 'AB' | 'SK' | 'MB' | 'NS' | 'NB' | 'NL' | 'PE'

/**
 * 档案保存的落地态:没动 / 存成 / 存挂(空串 = 初始或又开始改)。
 */
export type ProfileSaveState = '' | 'saved' | 'err'

/**
 * 职业选项一条:NOC 码 + 官方职业名(来自 noc-descriptions 维度,397 行)。
 */
export type NocOpt = {
  /**
   * NOC 2021 官方五位码。
   */
  noc: string

  /**
   * 官方职业名;维度里缺名时归一成空串(toNocOpt 兜)。
   */
  title: string
}

/**
 * noc-descriptions 维度接口的响应体(归一前:网络层什么都可能缺)。
 */
export type NocDescRespJson = {
  /**
   * 维度行清单;缺席/空按零条读。
   */
  docs?: {
    /**
     * NOC 码;缺码的行直接丢(没码没法选)。
     */
    noc?: string | null

    /**
     * 官方职业名;缺名归一成空串。
     */
    title?: string | null
  }[] | null
} | null

/**
 * ProfileForm 的 props(页面门在传,契约 2026-08-27 换装批原样保留)。
 */
export type ProfileFormIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 登录人 id(拼 PATCH 地址)。
   */
  userId: string | number

  /**
   * 档案初值(返回用户已填精确值不点不覆盖);没档 = null。
   */
  initial: ProfileValue | null

  /**
   * 存成后的回调(调用方可省 —— 目前页面门就没传)。
   */
  onSaved?: () => void
}

/**
 * useProfileForm 的入参(props 里状态机器要的三样)。
 */
export type ProfileHookIn = {
  /**
   * 登录人 id(交给保存工厂拼地址)。
   */
  userId: string | number

  /**
   * 档案初值;没档 = null。
   */
  initial: ProfileValue | null

  /**
   * 存成后的回调;没有 = null。
   */
  onSaved: (() => void) | null
}

/**
 * 档案表单的整块面板:状态 + 手柄(useProfileForm 出,profileform 拼装用)。
 */
export type ProfilePanel = {
  /**
   * 分型现值(空串 = 没选)。
   */
  status: string

  /**
   * 拨分型。
   */
  setStatus: (v: string) => void

  /**
   * 已选职业码清单。
   */
  nocs: string[]

  /**
   * 拨已选职业码清单。
   */
  setNocs: (v: string[]) => void

  /**
   * 英语 CLB 现值。
   */
  clb: number | null

  /**
   * 拨 CLB。
   */
  setClb: (v: number | null) => void

  /**
   * EE 分现值(存区间下界)。
   */
  crs: number | null

  /**
   * 拨 EE 分。
   */
  setCrs: (v: number | null) => void

  /**
   * 算过 EE 分吗(两段式的第一段)。
   */
  crsCalc: boolean

  /**
   * 拨「算过没」。
   */
  setCrsCalc: (v: boolean) => void

  /**
   * 目标省码清单。
   */
  provs: string[]

  /**
   * 拨目标省码清单。
   */
  setProvs: (v: string[]) => void

  /**
   * 工签剩余月数档。
   */
  pgwp: number | null

  /**
   * 拨工签档。
   */
  setPgwp: (v: number | null) => void

  /**
   * 职业搜索框现值。
   */
  q: string

  /**
   * 拨搜索框。
   */
  setQ: (v: string) => void

  /**
   * 职业选项全集(noc-descriptions 维度,挂载时拉一次)。
   */
  opts: NocOpt[]

  /**
   * 按当前输入命中的职业清单(已选的不再出)。
   */
  hits: NocOpt[]

  /**
   * 保存进行中。
   */
  busy: boolean

  /**
   * 保存落地态。
   */
  saved: ProfileSaveState

  /**
   * 「加输入框里这一个」的手柄(5 位码按码加,否则加命中第一条)。
   */
  onAddTyped: () => void

  /**
   * 保存整份档案。
   */
  onSave: () => void
}

/**
 * profileSeedOf 的入参。
 */
export type ProfileSeedIn = {
  /**
   * 档案初值;没档 = null。
   */
  initial: ProfileValue | null
}

/**
 * 档案表单各格 state 的初值包(profileSeedOf 出,useProfileForm 逐格喂 useState)。
 */
export type ProfileSeed = {
  /**
   * 分型初值(没填 = 空串)。
   */
  status: string

  /**
   * 已选职业码初值(滤掉空码)。
   */
  nocs: string[]

  /**
   * CLB 初值。
   */
  clb: number | null

  /**
   * EE 分初值。
   */
  crs: number | null

  /**
   * 「算过 EE 分」初值(有分 = 算过)。
   */
  crsCalc: boolean

  /**
   * 目标省初值(滤掉空码)。
   */
  provs: string[]

  /**
   * 工签档初值。
   */
  pgwp: number | null
}

/**
 * makeLoadNocOpts 的入参。
 */
export type LoadNocOptsIn = {
  /**
   * 选项全集的落格。
   */
  setOpts: (v: NocOpt[]) => void
}

/**
 * nocHitsOf 的入参(搜索兜底那格的三样原料)。
 */
export type NocHitsIn = {
  /**
   * 搜索框现值(体内自己 trim + 小写)。
   */
  q: string

  /**
   * 职业选项全集。
   */
  opts: NocOpt[]

  /**
   * 已选职业码(命中里剔掉)。
   */
  nocs: string[]
}

/**
 * makeNocAdd 的入参(热门 chip 与命中行共用的「加一个职业」)。
 */
export type NocAddIn = {
  /**
   * 要加的 NOC 码。
   */
  code: string

  /**
   * 现清单(重复不再加)。
   */
  nocs: string[]

  /**
   * 清单落格。
   */
  setNocs: (v: string[]) => void

  /**
   * 搜索框落格(加完清空,与旧 addNoc 同口径)。
   */
  setQ: (v: string) => void
}

/**
 * makeNocAdder 的入参(收码的参数化加法:makeAddTyped 要一个「给码就加」的口,
 * 与逐枚 chip 的零参手柄 makeNocAdd 是同一套逻辑的两种拿法)。
 */
export type NocAdderIn = {
  /**
   * 现清单(重复不再加)。
   */
  nocs: string[]

  /**
   * 清单落格。
   */
  setNocs: (v: string[]) => void

  /**
   * 搜索框落格(加完清空)。
   */
  setQ: (v: string) => void
}

/**
 * 参数化的「加一个职业」:收码,重复与空码由它自己挡。
 */
export type NocAddFn = (code: string) => void

/**
 * makeNocDrop 的入参(已选标签上的 ×,与热门 chip 再点取消共用)。
 */
export type NocDropIn = {
  /**
   * 要摘的 NOC 码。
   */
  code: string

  /**
   * 现清单。
   */
  nocs: string[]

  /**
   * 清单落格。
   */
  setNocs: (v: string[]) => void
}

/**
 * nocTitleOf 的入参(§3.4 藏码:码 → 人话职业名)。
 */
export type NocTitleIn = {
  /**
   * 要显示的 NOC 码。
   */
  code: string

  /**
   * 职业选项全集(官方名优先)。
   */
  opts: NocOpt[]

  /**
   * 取词函数(热门表的大白话标签兜底)。
   */
  t: TFn
}

/**
 * makeStatusPick 的入参(分型 chip:点同一项 = 取消)。
 */
export type StatusPickIn = {
  /**
   * 这枚 chip 代表的分型。
   */
  slug: StatusSlug

  /**
   * 分型现值。
   */
  status: string

  /**
   * 分型落格。
   */
  setStatus: (v: string) => void
}

/**
 * makeOptPick 的入参(区间单选行里一枚 chip)。
 */
export type OptPickIn = {
  /**
   * 这枚 chip 代表的值。
   */
  value: number | null

  /**
   * 点了往哪报。
   */
  onPick: (v: number | null) => void
}

/**
 * makeProvToggle 的入参(目标省 chip 多选:再点取消)。
 */
export type ProvToggleIn = {
  /**
   * 这枚 chip 代表的省码。
   */
  prov: Prov

  /**
   * 现清单。
   */
  provs: string[]

  /**
   * 清单落格。
   */
  setProvs: (v: string[]) => void
}

/**
 * makeCrsMode 的入参(EE 分两段式的第一段:没算过 / 算过)。
 */
export type CrsModeIn = {
  /**
   * 这枚 chip 代表「算过」还是「没算过」。
   */
  on: boolean

  /**
   * 「算过没」落格。
   */
  setCrsCalc: (v: boolean) => void

  /**
   * EE 分落格(切到「没算过」时清分 —— 数据完整性:没算过就不留分)。
   */
  setCrs: (v: number | null) => void
}

/**
 * makeSaveProfile 的入参(整份档案 PATCH 回 users.profile 要的全部原料)。
 */
export type SaveProfileIn = {
  /**
   * 登录人 id(拼地址)。
   */
  userId: string | number

  /**
   * 分型现值(空串存 null)。
   */
  status: string

  /**
   * 已选职业码。
   */
  nocs: string[]

  /**
   * CLB 现值。
   */
  clb: number | null

  /**
   * EE 分现值。
   */
  crs: number | null

  /**
   * 算过 EE 分吗(没算过时分存 null,不管手上残值)。
   */
  crsCalc: boolean

  /**
   * 目标省码。
   */
  provs: string[]

  /**
   * 工签档现值。
   */
  pgwp: number | null

  /**
   * 拨忙态。
   */
  setBusy: (v: boolean) => void

  /**
   * 拨落地态。
   */
  setSaved: (v: ProfileSaveState) => void

  /**
   * 存成后的回调;没有 = null。
   */
  onSaved: (() => void) | null
}

/**
 * profileSaveLabelOf 的入参(保存钮面:存中换省略号占位不跳动)。
 */
export type SaveLabelIn = {
  /**
   * 保存进行中。
   */
  busy: boolean

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * 区间归属的一档:上界(不含)与它代表的锚值。
 */
export type Band = {
  /**
   * 这一档的上界(严格小于;取值都是整数,闭界换开界不漏值)。
   */
  below: number

  /**
   * 命中这一档时高亮/存下的锚值。
   */
  value: number
}

/**
 * bandValueOf 的入参(clb/crs/pgwp 三张归属表共用的机器)。
 */
export type BandValueIn = {
  /**
   * 手上的精确值。
   */
  v: number

  /**
   * 从低到高排的档表。
   */
  bands: readonly Band[]

  /**
   * 全部档都不命中时的顶档锚值。
   */
  top: number
}

/**
 * StatusRow 的 props(分型单选行)。
 */
export type StatusRowIn = {
  /**
   * 分型现值。
   */
  status: string

  /**
   * 分型落格。
   */
  setStatus: (v: string) => void

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * BucketRow 的 props(clb/crs/pgwp 的区间单选行)。
 */
export type BucketRowIn = {
  /**
   * 这一行的档表。
   */
  opts: readonly Opt[]

  /**
   * 现值归属哪档(null = 没填)。
   */
  active: number | null

  /**
   * 点档往哪报(点 null 值档 = 清空该字段)。
   */
  onPick: (v: number | null) => void

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * ProvRow 的 props(目标省多选行)。
 */
export type ProvRowIn = {
  /**
   * 现清单。
   */
  provs: string[]

  /**
   * 清单落格。
   */
  setProvs: (v: string[]) => void

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * NocPicker 的 props(职业选择整块:热门 chips + 搜索兜底 + 命中表)。
 */
export type NocPickerIn = {
  /**
   * 搜索框现值。
   */
  q: string

  /**
   * 搜索框落格。
   */
  setQ: (v: string) => void

  /**
   * 职业选项全集。
   */
  opts: NocOpt[]

  /**
   * 当前命中清单。
   */
  hits: NocOpt[]

  /**
   * 已选职业码。
   */
  nocs: string[]

  /**
   * 已选清单落格。
   */
  setNocs: (v: string[]) => void

  /**
   * 「加输入框里这一个」的手柄。
   */
  onAddTyped: () => void

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * NocTags 的 props(已选职业的标签串,每枚带 ×)。
 */
export type NocTagsIn = {
  /**
   * 已选职业码。
   */
  nocs: string[]

  /**
   * 已选清单落格(× 摘一个)。
   */
  setNocs: (v: string[]) => void

  /**
   * 职业选项全集(码 → 名)。
   */
  opts: NocOpt[]

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * 首访引导向导走到的那一步(第一步永远是分型,后面几步由分型决定,见 OB_BRANCHES)。
 */
export type ObStep = 'status' | 'noc' | 'clb' | 'crs' | 'prov' | 'pgwp'

/**
 * 简历解析的落地态:没上传 / 解析中 / 读出来了 / 读不到文字 / 次数用完 / 别的失败。
 */
export type ResumeState = '' | 'busy' | 'done' | 'scan' | 'limit' | 'fail'

/**
 * 简历识别出的一个职业候选。
 */
export type NocCandidate = {
  /**
   * NOC 五位码。
   */
  noc: string

  /**
   * 官方英文职业名;识别得到码却没名时归一成空串。
   */
  title: string
}

/**
 * 当前登录人接口的响应体(归一前:没登录、网络挂了都可能什么都没有)。
 */
export type MeRespJson = {
  /**
   * 登录人;没登录时这一层就不在。
   */
  user?: {
    /**
     * 人的编号(档案存给谁靠它);缺号按没登录处理。
     */
    id?: string | number | null
  } | null
} | null

/**
 * 简历解析接口的响应体(归一前)。
 */
export type ResumeRespJson = {
  /**
   * 识别出的职业候选;缺席或空按零条读。
   */
  nocCandidates?: {
    /**
     * 候选的职业码;缺码的条目直接丢(没码没法选)。
     */
    noc?: string | null

    /**
     * 候选的职业名;缺名归一成空串。
     */
    title?: string | null
  }[] | null

  /**
   * 从简历里读到的英语水平档;读不出就没有这一项。
   */
  clb?: number | null
} | null

/**
 * 洗净的简历解析结果(预填建议,不静默入库 —— 职业候选进职业步供挑选,英语水平直接预选)。
 */
export type ResumePrefill = {
  /**
   * 职业候选清单。
   */
  candidates: NocCandidate[]

  /**
   * 英语水平档;简历里读不出 = null,这时不动用户已选的档。
   */
  clb: number | null
}

/**
 * 收下隐藏文件框那个元素的落格(回调式引用,签名由 React 的 ref 属性定死:
 * 挂载时给元素、卸载时给 null)。写成回调而不是 useRef,是因为点上传钮时要读它 ——
 * 用 useRef 就成了「渲染期间读引用」,React 的规则不许(先例 button 域的 btnRef)。
 */
export type FileMountFn = (el: HTMLInputElement | null) => void

/**
 * 文件框变更事件里本域真读的两样(签名由 React 定死,只声明用得上的)。
 */
export type FileInputEvent = {
  /**
   * 事件源,也就是那个文件框。
   */
  target: {
    /**
     * 用户选中的文件;一个没选 = null。
     */
    files: FileList | null

    /**
     * 文件框自己的值;选完清空,不清的话再选同一份文件不会触发变更。
     */
    value: string
  }
}

/**
 * 选完文件的回调(签名由 React 的 onChange 定死)。
 */
export type ResumePickFn = (e: FileInputEvent) => void

/**
 * 上传并解析一份简历。
 */
export type ResumeUploadFn = (f: File) => void

/**
 * 往已选职业清单上合并预选的更新函数(交给 React 的落格,拿到的是最新一份清单 ——
 * 解析要十几秒,这期间用户可能又点了几个,不能拿上传那一刻的旧清单去覆盖)。
 */
export type NocsMergeFn = (prev: string[]) => string[]

/**
 * 已选职业清单的落格:既收整份新清单,也收上面那种合并函数。
 */
export type SetNocsFn = (v: string[] | NocsMergeFn) => void

/**
 * makeLoadUserId 的入参。
 */
export type LoadUserIdIn = {
  /**
   * 登录人编号的落格;没登录或拉不到都落 null。
   */
  setUid: (v: string | number | null) => void
}

/**
 * makeResumeUpload 的入参(解析结果分四路落格)。
 */
export type ResumeUploadMakeIn = {
  /**
   * 解析态的落格(上传钮与提示语都看它)。
   */
  setState: (v: ResumeState) => void

  /**
   * 职业候选的落格(职业步把它们列成 chips)。
   */
  setCandidates: (v: NocCandidate[]) => void

  /**
   * 已选职业清单的落格(预选前两个候选)。
   */
  setNocs: SetNocsFn

  /**
   * 英语水平的落格(简历里读得出就直接预选)。
   */
  setClb: (v: number | null) => void
}

/**
 * makeResumePick 的入参。
 */
export type ResumePickIn = {
  /**
   * 拿到文件后交给谁去传。
   */
  onUpload: ResumeUploadFn
}

/**
 * resumeFailStateOf 的入参。
 */
export type ResumeFailIn = {
  /**
   * 上传的响应码(次数用完 429、读不到文字 422,其余按别的失败)。
   */
  status: number
}

/**
 * makeFileOpen 的入参。
 */
export type FileOpenIn = {
  /**
   * 那个藏起来的文件框(替用户去点它);还没挂上 = null。
   */
  el: HTMLInputElement | null
}

/**
 * makeNocsMerge 的入参。
 */
export type NocsMergeIn = {
  /**
   * 这次解析出的职业候选(取前 RESUME_PREFILL_MAX 个预选)。
   */
  candidates: NocCandidate[]
}

/**
 * makeNocPick 的入参(向导里点一枚职业 chip;它没有搜索框,所以不清搜索框)。
 */
export type NocPickIn = {
  /**
   * 这枚代表的职业码。
   */
  code: string

  /**
   * 现清单(重复不再加)。
   */
  nocs: string[]

  /**
   * 清单落格。
   */
  setNocs: SetNocsFn
}

/**
 * obNocLabelOf 的入参(向导里码 → 人话职业名)。
 */
export type NocLabelIn = {
  /**
   * 要显示的职业码。
   */
  code: string

  /**
   * 这次简历识别出的候选(热门表里没有的码,靠它拿到官方英文类名)。
   */
  candidates: NocCandidate[]

  /**
   * 取词函数(热门表的大白话标签)。
   */
  t: TFn
}

/**
 * obStepsOf 的入参。
 */
export type ObStepsIn = {
  /**
   * 分型现值(空串 = 还没选,那就只有第一步)。
   */
  status: string
}

/**
 * obCurrentStepOf 的入参。
 */
export type ObCurrentStepIn = {
  /**
   * 本次分型下要走的全部步骤。
   */
  steps: ObStep[]

  /**
   * 走到第几步(从 0 数;换分型会让步数变少,所以取值时还要夹一次)。
   */
  step: number
}

/**
 * obQuestionKeyOf 的入参。
 */
export type ObQuestionIn = {
  /**
   * 当前这一步。
   */
  step: ObStep
}

/**
 * obBarStyleOf 的入参。
 */
export type ObBarIn = {
  /**
   * 走到第几步(从 0 数)。
   */
  step: number

  /**
   * 本次一共几步。
   */
  total: number
}

/**
 * obResumeHintOf 的入参。
 */
export type ObResumeHintIn = {
  /**
   * 解析态。
   */
  state: ResumeState

  /**
   * 识别到几个职业方向(只有解析成了才用得上)。
   */
  count: number

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * obValueTextOf 与 obNextLabelOf 共用的场次判定:向导是从投递流里开的,还是从职位板开的。
 */
export type ObApplyIn = {
  /**
   * 从投递流里开的(填完继续投递,不跳匹配视图)。
   */
  apply: boolean

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * obNextLabelOf 的入参。
 */
export type ObNextLabelIn = {
  /**
   * 这一步是不是最后一步(是就显示终键文案)。
   */
  isLast: boolean

  /**
   * 从投递流里开的。
   */
  apply: boolean

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * obDirtyOf 的入参(六格档案值,判用户到底填没填东西)。
 */
export type ObDirtyIn = {
  /**
   * 分型现值。
   */
  status: string

  /**
   * 已选职业码。
   */
  nocs: string[]

  /**
   * 英语水平档。
   */
  clb: number | null

  /**
   * 快速通道分。
   */
  crs: number | null

  /**
   * 算过快速通道分吗(没算过时那格分不算数)。
   */
  crsCalc: boolean

  /**
   * 目标省码。
   */
  provs: string[]

  /**
   * 工签剩余月数档。
   */
  pgwp: number | null
}

/**
 * obTargetOf 的入参(只要判定「够不够得上匹配视图」真读的那三格)。
 */
export type ObTargetIn = {
  /**
   * 已选职业码。
   */
  nocs: string[]

  /**
   * 快速通道分。
   */
  crs: number | null

  /**
   * 算过快速通道分吗。
   */
  crsCalc: boolean

  /**
   * 目标省码。
   */
  provs: string[]
}

/**
 * 走完向导的手柄(存档 + 记「弹过了」+ 交还调用方或整页跳转)。
 */
export type ObFinishFn = () => void

/**
 * makeOnboardingFinish 的入参。
 */
export type ObFinishIn = {
  /**
   * 登录人编号;还没拉到或没登录 = null,那就只记「弹过了」不存档。
   */
  userId: string | number | null

  /**
   * 分型现值。
   */
  status: string

  /**
   * 已选职业码。
   */
  nocs: string[]

  /**
   * 英语水平档。
   */
  clb: number | null

  /**
   * 快速通道分。
   */
  crs: number | null

  /**
   * 算过快速通道分吗。
   */
  crsCalc: boolean

  /**
   * 目标省码。
   */
  provs: string[]

  /**
   * 工签剩余月数档。
   */
  pgwp: number | null

  /**
   * 存档忙态的落格(存的过程里终键不可点)。
   */
  setSaving: (v: boolean) => void

  /**
   * 投递流交还调用方的回调;从职位板开的向导没有 = null,那时整页跳转。
   */
  onFinished: (() => void) | null
}

/**
 * makeStepNext 的入参。
 */
export type StepNextIn = {
  /**
   * 这一步是不是最后一步(是就落地,不是就往后走一步)。
   */
  isLast: boolean

  /**
   * 走到第几步。
   */
  step: number

  /**
   * 本次一共几步。
   */
  total: number

  /**
   * 步数落格。
   */
  setStep: (v: number) => void

  /**
   * 最后一步按下时的落地手柄。
   */
  finish: ObFinishFn
}

/**
 * makeStepBack 的入参。
 */
export type StepBackIn = {
  /**
   * 走到第几步。
   */
  step: number

  /**
   * 步数落格。
   */
  setStep: (v: number) => void
}

/**
 * useResumePrefill 的入参(解析结果要落进向导的两格档案值,所以落格由调用方给)。
 */
export type ResumeHookIn = {
  /**
   * 已选职业清单的落格。
   */
  setNocs: SetNocsFn

  /**
   * 英语水平的落格。
   */
  setClb: (v: number | null) => void
}

/**
 * 简历预填的整块面板(useResumePrefill 出)。
 */
export type ResumePanel = {
  /**
   * 解析态。
   */
  state: ResumeState

  /**
   * 这次识别出的职业候选。
   */
  candidates: NocCandidate[]

  /**
   * 收下那个藏起来的文件框(挂到它的 ref 属性上)。
   */
  onFileMount: FileMountFn

  /**
   * 选完文件后的回调。
   */
  onPick: ResumePickFn

  /**
   * 点上传钮:去点那个藏起来的文件框。
   */
  onOpen: () => void
}

/**
 * useOnboardingWizard 的入参。
 */
export type OnboardingHookIn = {
  /**
   * 档案初值(返回用户已填的精确值不点不覆盖);没档 = null。
   */
  initial: ProfileValue | null

  /**
   * 投递流交还调用方的回调;从职位板开的向导没有 = null。
   */
  onFinished: (() => void) | null
}

/**
 * 首访引导向导的整块面板(useOnboardingWizard 出,各步件拼装用)。
 */
export type OnboardingPanel = {
  /**
   * 分型现值(空串 = 没选)。
   */
  status: string

  /**
   * 拨分型。
   */
  setStatus: (v: string) => void

  /**
   * 已选职业码清单。
   */
  nocs: string[]

  /**
   * 拨已选职业码清单。
   */
  setNocs: SetNocsFn

  /**
   * 英语水平档。
   */
  clb: number | null

  /**
   * 拨英语水平档。
   */
  setClb: (v: number | null) => void

  /**
   * 快速通道分(存区间下界)。
   */
  crs: number | null

  /**
   * 拨快速通道分。
   */
  setCrs: (v: number | null) => void

  /**
   * 算过快速通道分吗(两段式的第一段)。
   */
  crsCalc: boolean

  /**
   * 拨「算过没」。
   */
  setCrsCalc: (v: boolean) => void

  /**
   * 目标省码清单。
   */
  provs: string[]

  /**
   * 拨目标省码清单。
   */
  setProvs: (v: string[]) => void

  /**
   * 工签剩余月数档。
   */
  pgwp: number | null

  /**
   * 拨工签档。
   */
  setPgwp: (v: number | null) => void

  /**
   * 走到第几步(从 0 数)。
   */
  step: number

  /**
   * 本次一共几步(分型定的)。
   */
  total: number

  /**
   * 当前这一步问什么。
   */
  cur: ObStep

  /**
   * 这一步是不是最后一步。
   */
  isLast: boolean

  /**
   * 存档进行中(终键这期间不可点)。
   */
  saving: boolean

  /**
   * 从投递流里开的(价值行与终键的话术两套,不许在投递流里许诺「看匹配」)。
   */
  apply: boolean

  /**
   * 简历预填的那一块。
   */
  resume: ResumePanel

  /**
   * 下一步;最后一步上按下 = 落地。
   */
  onNext: () => void

  /**
   * 上一步。
   */
  onBack: () => void
}

/**
 * OnboardingWizard 的 props(契约冻结:jobs 的职位板与投递流两处在传)。
 */
export type OnboardingWizardIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 档案初值;没档 = null。
   */
  initial: ProfileValue | null

  /**
   * 关掉向导(调用方顺带记「弹过了」)。
   */
  onClose: () => void

  /**
   * 投递流的交还回调(调用方可省 —— 职位板首访弹的那次就没有)。
   */
  onFinished?: () => void

  /**
   * 弹框层级(调用方可省;投递流叠在注册框上要抬一层)。
   */
  z?: number
}

/**
 * 向导各步件共用的 props:整块面板 + 取词函数。
 */
export type OnboardingStepIn = {
  /**
   * 向导整机。
   */
  p: OnboardingPanel

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * OnboardingBuckets 的 props(英语 / 快速通道分 / 工签三步共用的区间单选行)。
 */
export type OnboardingBucketsIn = {
  /**
   * 这一行的档表。
   */
  opts: readonly Opt[]

  /**
   * 现值归属哪档(null = 没填)。
   */
  active: number | null

  /**
   * 点档往哪报。
   */
  onPick: (v: number | null) => void

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * ResumeUpload 的 props。
 */
export type ResumeUploadIn = {
  /**
   * 解析态。
   */
  state: ResumeState

  /**
   * 识别到几个职业方向。
   */
  count: number

  /**
   * 收下那个藏起来的文件框(挂到它的 ref 属性上)。逐格摊开而不是整块收下简历面板,
   * 是 React 的规矩:ref 属性上挂一个对象的成员,那个对象整个会被当成引用,
   * 之后从它身上取任何一格都算「渲染期间读引用」。
   */
  onFileMount: FileMountFn

  /**
   * 选完文件的回调。
   */
  onPick: ResumePickFn

  /**
   * 点上传钮。
   */
  onOpen: () => void

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * ResumeHint 的 props(上传钮右边那句灰字)。
 */
export type ResumeHintIn = {
  /**
   * 解析态。
   */
  state: ResumeState

  /**
   * 识别到几个职业方向。
   */
  count: number

  /**
   * 取词函数。
   */
  t: TFn
}
