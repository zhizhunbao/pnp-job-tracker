/**
 * news 域(移民动态)的自足形状:库行三张(列表卡 / 头条 / 详情)与评论行,
 * 各件的 props 契约、派生函数的入参、状态机器交回的面板。
 * 🔴 本文件**不带 `'use client'`**(老坑 6):服务端页面(generateMetadata 与 SQL 取数)
 * 与客户端视图共用这几张形状,标了指令就把服务端那半也拖进客户端边界。
 * 2026-08-27 换装批自 shared.ts 拆户而来(常量去 constants.ts、取名函数去 functions.ts);
 * 同批按三段律把原 `NewsRow` 更名 `NewsDbRow` —— 它是 `newsBySlug` 那条 SQL 的原始行,
 * `XxxRow` 那个后缀在七后缀里指的是对外展示行,占着它会认错东西。
 * 2026-08-29 页面门清闸批:两个门里的取数下沉本域 functions,取数入参的形状落在这里 ——
 * 唯一的 import 是 lib/db 的连接面(基础设施叶子,`no-import-in-leaf` 钦定的那一格特批)。
 *
 * @author Frank
 * @time 2026-08-27 23:30:00
 */
import type { DbPool } from '@/lib/db'

/**
 * 界面语取词函数(与 lib/i18n 的 TFn 同形:键 + 可选插值 —— 宪法 08-25「types 自声明」,
 * 形状本域自己声明,不从别的域取;真参数是 lib/i18n 那个带附加成员的交叉类型,
 * 结构上兜得住)。
 */
export type TFn = (key: string, vars?: Record<string, string | number>) => string

/**
 * 界面语言(三字面量各域自抄)。速读与对照译文按它取,英文界面不出对照开关。
 */
export type NewsLang = 'zh' | 'en' | 'ko'

/**
 * 在途状态(发评论):闲置 / 在途 / 已提交待审 / 失败。
 */
export type PostState = 'idle' | 'busy' | 'sent' | 'err'

/**
 * 在途状态(AI 速读与懒翻译):闲置 / 在途 / 失败。生成没有「已提交」这一档 ——
 * 成了就直接把正文换上。
 */
export type GenState = 'idle' | 'busy' | 'err'

/**
 * 列表卡的库行(`NEWS_LIST` 那条 SQL 的原始行)。
 */
export type NewsCard = {
  /**
   * 地区码:省码,或联邦档的 `federal`。
   */
  region: string

  /**
   * 官方原标题。
   */
  title: string

  /**
   * 官方发布日期(`YYYY-MM-DD`)。
   */
  date: string

  /**
   * 详情页地址的最后一段。
   */
  slug: string

  /**
   * 抓来的 og 图地址;库里没有就是 null。列表左侧图块不用它(用本站静态地标图)。
   */
  ogImage: string | null

  /**
   * mart 清洗产出的摘要(P1c);官方页没摘要时是 null。
   */
  excerpt: string | null

  /**
   * AI 重要度 1-5;没评过是 null(不折 0 —— 那会把「没评」说成「最低分」)。
   */
  importance: number | null

  /**
   * 重要度理由(数据层生成的**中文**);没评过是 null。
   */
  importanceNote: string | null
}

/**
 * 头条区的库行(`NEWS_LIST_REGION`):列表卡再加两门 AI 速读。
 */
export type NewsHero = NewsCard & {
  /**
   * 中文速读;没生成过是 null。
   */
  summaryZh: string | null

  /**
   * 韩文速读;没生成过是 null。
   */
  summaryKo: string | null
}

/**
 * 详情页的库行(`newsBySlug` 那条 SQL 的原始行)。
 */
export type NewsDbRow = NewsCard & {
  /**
   * 官方原文地址(转载姿势四件套之一)。
   */
  url: string

  /**
   * 官方英文原文全文(段落之间空行分隔)。
   */
  bodyEn: string

  /**
   * 中文译文;没翻过是 null(点开关时按需翻并写回库)。
   */
  bodyZh: string | null

  /**
   * 韩文译文;没翻过是 null。
   */
  bodyKo: string | null

  /**
   * 中文速读;没生成过是 null。
   */
  summaryZh: string | null

  /**
   * 韩文速读;没生成过是 null。
   */
  summaryKo: string | null

  /**
   * 英文速读;没生成过是 null(`summary_en` 列还没上生产时 SQL 直接选 NULL)。
   */
  summaryEn: string | null

  /**
   * 引用出处串(转载姿势四件套之一)。
   */
  citation: string

  /**
   * 本站抓取时刻。
   */
  fetched: string
}

