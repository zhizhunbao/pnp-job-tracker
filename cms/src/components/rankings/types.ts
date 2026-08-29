/**
 * rankings 页面域(/rankings/[slug] 榜单页)的形状。三段律走完整的一遍:
 * lib/rankings 交回的**事实行**(RankRow,本域只声明真正读到的格 —— 宪法 08-25
 * 「types 自声明」)→ 视图体内洗成**展示行**(RankCompanyCellRow / RankJobCellRow:
 * 每一格都已经算成文本与色档类)→ 单元格组件只读已经算好的那一项。
 * 🔴 洗行这一步照 employers 样张的形:单元格组件一律是顶层哑组件,单参收展示行、
 * 零闭包零工厂;要 t 才算得出的显示值(列名、口径注、「在职位板查看」)由洗行时算好挂在行上。
 * 榜单只有两种口径 —— 公司榜(sponsor-likely)与职位榜(其余全部),所以展示行也只有两种。
 *
 * @author Frank
 * @time 2026-08-28 12:49:56
 */

/**
 * `t(key, vars)` 的插值表({d} → 值)。
 */
export type TVars = Record<string, string | number>

/**
 * 取词函数。本域只用它的调用形态(i18n 域那份还挂着一个只读 lang 字段,
 * 我们一格都不读 —— 结构相同即兼容)。
 */
export type TFn = (key: string, vars?: TVars) => string

/**
 * 榜单的一行事实(lib/rankings 的 rankings 表行;零计算 —— 计算在
 * etl/10_build_rankings.py)。本域只声明这一页真正读到的格:少声明一格,
 * 漏读会当场 tsc 红;下游多长一格也不必跟着改。
 */
export type RankRow = {
  /**
   * 名次(1 起)。
   */
  rank: number

  /**
   * 职位名(公司榜不读这一格)。
   */
  title: string

  /**
   * 公司名。
   */
  company: string

  /**
   * 城市。
   */
  city: string

  /**
   * 省码;空串 = 跨省雇主(如加拿大军队)库里没记省。
   */
  province: string

  /**
   * 移民价值评分;null = 没算过。
   */
  score: number | null

  /**
   * 薪资原文;空串 = 帖面没写薪资。
   */
  salaryText: string

  /**
   * 年化薪资(薪资列的排序键);null = 折不出年薪。
   */
  salaryAnnual: number | null

  /**
   * 省提名通道文本;空串 = 这个岗没命中通道。
   */
  pnpStream: string

  /**
   * 联邦 EE 类别文本;空串 = 没命中类别。
   */
  eeCategory: string

  /**
   * 发布日期(库里带时分秒,显示前裁到十位)。
   */
  datePosted: string

  /**
   * 申请链接(官方原帖);空串 = 这一行没有可点的原帖。
   */
  applyUrl: string

  /**
   * 公司官网(公司榜的卡片标题链);空串 = 没收录官网。
   */
  officialUrl: string

  /**
   * 公司行:在招岗数;null = 岗行不填这一格。
   */
  openJobs: number | null

  /**
   * 公司行:省提名清单命中岗数;null = 岗行不填这一格。
   */
  namedJobs: number | null

  /**
   * 公司行:平均移民价值分;null = 岗行不填这一格。
   */
  avgScore: number | null

  /**
   * 公司行:近两年 LMIA 获批职位数(#21 第 17 轮:第一排序键上榜可见);null = 没有记录。
   */
  lmiaPositions: number | null

  /**
   * 最近获批的季度标注;空串 = 没有记录。
   */
  lmiaQuarter: string
}

/**
 * 单元格渲染器的形状 —— 与 table 域列声明的 render 位逐字对齐
 * (一个参数收这一行,哑组件的签名天然就是它)。
 */
export type CellFn<T> = (r: T) => React.ReactNode

/**
 * 排序取值器的形状(null 恒沉底)。
 */
export type SortFn<T> = (r: T) => string | number | null

/**
 * 一列的声明 —— 本域自声明真正用到的六项(table 域那份还有 width/align/thTip 等,
 * 本域不用;结构相同即兼容,走样当场 tsc 红)。
 */
export type RankCol<T> = {
  /**
   * 列身份(排序态按它记)。
   */
  key: string

  /**
   * 表头文案。
   */
  label: React.ReactNode

  /**
   * 单元格渲染器。
   */
  render: CellFn<T>

  /**
   * 排序取值器;不给就是不可排序。
   */
  sort?: SortFn<T>

  /**
   * 单元格不换行。
   */
  nowrap?: boolean

  /**
   * 列级类(整列同一个视觉形态时用它,省掉一枚只为套色的单元格组件)。
   */
  className?: string
}

