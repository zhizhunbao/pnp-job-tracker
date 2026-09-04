/**
 * pte 域(PTE Core 刷题:题单页 / 单题页 / 题下评论)的自足形状:两张 ETL 表的库行与洗净行、
 * 评论行、各件的 props 契约、派生函数的入参、三台状态机器交回的面板。
 * 🔴 本文件**不带 `'use client'`**(老坑 6):服务端页面门(取数与 generateMetadata)与客户端视图
 * 共用这几张形状。唯一的 import 是 lib/db 的连接面(基础设施叶子,`no-import-in-leaf` 钦定的特批)。
 * 2026-09-03 批二新立(设计稿 docs/design/PTE刷题-20260903.md),形照 components/news。
 *
 * @author Frank
 * @time 2026-09-03 12:00:00
 */
import type { DbPool } from '@/lib/db'

/**
 * 界面语取词函数(与 lib/i18n 的 TFn 同形,本域自声明)。
 */
export type TFn = (key: string, vars?: Record<string, string | number>) => string

/**
 * 界面语言(三字面量各域自抄);题型名按它取 pte_types 的三语列。
 */
export type PteLang = 'zh' | 'en' | 'ko'

/**
 * 单题页三段动线的段位:准备(RA 倒计时 / 听力型的播放钮)→ 作答 → 对照。
 */
export type PtePhase = 'ready' | 'answering' | 'checked'

/**
 * 在途状态(发评论):闲置 / 在途 / 已提交 / 失败。
 */
export type PostState = 'idle' | 'busy' | 'sent' | 'err'

/**
 * 题型维度的库行(`PTE_TYPES` 那条 SQL 的原始行;numeric 回来是字符串)。
 */
export type PteTypeDbRow = {
  /**
   * 标准题型码(RA / RS / ASQ / WFD)。
   */
  code: string

  /**
   * 所属 section(Speaking / Listening …)。
   */
  section: string | null

  /**
   * 考试序。
   */
  seq: string | number | null

  /**
   * 中文题型名。
   */
  nameZh: string | null

  /**
   * 英文题型名(Pearson 官方)。
   */
  nameEn: string | null

  /**
   * 韩文题型名。
   */
  nameKo: string | null

  /**
   * 题面以音频呈现(先听后答)。
   */
  audio: boolean | null

  /**
   * 占总分百分比;NULL = 没记。
   */
  weight: string | number | null

  /**
   * 在库题数(SQL 子查询;numeric 回来是字符串)。
   */
  n: string | number | null
}

/**
 * 题型(洗净行)。
 */
export type PteType = {
  /**
   * 标准题型码。
   */
  code: string

  /**
   * 所属栏(Speaking / Writing / Reading / Listening;胶囊按它分行)。
   */
  section: string

  /**
   * 考试序(胶囊按它排)。
   */
  seq: number

  /**
   * 中文题型名。
   */
  nameZh: string

  /**
   * 英文题型名。
   */
  nameEn: string

  /**
   * 韩文题型名。
   */
  nameKo: string

  /**
   * 题面以音频呈现。
   */
  audio: boolean

  /**
   * 占总分百分比;0 = 没记。
   */
  weight: number

  /**
   * 在库题数;0 = 还没接(面板灰字不可点)。
   */
  count: number
}

/**
 * 题单的库行(`PTE_LIST`)。
 */
export type PteListDbRow = {
  /**
   * 源:题型:源内 id。
   */
  qid: string

  /**
   * 来源(ynwac / duoink;页面不显示,只做键)。
   */
  source: string

  /**
   * 题型码。
   */
  type: string

  /**
   * 站内题号。
   */
  num: string | null

  /**
   * 索引标题(题面首句)。
   */
  title: string | null

  /**
   * 题面全文。
   */
  text: string | null

  /**
   * 押题。
   */
  predicted: boolean | null

  /**
   * 最近考过日;NULL = 该源无记录。
   */
  seen: string | null

  /**
   * 带日期回忆条数。
   */
  seenN: string | number | null

  /**
   * ynwac 考过票数;NULL = 非 ynwac。
   */
  votes: string | number | null

  /**
   * duoink 热度 0-3;NULL = 非 duoink。
   */
  freq: string | number | null
}

/**
 * 单题的库行(`PTE_ONE`):题单行再加答案与音频直链。
 */
export type PteOneDbRow = PteListDbRow & {
  /**
   * ASQ 答案;其余 NULL。
   */
  answer: string | null

  /**
   * 公开音频直链;NULL = 无(批三 TTS 合成)。
   */
  audioUrl: string | null
}

/**
 * 自家考试记录聚合的库行(`PTE_EXAM_COUNTS`)。
 */
export type PteExamCountDbRow = {
  /**
   * 题键。
   */
  qid: string

  /**
   * 记录条数。
   */
  n: string | number | null

  /**
   * 最近一条的考试日。
   */
  last: string | null
}

/**
 * 题单一行(洗净;三源抓取与自家记录已合并)。
 */
export type PteRow = {
  /**
   * 源:题型:源内 id。
   */
  qid: string

  /**
   * 题型码。
   */
  type: string

  /**
   * 单题页地址。
   */
  href: string

  /**
   * 站内题号(显示 #N)。
   */
  num: string

  /**
   * 题面(题单列显示首句截断,由 css 截)。
   */
  text: string

  /**
   * 押题。
   */
  predicted: boolean

  /**
   * 最近考过日(抓取与自家记录取最近);null = 没有任何记录。
   */
  seen: string | null

  /**
   * 考过次数(抓取票数或回忆条数 + 自家记录数)。
   */
  times: number
}

/**
 * 单题(洗净)。
 */