/**
 * 一条评论的库行(`NEWS_COMMENTS_THREADED`)。
 * F 件(E8-07):id/parentId = 楼中楼一层;pinned = 置顶楼;official = admin 号发的
 * (SQL join users.role 派生)。
 */
export type NewsComment = {
  /**
   * 评论 id(楼中楼靠它认爹)。
   */
  id: number

  /**
   * 所属顶层楼的 id;顶层楼自己是 null。
   */
  parentId: number | null

  /**
   * 是不是置顶楼。
   */
  pinned: boolean

  /**
   * 是不是 admin 号发的(挂「官方」标)。
   */
  official: boolean

  /**
   * 脱敏昵称快照。
   */
  authorName: string

  /**
   * 评论正文。
   */
  body: string

  /**
   * 发表日期(`YYYY-MM-DD`)。
   */
  date: string
}

/**
 * 按日分组后的一组(时间线列表一天一组)。
 */
export type NewsDayGroup = {
  /**
   * 这一组的日期。
   */
  day: string

  /**
   * 这一天的条目(库里的原序 = 官方发布序)。
   */
  items: NewsCard[]
}

/**
 * 无参无返的点击手柄(钮的 onClick;由各 make* 工厂造出来)。
 */
export type ClickFn = () => void

/**
 * 逐项点击手柄的工厂(给它这一项的序号/id,换一只只管这一项的手柄)。
 */
export type PickFn = (i: number) => ClickFn

/**
 * 输入框改值手柄(React 的事件形状由库定死)。
 */
export type TextChangeFn = (e: React.ChangeEvent<HTMLTextAreaElement>) => void

/**
 * News(动态列表整块视图)的 props。
 */
export type NewsIn = {
  /**
   * 列表条目(SSR 取好的前 60 条,已按日期倒序)。
   */
  items: NewsCard[]

  /**
   * 头条区那 5 条(重要度降序)。
   */
  hero: NewsHero[]

  /**
   * 每条动态的过审评论数,按 slug 索引;查不到的条目算 0。
   */
  cmtCounts: Record<string, number>

  /**
   * 数据更新时刻(ETL 心跳 checkedAt 的 ISO;'' = 还没拿到,不渲)。
   */
  updatedAt: string
}

/**
 * NewsDetail(单条动态详情整块视图)的 props。
 */
export type NewsDetailIn = {
  /**
   * 这条动态的库行。
   */
  row: NewsDbRow

  /**
   * 过审评论(时间正序;楼序在视图里排)。
   */
  comments: NewsComment[]

  /**
   * 当前访客登录了没(未登录 = 只读 + 一条去登录的引导)。
   */
  loggedIn: boolean
}

/**
 * RegionTag(地区标)的 props。
 */
export type RegionTagIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 地区码。
   */
  region: string
}

/**
 * ImpBadge(AI 重要度徽标)的 props。
 */
export type ImpBadgeIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 当前界面语言(非中文界面不挂中文理由)。
   */
  lang: NewsLang

  /**
   * AI 重要度;null 或不足下限时整枚不渲。
   */
  importance: number | null

  /**
   * 重要度理由(中文);null = 没评过。
   */
  note: string | null
}

/**
 * ListTile(列表左侧地标图块)的 props。
 */
export type ListTileIn = {
  /**
   * 地区码(定图与缺图兜底的配色)。
   */
  region: string
}

/**
 * HeroImage(头条大图)的 props。
 */
export type HeroImageIn = {
  /**
   * 地区码(定图与缺图兜底的渐变)。
   */
  region: string
}

/**
 * HeroBig(头条大卡正文)的 props。
 */
export type HeroBigIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 当前界面语言(定速读取哪一门)。
   */
  lang: NewsLang

  /**
   * 当前这一张头条。
   */
  hero: NewsHero
}

/**
 * HeroControls(轮播箭头与圆点)的 props。
 */
export type HeroControlsIn = {
  /**
   * 全部头条(定圆点颗数)。
   */
  slides: NewsHero[]

  /**
   * 当前张(已取模)。
   */
  cur: number

  /**
   * 上一张。
   */
  onPrev: ClickFn

  /**
   * 下一张。
   */
  onNext: ClickFn

  /**
   * 点第 i 颗圆点直接切到第 i 张。
   */
  pickOf: PickFn
}