/**
 * 一个「有值就渲文本、没值就渲灰色横杠」的单元格数据。
 */
export type RankDashCell = {
  /**
   * 已经算好的文本;空串 = 本站没有这一项(渲灰色横杠)。
   */
  text: string

  /**
   * 有值时套的色档类;空串 = 不套类(用表格默认字色)。
   */
  cls: string
}

/**
 * DashText(域内小件:一个单元格的文本,或灰色横杠)的 props。
 */
export type DashTextIn = {
  /**
   * 已经算好的这一项。
   */
  v: RankDashCell
}

/**
 * 公司榜的一行展示行(桌面表格与手机卡片共用一份 —— 同一行数据长两个样是 #121 的老账)。
 */
export type RankCompanyCellRow = {
  /**
   * 行身份(名次在一张榜里唯一)。
   */
  key: string

  /**
   * 名次文本(表格首列)。
   */
  rankText: string

  /**
   * 带井号的名次(卡片标题行)。
   */
  rankMark: string

  /**
   * 名次的排序键。
   */
  rankSort: number

  /**
   * 公司名。
   */
  company: string

  /**
   * 公司名的排序键(小写 —— 全大写的公司名不该整批排到前面)。
   */
  companySort: string

  /**
   * 公司官网(卡片上公司名的去处);空串 = 没收录官网,卡上渲纯文字。
   * #199(Frank「多余的跳转都删掉」):**表格里**的公司名外链已撤,只剩卡片这一处。
   */
  officialUrl: string

  /**
   * 省名(卡片上那行小灰字);空串 = 跨省雇主,整行不渲。
   */
  province: string

  /**
   * 省格(表格):#48(第 18 轮)跨省雇主 province 为空,裸空像渲染缺陷 → 占位横杠。
   */
  prov: RankDashCell

  /**
   * 省的排序键;null = 没记省,恒沉底。
   */
  provSort: string | null

  /**
   * LMIA 获批职位数格(青绿粗体;没有记录时渲横杠)。
   */
  lmia: RankDashCell

  /**
   * 最近获批的季度(卡片上那条独立的键值);空串 = 没有记录,那一条不渲。
   */
  lmiaQuarter: string

  /**
   * 表格里挂在获批数下面的季度灰行;空串 = 不渲这一行。**表格比卡片多一条件**:
   * 获批数本身没有记录时,单挂一个季度读不出它在说什么(卡片有键名撑着,表格没有)。
   */
  lmiaSubText: string

  /**
   * LMIA 获批职位数的排序键;null = 没有记录,恒沉底。
   */
  lmiaSort: number | null

  /**
   * 省提名清单命中岗数文本。
   */
  namedText: string

  /**
   * 命中岗数的排序键;null = 没有记录。
   */
  namedSort: number | null

  /**
   * 命中岗数这一列出不出。第 2 轮 #7 核查:LMIA 强雇主与省提名清单命中长期不重叠
   * (全库 436 命中岗,30 强全 0)—— 整列 0 像坏数据,全零时藏列;哪天数据重叠了
   * 自动恢复,排序键不受影响(ETL 侧)。
   */
  showNamed: boolean

  /**
   * 在招岗数文本(表格);空串 = 岗行不填这一格,格子留空。
   */
  openText: string

  /**
   * 在招岗数文本(卡片);缺数时是横杠 —— 卡片上没有列名撑着,空格子读不出是「没有」。
   */
  cardOpenText: string

  /**
   * 在招岗数的排序键;null = 没有记录。
   */
  openSort: number | null

  /**
   * 平均移民价值分文本;缺数时是横杠。
   */
  avgText: string

  /**
   * 平均分的排序键;null = 没有记录。
   */
  avgSort: number | null

  /**
   * 「在职位板查看」的去处(职位板按这家公司名搜)。
   */
  goHref: string

  /**
   * 「在职位板查看」的链面文字。
   */
  goLabel: string

  /**
   * 卡片上 LMIA 那条的标签。
   */
  lmiaLabel: string

  /**
   * 卡片上季度那条的标签。
   */
  quarterLabel: string

  /**
   * 卡片上命中岗数那条的标签。
   */
  namedLabel: string

  /**
   * 卡片上在招岗数那条的标签。
   */
  openLabel: string

  /**
   * 卡片上平均分那条的标签。
   */
  avgLabel: string
}

/**
 * 职位榜的一行展示行(桌面表格与手机卡片共用一份)。
 */