export type PteQuestion = PteRow & {
  /**
   * 答案;null = 该型没有。
   */
  answer: string | null

  /**
   * 音频直链;null = 用浏览器朗读顶(批三换盒子 TTS)。
   */
  audioUrl: string | null
}

/**
 * 题下评论的库行(`PTE_COMMENTS`)。
 */
export type PteCommentDbRow = {
  /**
   * 评论 id。
   */
  id: number

  /**
   * exam / note。
   */
  kind: string | null

  /**
   * 考试日(exam)。
   */
  examDate: string | null

  /**
   * 考点城市(exam)。
   */
  examCity: string | null

  /**
   * 脱敏昵称快照。
   */
  authorName: string | null

  /**
   * 正文。
   */
  body: string | null

  /**
   * 发表日。
   */
  date: string | null
}

/**
 * 题下评论(洗净)。
 */
export type PteComment = {
  /**
   * 评论 id。
   */
  id: number

  /**
   * exam / note。
   */
  kind: string

  /**
   * 考试日;非 exam 为 null。
   */
  examDate: string | null

  /**
   * 考点城市;空串 = 没填。
   */
  examCity: string

  /**
   * 脱敏昵称。
   */
  authorName: string

  /**
   * 正文。
   */
  body: string

  /**
   * 发表日。
   */
  date: string
}

/**
 * 单题页装配结果:题 + 沿题单序的前后邻 + 位置。
 */
export type PteItem = {
  /**
   * 这道题。
   */
  q: PteQuestion

  /**
   * 上一题地址;null = 已是第一题。
   */
  prevHref: string | null

  /**
   * 下一题地址;null = 已是最后一题。
   */
  nextHref: string | null

  /**
   * 在题单里的序(1 起)。
   */
  index: number

  /**
   * 题单总数。
   */
  total: number

  /**
   * 题面里要高亮的词 → 档(1–3);不在表里 = 不高亮(2026-09-04 关键词高亮)。
   */
  tiers: Record<string, number>

  /**
   * 这一型的全部题(左侧目录树;Frank 2026-09-04「左侧应该有个目录树可以快速导航到其他题目」)。
   */
  rows: PteRow[]
}

/**
 * 取题型维度(`loadPteTypes`)的入参 —— 方案 A:连接池由页面门注进来。
 */
export type PteTypesIn = {
  /**
   * 数据库连接。
   */
  db: DbPool
}

/**
 * 取一型题单(`loadPteList`)的入参。
 */
export type PteListIn = {
  /**
   * 数据库连接。
   */
  db: DbPool

  /**
   * 路由里的题型段(任意大小写,函数内归一)。
   */
  type: string
}

/**
 * 取单题(`loadPteItem`)的入参。
 */
export type PteItemLoadIn = {
  /**
   * 数据库连接。
   */
  db: DbPool

  /**
   * 路由里的题型段。
   */
  type: string

  /**
   * 路由里的题段(`源-源内id`)。
   */
  id: string
}

/**
 * 取题下评论(`loadPteComments`)的入参。
 */
export type PteCommentsIn = {
  /**
   * 数据库连接。
   */
  db: DbPool

  /**
   * 题键。
   */
  qid: string
}

/**
 * 题单页正文(Pte)的 props。
 */
export type PteIn = {
  /**
   * 题型维度(胶囊按 seq 排)。
   */
  types: PteType[]

  /**
   * 当前题型码。
   */
  type: string

  /**
   * 这一型的全部题(窗口/押题/练过筛在客户端)。
   */
  rows: PteRow[]

  /**
   * 登录态(练过档与库并集)。
   */
  loggedIn: boolean

  /**
   * 数据更新时刻(ETL 心跳 checkedAt 的 ISO;'' = 还没拿到,不渲)。
   */
  updatedAt: string
}

/**
 * 一栏题型(`sectionsOf` 的产物)。
 */
export type PteSection = {
  /**
   * 栏(Speaking / …)。
   */
  section: string

  /**
   * 这一栏的题型(按 seq)。
   */
  types: PteType[]
}

/**
 * 分栏(`sectionsOf`)的入参。
 */
export type SectionsIn = {
  /**
   * 题型维度。
   */
  types: PteType[]
}


/**
 * 栏名(`sectionLabelOf`)的入参。
 */
export type SectionLabelIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 栏。
   */
  section: string
}




/**
 * 练过档同步 effect 工厂(`makeDoneSync`)的入参。
 */
export type DoneSyncIn = {
  /**
   * 登录态(没登录什么都不做)。
   */
  loggedIn: boolean
}

/**
 * 单题页正文(PteItem 视图)的 props。
 */
export type PteItemIn = {
  /**
   * 题型维度。
   */
  types: PteType[]

  /**
   * 题 + 前后邻 + 位置。
   */
  item: PteItem

  /**
   * SSR 带下的过审评论。
   */
  comments: PteComment[]

  /**
   * 登录态(发评论分流)。
   */
  loggedIn: boolean

  /**
   * Pro 用户(批四配额不拦)。
   */
  pro: boolean
}

/**
 * 单题页左侧目录树(PteNav)的 props:题型切换钮排 + 这一型全部题的清单。
 */
export type PteNavIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 题型维度(有题的才出钮)。
   */
  types: PteType[]

  /**
   * 当前题型码。
   */
  type: string

  /**
   * 这一型的全部题。
   */
  rows: PteRow[]

  /**
   * 当前题键(高亮 + 滚进视野)。
   */
  qid: string

  /**
   * 界面语。
   */
  lang: PteLang
}

/**
 * 目录树一行题面截尾(`navTextOf`)的入参。
 */
export type NavTextIn = {
  /**
   * 整段题面。
   */
  text: string
}

/**
 * 目录树进页滚到当前题(`makeNavScroll`)的入参。
 */