/**
 * HeroSideList(头条右列小卡清单)的 props。
 */
export type HeroSideListIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 当前界面语言。
   */
  lang: NewsLang

  /**
   * 右列要显示的其余头条(至多 4 条)。
   */
  items: NewsHero[]
}

/**
 * FeaturedGrid(头条区 1 大 + 4 小)的 props。
 */
export type FeaturedGridIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 当前界面语言。
   */
  lang: NewsLang

  /**
   * 头条条目(空列时整块不渲)。
   */
  slides: NewsHero[]
}

/**
 * NewsChips(地区筛选药丸行)的 props。
 */
export type NewsChipsIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 本页真有条目的地区码(没有条目的地区不出药丸)。
   */
  regions: string[]

  /**
   * 当前选中的地区码;空串 = 全部。
   */
  region: string

  /**
   * 点「全部」。
   */
  onAll: ClickFn

  /**
   * 点某个地区药丸(工厂按地区码给手柄)。
   */
  pickOf: (code: string) => ClickFn

  /**
   * 数据更新时刻(ETL 心跳 checkedAt 的 ISO;'' = 还没拿到,不渲)。
   */
  updatedAt: string
}

/**
 * NewsRowCard(时间线里的一条)的 props。
 */
export type NewsRowCardIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 当前界面语言。
   */
  lang: NewsLang

  /**
   * 这一条。
   */
  item: NewsCard

  /**
   * 这一条的过审评论数。
   */
  comments: number
}

/**
 * NewsDayGroupRows(一天一组)的 props。
 */
export type NewsDayGroupRowsIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 当前界面语言。
   */
  lang: NewsLang

  /**
   * 这一组(日期 + 当天条目)。
   */
  group: NewsDayGroup

  /**
   * 每条动态的过审评论数,按 slug 索引。
   */
  cmtCounts: Record<string, number>
}

/**
 * CommentRow(一条评论)的 props。
 */
export type CommentRowIn = {
  /**
   * 这条评论。
   */
  cm: NewsComment

  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 当前访客登录了没(未登录不出回复钮)。
   */
  loggedIn: boolean

  /**
   * 点「回复」;null = 这一条不给回复(楼中楼只有一层)。
   */
  onReply: ClickFn | null

  /**
   * 回复框正开在这一条上(钮高亮)。
   */
  replying: boolean
}

/**
 * CommentForm(顶层发评论表单)的 props。
 */
export type CommentFormIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 输入框现值。
   */
  body: string

  /**
   * 提交状态。
   */
  state: PostState

  /**
   * 输入框改值。
   */
  onChange: TextChangeFn

  /**
   * 提交。
   */
  onSubmit: ClickFn
}

/**
 * ReplyBox(楼中楼回复框)的 props。
 */
export type ReplyBoxIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 回复框现值。
   */
  body: string

  /**
   * 提交状态(与顶层表单共用一台 —— 同一时刻只发一条)。
   */
  state: PostState

  /**
   * 回复框改值。
   */
  onChange: TextChangeFn

  /**
   * 提交回复。
   */
  onSubmit: ClickFn
}

/**
 * CommentThread(一座楼:楼主 + 回复框 + 楼内回复)的 props。
 */
export type CommentThreadIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 楼主那一条。
   */
  top: NewsComment

  /**
   * 楼内回复(时间正序)。
   */
  replies: NewsComment[]

  /**
   * 当前访客登录了没。
   */
  loggedIn: boolean

  /**
   * 回复框正开在这座楼上。
   */
  replying: boolean

  /**
   * 楼内回复是展开态(≤3 条恒展开)。
   */
  open: boolean

  /**
   * 点楼主那条的「回复」。
   */
  onReply: ClickFn

  /**
   * 点「展开 N 条回复」/「收起」。
   */
  onToggle: ClickFn

  /**
   * 回复框现值。
   */
  replyBody: string

  /**
   * 提交状态。
   */
  state: PostState

  /**
   * 回复框改值。
   */
  onReplyChange: TextChangeFn

  /**
   * 提交回复。
   */
  onReplySubmit: ClickFn
}

/**
 * CommentsSection(评论区整块)的 props。
 */
export type CommentsSectionIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 这条动态的 slug(发评论时带上)。
   */
  slug: string

  /**
   * 过审评论(时间正序)。
   */
  comments: NewsComment[]

  /**
   * 当前访客登录了没。
   */
  loggedIn: boolean
}

