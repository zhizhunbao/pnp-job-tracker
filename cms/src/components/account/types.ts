/**
 * 账户页(/account)那几个迁出组件体的函数的契约。
 * 2026-08-26 Frank 立「tsx 组件体内不许声明内嵌函数」,ProfileForm 的 addTyped 与
 * AccountPage 的 onNickKey 随之迁进本目录的 functions.ts —— 原先靠闭包拿到的东西
 * 全部改成这里的显式入参,组件只负责把手上的值递进去。
 * 2026-08-26 页面「纯拼装门」改造批续:page.tsx 的三个 type(Me / ProfileWithResume /
 * Sec)与拆出来的六件视觉组件的 props 契约一并迁进来。
 *
 * @author Frank
 * @time 2026-08-26 15:28:17
 */

/**
 * 界面语取词函数(与 lib/i18n 的 TFn 同形:键 + 可选插值 —— 宪法 08-25「types 自声明」,
 * 形状本域自己声明,不从别的域取;真参数是 lib/i18n 那个带附加成员的交叉类型,
 * 结构上兜得住)。
 */
export type TFn = (key: string, vars?: Record<string, string | number>) => string

/**
 * 账户页的节标识。同 URL 深链 `?sec=` 的取值,也是侧栏节表 SEC_TABS 的键
 * (2026-08-26 自 page.tsx 迁入)。
 * 2026-09-23 撤概览、移民档案、已保存的筛选、升级 Pro 四节后只剩三个值(新立的 resume = 我的简历)。
 */
export type Sec = 'resume' | 'favs' | 'sjobs' | 'sub'

/**
 * 用户档案 + 简历存档两键。profile 上的简历存档两键(E11-08)只在本页读显示、
 * 不进 ProfileForm 的表单值 —— 原先是 `ProfileValue & { … }` 就地扩类型,
 * 2026-08-26 随页面拆件迁进本文件;types.ts 不许 import,所以照抄全格
 * (结构相同即与 ProfileValue 兼容,喂给 ProfileForm 的接缝零断言)。
 */
export type ProfileWithResume = {
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
   * EE 的 CRS 分;未填 = null。
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

  /**
   * 存档的简历全文(E11-08);没存过 = null。
   */
  resumeText?: string | null

  /**
   * 简历存档时间(ISO);没存过 = null。
   */
  resumeSavedAt?: string | null
}

/**
 * 已登录用户(/api/users/me 下发的那份,只声明本页真读的那几格)。
 */
export type AccountUser = {
  /**
   * 用户 id(PATCH /api/users/:id 要它)。
   */
  id: string | number

  /**
   * 邮箱(身份行的佐证;昵称为空时取 @ 前缀当显示名)。
   */
  email: string

  /**
   * 角色(本页不渲染,随接口原样收下)。
   */
  role?: string

  /**
   * Pro 到期日(ISO);从没买过 = null。
   */
  proUntil?: string | null

  /**
   * 移民档案 + 简历存档;从没填过 = null。
   */
  profile?: ProfileWithResume | null

  /**
   * 昵称(E11-01 可就地改);没设过 = null。
   */
  displayName?: string | null

  /**
   * OAuth 带回的头像 URL;没有 = null(走首字母色块)。
   */
  avatar?: string | null

  /**
   * 用户偏好语(本页不渲染,随接口原样收下)。
   */
  locale?: string | null
}

/**
 * 会话探测的结果:拿到用户 = 对象,没登录 = null(2026-08-26 自 page.tsx 迁入)。
 */
export type Me = AccountUser | null

/**
 * AccountColumns 的 props。
 */
export type AccountColumnsIn = {
  /**
   * 左卡里的节导航(由调用方拼好递进来 —— 本件只管两列的骨架)。
   */
  nav: React.ReactNode

  /**
   * 右卡里当前选中节的内容。
   */
  children: React.ReactNode
}