export type NavScrollIn = {
  /**
   * 当前题键。
   */
  qid: string
}

/**
 * 题型钮文案(`typeLabelOf`,「朗读 (168)」)的入参。
 */
export type TypeLabelIn = {
  /**
   * 人话题型名。
   */
  name: string

  /**
   * 在库题数。
   */
  count: number
}

/**
 * 题型四栏面板(PteSections)的 props。
 */
export type PteSectionsIn = {
  /**
   * 题型维度。
   */
  types: PteType[]

  /**
   * 当前题型码。
   */
  type: string

  /**
   * 界面语言。
   */
  lang: PteLang

  /**
   * 取词函数(栏名)。
   */
  t: TFn
}


/**
 * 桌面表(PteTable)/ 手机卡列(PteCards)的 props。
 */
export type PteRowsIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 题单状态机面板。
   */
  b: PteBoardPanel
}

/**
 * 手机卡一张(PteCard)的 props。
 */
export type PteCardIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 这一行。
   */
  row: PteRow

  /**
   * 练过。
   */
  done: boolean
}

/**
 * 答题卡(PteAnswer)的 props。
 */
export type PteAnswerIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 题。
   */
  q: PteQuestion

  /**
   * 题型(英文名与是否音频型)。
   */
  type: PteType

  /**
   * 位置文案(`12 / 137`)。
   */
  pos: string

  /**
   * 答题状态机面板。
   */
  a: PteAnswerPanel

  /**
   * 「考过 (N)」钮(评论机器在单题页装配,钮挂题卡头 —— Frank 2026-09-04 照小枫叶「就考过就完事了」)。
   */
  seen: React.ReactNode

  /**
   * 上一题地址。
   */
  prevHref: string | null

  /**
   * 下一题地址。
   */
  nextHref: string | null

  /**
   * 题面高亮词 → 档。
   */
  tiers: Record<string, number>

  /**
   * 鼠标悬到高亮词:开字典弹层(词 + 该元素矩形)。
   */
  onHoverWord: (e: React.MouseEvent<HTMLElement>) => void

  /**
   * Pro 用户(配额计数行不渲)。
   */
  pro: boolean
}

/**
 * 音频播放件(PtePlayer)的 props:一颗播放钮 + 标签 + 状态。
 */
export type PtePlayerIn = {
  /**
   * 标签文案。
   */
  label: string

  /**
   * 在播。
   */
  playing: boolean

  /**
   * 点击。
   */
  onClick: () => void

  /**
   * 不可点(没有音源)。
   */
  disabled: boolean
}

/**
 * 录音件(PteRecorder)的 props。
 */
export type PteRecorderIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 已录秒数。
   */
  seconds: number

  /**
   * 上限秒数。
   */
  cap: number

  /**
   * 停止。
   */
  onStop: () => void
}

/**
 * WFD 逐词对照(PteDiff)的 props。
 */
export type PteDiffIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 你写的。
   */
  typed: string

  /**
   * 原句。
   */
  text: string
}

/**
 * 事实卡(PteFacts)的 props。
 */
export type PteFactsIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 题。
   */
  q: PteQuestion
}

/**
 * 题下评论区(PteComments)的 props。
 */
export type PteCommentsViewIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 评论状态机面板(单题页装配,与题卡头的「考过」钮同一台)。
   */
  c: PteCommentsPanel

  /**
   * 登录态。
   */
  loggedIn: boolean
}


/**
 * 留言表单(PteNoteForm)的 props。
 */
export type PteNoteFormIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 评论状态机面板。
   */
  c: PteCommentsPanel
}

/**
 * 题单状态机(usePteBoard)的入参。
 */
export type PteBoardHookIn = {
  /**
   * 这一型的全部题。
   */
  rows: PteRow[]

  /**
   * 登录态(挂载后与库并集练过档)。
   */
  loggedIn: boolean
}

/**
 * 题单状态机交回的面板。
 */
export type PteBoardPanel = {
  /**
   * 练过的题键。
   */
  done: Set<string>

  /**
   * 当前显示的行(前 shown 条;顺序 = 入参顺序,排序走表头)。
   */
  shown: PteRow[]

  /**
   * 还没显示的条数。
   */
  rest: number

  /**
   * 显示更多。
   */
  onMore: () => void
}

/**
 * 答题状态机(usePteAnswer)的入参。
 */
export type PteAnswerHookIn = {
  /**
   * 题。
   */
  q: PteQuestion

  /**
   * 题型。
   */
  type: PteType

  /**
   * 登录态(记练过时顺手写库)。
   */
  loggedIn: boolean

  /**
   * Pro 用户(不计配额)。
   */
  pro: boolean
}

/**
 * 答题状态机交回的面板。
 */
export type PteAnswerPanel = {
  /**
   * 段位。
   */
  phase: PtePhase

  /**
   * 准备倒计时剩余秒(RA);0 = 没在倒。
   */
  prepLeft: number

  /**
   * 作答已用秒。
   */
  elapsed: number

  /**
   * 题目音频在播。
   */
  playing: boolean

  /**
   * 浏览器能朗读(或有音频直链)。
   */
  canPlay: boolean

  /**
   * 音频型的题面已展开(作答段里点了「显示原句」)。
   */
  textShown: boolean

  /**
   * 答案已显示(默认藏着 —— Frank 2026-09-04「答案默认隐藏好一点吧」)。
   */
  answerShown: boolean

  /**
   * WFD 打字框现值。
   */
  typed: string

  /**
   * 录音中。
   */
  recording: boolean

  /**
   * 已录秒数。
   */
  recSeconds: number

  /**
   * 录音回放地址;null = 没录到。
   */
  recUrl: string | null

  /**
   * 麦克风没拿到。
   */
  micDenied: boolean

  /**
   * 播题目 / 再听一遍。
   */
  onPlay: () => void

  /**
   * 跳过准备。
   */
  onSkipPrep: () => void

  /**
   * 显示原句。
   */
  onShowText: () => void

  /**
   * 显示答案。
   */
  onShowAnswer: () => void

  /**
   * 打字框输入。
   */
  onTyped: (e: React.ChangeEvent<HTMLTextAreaElement>) => void

  /**
   * 停止录音。
   */
  onStopRec: () => void

  /**
   * 提交 → 对照。
   */
  onSubmit: () => void

  /**
   * 重做。
   */
  onRedo: () => void

  /**
   * 今日已用的免费提交次数(Pro 也照数,只是不拦)。
   */
  used: number

  /**
   * 配额闸:none / login / upgrade。
   */
  gate: PteGate

  /**
   * 关闸(关掉弹出来的注册框或升级框)。
   */
  onGateClose: () => void
}