/**
 * LineBreaks(段内换行保真)的 props。
 */
export type LineBreaksIn = {
  /**
   * 一段正文(段内的单个换行渲成 `<br>`)。
   */
  text: string
}

/**
 * NewsPara(一段原文 + 可能的对照译文)的 props。
 */
export type NewsParaIn = {
  /**
   * 英文原文这一段。
   */
  text: string

  /**
   * 对照译文这一段;null = 这段没有译文(超长稿只翻前段)。
   */
  trans: string | null
}

/**
 * NewsBody(正文全文)的 props。
 */
export type NewsBodyIn = {
  /**
   * 英文原文分好的段。
   */
  paras: string[]

  /**
   * 对照译文分好的段(译文由编号协议保证段对段对齐,按序配对安全)。
   */
  transParas: string[]

  /**
   * 对照开着没。
   */
  on: boolean
}

/**
 * NewsSummary(AI 速读框)的 props。
 */
export type NewsSummaryIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 速读正文。
   */
  summary: string
}

/**
 * NewsSource(转载姿势那一行:© 出处 + 原文链 + 速读钮 + 对照钮)的 props。
 */
export type NewsSourceIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 当前界面语言(英文界面不出对照钮)。
   */
  lang: NewsLang

  /**
   * 地区码(算 © 出处方)。
   */
  region: string

  /**
   * 官方原文地址。
   */
  url: string

  /**
   * 当前语言的速读;null = 还没生成(出生成钮)。
   */
  summary: string | null

  /**
   * 速读生成状态。
   */
  sumState: GenState

  /**
   * 对照译文开着没。
   */
  transOn: boolean

  /**
   * 翻译状态。
   */
  trState: GenState

  /**
   * 点「AI 速读」。
   */
  onSum: ClickFn

  /**
   * 点对照开关。
   */
  onTrans: ClickFn
}

/**
 * NewsArticle(详情页正文卡)的 props。
 */
export type NewsArticleIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 当前界面语言。
   */
  lang: NewsLang

  /**
   * 这条动态的库行。
   */
  row: NewsDbRow

  /**
   * 当前语言的速读;null = 还没生成(那时出生成钮)。
   */
  summary: string | null

  /**
   * 速读生成状态。
   */
  sumState: GenState

  /**
   * 对照译文开着没。
   */
  transOn: boolean

  /**
   * 当前语言的对照译文;null = 还没有。
   */
  trans: string | null

  /**
   * 翻译状态。
   */
  trState: GenState

  /**
   * 点「AI 速读」。
   */
  onSum: ClickFn

  /**
   * 点对照开关。
   */
  onTrans: ClickFn
}

/**
 * useDeadImage 交回的面板(图挂了就换兜底那一版)。
 */
export type DeadImagePanel = {
  /**
   * 图挂了没。
   */
  dead: boolean

  /**
   * 图加载失败的回调(交给 `<img onError>`)。
   */
  onError: ClickFn
}

/**
 * useCarousel 交回的面板。
 */
export type CarouselPanel = {
  /**
   * 当前张(已对条数取模)。
   */
  cur: number

  /**
   * 上一张。
   */
  onPrev: ClickFn

  /**
   * 下一张。
   */
  onNext: ClickFn

  /**
   * 鼠标进入 = 暂停自动轮播。
   */
  onEnter: ClickFn

  /**
   * 鼠标离开 = 恢复自动轮播。
   */
  onLeave: ClickFn

  /**
   * 点第 i 颗圆点直接切到第 i 张。
   */
  pickOf: PickFn
}

/**
 * useNewsFilter 交回的面板。
 */
export type NewsFilterPanel = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 当前界面语言。
   */
  lang: NewsLang

  /**
   * 当前选中的地区码;空串 = 全部。
   */
  region: string

  /**
   * 点「全部」。
   */
  onAll: ClickFn

  /**
   * 点某个地区药丸。
   */
  pickOf: (code: string) => ClickFn
}

/**
 * useComments 交回的面板。
 */