export type RankJobCellRow = {
  /**
   * 行身份(名次在一张榜里唯一)。
   */
  key: string

  /**
   * 名次文本(表格首列)。
   */
  rankText: string

  /**
   * 带井号的名次(卡片右上角)。
   */
  rankMark: string

  /**
   * 名次的排序键。
   */
  rankSort: number

  /**
   * 职位名。
   */
  title: string

  /**
   * 职位名的排序键(小写)。
   */
  titleSort: string

  /**
   * 官方原帖(职位名的去处,新开页);空串 = 这一行渲纯文字。
   */
  applyUrl: string

  /**
   * 公司名;空串 = 帖面没写公司,卡上整格不渲。
   */
  company: string

  /**
   * 公司名的排序键(小写;洗行时算一次 —— 摆进比较器里就是 O(n log n) 次重复转换)。
   */
  companySort: string

  /**
   * 地点(城市与省,缺哪一段就少哪一段);空串 = 两段都没有。
   */
  where: string

  /**
   * 地点的排序键(按城市);null = 没记城市。
   */
  citySort: string | null

  /**
   * 薪资文本(表格);缺数时是横杠。
   */
  salaryText: string

  /**
   * 薪资文本(卡片);空串 = 帖面没写薪资,卡上那一格不渲。
   */
  cardSalary: string

  /**
   * 薪资的排序键(年化);null = 折不出年薪。
   */
  salarySort: number | null

  /**
   * 省提名通道格(#199 Frank「拆成两列」:PNP/EE 合并列拆成两列,与主表列名同源)。
   */
  pnp: RankDashCell

  /**
   * 联邦 EE 类别格。
   */
  ee: RankDashCell

  /**
   * 移民价值分文本;缺数时是横杠。
   * #199(Frank「这个通道没人知道什么意思」):这一列实为 0-100 移民价值分
   * (非 1-5 通道档),列名已 relabel 成「移民价值分」。
   */
  scoreText: string

  /**
   * 移民价值分的排序键;null = 没算过。
   */
  scoreSort: number | null

  /**
   * 发布日期(裁到十位);空串 = 库里没记。
   */
  dateText: string

  /**
   * 发布日期的排序键;null = 没记日期。
   */
  dateSort: string | null

  /**
   * 卡片页脚(「移民价值分 87」);空串 = 没算过分,页脚不渲。
   * #215(第 26 轮体检续):标签原用 col.score(=「通道」),值却是旧 0-100 分 ——
   * 名实不符,换回榜单口径名;裸数字没上下文 = #200 教训,所以带标签。
   */
  cardFooter: string
}

/**
 * 卡片上一处可点文本的数据(card 域 CardLink 的子集 —— 本域只用这三格)。
 */
export type RankCardLink = {
  /**
   * 显示文字。
   */
  text: string

  /**
   * 去处;不给 = 纯文本。
   */
  href?: string

  /**
   * 新开页目标;不给 = 同标签打开。
   */
  target?: string
}

/**
 * 职位卡各插槽已经算好的值(缺席 = 那一格不渲 —— card 域的插槽契约就是「不传就不出」)。
 */
export type RankJobCardParts = {
  /**
   * 职位名(直链官方原帖)。
   */
  title: RankCardLink

  /**
   * 公司名(纯文本);不给 = 帖面没写公司。
   */
  company?: RankCardLink

  /**
   * 薪资(右列);不给 = 帖面没写薪资。
   */
  salary?: string

  /**
   * 地点(左列);不给 = 两段都没有。
   */
  location?: string

  /**
   * 发布日期(右列);不给 = 库里没记。
   */
  date?: string

  /**
   * 页脚(带标签的移民价值分);不给 = 没算过分。
   */
  footer?: string
}

/**
 * 榜单导航里的一格(E9-02 分类榜矩阵)。
 */
export type RankTabRow = {
  /**
   * 这一格的榜 slug(也是行身份)。
   */
  slug: string

  /**
   * 榜名。
   */
  label: string

  /**
   * 这一榜的地址。
   */
  href: string

  /**
   * 是不是当前正看的这一榜。#210(第 26 轮):当前榜原来也是链到自己的 `<a>`
   * (点不动的链接,同 #205 页签)→ 当前榜渲成不可点的粗黑字。
   */
  current: boolean
}

/**
 * Ranking(榜单页正文)的 props。
 */
export type RankingIn = {
  /**
   * 当前榜的 slug(路由段;白名单 RANKING_SLUGS 在门里先验过)。
   */
  slug: string

  /**
   * 这一榜的全部行(名次序,服务端查好)。
   */
  items: RankRow[]

  /**
   * 当天有数据的榜 slug 清单;可省 —— 查不到的调用方不传这一项(体内默认空列)。
   */
  slugs?: string[]
}

/**
 * RankingTable(更新时间 + 口径注 + 榜单表)的 props。
 */