/**
 * 评论状态机(usePteComments)的入参。
 */
export type PteCommentsHookIn = {
  /**
   * 题键。
   */
  qid: string

  /**
   * SSR 带下的过审评论。
   */
  comments: PteComment[]

  /**
   * 来源合成的考过次数(题的 times)。
   */
  times: number
}

/**
 * 评论状态机交回的面板。
 */
export type PteCommentsPanel = {
  /**
   * 考试记录(含刚发的)。
   */
  exams: PteComment[]

  /**
   * 「考过 (N)」的 N(来源次数 + 本次会话刚记的)。
   */
  seenN: number

  /**
   * 留言。
   */
  notes: PteComment[]

  /**
   * 考试记录提交状态。
   */
  examState: PostState

  /**
   * 原地登录框开着(未登录点「考过」/「写评论」—— Frank 2026-09-04「应该直接弹出登录页面,
   * 为什么要跳到 jobs 页面再弹出」)。
   */
  loginOpen: boolean

  /**
   * 开登录框。
   */
  onLoginOpen: () => void

  /**
   * 关登录框。
   */
  onLoginClose: () => void

  /**
   * 登录完成:整页刷新按真实态重渲。
   */
  onLoginDone: () => void

  /**
   * 留言表单开着(点「写评论」才开)。
   */
  noteOpen: boolean

  /**
   * 留言现值。
   */
  note: string

  /**
   * 留言提交状态。
   */
  noteState: PostState

  /**
   * 发考试记录。
   */
  onExamSubmit: () => void

  /**
   * 开/关留言表单。
   */
  onNoteOpen: () => void

  /**
   * 留言输入。
   */
  onNote: (e: React.ChangeEvent<HTMLTextAreaElement>) => void

  /**
   * 发留言。
   */
  onNoteSubmit: () => void
}

/**
 * 自家聚合取数(`examCountsOf`)的入参。
 */
export type ExamCountsIn = {
  /**
   * 数据库连接。
   */
  db: DbPool

  /**
   * 题型码(大写)。
   */
  type: string
}

/**
 * 公共子序列表取值(`lcsAt`)的入参。
 */
export type LcsAtIn = {
  /**
   * 表(键 = i * cols + j)。
   */
  lcs: Map<number, number>

  /**
   * 列数(原句词数 + 1)。
   */
  cols: number

  /**
   * 行坐标。
   */
  i: number

  /**
   * 列坐标。
   */
  j: number
}


/**
 * 多行文本框输入手柄。
 */
export type TextChangeFn = (e: React.ChangeEvent<HTMLTextAreaElement>) => void


/**
 * effect 体(交回清理函数)。
 */
export type EffectFn = () => () => void

/**
 * 录音块回调(MediaRecorder 定的形)。
 */
export type ChunkSinkFn = (e: BlobEvent) => void

/**
 * 停止录音并交回回放地址。
 */
export type RecorderStopFn = () => Promise<string | null>

/**
 * 造停止函数(`makeRecorderStop`)的入参。
 */
export type RecorderStopIn = {
  /**
   * 录音机。
   */
  rec: MediaRecorder

  /**
   * 攒下的块。
   */
  chunks: Blob[]

  /**
   * 麦克风流(停时关掉)。
   */
  stream: MediaStream
}

/**
 * 查词状态。
 */
export type DictState = 'idle' | 'busy' | 'ok' | 'none'

/**
 * 一条字典结果(洗净)。
 */
export type DictEntry = {
  /**
   * 词。
   */
  word: string

  /**
   * 音标;空串 = 词典没给。
   */
  phonetic: string

  /**
   * 释义,一义一行(带词性,如「adv. 使人惊奇, 出人意外」)。
   */
  lines: string[]

  /**
   * 原形;空串 = 本身就是原形(屈折形弹层多给一行原形)。
   */
  lemma: string

  /**
   * 英音音标;空串 = 没给。
   */
  phoneticUk: string

  /**
   * 美音音标;空串 = 没给。
   */
  phoneticUs: string
}




/**
 * /api/pte/dict/[word] 的响应形(网络来的,只读真用的格;逐格判)。
 */
export type DictApiBody = {
  /**
   * 查到了。
   */
  ok: boolean

  /**
   * 词。
   */
  word: string

  /**
   * 音标。
   */
  phonetic: string

  /**
   * 中文释义(多义换行分隔)。
   */
  translation: string

  /**
   * 原形。
   */
  lemma: string

  /**
   * 英音音标。
   */
  phoneticUk: string

  /**
   * 美音音标。
   */
  phoneticUs: string
}

/**
 * pte_dict 高亮依据的库行(`PTE_DICT_TAGS`)。
 */