export type CommentsPanel = {
  /**
   * 顶层输入框现值。
   */
  body: string

  /**
   * 提交状态(顶层与回复共用 —— 同一时刻只发一条)。
   */
  state: PostState

  /**
   * 回复框正开在哪座楼上;null = 没开。
   */
  replyTo: number | null

  /**
   * 回复框现值。
   */
  replyBody: string

  /**
   * 顶层输入框改值。
   */
  onChange: TextChangeFn

  /**
   * 提交顶层评论。
   */
  onSubmit: ClickFn

  /**
   * 回复框改值。
   */
  onReplyChange: TextChangeFn

  /**
   * 提交回复。
   */
  onReplySubmit: ClickFn

  /**
   * 开/关某座楼的回复框。
   */
  replyToggleOf: PickFn

  /**
   * 展开/收起某座楼的楼内回复。
   */
  expandToggleOf: PickFn

  /**
   * 楼内回复是展开态的楼 id。
   */
  expanded: Set<number>
}

/**
 * useNewsDetail 交回的面板。
 */
export type NewsDetailPanel = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 当前界面语言。
   */
  lang: NewsLang

  /**
   * 对照译文开着没。
   */
  transOn: boolean

  /**
   * 当前语言的对照译文;null = 库里没有、也还没翻。
   */
  trans: string | null

  /**
   * 翻译状态。
   */
  trState: GenState

  /**
   * 当前语言的速读;null = 还没生成。
   */
  summary: string | null

  /**
   * 速读生成状态。
   */
  sumState: GenState

  /**
   * 点「AI 速读」。
   */
  onSum: ClickFn

  /**
   * 点对照开关。
   */
  onTrans: ClickFn
}

/**
 * regionLabelOf 的入参。
 */
export type RegionLabelOfIn = {
  /**
   * 取词函数(联邦档的名字过 i18n)。
   */
  t: TFn

  /**
   * 地区码。
   */
  region: string
}

/**
 * impTipOf 的入参。
 */
export type ImpTipOfIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 当前界面语言。
   */
  lang: NewsLang

  /**
   * 重要度理由(中文);null = 没评过。
   */
  note: string | null
}

/**
 * 只认地区码的派生函数入参(图地址、兜底配色类、代号、地名各要一个)。
 */
export type RegionIn = {
  /**
   * 地区码。
   */
  region: string
}

/**
 * heroSummaryOf 的入参。
 */
export type HeroSummaryOfIn = {
  /**
   * 当前界面语言(中/韩取 AI 速读,英文界面退官方摘要)。
   */
  lang: NewsLang

  /**
   * 这一张头条。
   */
  hero: NewsHero
}

/**
 * slideAtOf / sideSlidesOf 的入参。
 */
export type SlidesAtIn = {
  /**
   * 全部头条。
   */
  slides: NewsHero[]

  /**
   * 当前张(未取模也行,函数里取)。
   */
  idx: number
}

/**
 * shownItemsOf 的入参。
 */
export type ShownItemsOfIn = {
  /**
   * 全部列表条目。
   */
  items: NewsCard[]

  /**
   * 头条那几条(未筛选时要从时间线里剔掉,同页不读两遍)。
   */
  hero: NewsHero[]

  /**
   * 当前筛选的地区码;空串 = 未筛选。
   */
  region: string
}

/**
 * presentRegionsOf 的入参。
 */
export type PresentRegionsOfIn = {
  /**
   * 全部列表条目(哪个地区有条目就出哪个药丸)。
   */
  items: NewsCard[]
}

/**
 * dayGroupsOf 的入参。
 */
export type DayGroupsOfIn = {
  /**
   * 要分组的条目(已按日期倒序,同日保持库里的原序)。
   */
  items: NewsCard[]
}

/**
 * parasOf 的入参。
 */
export type ParasOfIn = {
  /**
   * 全文;null = 没有(译文没翻时)。
   */
  text: string | null
}

/**
 * topCommentsOf / repliesOf 的入参。
 */
export type CommentsOfIn = {
  /**
   * 全部过审评论。
   */
  comments: NewsComment[]
}

/**
 * transAtOf 的入参。
 */
export type TransAtOfIn = {
  /**
   * 对照译文分好的段。
   */
  paras: string[]

  /**
   * 第几段。
   */
  i: number

  /**
   * 对照开着没(没开就一律不给)。
   */
  on: boolean
}

/**
 * initialOf 的入参。
 */
export type InitialOfIn = {
  /**
   * 脱敏昵称。
   */
  name: string
}

/**
 * 三门速读/译文的缓存(per-lang 各自缓存:SSR 带下命中秒显,点按钮生成后写回这里)。
 */