/**
 * AccountBanner 的 props(2026-10-05 立)。
 */
export type AccountBannerIn = {
  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * AccountNav 的 props。
 */
export type AccountNavIn = {
  /**
   * 当前选中的节(决定哪一枚钮亮起来)。
   */
  sec: Sec

  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 点某一节。
   */
  onPick: (sec: Sec) => void
}

/**
 * navLabelOf 的入参。
 */
export type NavLabelIn = {
  /**
   * 该节的标题原文(可能带括号说明)。
   */
  label: string
}

/**
 * PayOkNotice 的 props(Stripe 回跳 `?ok=1` 的成功提示;出不出由页面门按面板的 payOk 判)。
 */
export type PayOkNoticeIn = {
  /**
   * 取词函数(提示文案 acct.payOk)。
   */
  t: TFn
}

/**
 * 语言三字面量(宪法:各域自抄,不跨域借形状)。与 components/i18n 的取值一致,
 * 结构相同即兼容 —— 少一门语言 tsc 当场红。
 */
export type AccountLang = 'zh' | 'en' | 'ko'

/**
 * `/api/users/me` 的响应体(线格式,归一前形状:键可能不在,`== null` 一网兜住)。
 */
export type MeRespJson = {
  /**
   * 登录人;未登录时缺席或 null。
   */
  user?: AccountUser | null
}

/**
 * useAccountPage 状态机器的面板:门(page.tsx)只拿这一份 + 拼组件
 * (2026-08-26 Frank 看完拼装版实拍「还是有一堆函数啊」—— state/effect/handler
 * 全部收进 hooks,门里不再有任何函数体;闸 local/page-no-logic)。
 */
export type AccountPanel = {
  /**
   * 当前语言(LangProvider 初值由服务端 cookie 定)。
   */
  lang: AccountLang

  /**
   * 切语言并落 cookie(直递 Header)。
   */
  setLang: (l: AccountLang) => void

  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 窄屏 = true(sidebar 变顶部横排)。
   */
  narrow: boolean

  /**
   * 当前节。
   */
  sec: Sec

  /**
   * 登录人;null = 未登录或还没查完(配 checked 分辨)。
   */
  me: Me

  /**
   * me 查完 = true(没查完先不渲主体,免闪未登录跳转)。
   */
  checked: boolean

  /**
   * Stripe 回跳带 `?ok=1` = true。
   */
  payOk: boolean

  /**
   * 切节。
   */
  onPick: (s: Sec) => void
}

/**
 * makeRefresh 的入参(登录态查询要拨的两格 state)。
 */
export type RefreshIn = {
  /**
   * 落查询结果(null = 未登录)。
   */
  setMe: (m: Me) => void

  /**
   * 落「查完了」标记(成败都落,免得页面卡在空白)。
   */
  setChecked: (v: boolean) => void
}

/**
 * 重查登录态的手柄。
 */
export type RefreshFn = () => Promise<void>

/**
 * 求职看板的状态档(E9-01:想投/已投/面试中/offer)。
 */
export type SjStatus = 'wish' | 'applied' | 'interview' | 'offer'

/**
 * 收藏岗一条(toSavedJob 洗净后):快照字段,岗位下架后仍可读。
 */
export type SavedJobFact = {
  /**
   * 收藏记录 id(拼 PATCH/DELETE 地址;Payload 可能给数字,洗成串)。
   */
  id: string

  /**
   * 职位名快照;没有 = 空串(渲染层显示占位横杠)。
   */
  title: string

  /**
   * 公司名快照;没有 = 空串。
   */
  company: string

  /**
   * 求职看板状态;库里存了不认识的值按 wish 读(与旧渲染 `status || 'wish'` 同口径)。
   */
  status: SjStatus
}

/**
 * saved-jobs 列表接口的响应体(归一前)。
 */
export type SavedJobsRespJson = {
  /**
   * 收藏行清单;缺席/空按零条读。
   */
  docs?: {
    /**
     * 收藏记录 id。
     */
    id: number | string

    /**
     * 职位名快照;可能缺。
     */
    title?: string | null

    /**
     * 公司名快照;可能缺。
     */
    company?: string | null

    /**
     * 看板状态;可能缺或存了旧值。
     */
    status?: string | null
  }[] | null
} | null

/**
 * SavedJobsList 的 props(页面门在传,契约 2026-08-27 换装批原样保留)。
 */
export type SavedJobsListIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 登录人 id(周报开关 PATCH 用;favs 视图不传)。
   */
  userId?: number | string

  /**
   * 周报退订现状(E9-02b;favs 视图不传)。
   */
  weeklyOptOut?: boolean

  /**
   * favs = 「我的收藏」纯列表视图(#62A:无状态下拉/周报开关)。
   */
  variant?: 'favs'
}