export type RankingTableIn = {
  /**
   * 当前榜的 slug(定口径注与表形)。
   */
  slug: string

  /**
   * 这一榜的全部行。
   */
  items: RankRow[]

  /**
   * 取词函数(壳与标题由宿主渲,所以译函数从宿主传进来)。
   */
  t: TFn
}

/**
 * 一块榜单表(公司榜 / 职位榜各一件)的 props。
 */
export type RankBoardIn = {
  /**
   * 这一榜的全部行(洗展示行在块里做)。
   */
  items: RankRow[]

  /**
   * 取词函数(列名与卡上的标签都要它)。
   */
  t: TFn
}

/**
 * RankCompanyCard(公司榜手机卡)的 props。
 */
export type RankCompanyCardIn = {
  /**
   * 这一行的展示行。
   */
  r: RankCompanyCellRow
}

/**
 * RankJobCard(职位榜手机卡)的 props。
 */
export type RankJobCardIn = {
  /**
   * 这一行的展示行。
   */
  r: RankJobCellRow
}

/**
 * RankTabs(榜单导航)的 props。
 */
export type RankTabsIn = {
  /**
   * 导航各格(已经算好榜名、地址与当前态)。
   */
  rows: RankTabRow[]
}

/**
 * RankTab(导航一格)的 props。
 */
export type RankTabIn = {
  /**
   * 这一格。
   */
  r: RankTabRow
}

/**
 * rankTitleOf 的入参:取词函数与榜 slug。
 */
export type RankTitleIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 榜 slug。
   */
  slug: string
}

/**
 * boardsOf 的入参:当前榜与当天有数据的榜。
 */
export type BoardsIn = {
  /**
   * 当前榜的 slug(它自己恒在导航里 —— 站着的这一榜不许从导航消失)。
   */
  slug: string

  /**
   * 当天有数据的榜 slug 清单。
   */
  slugs: string[]
}

/**
 * toRankTabRows 的入参:导航要列的榜、当前榜与取词函数。
 */
export type TabRowsIn = {
  /**
   * 导航要列的榜 slug 清单(boardsOf 算好的)。
   */
  boards: string[]

  /**
   * 当前榜的 slug。
   */
  slug: string

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * updatedTextOf 的入参:取词函数与本榜的行。
 */
export type UpdatedIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 本榜的全部行(取里面最新的发布日)。
   */
  items: RankRow[]
}

/**
 * noteTextOf 的入参:取词函数与榜 slug。
 */
export type NoteIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 榜 slug。
   */
  slug: string
}

/**
 * 洗一整页展示行的入参。
 */
export type CellRowsIn = {
  /**
   * 本榜的全部行。
   */
  items: RankRow[]

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * 洗一整页公司榜展示行的入参。
 */
export type CompanyCellRowsIn = {
  /**
   * 本榜的全部行。
   */
  items: RankRow[]

  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 命中岗数这一列出不出(整页一个口径,列组与展示行共用同一个判定)。
   */
  showNamed: boolean
}

/**
 * 洗一行公司榜展示行的入参。
 */
export type CompanyCellRowIn = {
  /**
   * 这一行事实。
   */
  r: RankRow

  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 命中岗数这一列出不出(整页一个口径,洗行前算好)。
   */
  showNamed: boolean
}

/**
 * 洗一行职位榜展示行的入参。
 */
export type JobCellRowIn = {
  /**
   * 这一行事实。
   */
  r: RankRow

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * 列组构造器的入参。
 */
export type ColsIn = {
  /**
   * 取词函数(列名)。
   */
  t: TFn
}

/**
 * 公司榜列组构造器的入参。
 */
export type CompanyColsIn = {
  /**
   * 取词函数(列名)。
   */
  t: TFn

  /**
   * 命中岗数这一列出不出。
   */
  showNamed: boolean
}

/**
 * 榜单页 SEO 主体的入参。2026-08-29 形制批从「Next 定死的 generateMetadata 形状
 * (一个带 `params: Promise<…>` 的对象)」改回本域一参形 —— 框架的线形状不该压进桶的签名,
 * 拆 promise 那一步留在页面门里(门里 `export async function generateMetadata` 收框架参数,
 * await 完只递一个 slug 进来)。随之退役的 RankingParams 只有这一个消费者,同批删除。
 */
export type RankingMetaIn = {
  /**
   * 榜 slug。
   */
  slug: string
}

/**
 * 榜单页交给 Next 的 SEO 主体。缺席 = 不发这个键(线格式语义:整页回落 layout 那份),
 * 与「发一个空标题」是两件事 —— 白名单外的 slug 走的正是这条路。
 */
export type RankingMeta = {
  /**
   * 页标题;不给 = 回落 layout 的站名。
   */
  title?: string

  /**
   * 页描述;不给 = 回落 layout 那份。
   */
  description?: string
}