export type LangCache = {
  /**
   * 中文那份;null = 没有。
   */
  zh: string | null

  /**
   * 韩文那份;null = 没有。
   */
  ko: string | null

  /**
   * 英文那份;null = 没有。
   */
  en: string | null
}

/**
 * putLangCache 的入参(不许对象展开,换新缓存靠逐格重装)。
 */
export type PutLangCacheIn = {
  /**
   * 现缓存。
   */
  cache: LangCache

  /**
   * 要写的那一门。
   */
  lang: NewsLang

  /**
   * 写进去的正文。
   */
  text: string
}

/**
 * postCommentIn:发一条评论(顶层或回复)。
 */
export type PostCommentIn = {
  /**
   * 这条动态的 slug。
   */
  slug: string

  /**
   * 评论正文(已去首尾空白)。
   */
  body: string

  /**
   * 所回复的顶层楼 id;null = 发顶层评论。
   */
  parent: number | null
}

/**
 * 接口回来的生成结果(速读与翻译共用一个壳)。
 */
export type GenBody = {
  /**
   * 服务端自报的成功位。
   */
  ok: boolean

  /**
   * 速读正文;这次不是速读请求就没有这个键。
   */
  summary?: string

  /**
   * 译文全文;这次不是翻译请求就没有这个键。
   */
  body?: string
}

/**
 * 图块与头条图的类名预算入参。
 */
export type ImgClsIn = {
  /**
   * 地区码。
   */
  region: string

  /**
   * 图挂了没(挂了才叠兜底那一档与配色)。
   */
  dead: boolean
}

/**
 * isImportant 的入参。
 */
export type ImportanceIn = {
  /**
   * AI 重要度;null = 没评过。
   */
  importance: number | null
}

/**
 * arrowClsOf 的入参。
 */
export type NextIn = {
  /**
   * 是不是「下一张」那一枚箭头。
   */
  next: boolean
}

/**
 * 「亮着没」这一格的入参(圆点、回复钮、药丸钮共用)。
 */
export type OnIn = {
  /**
   * 亮着没。
   */
  on: boolean
}

/**
 * sideItemClsOf 的入参。
 */
export type FirstIn = {
  /**
   * 是不是右列的第一条(第一条不加上分隔线)。
   */
  first: boolean
}

/**
 * 输入框与发送钮的档位入参。
 */
export type SmallIn = {
  /**
   * 是不是楼中楼那一档(小一号)。
   */
  small: boolean
}

/**
 * threadClsOf / pinRank 的入参。
 */
export type PinnedIn = {
  /**
   * 是不是置顶楼。
   */
  pinned: boolean
}

/**
 * 头像与昵称类名的入参。
 */
export type OfficialIn = {
  /**
   * 是不是 admin 号发的。
   */
  official: boolean
}

/**
 * newsHrefOf 的入参。
 */
export type SlugIn = {
  /**
   * 详情页地址的最后一段。
   */
  slug: string
}

/**
 * shortDateOf 的入参。
 */
export type DateIn = {
  /**
   * 完整日期(`YYYY-MM-DD`)。
   */
  date: string
}

/**
 * commentCountOf 的入参。
 */
export type CommentCountIn = {
  /**
   * 每条动态的过审评论数,按 slug 索引。
   */
  counts: Record<string, number>

  /**
   * 要查的那条动态。
   */
  slug: string
}

/**
 * repliesAtOf 的入参。
 */
export type RepliesAtIn = {
  /**
   * 楼内回复的分组表。
   */
  table: Map<number, NewsComment[]>

  /**
   * 要查的顶层楼 id。
   */
  id: number
}

/**
 * isThreadOpen 的入参。
 */
export type ThreadOpenIn = {
  /**
   * 这座楼的回复条数。
   */
  count: number

  /**
   * 这座楼的 id。
   */
  id: number

  /**
   * 用户点开过的楼。
   */
  expanded: Set<number>
}

/**
 * langCacheAt 的入参。
 */
export type LangCacheAtIn = {
  /**
   * per-lang 缓存。
   */
  cache: LangCache

  /**
   * 要取哪一门。
   */
  lang: NewsLang
}

/**
 * slideAriaOf 的入参。
 */
export type SlideAriaIn = {
  /**
   * 第几颗圆点(从 0 数)。
   */
  i: number
}

/**
 * isSendDisabled 的入参。
 */
export type SendDisabledIn = {
  /**
   * 输入框现值。
   */
  body: string

  /**
   * 提交状态。
   */
  state: PostState
}