export type PteDictTagDbRow = {
  /**
   * 词。
   */
  word: string | null

  /**
   * 考纲标签(空格分隔)。
   */
  tag: string | null

  /**
   * 柯林斯星级。
   */
  collins: number | null
}

/**
 * 取一题高亮档表(`loadPteTiers`)的入参。
 */
export type PteTiersIn = {
  /**
   * 数据库连接。
   */
  db: DbPool

  /**
   * 题面。
   */
  text: string
}

/**
 * 档位判定(`tierOf`)的入参。
 */
export type TierOfIn = {
  /**
   * 考纲标签串(空格分隔)。
   */
  tag: string
}

/**
 * 题面切段(`textPartsOf`)的入参。
 */
export type TextPartsIn = {
  /**
   * 题面。
   */
  text: string

  /**
   * 词 → 档。
   */
  tiers: Record<string, number>
}

/**
 * 题面的一段:词或词间的分隔;tier > 0 的词高亮。
 */
export type TextPart = {
  /**
   * 原样文字。
   */
  text: string

  /**
   * 小写归一的词;分隔段为空串。
   */
  word: string

  /**
   * 档;0 = 不高亮。
   */
  tier: number
}

/**
 * 悬停开弹层手柄(`makeHoverWord`)的入参。
 */
export type HoverWordIn = {
  /**
   * 落词。
   */
  setWord: (w: string) => void

  /**
   * 落弹层位置。
   */
  setPos: (p: DictPos) => void
}

/**
 * 高亮题面(PteText)的 props。
 */
export type PteTextIn = {
  /**
   * 题面。
   */
  text: string

  /**
   * 词 → 档。
   */
  tiers: Record<string, number>

  /**
   * 悬停手柄。
   */
  onHoverWord: (e: React.MouseEvent<HTMLElement>) => void
}

/**
 * 配额闸三态。
 */
export type PteGate = 'none' | 'login' | 'upgrade'

/**
 * 配额档(localStorage 里的 JSON)。
 */
export type QuotaDoc = {
  /**
   * 计数所属日(YYYY-MM-DD,本地时区)。
   */
  day: string

  /**
   * 当日已提交次数。
   */
  n: number
}

/**
 * 关闸手柄(`makeGateClose`)的入参。
 */
export type GateCloseIn = {
  /**
   * 落闸态。
   */
  setGate: (g: PteGate) => void
}

/**
 * 带配额闸的提交手柄(`makeGatedSubmit`)的入参。
 */
export type GatedSubmitIn = {
  /**
   * Pro(不拦)。
   */
  pro: boolean

  /**
   * 登录态(拦下时决定弹注册框还是升级框)。
   */
  loggedIn: boolean

  /**
   * 今日已用。
   */
  used: number

  /**
   * 真提交。
   */
  submit: () => void

  /**
   * 落闸态。
   */
  setGate: (g: PteGate) => void
}

/**
 * 弹层一档音标取值(`phonOf`)的入参。
 */
export type PhonIn = {
  /**
   * 本档音标(英或美)。
   */
  own: string

  /**
   * 兜底音标(ECDICT 混合音标)。
   */
  fallback: string
}

/**
 * 读一个词(`makeSpeakWord`)的入参。
 */
export type SpeakWordIn = {
  /**
   * 要读的词。
   */
  word: string

  /**
   * 语音语言码(en-GB / en-US)。
   */
  lang: string
}

/**
 * 弹层的位置(视口坐标)。
 */
export type DictPos = {
  /**
   * 左。
   */
  x: number

  /**
   * 上。
   */
  y: number
}

/**
 * 查词状态机(usePteDict)交回的面板。
 */
export type PteDictPanel = {
  /**
   * 状态。
   */
  state: DictState

  /**
   * 选中的词;空串 = 没选。
   */
  word: string

  /**
   * 结果;null = 还没有。
   */
  entry: DictEntry | null

  /**
   * 弹层位置。
   */
  pos: DictPos

  /**
   * 关掉弹层。
   */
  onClose: () => void

  /**
   * 读英音(浏览器 en-GB 语音)。
   */
  onSpeakUk: () => void

  /**
   * 读美音(浏览器 en-US 语音)。
   */
  onSpeakUs: () => void

  /**
   * 鼠标悬到高亮词:以该元素位置开弹层(Frank 2026-09-04「鼠标放上去显示字典解析」)。
   */
  onHoverWord: (e: React.MouseEvent<HTMLElement>) => void
}

/**
 * 字典弹层(PteDict)的 props。
 */
export type PteDictIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 查词面板。
   */
  d: PteDictPanel
}

/**
 * 选区监听 effect 工厂(`makeSelectionWatch`)的入参。
 */
export type SelectionWatchIn = {
  /**
   * 落词与位置。
   */
  setWord: (w: string) => void

  /**
   * 落位置。
   */
  setPos: (p: DictPos) => void
}

/**
 * 查词 effect 工厂(`makeDictLookup`)的入参。
 */
export type DictLookupIn = {
  /**
   * 要查的词;空串 = 不查。
   */
  word: string

  /**
   * 落状态。
   */
  setState: (s: DictState) => void

  /**
   * 落结果。
   */
  setEntry: (e: DictEntry | null) => void
}

/**
 * 查词真身(`lookupNow`)的入参:effect 入参 + 死亡标记。
 */
export type LookupNowIn = {
  /**
   * effect 入参。
   */
  x: DictLookupIn

  /**
   * 拆卸标记。
   */
  flag: DeadFlag
}

/**
 * 落查词结果(`settleDict`)的入参。
 */
export type SettleDictIn = {
  /**
   * effect 入参。
   */
  x: DictLookupIn

  /**
   * 结果;null = 没查到。
   */
  entry: DictEntry | null
}

/**
 * 关弹层手柄(`makeDictClose`)的入参。
 */