/**
 * useSavedJobs 的入参。
 */
export type SavedJobsHookIn = {
  /**
   * 周报退订现状;没传按未退订读。
   */
  weeklyOptOut: boolean | null
}

/**
 * 收藏岗清单的面板(useSavedJobs 出)。
 */
export type SavedJobsPanel = {
  /**
   * 洗净的收藏行;null = 还在拉。
   */
  items: SavedJobFact[] | null

  /**
   * 收藏行落格(行内改状态/移除用)。
   */
  setItems: (v: SavedJobFact[] | null) => void

  /**
   * 周报退订现状(显示语义取反:勾 = 订阅)。
   */
  optOut: boolean

  /**
   * 周报退订落格。
   */
  setOptOut: (v: boolean) => void
}

/**
 * makeLoadSavedJobs 的入参。
 */
export type LoadSavedJobsIn = {
  /**
   * 收藏行落格(网络挂了落空清单,与旧口径一致)。
   */
  setItems: (v: SavedJobFact[] | null) => void
}

/**
 * makeJobStatusChange 的入参(一行的状态下拉)。
 */
export type JobStatusChangeIn = {
  /**
   * 这一行的收藏记录 id。
   */
  id: string

  /**
   * 现清单(重建这一行,别的行原样)。
   */
  items: SavedJobFact[]

  /**
   * 清单落格(先本地改再发请求,失败不回滚 —— 与旧口径一致)。
   */
  setItems: (v: SavedJobFact[] | null) => void
}

/**
 * 状态下拉的 change 手柄(按本域自己声明形状的规矩只读 target.value 一格;
 * 实参是 React.ChangeEvent,结构上兜得住)。
 */
export type JobStatusChangeFn = (e: {
  /**
   * 事件源(下拉本体)。
   */
  target: {
    /**
     * 选中的档值(SJ_STATUS_TABS 的键之一;不认识的值按默认档兜)。
     */
    value: string
  }
}) => void

/**
 * makeJobRemove 的入参(一行的移除 ×)。
 */
export type JobRemoveIn = {
  /**
   * 这一行的收藏记录 id。
   */
  id: string

  /**
   * 现清单。
   */
  items: SavedJobFact[]

  /**
   * 清单落格(先本地移除再发请求)。
   */
  setItems: (v: SavedJobFact[] | null) => void
}

/**
 * makeWeeklyToggle 的入参(周报开关:E9-02b)。
 */
export type WeeklyToggleIn = {
  /**
   * 登录人 id(PATCH 地址)。
   */
  userId: number | string

  /**
   * 退订态落格。
   */
  setOptOut: (v: boolean) => void
}

/**
 * 周报勾选框的 change 手柄(只读 target.checked 一格;实参是 React.ChangeEvent,
 * 结构上兜得住)。
 */
export type WeeklyToggleFn = (e: {
  /**
   * 事件源(勾选框本体)。
   */
  target: {
    /**
     * 勾着 = 订阅(存进库前语义取反成退订)。
     */
    checked: boolean
  }
}) => void