/**
 * expandLabelOf 的入参。
 */
export type ExpandLabelIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 楼内回复展开着没。
   */
  open: boolean

  /**
   * 楼内回复条数。
   */
  count: number
}

/**
 * sumLabelOf 的入参。
 */
export type SumLabelIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 生成状态。
   */
  state: GenState
}

/**
 * transLabelOf 的入参。
 */
export type TransLabelIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 翻译状态。
   */
  state: GenState

  /**
   * 对照开着没。
   */
  on: boolean
}

/**
 * 速读与翻译共用的取文入参。
 */
export type GenTextIn = {
  /**
   * 接口地址。
   */
  url: string

  /**
   * 这条动态的 slug。
   */
  slug: string

  /**
   * 生成哪一门。
   */
  lang: NewsLang
}

/**
 * makeDead 的入参。
 */
export type DeadIn = {
  /**
   * 图挂没挂的落格。
   */
  setDead: (v: boolean) => void
}

/**
 * makeStep 的入参。
 */
export type StepIn = {
  /**
   * 一次走几格(上一张 -1、下一张 1)。
   */
  delta: number

  /**
   * 头条总条数。
   */
  total: number

  /**
   * 当前张落格(函数式,拿得到最新值)。
   */
  setIdx: (f: (n: number) => number) => void
}

/**
 * makeSlidePickOf 的入参。
 */
export type SlidePickIn = {
  /**
   * 当前张落格。
   */
  setIdx: (v: number) => void
}

/**
 * makePause 的入参。
 */
export type PauseIn = {
  /**
   * 暂停位落格。
   */
  setPaused: (v: boolean) => void

  /**
   * 写进去的值(鼠标进来 true、离开 false)。
   */
  on: boolean
}

/**
 * makeSlideTimer 的入参。
 */
export type SlideTimerIn = {
  /**
   * 头条总条数。
   */
  total: number

  /**
   * 当前张落格(函数式自增)。
   */
  setIdx: (f: (n: number) => number) => void
}

/**
 * makeRegionPickOf / makeRegionAll 的入参。
 */
export type RegionPickIn = {
  /**
   * 当前筛选落格。
   */
  setRegion: (v: string) => void
}

/**
 * makeTextChange 的入参。
 */
export type TextChangeIn = {
  /**
   * 正文落格。
   */
  setBody: (v: string) => void

  /**
   * 提交状态现值。
   */
  state: PostState

  /**
   * 提交状态落格。
   */
  setState: (v: PostState) => void
}

/**
 * makeCommentSubmit 与它的 async 真身共用的入参。
 */
export type CommentSubmitIn = {
  /**
   * 这条动态的 slug。
   */
  slug: string

  /**
   * 输入框现值。
   */
  body: string

  /**
   * 提交状态现值。
   */
  state: PostState

  /**
   * 提交状态落格。
   */
  setState: (v: PostState) => void

  /**
   * 正文落格。
   */
  setBody: (v: string) => void
}

/**
 * makeReplySubmit 与它的 async 真身共用的入参。
 */
export type ReplySubmitIn = {
  /**
   * 这条动态的 slug。
   */
  slug: string

  /**
   * 所回复的顶层楼 id;null = 没开着回复框。
   */
  replyTo: number | null

  /**
   * 回复框现值。
   */
  replyBody: string

  /**
   * 提交状态现值。
   */
  state: PostState

  /**
   * 提交状态落格。
   */
  setState: (v: PostState) => void

  /**
   * 回复框正文落格。
   */
  setReplyBody: (v: string) => void

  /**
   * 回复框开在哪座楼的落格。
   */
  setReplyTo: (v: number | null) => void
}

/**
 * makeReplyToggleOf 的入参。
 */
export type ReplyToggleIn = {
  /**
   * 现在开着回复框的楼 id;null = 没开。
   */
  replyTo: number | null

  /**
   * 回复框开在哪座楼的落格。
   */
  setReplyTo: (v: number | null) => void

  /**
   * 回复框正文落格。
   */
  setReplyBody: (v: string) => void
}

/**
 * makeExpandToggleOf 的入参。
 */
export type ExpandToggleIn = {
  /**
   * 展开集合落格(函数式,拿得到最新值)。
   */
  setExpanded: (f: (s: Set<number>) => Set<number>) => void
}

/**
 * makeSumClick 与它的 async 真身共用的入参。
 */