export type DictCloseIn = {
  /**
   * 落词(清成空串 = 关)。
   */
  setWord: (w: string) => void
}

/**
 * 选区读取(`selectedWordOf`)的返回:词 + 位置;没选到词是 null。
 */
export type SelectedWord = {
  /**
   * 词。
   */
  word: string

  /**
   * 弹层位置。
   */
  pos: DictPos
}

/**
 * 弹层定位(`dictPosOf`)的入参:选区矩形。
 */
export type DictPosIn = {
  /**
   * 选区左。
   */
  left: number

  /**
   * 选区底。
   */
  bottom: number
}

/**
 * 死亡标记(effect 拆卸后不再落格)。
 */
export type DeadFlag = {
  /**
   * 已拆卸。
   */
  dead: boolean
}

/**
 * 无参无返回的手柄。
 */
export type ClickFn = () => void

/**
 * 题型名取值(`typeNameOf`)的入参。
 */
export type TypeNameIn = {
  /**
   * 题型。
   */
  type: PteType

  /**
   * 界面语言。
   */
  lang: PteLang
}

/**
 * 按码找题型(`typeAt`)的入参。
 */
export type TypeAtIn = {
  /**
   * 题型维度。
   */
  types: PteType[]

  /**
   * 题型码。
   */
  code: string
}

/**
 * 单题页地址(`itemHrefOf`)的入参。
 */
export type ItemHrefIn = {
  /**
   * 题键(源:题型:源内 id)。
   */
  qid: string
}

/**
 * 路由段 → 题键(`qidOf`)的入参。
 */
export type QidOfIn = {
  /**
   * 题型段(任意大小写)。
   */
  type: string

  /**
   * 题段(`源-源内id`)。
   */
  id: string
}

/**
 * 题型段归一(`typeCodeOf`)的入参。
 */
export type TypeCodeIn = {
  /**
   * 路由里的题型段。
   */
  type: string
}

/**
 * 距今天数(`daysAgoOf`)的入参。
 */
export type DaysAgoIn = {
  /**
   * 日期串 YYYY-MM-DD。
   */
  iso: string
}

/**
 * 「N 天前考过」文案(`seenTextOf`)的入参。
 */
export type SeenTextIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 最近考过日;null 给空串。
   */
  seen: string | null
}

/**
 * 「N 天前」文案(`agoTextOf`)的入参。
 */
export type AgoTextIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 日期;null 给「暂无记录」。
   */
  iso: string | null
}



/**
 * WFD 逐词对照的一个词。
 */
export type DiffToken = {
  /**
   * 原样的词。
   */
  w: string

  /**
   * 对上了。
   */
  ok: boolean
}

/**
 * 逐词对照(`diffOf`)的入参。
 */
export type DiffIn = {
  /**
   * 你写的。
   */
  typed: string

  /**
   * 原句。
   */
  text: string
}

/**
 * 逐词对照的结果。
 */
export type DiffOut = {
  /**
   * 你写的逐词(错的标红)。
   */
  tokens: DiffToken[]

  /**
   * 对上的词数。
   */
  ok: number

  /**
   * 错的词数(原句里没对上的)。
   */
  bad: number
}

/**
 * 秒 → `m:ss`(`clockOf`)的入参。
 */
export type ClockIn = {
  /**
   * 秒数。
   */
  seconds: number
}

/**
 * 合并三源与自家记录(`toPteRow`)的入参。
 */
export type PteRowIn = {
  /**
   * 库行。
   */
  row: PteListDbRow

  /**
   * 自家记录聚合(按 qid)。
   */
  own: Map<string, PteExamCount>
}

/**
 * 自家考试记录聚合(洗净)。
 */
export type PteExamCount = {
  /**
   * 条数。
   */
  n: number

  /**
   * 最近一条的考试日。
   */
  last: string | null
}

/**
 * 装配单题(`toPteQuestion`)的入参。
 */
export type PteQuestionIn = {
  /**
   * 库行。
   */
  row: PteOneDbRow

  /**
   * 题单里对应的洗净行(合并后的 seen / times);null = 题单里没它。
   */
  listed: PteRow | null
}

/**
 * 找前后邻(`neighborsOf`)的入参。
 */
export type NeighborsIn = {
  /**
   * 题单(按题单序)。
   */
  rows: PteRow[]

  /**
   * 当前题键。
   */
  qid: string
}

/**
 * 前后邻与位置。
 */
export type NeighborsOut = {
  /**
   * 上一题地址;null = 第一题。
   */
  prevHref: string | null

  /**
   * 下一题地址;null = 最后一题。
   */
  nextHref: string | null

  /**
   * 序(1 起;不在题单里给 0)。
   */
  index: number
}

/**
 * 练过落盘(`saveDone`)的入参。
 */
export type SaveDoneIn = {
  /**
   * 练过的题键。
   */
  done: Set<string>
}

/**
 * 记一题练过(`markDone`)的入参。
 */
export type MarkDoneIn = {
  /**
   * 题键。
   */
  qid: string

  /**
   * 登录态(顺手 PUT 到库)。
   */
  loggedIn: boolean
}

/**
 * 练过档接口的响应形状(`{ ok, done }`;网络来的,逐格判)。
 */
export type DoneResBody = {
  /**
   * 并集后的题键。
   */
  done: string[]
}

/**
 * 有无 href 的落格(`hrefOrNone`):null 给空串,Button 收到空串退回 <button>。
 */
export type MaybeHref = string | null



/**
 * 置真/置假手柄(`makeOpen` / `makeClose`)的入参。
 */
export type SetBoolIn = {
  /**
   * 落格。
   */
  set: (on: boolean) => void
}