/**
 * SavedJobRow 的 props(收藏清单里的一行)。
 */
export type SavedJobRowIn = {
  /**
   * 这一行(洗净)。
   */
  row: SavedJobFact

  /**
   * favs 视图 = 纯列表(不出状态下拉)。
   */
  favs: boolean

  /**
   * 现清单(行内手柄要重建它)。
   */
  items: SavedJobFact[]

  /**
   * 清单落格。
   */
  setItems: (v: SavedJobFact[] | null) => void

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * WeeklyOptin 的 props(周报开关那一行)。
 */
export type WeeklyOptinIn = {
  /**
   * 登录人 id。
   */
  userId: number | string

  /**
   * 退订现状。
   */
  optOut: boolean

  /**
   * 退订落格。
   */
  setOptOut: (v: boolean) => void

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * jobSearchHrefOf 的入参(收藏行的「查看」= 回职位板按职位名搜)。
 */
export type SearchHrefIn = {
  /**
   * 职位名快照。
   */
  title: string
}

/**
 * sjTitleKeysOf 的入参(收藏节两套抬头:收藏视图 fav.*,看板视图 sj.*)。
 */
export type SjTitleKeysIn = {
  /**
   * 是不是 favs 纯列表视图。
   */
  favs: boolean
}

/**
 * 收藏节抬头的两把 i18n 键(标题 + 灰字小注)。
 */
export type SjTitleKeys = {
  /**
   * 标题键。
   */
  title: string

  /**
   * 小注键。
   */
  note: string
}

/**
 * Subscription(「我的订阅」节)的 props(2026-10-04 页面门在传)。
 */
export type SubscriptionIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * Pro 到期日(ISO;/api/users/me 原样);从没买过 = null 或压根没这一格。
   */
  until?: string | null
}

/**
 * useSubscription 交回的面板(定价框开合一格)。
 */
export type SubscriptionPanel = {
  /**
   * 定价框开着没有。
   */
  open: boolean

  /**
   * 写定价框开合。
   */
  setOpen: (v: boolean) => void
}

/**
 * proOf 的入参。
 */
export type ProOfIn = {
  /**
   * Pro 到期日(ISO);null = 从没买过。
   */
  until: string | null
}

/**
 * makeFlagSet 的入参(把一个布尔格拨成定值的通用小手柄:展开/收起、亮/熄二次确认
 * 都是它 —— 四枚钮各自造一个工厂只会四份同文)。
 */
export type FlagSetIn = {
  /**
   * 拨哪格。
   */
  set: (v: boolean) => void

  /**
   * 拨成什么。
   */
  v: boolean
}

/**
 * 「我的简历」原件的元信息(接口 /api/resume/file/meta 与上传接口交回的线格式)。
 */
export type ResumeMeta = {
  /**
   * 简历 id。
   */
  id: number

  /**
   * 是不是默认那份(投递时默认附它)。
   */
  isDefault: boolean

  /**
   * 上传时的原文件名。
   */
  fileName: string

  /**
   * MIME(PDF 或 .docx)。
   */
  mime: string

  /**
   * 字节数。
   */
  sizeBytes: number

  /**
   * 上传时刻(ISO 串)。
   */
  uploadedAt: string
}

/**
 * 本人的简历清单(默认那份在最前)。
 */
export type ResumeMetas = ResumeMeta[]

/**
 * 元信息或没有(预览弹框没开)。
 */
export type MaybeResumeMeta = ResumeMeta | null

/**
 * 简历接口回包的线格式(清单接口成功带 items;失败带 error 码)。
 */
export type ResumeRespJson = {
  /**
   * 清单(清单接口成功时在)。
   */
  items?: ResumeMetas

  /**
   * 错误码(type / size / limit / nofile / auth;成功时缺席)。
   */
  error?: string
}

/**
 * ResumeFile 的 props(页面门在传)。
 */
export type ResumeFileIn = {
  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * 「我的简历」整机的面板(useResumeFile 出)。
 */
export type ResumeFilePanel = {
  /**
   * 清单拉回来了吗(没拉回来先占位,不闪「上传简历」)。
   */
  checked: boolean

  /**
   * 本人的简历清单(默认那份在最前)。
   */
  items: ResumeMetas

  /**
   * 正在上传吗。
   */
  busy: boolean

  /**
   * 报错文案键(空串 = 没错)。
   */
  err: string

  /**
   * 哪一份的删除二次确认亮着(null = 都没亮)。
   */
  sure: number | null

  /**
   * 有文件拖在上传区上方吗(上传区描边变蓝)。
   */
  dragOn: boolean

  /**
   * 预览弹框开着哪一份(null = 没开)。
   */
  preview: MaybeResumeMeta

  /**
   * 隐藏文件框挂上 / 卸下时的回调(元素收进状态,点钮时替用户去点它)。
   */
  onInputMount: (el: HTMLInputElement | null) => void

  /**
   * 「选择文件 / 添加简历」:新加一份。
   */
  onAdd: () => void

  /**
   * 文件框选好文件。
   */
  onPick: (e: InputChangeEvent) => void

  /**
   * 文件拖进 / 悬在上传区上方。
   */
  onDragOver: (e: DivDragEvent) => void

  /**
   * 文件拖离上传区。
   */
  onDragLeave: () => void

  /**
   * 文件放进上传区。
   */
  onDrop: (e: DivDragEvent) => void

  /**
   * 某一份的「替换文件」手柄。
   */
  replaceOf: IdHandlerFn

  /**
   * 某一份的「删除」手柄(亮二次确认)。
   */
  askOf: IdHandlerFn

  /**
   * 「取消」:熄二次确认。
   */
  onCancel: () => void

  /**
   * 某一份的「确认删除」手柄。
   */
  deleteOf: IdHandlerFn

  /**
   * 某一份的「设为默认」手柄。
   */
  defaultOf: IdHandlerFn

  /**
   * 某一份的「预览」手柄(开弹框)。
   */
  previewOf: (m: ResumeMeta) => () => void

  /**
   * 关预览弹框。
   */
  onPreviewClose: () => void
}

/**
 * 「按 id 造一枚点击手柄」的工厂形(卡片逐份拿自己的手柄)。
 */
export type IdHandlerFn = (id: number) => () => void

/**
 * 文件框 change 事件(库类型起本地名)。
 */
export type InputChangeEvent = React.ChangeEvent<HTMLInputElement>

/**
 * 上传区的拖放事件(库类型起本地名)。
 */
export type DivDragEvent = React.DragEvent<HTMLDivElement>

/**
 * ResumeDrop 的 props(第一次来:上传区)。
 */
export type ResumeDropIn = {
  /**
   * 「我的简历」整机面板。
   */
  p: ResumeFilePanel

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * ResumeCard 的 props(有原件:缩略图 + 文件信息 + 操作)。
 */
export type ResumeCardIn = {
  /**
   * 元信息。
   */
  meta: ResumeMeta

  /**
   * 「我的简历」整机面板。
   */
  p: ResumeFilePanel

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * ResumeThumb 的 props。
 */
export type ResumeThumbIn = {
  /**
   * 元信息(按 MIME 决定画 PDF 首页还是 Word 占位;上传时刻拼进地址当版本)。
   */
  meta: ResumeMeta
}

/**
 * 缩略图整机的面板(useResumeThumb 出)。
 */
export type ResumeThumbPanel = {
  /**
   * 画布挂上 / 卸下时的回调。
   */
  onCanvasMount: (el: HTMLCanvasElement | null) => void

  /**
   * 画好了吗(画好之前只露白纸占位)。
   */
  ready: boolean
}

/**
 * useResumeThumb 的入参。
 */
export type ResumeThumbHookIn = {
  /**
   * 原件地址(带版本参数;空串 = 不画,Word 走占位)。
   */
  src: string
}

/**
 * 一次上传(makeResumeUpload 造出的函数)。
 */
export type ResumeUploadFn = (file: File) => Promise<void>

/**
 * 拉清单工厂(makeResumeListLoad)的入参。
 */
export type ResumeListLoadIn = {
  /**
   * 清单落格。
   */
  setItems: (v: ResumeMetas) => void

  /**
   * 「拉回来了」落格。
   */
  setChecked: (v: boolean) => void
}

/**
 * 拉一次清单(makeResumeListLoad 造出的函数;上传 / 删除 / 设默认之后都重拉)。
 */
export type ResumeReloadFn = () => Promise<void>

/**
 * 上传工厂(makeResumeUpload)的入参。
 */
export type ResumeUploadIn = {
  /**
   * 替换哪一份(null = 新加一份)。
   */
  replaceId: number | null

  /**
   * 成功后重拉清单。
   */
  reload: ResumeReloadFn

  /**
   * 在途落格。
   */
  setBusy: (v: boolean) => void

  /**
   * 报错落格(文案键;空串清掉)。
   */
  setErr: (v: string) => void
}

/**
 * 按 id 动库的几个工厂(删除 / 设默认)的入参。
 */
export type ResumeActIn = {
  /**
   * 成功后重拉清单。
   */
  reload: ResumeReloadFn

  /**
   * 熄二次确认。
   */
  setSure: (v: number | null) => void

  /**
   * 报错落格。
   */
  setErr: (v: string) => void
}

/**
 * 「删除」亮确认工厂(makeAskOf)的入参。
 */
export type AskOfIn = {
  /**
   * 亮哪一份的二次确认。
   */
  setSure: (v: number | null) => void

  /**
   * 报错落格(清掉上一次的)。
   */
  setErr: (v: string) => void
}

/**
 * 「添加 / 替换」打开文件选择器工厂(makePickerOf / makeAdd)的入参。
 */
export type PickerIn = {
  /**
   * 隐藏文件框(还没挂上是 null)。
   */
  input: HTMLInputElement | null

  /**
   * 记下这次选完文件替换哪一份(null = 新加)。
   */
  setReplaceId: (v: number | null) => void
}

/**
 * 开预览弹框工厂(makePreviewOf)的入参。
 */
export type PreviewOfIn = {
  /**
   * 预览落格。
   */
  setPreview: (v: MaybeResumeMeta) => void
}

/**
 * ResumeAdd 的 props(已有简历时卡片下面那一行:添加简历 + 份数)。
 */
export type ResumeAddIn = {
  /**
   * 整机面板。
   */
  p: ResumeFilePanel

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * ResumePreview 的 props(本页预览弹框)。
 */
export type ResumePreviewIn = {
  /**
   * 预览哪一份。
   */
  meta: ResumeMeta

  /**
   * 关弹框。
   */
  onClose: () => void

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * 预览弹框整机的面板(useResumePages 出)。
 */
export type ResumePagesPanel = {
  /**
   * 放页的容器挂上 / 卸下时的回调(页一张张画进它里面)。
   */
  onBoxMount: (el: HTMLDivElement | null) => void

  /**
   * 画完了吗(画完前出「加载中」)。
   */
  ready: boolean

  /**
   * 画不出来(加密、损坏;弹框出一句改下载)。
   */
  failed: boolean

  /**
   * 一共几页(画完前是 0;多于 1 页才出翻页条)。
   */
  count: number

  /**
   * 正在看第几页(从 0 数,同 pager 桶的口径)。
   */
  index: number

  /**
   * 翻到第几页。
   */
  onPage: (p: number) => void
}

/**
 * 只露一页(showPdfPage)的入参。
 */
export type ShowPageIn = {
  /**
   * 放页的容器。
   */
  box: HTMLDivElement

  /**
   * 露第几页(从 0 数)。
   */
  index: number
}

/**
 * 逐页画 PDF(renderPdfPages)的入参。
 */
export type PdfPagesIn = {
  /**
   * 放页的容器。
   */
  box: HTMLDivElement

  /**
   * 原件地址。
   */
  src: string

  /**
   * 画完时拨「画完了」。
   */
  setReady: (v: boolean) => void

  /**
   * 画不出来时拨「画不了」。
   */
  setFailed: (v: boolean) => void

  /**
   * 画完时报一共几页。
   */
  setCount: (v: number) => void
}

/**
 * ResumePages 的 props(放页的容器;回调逐格收,理由同 ResumeInput)。
 */
export type ResumePagesIn = {
  /**
   * 容器挂上 / 卸下的回调。
   */
  onMount: (el: HTMLDivElement | null) => void
}

/**
 * 文件框选好文件的工厂(makeFilePick)的入参。
 */
export type FilePickIn = {
  /**
   * 一次上传。
   */
  upload: ResumeUploadFn
}

/**
 * 拖放上传工厂(makeFileDrop / makeDragOver / makeDragLeave)的入参。
 */
export type FileDropIn = {
  /**
   * 一次上传。
   */
  upload: ResumeUploadFn

  /**
   * 拖放高亮落格。
   */
  setDragOn: (v: boolean) => void
}

/**
 * 画 PDF 首页(renderPdfThumb)的入参。
 */
export type PdfThumbIn = {
  /**
   * 画布(按它的显示宽度乘设备像素比画,高清屏不糊)。
   */
  canvas: HTMLCanvasElement

  /**
   * 原件地址。
   */
  src: string

  /**
   * 画好时拨「画好了」。
   */
  setReady: (v: boolean) => void
}

/**
 * ResumeInput 的 props(回调逐格收)。
 */
export type ResumeInputIn = {
  /**
   * 文件框挂上 / 卸下的回调(签名由 React 的 ref 属性定死)。
   */
  onMount: (el: HTMLInputElement | null) => void

  /**
   * 选好文件。
   */
  onPick: (e: InputChangeEvent) => void
}

/**
 * ResumeCanvas 的 props。
 */
export type ResumeCanvasIn = {
  /**
   * 画布挂上 / 卸下的回调(签名由 React 的 ref 属性定死)。
   */
  onMount: (el: HTMLCanvasElement | null) => void
}

/**
 * 页签条的一项(形状照 tabs 桶的 TabItem 抄,本域自声明)。
 */
export type SecTabItem = {
  /**
   * 节标识(同深链 `?sec=` 的取值)。
   */
  key: string

  /**
   * 页签文字。
   */
  label: string
}

/**
 * secTabItemsOf 的入参。
 */
export type SecItemsIn = {
  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * makeSecChange 的入参。
 */
export type SecChangeIn = {
  /**
   * 切节回调。
   */
  onPick: (s: Sec) => void
}

/**
 * 页签切换手柄(签名由 tabs 桶的 onChange 定死:交回字符串键)。
 */
export type SecChangeFn = (key: string) => void


/**
 * 删除 / 设默认共用的一次请求(sendResumeAct)的入参。
 */
export type ResumeActSendIn = {
  /**
   * 重拉与两个落格。
   */
  x: ResumeActIn

  /**
   * 请求地址(带 id)。
   */
  url: string

  /**
   * 请求方法(DELETE / PATCH)。
   */
  method: string
}

/**
 * 懒加载 pdf.js 的返回(模块类型由库定,不透明地交给调用方)。
 */
// eslint-disable-next-line local/no-bare-strings -- 动态导入的模块类型只能写包名取;本行是类型,不产生运行时依赖(外部库形状)
export type PdfjsOut = Promise<typeof import('pdfjs-dist')>