export type SumClickIn = {
  /**
   * 这条动态的 slug。
   */
  slug: string

  /**
   * 界面语言(生成哪一门)。
   */
  lang: NewsLang

  /**
   * 生成状态现值。
   */
  sumState: GenState

  /**
   * 生成状态落格。
   */
  setSumState: (v: GenState) => void

  /**
   * 速读缓存落格。
   */
  setSumCache: (v: LangCache) => void

  /**
   * 速读缓存现值。
   */
  sumCache: LangCache
}

/**
 * makeTransClick 与它的 async 真身共用的入参。
 */
export type TransClickIn = {
  /**
   * 这条动态的 slug。
   */
  slug: string

  /**
   * 界面语言(翻哪一门)。
   */
  lang: NewsLang

  /**
   * 对照开着没。
   */
  transOn: boolean

  /**
   * 当前语言已有的译文;null = 还没有。
   */
  trans: string | null

  /**
   * 翻译状态现值。
   */
  trState: GenState

  /**
   * 对照开关落格。
   */
  setTransOn: (v: boolean) => void

  /**
   * 翻译状态落格。
   */
  setTrState: (v: GenState) => void

  /**
   * 译文缓存落格。
   */
  setTransCache: (v: LangCache) => void

  /**
   * 译文缓存现值。
   */
  transCache: LangCache
}

/**
 * useCarousel 的入参。
 */
export type CarouselIn = {
  /**
   * 头条总条数(少于两条不装表)。
   */
  total: number
}

/**
 * useComments 的入参。
 */
export type CommentsHookIn = {
  /**
   * 这条动态的 slug(发评论时带上)。
   */
  slug: string
}

/**
 * useNewsDetail 的入参。
 */
export type NewsDetailHookIn = {
  /**
   * 这条动态的库行(带 SSR 已有的速读与译文)。
   */
  row: NewsDbRow
}

/**
 * 每条动态的过审评论数表:键 = slug,值 = 条数。查不到的 slug 在表里缺席
 * (不折 0 —— 列表那一格自己判「有没有」)。
 */
export type NewsCmtCounts = Record<string, number>

/**
 * 过审评论数的库行(`NEWS_COMMENT_COUNTS` 那条 SQL 的原始行)。
 */
export type NewsCmtCountDbRow = {
  /**
   * 详情页地址的最后一段(库里那列叫 news_slug,SQL 里已改名 slug)。
   */
  slug: string

  /**
   * 这条动态的过审评论条数。
   */
  n: number
}

/**
 * 三条列表查询(`loadNewsCards` / `loadNewsHeroes` / `loadNewsCommentCounts`)的入参
 * —— 方案 A:连接池由页面门 `getPayload` + `dbOf` 取好注进来,本域一个 `/server` 门都不 import。
 */
export type NewsListIn = {
  /**
   * 数据库连接。
   */
  db: DbPool
}

/**
 * 单条动态取库行(`loadNewsRow`)与取过审评论(`loadNewsComments`)的入参。
 */
export type NewsSlugIn = {
  /**
   * 数据库连接(同上,由页面门注进来)。
   */
  db: DbPool

  /**
   * 详情页地址的最后一段。
   */
  slug: string
}

/**
 * `firstNewsRow` 的入参:一条 `newsBySlug` 语句要的两格。
 */
export type NewsFirstRowIn = {
  /**
   * 数据库连接。
   */
  db: DbPool

  /**
   * 英文摘要那一格取哪个列 —— 真列名,或 schema 缺列时的 `NULL` 占位。
   */
  col: string

  /**
   * 详情页地址的最后一段。
   */
  slug: string
}

/**
 * `newsCommentsAt` 的入参:哪条语句、哪条动态。
 */
export type NewsCommentsAtIn = {
  /**
   * 数据库连接。
   */
  db: DbPool

  /**
   * 取评论的 SQL 文本(楼中楼版,或 parent_id/pinned 缺列时的老版)。
   */
  sql: string

  /**
   * 详情页地址的最后一段。
   */
  slug: string
}

/**
 * `toNewsCard` 的入参。
 */
export type NewsCardRowIn = {
  /**
   * `NEWS_LIST` 交回的原始行。
   */
  row: NewsCard
}

/**
 * `toNewsHero` 的入参。
 */
export type NewsHeroRowIn = {
  /**
   * `NEWS_LIST_REGION` 交回的原始行。
   */
  row: NewsHero
}