/**
 * 布尔开关手柄(`makeToggle`)的入参。
 */
export type ToggleIn = {
  /**
   * 现值。
   */
  on: boolean

  /**
   * 落格。
   */
  set: (on: boolean) => void
}

/**
 * 显示更多手柄(`makeMore`)的入参。
 */
export type MoreIn = {
  /**
   * 现值。
   */
  shown: number

  /**
   * 落格。
   */
  setShown: (n: number) => void
}

/**
 * 段位落格手柄(`makePhaseSet`)的入参。
 */
export type PhaseSetIn = {
  /**
   * 落格。
   */
  setPhase: (p: PtePhase) => void

  /**
   * 目标段位。
   */
  phase: PtePhase
}

/**
 * 朗读(`speak`)的入参。
 */
export type SpeakIn = {
  /**
   * 要读的英文。
   */
  text: string

  /**
   * 读完回调。
   */
  onEnd: () => void
}

/**
 * 播直链(`playUrl`)的入参。
 */
export type PlayUrlIn = {
  /**
   * 音频地址。
   */
  url: string

  /**
   * 播完回调。
   */
  onEnd: () => void
}

/**
 * 播题目手柄(`makePlay`)的入参。
 */
export type PlayIn = {
  /**
   * 题。
   */
  q: PteQuestion

  /**
   * 音频型(读完进作答段)。
   */
  audioType: boolean

  /**
   * 当前段位。
   */
  phase: PtePhase

  /**
   * 落在播。
   */
  setPlaying: (on: boolean) => void

  /**
   * 落段位。
   */
  setPhase: (p: PtePhase) => void
}

/**
 * 文本框输入手柄(`makeTextChange`)的入参。
 */
export type TextChangeIn = {
  /**
   * 落格。
   */
  set: (v: string) => void
}


/**
 * 录音机句柄:浏览器 MediaRecorder 那一格由 startRecorder 交回,stop 时收 blob。
 */
export type RecorderHandle = {
  /**
   * 停止并交回回放地址(录不到给 null)。
   */
  stop: () => Promise<string | null>
}

/**
 * 起录音(`startRecorder`)的入参。
 */
export type StartRecorderIn = {
  /**
   * 拿不到麦克风时的回调。
   */
  onDenied: () => void
}

/**
 * 提交手柄(`makeSubmit`)的入参:停录 → 落回放 → 进对照 → 记练过。
 */
export type SubmitIn = {
  /**
   * 题键。
   */
  qid: string

  /**
   * 登录态(记练过时顺手 PUT 到库)。
   */
  loggedIn: boolean

  /**
   * 录音机;null = 这型不录。
   */
  rec: RecorderHandle | null

  /**
   * 落回放地址。
   */
  setRecUrl: (u: string | null) => void

  /**
   * 落录音中。
   */
  setRecording: (on: boolean) => void

  /**
   * 清录音机(停完就扔,重做再起新的)。
   */
  setRec: (r: RecorderHandle | null) => void

  /**
   * 落段位。
   */
  setPhase: (p: PtePhase) => void
}

/**
 * 重做手柄(`makeRedo`)的入参。
 */
export type RedoIn = {
  /**
   * 落段位。
   */
  setPhase: (p: PtePhase) => void

  /**
   * 清录音机。
   */
  setRec: (r: RecorderHandle | null) => void

  /**
   * 清麦克风拒绝标记(重做再要一次)。
   */
  setMicDenied: (on: boolean) => void

  /**
   * 清打字框。
   */
  setTyped: (v: string) => void

  /**
   * 清回放。
   */
  setRecUrl: (u: string | null) => void

  /**
   * 清已用秒。
   */
  setElapsed: (n: number) => void

  /**
   * 收起原句。
   */
  setTextShown: (on: boolean) => void

  /**
   * 重置准备倒计时。
   */
  setPrepLeft: (n: number) => void

  /**
   * 准备秒数(RA);0 = 这型没有准备段。
   */
  prepS: number
}

/**
 * 秒表 effect 工厂(`makeTicker`)的入参:每秒把计数加一直到上限。
 */
export type TickerIn = {
  /**
   * 在走(段位对上了才走;不在走什么都不做)。
   */
  active: boolean

  /**
   * 现值。
   */
  value: number

  /**
   * 落格。
   */
  set: (n: number) => void

  /**
   * 上限;到了停(0 = 不设上限)。
   */
  cap: number

  /**
   * 到上限时的回调;null = 无。
   */
  onCap: (() => void) | null
}

/**
 * 发评论(`postComment`)的入参。
 */
export type PostCommentIn = {
  /**
   * 请求体(已序列化)。
   */
  body: string
}

/**
 * 发考试记录手柄(`makeExamSubmit`)的入参。
 */
export type ExamSubmitIn = {
  /**
   * 题键。
   */
  qid: string

  /**
   * 现状态。
   */
  state: PostState

  /**
   * 落状态。
   */
  setState: (s: PostState) => void

  /**
   * 现记录。
   */
  exams: PteComment[]

  /**
   * 落记录(发成功当场并进去)。
   */
  setExams: (rows: PteComment[]) => void
}

/**
 * 发留言手柄(`makeNoteSubmit`)的入参。
 */
export type NoteSubmitIn = {
  /**
   * 题键。
   */
  qid: string

  /**
   * 正文现值。
   */
  note: string

  /**
   * 现状态。
   */
  state: PostState

  /**
   * 落状态。
   */
  setState: (s: PostState) => void

  /**
   * 清正文。
   */
  setNote: (v: string) => void
}

/**
 * 「考过 (N)」计数(`seenCountOf`)的入参。
 */
export type SeenCountIn = {
  /**
   * 来源合成的考过次数。
   */
  times: number

  /**
   * SSR 带下的评论。
   */
  comments: PteComment[]

  /**
   * 现时考试记录(含刚发的)。
   */
  exams: PteComment[]
}

/**
 * 评论按类分拣(`commentsOfKind`)的入参。
 */
export type CommentsOfKindIn = {
  /**
   * 全部评论。
   */
  comments: PteComment[]

  /**
   * 要哪类。
   */
  kind: string
}

/**
 * 单题页元数据(`pteItemMetaOf`)的入参。
 */
export type ItemMetaIn = {
  /**
   * 题;null = 查无此题。
   */
  item: PteItem | null

  /**
   * 题型;null = 查无此型。
   */
  type: PteType | null
}

/**
 * 页面元数据的形(Next 的 Metadata 只取这几格)。
 */
export type PteMeta = {
  /**
   * 标题。
   */
  title: string

  /**
   * 描述。
   */
  description: string

  /**
   * 收录开关;查无此题禁收录。
   */
  robots: {
    /**
     * 允许收录。
     */
    index: boolean
  }
}

/**
 * 题单页元数据(`pteListMetaOf`)的入参。
 */
export type ListMetaIn = {
  /**
   * 题型;null = 查无此型。
   */
  type: PteType | null

  /**
   * 题数。
   */
  n: number
}

/**
 * 卡片/单元格用的「练过」判定(`isDone`)的入参。
 */
export type IsDoneIn = {
  /**
   * 练过的题键。
   */
  done: Set<string>

  /**
   * 题键。
   */
  qid: string
}

/**
 * 题单展示行(洗行 → 展示行 → 哑单元格,形照 employers):文案在这里算好,单元格只放。
 */
export type PteCellRow = {
  /**
   * 题键(行身份)。
   */
  qid: string

  /**
   * 单题页地址。
   */
  href: string

  /**
   * `#N`。
   */
  num: string

  /**
   * 题号数值(列排序用)。
   */
  numN: number

  /**
   * 最近考过日;null = 没记录(列排序用)。
   */
  seenIso: string | null

  /**
   * 题面。
   */
  text: string

  /**
   * 题面格类名(练过的灰掉;算好放这里,单元格才不用回头 import 行为 —— 那是个环)。
   */
  textCls: string

  /**
   * 「N 天前考过」/ 空串。
   */
  seenText: string

  /**
   * 考过次数。
   */
  times: number

  /**
   * 练过(整行灰掉)。
   */
  done: boolean

  /**
   * 操作列钮文案(「练习」)。
   */
  actText: string
}

/**
 * 展示行构造(`cellRowsOf`)的入参。
 */
export type CellRowsIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 洗净行。
   */
  rows: PteRow[]

  /**
   * 练过的题键。
   */
  done: Set<string>
}

/**
 * 表格列声明(与 components/table 的 Col 同形,本域自抄真读的格)。
 */
export type PteCol = {
  /**
   * 列身份。
   */
  key: string

  /**
   * 表头文案。
   */
  label: string

  /**
   * 单元格渲染(表格按库定的形调:把整行当 props 递给哑单元格)。
   */
  render: (r: PteCellRow) => React.ReactNode

  /**
   * 排序取值器(表头可点排序;Frank 2026-09-03「table 怎么没有带排序」)。
   */
  sort: (r: PteCellRow) => string | number | null

  /**
   * 显式列宽(百分比;固定版式,永不横滚)。
   */
  width: string

  /**
   * 数字列右对齐。
   */
  align: 'left' | 'right'
}

/**
 * 列构造(`colsOf`)的入参。
 */
export type ColsOfIn = {
  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * 桌面表(PteTable)/ 手机卡列(PteCards)的 props。
 */
export type PteRowsViewIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 展示行(已按 shown 截)。
   */
  rows: PteCellRow[]
}

/**
 * 手机卡一张(PteCard)的 props。
 */
export type PteCardViewIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 展示行。
   */
  r: PteCellRow
}

/**
 * 词数(`wordCountOf`)的入参。
 */
export type WordCountIn = {
  /**
   * 句子。
   */
  s: string
}

/**
 * 练过态类名(`textCellClsOf` / `cardClsOf`)的入参。
 */
export type DoneClsIn = {
  /**
   * 练过。
   */
  done: boolean
}


/**
 * 「能不能播」快照(`canPlaySnapshotOf`)的入参。
 */
export type CanPlayIn = {
  /**
   * 题的音频直链;null = 靠浏览器朗读。
   */
  audioUrl: string | null
}

/**
 * 提交状态提示(`noteHintOf` / `examHintOf`)的入参。
 */
export type HintIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 提交状态。
   */
  s: PostState
}

/**
 * 题面该不该露(`isTextShown`)的入参。
 */
export type TextShownIn = {
  /**
   * 音频型。
   */
  audio: boolean

  /**
   * 作答段里点了「显示原句」。
   */
  textShown: boolean

  /**
   * 段位。
   */
  phase: PtePhase

  /**
   * WFD(对照段的原句由逐词对照件出,这里不重复)。
   */
  wfd: boolean
}

/**
 * 起录音 effect 工厂(`makeStartRec`)的入参。
 */
export type StartRecIn = {
  /**
   * 该录(段位在作答且这型要录且还没起)。
   */
  should: boolean

  /**
   * 落录音机。
   */
  setRec: (r: RecorderHandle | null) => void

  /**
   * 落录音中。
   */
  setRecording: (on: boolean) => void

  /**
   * 落麦克风没拿到。
   */
  setMicDenied: (on: boolean) => void
}

/**
 * 答题卡三件(PteAnswerHead / PteAnswerBody / PteAnswerBtns)共用的 props(= PteAnswerIn)。
 */
export type PteAnswerPartIn = PteAnswerIn







