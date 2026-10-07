/**
 * quiz 域的自足形状:三问答案与落档报文、职业行与热门榜行、答题壳各件的 props 契约、
 * 两台状态机器交出的面板,以及函数与手柄工厂的入参。
 * 形状**由本域自己声明**(宪法 08-25「types 自声明」):界面语言、取词函数、三语表
 * 各抄一份 —— 结构相同即兼容,走样当场 tsc 红。
 * 2026-08-28 换装批自 EntryQuiz.tsx(本文件的前身,git mv 保历史)与三个 tsx 的
 * 内联 props 收拢而来。
 * 2026-10-05 访客第 3 题改左右两栏(Frank「也改成左右 两部分吗?」「改啊」):多大号档两栏的几样(OccRailIn / OccLinesIn /
 * 左栏项与切换手柄 / railBusyOf 入参),借 profile 桶已选标签件的几样与大号胶囊、胶囊排的 props 撤(见各处原位的指路注)。
 *
 * @author Frank
 * @time 2026-08-28 04:10:00
 */

/**
 * 界面语言(三字面量各域自抄)。
 */
export type QuizLang = 'zh' | 'en' | 'ko'

/**
 * 题面/选项的三语文本 —— 形状跟着**字段库**走(lib/quiz/fields 的 L),
 * 这里只负责按当前语言取。2026-08-17:先前 QuizUI 另抄了一份一模一样的 type L,
 * 两份定义各活各的,是真重复;2026-08-28 依「types 自声明」在本域落一份自足的。
 */
export type L = Record<QuizLang, string>

/**
 * 界面语取词函数(与 lib/i18n 的 TFn 同形:键 + 可选插值 —— 真参数是 lib/i18n
 * 那个带附加成员的交叉类型,结构上兜得住)。
 */
export type TFn = (key: string, vars?: Record<string, string | number>) => string

/**
 * 三问的答案(处境 / 职业 / 目标省)。
 */
export type QuizAnswers = {
  /**
   * 当前处境档(境内/境外/学签…;档位值由字段库定)。
   */
  status: string

  /**
   * 选中的 NOC 五位码。
   */
  nocs: string[]

  /**
   * 目标省的两位省码;「还不确定」时是空列。
   */
  provs: string[]
}

/**
 * readQuiz 的返回:三问答案 + 收卷标记;从没答过给 null(职位板据此决定弹不弹)。
 */
export type QuizAnswersRead = QuizAnswers & {
  /**
   * 收过卷没有;没收过时**整格缺席**(语义与旧版逐字一致 —— 只在收过卷时挂这一格)。
   */
  done?: boolean
}

/**
 * 一个职业的事实卡(职位板落档面用;通道命中与分省在招由服务端算好)。
 */
export type QuizFacts = {
  /**
   * NOC 五位码。
   */
  noc: string

  /**
   * TEER 档;未分类给 null。
   */
  teer: number | null

  /**
   * 官方英文职业名。
   */
  title: string

  /**
   * 中文译名。
   */
  titleZh: string

  /**
   * 全国在招数。
   */
  open: number

  /**
   * 其中打了 pnpEligible 的条数。
   */
  eligible: number

  /**
   * 其中来自指定雇主的条数。
   */
  named: number

  /**
   * 命中的通道与条数。
   */
  streams: QuizStreamCount[]

  /**
   * 分省在招与其中可走 PNP 的条数。
   */
  byProv: QuizProvCount[]

  /**
   * 工资中位数;官方没这一档就 null(折 0 = 替官方编数)。
   */
  medianSalary: number | null
}

/**
 * 通道命中一行。
 */
export type QuizStreamCount = {
  /**
   * 通道名。
   */
  stream: string

  /**
   * 命中条数。
   */
  n: number
}

/**
 * 分省在招一行。
 */
export type QuizProvCount = {
  /**
   * 两位省码。
   */
  province: string

  /**
   * 该省在招数。
   */
  n: number

  /**
   * 其中可走 PNP 的条数。
   */
  eligible: number
}

/**
 * `/api/users/me` 的报文(归一前形状:整段可能没有,格也可能缺)。
 */
export type MeJson = {
  /**
   * 当前用户;没登录时缺席。
   */
  user?: MeUser
}

/**
 * `/api/users/me` 报文里的用户格(归一前形状)。
 */
export type MeUser = {
  /**
   * 用户 id;拿不到就不落档。
   */
  id?: string

  /**
   * 既有档案;从没建过档时缺席。
   */
  profile?: ProfileJson
}

/**
 * 既有档案里三问会覆盖到的那几格(归一前形状 —— 旧存档里这些键可能压根不存在)。
 * ⚠️ 只声明本页真读的那几格:其余字段(语言分/CRS/PGWP…)原样带回,
 * 由 Object.assign 透传 —— #107 同类保险丝,三问没问的一律不能被整组 PATCH 抹掉。
 */
export type ProfileJson = {
  /**
   * 当前处境档。
   */
  currentStatus?: string

  /**
   * 已存的 NOC 码。
   */
  nocCodes?: string[]

  /**
   * 已存的目标省码。
   */
  targetProvinces?: string[]

  /**
   * 已存的 CLB 语言档。
   */
  clb?: number

  /**
   * 已存的加拿大经验月数。
   */
  expCanadaMonths?: number

  /**
   * 已存的海外经验月数。
   */
  expForeignMonths?: number

  /**
   * 已存的「有没有 offer」。
   */
  hasOffer?: boolean

  /**
   * 已存的「有没有加拿大学历」。
   */
  canadaStudy?: boolean
}

/**
 * 三问要落进档案的那一组格(与既有档案合并后整组 PATCH 上去)。
 */
export type ProfilePatch = {
  /**
   * 当前处境档;三问与旧档都没有就 null。
   */
  currentStatus: string | null

  /**
   * NOC 码组(这次没选就保留旧值)。
   */
  nocCodes: string[]

  /**
   * 目标省码组(这次没选就保留旧值)。
   */
  targetProvinces: string[]

  /**
   * CLB 语言档;没答过就 null。
   */
  clb: number | null

  /**
   * 加拿大经验月数;没答过就 null。
   */
  expCanadaMonths: number | null

  /**
   * 官方口径的海外经验 = 总经验 − 加拿大经验(两个都答了才算得出,否则留旧值)。
   */
  expForeignMonths: number | null

  /**
   * 有没有 offer;没答过就 null。
   */
  hasOffer: boolean | null

  /**
   * 有没有加拿大学历;没答过就 null。
   */
  canadaStudy: boolean | null

  /**
   * 这次落档的时刻(ISO 串)。
   */
  profileUpdatedAt: string
}

/**
 * `keepNum` / `keepBool` 的入参:这次算出来的值与旧档里的值。
 */
export type KeepNumIn = {
  /**
   * 这次由字段库算出来的值;没答就不是数字。
   */
  now: number | string | boolean | string[] | undefined

  /**
   * 旧档里的值;从没答过就缺席。
   */
  prev: number | undefined
}

/**
 * `keepBool` 的入参:这次算出来的值与旧档里的值。
 */
export type KeepBoolIn = {
  /**
   * 这次由字段库算出来的值;没答就不是布尔。
   */
  now: number | string | boolean | string[] | undefined

  /**
   * 旧档里的值;从没答过就缺席。
   */
  prev: boolean | undefined
}

/**
 * `foreignMonthsOf` 的入参:两段经验与旧值。
 */
export type ForeignMonthsIn = {
  /**
   * 总经验月数;没答就 null。
   */
  total: number | null

  /**
   * 加拿大经验月数;没答就 null。
   */
  canada: number | null

  /**
   * 旧档里的海外经验月数;从没答过就缺席。
   */
  prev: number | undefined
}

/**
 * `firstTextOf` 的入参:优先取的新值与两级兜底。
 */
export type FirstTextIn = {
  /**
   * 这次答的值;空串 = 没答。
   */
  now: string

  /**
   * 旧档里的值;缺席或空串都算没有。
   */
  prev: string | undefined
}

/**
 * `firstListOf` 的入参:这次选的清单与旧档清单。
 */
export type FirstListIn = {
  /**
   * 这次选的;空列 = 没选。
   */
  now: string[]

  /**
   * 旧档里的;缺席算空列。
   */
  prev: string[] | undefined
}

/**
 * `shortOcc` 的返回与入参都是裸串(全站唯一一处按名字砍尾的显示层刀口),
 * 这里给它的入参起个形状名,签名里不出现裸 string 之外的东西。
 */
export type OccNameIn = string

/**
 * 一个职业候选(搜索结果与热门榜共用的名字面;三语短名由 ETL 04g 产)。
 */
export type Cand = {
  /**
   * NOC 五位码。
   */
  noc: string

  /**
   * 官方英文名(一个字都不动)。
   */
  title: string

  /**
   * 完整中文译名。
   */
  titleZh: string

  /**
   * 中文短名;库里没压出来时缺席。
   */
  titleZhShort?: string

  /**
   * 韩文短名;库里没压出来时缺席。
   */
  titleKoShort?: string

  /**
   * 英文短名;库里没压出来时缺席。
   */
  titleEnShort?: string
}

/**
 * 热门榜/分类清单的一行 = 候选 + 在招数(+ 所属大分类)。
 */
export type Top = Cand & {
  /**
   * 该职业当前在招数。
   */
  open: number

  /**
   * 所属大分类 slug;按热门取时接口不带这一格。
   */
  broad?: string
}

/**
 * NOC 码 → 显示名的表(已选胶囊回显靠它;冷门职业由逐码查询补上)。
 */
export type TitleMap = Record<string, string>

/**
 * 大分类 slug → 该类职业清单的表(点中某类才按需查一次)。
 */
export type CatalogMap = Record<string, Top[]>

/**
 * 显示名 → 出现次数的表(判「同名不同码」)。
 */
export type DupMap = Map<string, number>

/**
 * NOC 码 → 所在职业的组键(2026-10-05 立):职业 = 中文短名相同的一组码,键就是中文短名(数据层 etl/noc 的 OCC_MERGE
 * 把 21230 / 21231 / 21232 写成同一个「软件开发」;职位板与查询层按同一列归组)。值为空串 = 查过、库里没压出短名
 * (这个码自成一组,不再回查)。
 */
export type KeyMap = Record<string, string>

/**
 * 这一屏摆出来的一个职业 = 组键相同的那几行(2026-10-05 Frank「这个职位 怎么还有 小字 英文呢」:同组的三个码原先
 * 一码一颗胶囊、三颗同名再各挂官方英文名区分,改成一颗)。
 */
export type OccItem<T extends Cand> = {
  /**
   * 组键(见 KeyMap;没有短名的码,键是码自己)。
   */
  key: string

  /**
   * 代表行 = 组里排最前的那一行(热门 / 分类那一屏按在招量排过 = 在招最多的码,与职位板代表码同一口径):
   * 显示名、重名小注、五位码小注都取它。
   */
  head: T

  /**
   * 组里的全部行(代表行在首)。
   */
  rows: T[]
}

/**
 * 已选的一个职业 = 已选码里组键相同的那几个码(2026-10-05 立;底部汇总、大号档标签与「已选 N 个」都按它数,同组只算一个)。
 */
export type OccGroup = {
  /**
   * 组键(见 KeyMap)。
   */
  key: string

  /**
   * 代表码 = 组里最先选上的码(汇总胶囊、标签按它取名)。
   */
  head: string

  /**
   * 组里已选的全部码(代表码在首)。
   */
  nocs: string[]
}

/**
 * 组键表的 updater。
 */
export type KeysUpdateFn = (m: KeyMap) => KeyMap

/**
 * 组键表的落格(收 updater)。
 */
export type SetKeysFn = (f: KeysUpdateFn) => void

/**
 * 无参无返的点击手柄。
 */
export type ClickFn = () => void

/**
 * 搜索框的改值手柄。
 */
export type SearchFn = (v: string) => void

/**
 * 逐项点击手柄的工厂(给它一个职业,换一只只管这个职业的手柄)。
 */
export type PickOfFn = (i: PickItemIn) => ClickFn

/**
 * 逐分类点击手柄的工厂(给它一个分类 slug,换一只只管切到那类的手柄)。
 */
export type CatPickOfFn = (slug: string) => ClickFn

/**
 * 逐省点击手柄的工厂。
 */
export type ProvPickOfFn = (code: string) => ClickFn

/**
 * 下拉框的改值手柄(平台定死的签名:收原生事件)。
 */
export type SelectChangeFn = (e: React.ChangeEvent<HTMLSelectElement>) => void

/**
 * 勾选框的改值手柄(平台定死的签名:收原生事件)。
 */
export type CheckChangeFn = (e: React.ChangeEvent<HTMLInputElement>) => void

/**
 * 单选框的改值手柄(平台定死的签名:受控 radio 的 onChange 不读事件)。
 */
export type RadioChangeFn = () => void

/**
 * 拦住冒泡的点击手柄(平台定死的签名:收原生事件)。
 */
export type MouseStopFn = (e: React.MouseEvent) => void

/**
 * OccCandPill(搜索结果里的一颗胶囊)的 props。
 */
export type OccCandPillIn = {
  /**
   * NOC 五位码(右边那格灰字小注)。
   */
  noc: string

  /**
   * 显示名(渲染时再砍尾)。
   */
  label: string

  /**
   * 选中没有。
   */
  on: boolean

  /**
   * 点击手柄。
   */
  onPick: ClickFn
}

/**
 * OccTopPill(热门/分类那一屏的一颗胶囊)的 props。
 */
export type OccTopPillIn = {
  /**
   * 显示名(渲染时再砍尾;同时挂 title 给全名)。
   */
  label: string

  /**
   * 重名时的官方英文名;不重名给空串(那一格不渲)。
   */
  hint: string

  /**
   * 「N 在招」那一格;没在招给空串(那一格不渲)。
   */
  openText: string

  /**
   * 选中没有。
   */
  on: boolean

  /**
   * 点击手柄。
   */
  onPick: ClickFn
}

/**
 * OccChip(已选汇总里的一颗胶囊)的 props。
 */
export type OccChipIn = {
  /**
   * 已砍尾的显示名;空串 = 名字还没拉到(出占位条)。
   */
  name: string

  /**
   * 点击手柄(点一下取消选中)。
   */
  onPick: ClickFn
}

/**
 * QuizTitle(题干)的 props。
 */
export type QuizTitleIn = {
  /**
   * 题干文字。
   */
  children: React.ReactNode
}

/**
 * QuizSub(题干下的一句小注)的 props。
 */
export type QuizSubIn = {
  /**
   * 小注文字。
   */
  children: React.ReactNode
}

/**
 * QuizProgress(进度条)的 props。
 */
export type QuizProgressIn = {
  /**
   * 当前界面语言。
   */
  lang: QuizLang

  /**
   * 已填几项。
   */
  done: number

  /**
   * 一共几项(选工作是决定线第 1 步,也算一项)。
   */
  total: number
}

/**
 * QuizNav(每一题的动作条)的 props。
 */
export type QuizNavIn = {
  /**
   * 「上一题」钮上的字。
   */
  prevLabel: string

  /**
   * 「下一题」钮上的字。
   */
  nextLabel: string

  /**
   * 回上一题;不传 = 这是整卷第一题,没有上一题。
   */
  onPrev?: () => void

  /**
   * 去下一题。
   */
  onNext: () => void

  /**
   * 「下一题」置灰(没答完就走不了)。
   */
  nextDisabled?: boolean

  /**
   * 两颗按钮之间那句灰字;不传就空着(那一格仍占位)。
   */
  hint?: React.ReactNode

  /**
   * 旁路收卷钮的字,摆在「下一题」旁边(2026-08-13 Frank:「有的时候只是改一个答案」——
   * 改完不该被逼着把答过的题再翻一遍)。调用方只在**全卷已答满**时传:没答满就收卷,结果出不来。
   */
  doneLabel?: string

  /**
   * 旁路收卷。
   */
  onDone?: () => void
}

/**
 * 一道多选题的一个条目。
 */
export type QuizCheckItem = {
  /**
   * 条目标识(也是 React key)。
   */
  key: string

  /**
   * 条目文字。
   */
  text: string

  /**
   * 该条的分值;官方表没给分的条目不带这一格,明确无分的给 null。
   */
  pts?: number | null

  /**
   * 勾没勾上。
   */
  on: boolean

  /**
   * 勾选落格。
   */
  toggle: (v: boolean) => void
}

/**
 * QuizCheckRow(一道多选题的一张选项卡片)的 props。与 QuizCheckItem 同集,
 * 但**不带 key** —— `key` 是 React 的保留属性,同名的自家 props 会和它撞车。
 */
export type QuizCheckRowIn = {
  /**
   * 条目文字。
   */
  text: string

  /**
   * 该条的分值;官方表没给分的条目不带这一格,明确无分的给 null。
   */
  pts?: number | null

  /**
   * 勾没勾上。
   */
  on: boolean

  /**
   * 勾选落格。
   */
  toggle: (v: boolean) => void
}

/**
 * QuizChoiceRow(一道单选题的一张选项卡片)的 props。
 */
export type QuizChoiceRowIn = {
  /**
   * 同组 radio 的 name。
   */
  name: string

  /**
   * 选中没有。
   */
  on: boolean

  /**
   * 左侧字母徽标上的字(A/B/C/D…)。
   */
  alpha: string

  /**
   * 选项文字(三语表或已取好的字)。
   */
  text: L | string

  /**
   * 当前界面语言。
   */
  lang: QuizLang

  /**
   * 选中落格。
   */
  onPick: RadioChangeFn
}

/**
 * QuizChecks(一道多选题的选项组)的 props。
 */
export type QuizChecksIn = {
  /**
   * 全部条目。
   */
  items: QuizCheckItem[]
}

/**
 * 一道单选题的一个选项。
 */
export type QuizChoice<T extends string | number> = {
  /**
   * 选项存进答案的值。
   */
  value: T

  /**
   * 选项文字(三语表或已取好的字)。
   */
  text: L | string
}

/**
 * QuizChoices(一道单选题的选项组)的 props。
 */
export type QuizChoicesIn<T extends string | number> = {
  /**
   * 同组 radio 的 name(方向键切换靠它成组)。
   */
  name: string

  /**
   * 全部选项。
   */
  choices: QuizChoice<T>[]

  /**
   * 当前选中的值;没答过就缺席(受控 radio,选中不自动跳)。
   */
  value: T | undefined

  /**
   * 选中落格。
   */
  onPick: (v: T) => void

  /**
   * 当前界面语言(选项文字是三语表时按它取)。
   */
  lang: QuizLang
}

/**
 * OccPicker(选职业)的 props。
 */
export type OccPickerIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语言码(宽字符串:非 zh/ko 一律按英文,与 lib/noc 的 pickName 同口径)。
   */
  lang: string

  /**
   * 进来时已选的 NOC 码。
   */
  initial: string[]

  /**
   * 服务端已取好的热门榜(ETL 聚合表 noc_openings 直出)。给了它就**一次成型**:
   * 首帧即终态,不再「内置 14 个 → 补数字 → 换真榜」刷三次,骨架也用不上。
   * (2026-08-12 Frank「现在是一点一点刷出来,不能一次性刷出来吗」)
   */
  initialTop?: Top[]

  /**
   * 点「下一题」交出当前选择。
   */
  onDone: (nocs: string[]) => void

  /**
   * 选中即回传(2026-08-01 Frank「不能同时显示出来吗」):合并成一屏后,
   * 选职业不再是独立一步 —— 自己的动作按钮收起(hideDone),整卷底部只留一个「出报告」。
   */
  onChange?: (nocs: string[]) => void

  /**
   * 关闭弹层(只有弹层形态给)。
   */
  onClose?: () => void

  /**
   * 不套弹层,直接铺在答题卡里(2026-07-31 Frank「选职业和其他问题都放到一个方式,
   * 不要只有职业是弹框」)—— 职业是第一题,就该和别的题长一个样,而不是另开一层。
   */
  inline?: boolean

  /**
   * 铺在答题卡里时「下一题」钮上的字;不传就用默认那句。
   */
  doneLabel?: string

  /**
   * 收起自己那块「已选 N 个」汇总(整卷底部只留一个出口时用)。
   */
  hideDone?: boolean

  /**
   * 旁路收卷钮的字(2026-08-16 Frank「这两个右下角都需要一个完成按钮」);
   * 选择经 onChange 已实时落档。
   */
  finishLabel?: string

  /**
   * 旁路收卷。
   */
  onFinish?: () => void

  /**
   * 专业的 CIP 2021 class 码(52.0203;2026-10-04 A2,访客第 3 题):给了就把热门那一屏换成该专业对应大类下
   * 在招最多的职业(/api/quiz?major=),没给(或空串)照旧取全站热门榜(?top=24)。
   */
  majorCode?: string

  /**
   * 大号档(2026-10-04 A2,访客第 3 题):胶囊换 chip 桶的大号胶囊、已选标签挪到最上面(借 profile 桶 OnboardingTags,
   * 只回显这一屏胶囊外的码)、不出分类导航 / 底部汇总 / 动作条(钮区归宿主)。搜索、多选照旧。
   * 2026-10-05 Frank「也改成左右 两部分吗?」「改啊」:改成与第 2 题专业选择器同一副左右两栏(OccRail)—— 搜索框 → 已选一行
   * (全部已选职业,tag 桶 TagRow)→ 没在搜时左栏「推荐」+ 全站大类、右边一列职业行,在搜时单列命中;上面「大号胶囊」
   * 「已选标签挪到最上面」「只回显这一屏胶囊外的码」三处作废。不出分类导航 / 底部汇总 / 动作条、搜索与多选照旧。
   */
  lg?: boolean
}

/**
 * ProvPill(目标省的一颗药丸)的 props。
 */
export type ProvPillIn = {
  /**
   * 药丸上的字(省全名或「还不确定」)。
   */
  label: string

  /**
   * 选中没有。
   */
  on: boolean

  /**
   * 点击手柄。
   */
  onPick: ClickFn
}

/**
 * ProvincePicker(选目标省)的 props。
 */
export type ProvincePickerIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 进来时已选的省码。
   */
  initial: string[]

  /**
   * 选择变化即回传(实时落档)。
   */
  onChange?: (provinces: string[]) => void

  /**
   * 点「下一题」交出当前选择与「还不确定」态。
   */
  onDone: (provinces: string[], unsure?: boolean) => void

  /**
   * 回上一题;不传 = 没有上一题。
   */
  onBack?: () => void

  /**
   * 进来时是不是「还不确定」。
   */
  unsure?: boolean

  /**
   * 旁路收卷钮的字(2026-08-16 Frank「这两个右下角都需要一个完成按钮」)——与基础题那颗同源:
   * 改一个答案不用把答过的题再翻一遍。
   */
  finishLabel?: string

  /**
   * 旁路收卷。**当前选择随参数交出去**,由调用方落档后收卷。
   */
  onFinish?: (provinces: string[], unsure?: boolean) => void
}

/**
 * OccHead(弹层形态的标题行)的 props。
 */
export type OccHeadIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 关闭弹层。
   */
  onClose?: () => void
}

/**
 * OccResults(搜索结果区)的 props。
 */
export type OccResultsIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语言码。
   */
  lang: string

  /**
   * 搜索在途中。
   */
  searching: boolean

  /**
   * 命中的职业(2026-10-05 起同组的几个候选合成一个,计数行按它数)。
   */
  hits: OccItem<Cand>[]

  /**
   * 已选的职业(判胶囊亮不亮:同组任一个码选着就亮;2026-10-05 自已选码改)。
   */
  picked: OccGroup[]

  /**
   * 逐候选的点击手柄工厂(选中即清空搜索框)。
   * (原在下面的 lg 格 —— 大号档命中换 chip 桶大号胶囊 —— 2026-10-05 撤:大号档改走 OccRail 的单列命中,本件只剩常规档。)
   */
  pickOf: PickOfFn
}

/**
 * OccCats(分类下拉与页签)的 props。
 */
export type OccCatsIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 当前分类 slug;空串 = 热门。
   */
  cat: string

  /**
   * 全部大分类 slug。
   */
  cats: string[]

  /**
   * 手机端下拉的改值手柄。
   */
  onSelect: SelectChangeFn

  /**
   * 逐页签的点击手柄工厂。
   */
  pickOf: CatPickOfFn
}

/**
 * OccList(职业胶囊排)的 props。
 */
export type OccListIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语言码。
   */
  lang: string

  /**
   * 当前分类 slug;空串 = 热门(热门才补占位骨架)。
   */
  cat: string

  /**
   * 分类清单在途中(整排换骨架)。
   */
  catLoading: boolean

  /**
   * 真实热门榜到没到(没到就用骨架把格子占满)。
   */
  topLoaded: boolean

  /**
   * 这一屏要摆的职业(2026-10-05 起同组的几个码合成一个)。
   */
  list: OccItem<Top>[]

  /**
   * 已选的职业(判胶囊亮不亮:同组任一个码选着就亮;2026-10-05 自已选码改)。
   */
  picked: OccGroup[]

  /**
   * 显示名 → 出现次数(判要不要挂官方名区分)。
   */
  dupCount: DupMap

  /**
   * 逐职业的点击手柄工厂。
   * (原在下面的 lg 格 —— 大号档胶囊换 chip 桶大号胶囊、骨架换大号占位 —— 2026-10-05 撤:大号档改走 OccRail 的两栏,本件只剩常规档。)
   */
  pickOf: PickOfFn
}

/**
 * OccSelected(底部「已选 N 个」汇总)的 props。
 */
export type OccSelectedIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 已选的职业(同组的几个码一颗胶囊、算一个;2026-10-05 自已选码改)。
   */
  picked: OccGroup[]

  /**
   * NOC 码 → 显示名(名字还没拉到就出占位条)。
   */
  titles: TitleMap

  /**
   * 逐胶囊的点击手柄工厂(点一下取消选中)。
   */
  pickOf: PickOfFn
}

/**
 * OccActions(控件底部的动作条)的 props。
 */
export type OccActionsIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 铺在答题卡里(走答题壳同一条动作条)还是弹层形态(通栏钮)。
   */
  inline?: boolean

  /**
   * 已选的职业(钮上「已选 N 个」按它数,同组只算一个;2026-10-05 自已选码改)。
   */
  picked: OccGroup[]

  /**
   * 「下一题」钮上的字;不传就用默认那句。
   */
  doneLabel?: string

  /**
   * 旁路收卷钮的字。
   */
  finishLabel?: string

  /**
   * 点「下一题」。
   */
  onNext: ClickFn

  /**
   * 旁路收卷。
   */
  onFinish?: () => void
}

/**
 * OccModal(弹层外壳)的 props。
 */
export type OccModalIn = {
  /**
   * 点遮罩关闭。
   */
  onClose?: () => void

  /**
   * 弹层里的内容。
   */
  children: React.ReactNode
}

/**
 * OccBody(控件正文:搜索 + 分类 + 胶囊 + 汇总 + 动作条)的 props。
 */
export type OccBodyIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语言码。
   */
  lang: string

  /**
   * 选职业整机(状态与手柄)。
   */
  d: OccPanel

  /**
   * 铺在答题卡里还是弹层形态。
   */
  inline?: boolean

  /**
   * 收起底部汇总。
   */
  hideDone?: boolean

  /**
   * 「下一题」钮上的字。
   */
  doneLabel?: string

  /**
   * 旁路收卷钮的字。
   */
  finishLabel?: string

  /**
   * 关闭弹层。
   */
  onClose?: () => void

  /**
   * 旁路收卷。
   */
  onFinish?: () => void

  /**
   * 大号档(见 OccPickerIn.lg;2026-10-05 起给真就整个交给 OccRail 摆)。
   */
  lg: boolean
}

/**
 * useOccPicker 的入参。
 */
export type OccPickerHookIn = {
  /**
   * 取词函数(内置常用清单的名字要现取)。
   */
  t: TFn

  /**
   * 界面语言码。
   */
  lang: string

  /**
   * 进来时已选的 NOC 码。
   */
  initial: string[]

  /**
   * 服务端已取好的热门榜;给了它就一个请求都不发。
   */
  initialTop?: Top[]

  /**
   * 选择变化即回传。
   */
  onChange?: (nocs: string[]) => void

  /**
   * 点「下一题」交出当前选择。
   */
  onDone: (nocs: string[]) => void

  /**
   * 专业的 CIP class 码;空串 = 没给(热门那一屏取全站热门榜)。
   */
  majorCode: string
}

/**
 * useOccPicker 交出的面板。
 */
export type OccPanel = {
  /**
   * 已选的职业(已选码按组键收拢:同组的几个码算一个;2026-10-05 自已选码改 —— 码本身照旧整份回传给宿主)。
   */
  picked: OccGroup[]

  /**
   * NOC 码 → 显示名。
   */
  titles: TitleMap

  /**
   * 搜索框现值。
   */
  q: string

  /**
   * 在搜(搜索框去空白后够 QUERY_MIN 个字:正文换成命中那一屏;2026-10-05 立 —— 原常规档 OccBody 与大号档 OccRail 各写一遍,
   * 判定收回整机一处,同 majors 桶整机的 searchOn;搜索在途工作者按同一个判定发不发请求)。
   */
  searchOn: boolean

  /**
   * 搜索命中的职业(同组的几个候选合成一个;2026-10-05 自命中候选改)。
   */
  hits: OccItem<Cand>[]

  /**
   * 搜索在途中。
   */
  searching: boolean

  /**
   * 当前分类 slug;空串 = 热门。
   */
  cat: string

  /**
   * 全部大分类 slug。
   */
  cats: string[]

  /**
   * 这一屏要摆的职业(热门按在招量降序取前 24,分类页由接口排好)。
   * 2026-10-05:同组的几个码合成一个职业,在招数加总后照它重排(见 occListOf)。
   */
  list: OccItem<Top>[]

  /**
   * 分类清单在途中。
   */
  catLoading: boolean

  /**
   * 真实热门榜到没到。
   */
  topLoaded: boolean

  /**
   * 按专业取的热门还在路上(给了专业码、榜没到):胶囊整排是占位,大号档的已选标签这一拍不渲。2026-10-04 A2 收口。
   * 2026-10-05 大号档改左右两栏(「也改成左右 两部分吗?」「改啊」):停在「推荐」时右边那块摆「加载中」;已选一行改成全部已选都摆,
   * 不再这一拍不渲(先前不渲是因为「胶囊外才挂」要等这一屏到了才判得出,全部都摆就没有这一跳)。
   */
  hold: boolean

  /**
   * 显示名 → 出现次数。
   */
  dupCount: DupMap

  /**
   * 搜索框的改值手柄。
   */
  onSearch: SearchFn

  /**
   * 逐候选的点击手柄工厂(选中即清空搜索框与候选)。
   */
  candPickOf: PickOfFn

  /**
   * 逐职业/逐已选胶囊的点击手柄工厂。
   */
  pickOf: PickOfFn

  /**
   * 逐分类页签的点击手柄工厂。
   */
  catPickOf: CatPickOfFn

  /**
   * 手机端分类下拉的改值手柄。
   */
  onCatSelect: SelectChangeFn

  /**
   * 大号档左栏的切换手柄(点「推荐」回热门那一屏、点大类记它的 slug;2026-10-05「改啊」)。
   * (原在下面的 setNocs —— 整份拨已选码 —— 与 named —— 名字表摊成「码 + 名」—— 同日撤:两格只给借来的 profile 桶已选标签件用,
   * 已选一行改由本桶 OccTags 自己摆,× 走 pickOf。)
   */
  onRail: RailPickFn

  /**
   * 右边这一屏的职业是不是全选着(大号档大类那一屏首行「全选」的勾;空清单 = false)。
   * 2026-10-05 Frank「有可能这个大类下 我想全选」立。
   */
  allOn: boolean

  /**
   * 点「全选」:这一屏没全选着 = 把没选的整组都选上;全选着 = 这一屏的职业全部撤掉。2026-10-05 立。
   */
  onAll: ClickFn

  /**
   * 点「下一题」。
   */
  onNext: ClickFn
}

/**
 * useProvincePicker 的入参。
 */
export type ProvPickerHookIn = {
  /**
   * 进来时已选的省码。
   */
  initial: string[]

  /**
   * 进来时是不是「还不确定」。
   */
  unsure?: boolean

  /**
   * 选择变化即回传。
   */
  onChange?: (provinces: string[]) => void

  /**
   * 点「下一题」交出当前选择。
   */
  onDone: (provinces: string[], unsure?: boolean) => void

  /**
   * 旁路收卷。
   */
  onFinish?: (provinces: string[], unsure?: boolean) => void
}

/**
 * useProvincePicker 交出的面板。
 */
export type ProvPanel = {
  /**
   * 已选的省码。
   */
  selected: string[]

  /**
   * 是不是「还不确定」。
   */
  anyProv: boolean

  /**
   * 逐省药丸的点击手柄工厂。
   */
  pickOf: ProvPickOfFn

  /**
   * 「还不确定」药丸的点击手柄。
   */
  onAny: ClickFn

  /**
   * 点「下一题」。
   */
  onNext: ClickFn

  /**
   * 旁路收卷;调用方没给 onFinish 时缺席(那颗钮就不出)。
   */
  onFinish?: ClickFn
}

/**
 * makeSearch 的入参(原 OccPicker 体内 onSearch 闭包的两个 setter)。
 */
export type SearchIn = {
  /**
   * 搜索词 setter。
   */
  setQ: (v: string) => void

  /**
   * 候选清单 setter。这里只拿来清空,故入参窄成空数组 ——
   * 本函数不读候选的任何一格,不必替它声明形状。
   */
  setCands: (empty: []) => void
}

/**
 * 逐项手柄工厂交出的手柄要认的那个职业。
 */
export type PickItemIn = {
  /**
   * 这个职业的组键(见 KeyMap;2026-10-05 起一颗胶囊是一个职业,不再是一个码)。
   */
  key: string

  /**
   * 这颗胶囊代表的全部 NOC 五位码(点中 = 整组选上;原单码 noc 格 2026-10-05 改成整组)。
   */
  nocs: string[]

  /**
   * 这颗胶囊上现在写着的名字(点中时顺手记进 titles,省一次回查)。
   */
  name: string
}

/**
 * makeAllPick 的入参(2026-10-05「全选」立)。
 */
export type AllPickIn = {
  /**
   * 点选手柄的共用入参(已选码、组键、四个 setter 与回传)。
   */
  p: PickOfIn

  /**
   * 这一屏的职业。
   */
  items: OccItem<Top>[]

  /**
   * 界面语言码(选上时顺手记名字用)。
   */
  lang: string
}

/**
 * isAllOn 的入参(2026-10-05「全选」立)。
 */
export type AllOnIn = {
  /**
   * 这一屏的职业。
   */
  items: OccItem<Top>[]

  /**
   * 已选的职业。
   */
  picked: OccGroup[]
}

/**
 * useTopFor 的入参(2026-10-05 专业码一变撤回「真榜到了」时立)。
 */
export type TopForIn = {
  /**
   * 现在的专业码(逗号连的清单;空串 = 没给)。
   */
  majorCode: string

  /**
   * 「真榜到了」的 setter。
   */
  setTopLoaded: SetFlagFn
}

/**
 * useOccSearch 的入参(2026-10-05 自 useOccPicker 拆出,函数行数闸)。
 */
export type OccSearchHookIn = {
  /**
   * 搜索词。
   */
  q: string

  /**
   * 候选的 setter。
   */
  setCands: SetCandsFn

  /**
   * 「搜索在途」的 setter。
   */
  setSearching: SetFlagFn
}

/**
 * makePickOf / makeCandPickOf 的入参。
 */
export type PickOfIn = {
  /**
   * 已选的 NOC 码(事件处理器里它就是最新值,不需要 updater 形式)。
   */
  nocs: string[]

  /**
   * 码 → 组键(此刻知道的全部:各份清单里带短名的行 + 点选 / 逐码查询记下的;判「已选里哪几个码是这个职业」)。
   */
  keys: KeyMap

  /**
   * 已选码 setter。
   */
  setNocs: (v: string[]) => void

  /**
   * 显示名表 setter(收 updater)。
   */
  setTitles: (f: (m: TitleMap) => TitleMap) => void

  /**
   * 组键表 setter(收 updater;点选时把整组的码记成同一个键,搜索结果清掉以后还认得出)。
   */
  setKeys: SetKeysFn

  /**
   * 选择变化的回传;调用方没给就缺席。
   */
  onChange?: (nocs: string[]) => void

  /**
   * 搜索词 setter(只有搜索结果那只手柄用得上)。
   */
  setQ: (v: string) => void

  /**
   * 候选清单 setter(同上)。
   */
  setCands: (empty: []) => void
}

/**
 * makeTitlePut 的入参。
 */
export type TitlePutIn = {
  /**
   * 要记名字的 NOC 码(一个职业的整组码记同一个名字;2026-10-05 自单码 noc 改)。
   */
  nocs: string[]

  /**
   * 要记的名字。
   */
  name: string
}

/**
 * makeCatPickOf / makeCatSelect 的入参。
 */
export type CatPickIn = {
  /**
   * 当前分类 setter。
   */
  setCat: (v: string) => void
}

/**
 * makeNext 的入参:点「下一题」时要交出去的东西。
 */
export type OccNextIn = {
  /**
   * 已选的 NOC 码。
   */
  nocs: string[]

  /**
   * 交出口。
   */
  onDone: (nocs: string[]) => void
}

/**
 * makeProvPickOf 的入参。
 */
export type ProvPickIn = {
  /**
   * 已选的省码。
   */
  selected: string[]

  /**
   * 已选省码 setter。
   */
  setSelected: (v: string[]) => void

  /**
   * 「还不确定」态 setter。
   */
  setAnyProv: (v: boolean) => void

  /**
   * 选择变化的回传。
   */
  onChange?: (provinces: string[]) => void
}

/**
 * makeProvAny 的入参。
 */
export type ProvAnyIn = {
  /**
   * 已选省码 setter(选「还不确定」就清空具体省)。
   */
  setSelected: (empty: []) => void

  /**
   * 「还不确定」态 setter。
   */
  setAnyProv: (v: boolean) => void

  /**
   * 选择变化的回传。
   */
  onChange?: (provinces: string[]) => void
}

/**
 * makeProvDone / makeProvFinish 的入参。
 */
export type ProvDoneIn = {
  /**
   * 已选的省码。
   */
  selected: string[]

  /**
   * 是不是「还不确定」。
   */
  anyProv: boolean

  /**
   * 交出口。
   */
  onDone: (provinces: string[], unsure?: boolean) => void
}

/**
 * makeCheckToggle 的入参。
 */
export type CheckToggleIn = {
  /**
   * 这一条的勾选落格。
   */
  toggle: (v: boolean) => void
}

/**
 * makeChoicePick 的入参。
 */
export type ChoicePickIn<T extends string | number> = {
  /**
   * 这个选项存进答案的值。
   */
  value: T

  /**
   * 选中落格。
   */
  onPick: (v: T) => void
}

/**
 * 拼加倍类的入参(选中态/当前态那一档)。
 */
export type OnClsIn = {
  /**
   * 亮起来没有。
   */
  on: boolean
}

/**
 * 骨架宽度档的入参。
 */
export type SkelClsIn = {
  /**
   * 这是第几颗骨架(按档位数取模挑宽度)。
   */
  i: number
}

/**
 * pickL 之外按语言取三语表的入参(进度文案那张表)。
 */
export type ProgressTextIn = {
  /**
   * 当前界面语言。
   */
  lang: QuizLang

  /**
   * 已填几项。
   */
  done: number

  /**
   * 一共几项。
   */
  total: number
}

/**
 * 进度条宽度的入参。
 */
export type BarStyleIn = {
  /**
   * 已填几项。
   */
  done: number

  /**
   * 一共几项。
   */
  total: number
}

/**
 * 字母徽标的入参。
 */
export type AlphaIn = {
  /**
   * 这是第几个选项(0 → A)。
   */
  i: number
}

/**
 * 分值显示的入参。
 */
export type PtsTextIn = {
  /**
   * 这一条的分值。
   */
  pts: number
}

/**
 * 重名小注的入参。
 */
export type DupHintIn = {
  /**
   * 这一行职业。
   * 2026-10-05 Top 放宽成 Cand(只读官方名与码两格;大号档的命中行是候选,也要挂重名小注)。
   */
  row: Cand

  /**
   * 它此刻的显示名。
   */
  label: string

  /**
   * 显示名 → 出现次数。
   */
  dupCount: DupMap
}

/**
 * 在招数文案的入参。
 */
export type OpenTextIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 在招数。
   */
  open: number
}

/**
 * 分类页签上的字的入参。
 */
export type CatLabelIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 分类 slug;空串 = 热门。
   */
  slug: string
}

/**
 * 已选胶囊上的名字的入参。
 * 2026-10-05:isTitleMiss(名字表缺不缺这个码)同形同读,借这一个。
 */
export type ChipNameIn = {
  /**
   * NOC 五位码。
   */
  noc: string

  /**
   * NOC 码 → 显示名。
   */
  titles: TitleMap
}

/**
 * tagDelNameOf(大号档已选一行里一颗标签 × 的读屏名里的那个名字)的入参(2026-10-05 自 ChipNameIn 分出:名字没到时报泛称,
 * 要取词函数现取那个词)。
 */
export type TagDelNameIn = {
  /**
   * 取词函数(名字没到时的泛称现取)。
   */
  t: TFn

  /**
   * 代表码(这一颗标签所在那一组最先选上的码)。
   */
  noc: string

  /**
   * NOC 码 → 显示名。
   */
  titles: TitleMap
}

/**
 * 按语言取显示名的入参(库里的三语短名优先 —— 前端不自己截字符串,清洗归数据层)。
 */
export type OccLabelIn = {
  /**
   * 这一行职业。
   */
  row: Cand

  /**
   * 界面语言码。
   */
  lang: string
}

/**
 * 这一屏要摆哪些职业的入参。
 */
export type OccListOfIn = {
  /**
   * 当前分类 slug;空串 = 热门。
   */
  cat: string

  /**
   * 该分类的清单;还没查过时缺席。
   */
  catRows?: Top[]

  /**
   * 兜底/热门那一份。
   */
  base: Top[]

  /**
   * 码 → 组键(同组的几行合成一个职业;2026-10-05)。
   */
  keys: KeyMap
}

/**
 * occItemsOf 的入参(2026-10-05)。
 */
export type OccItemsIn<T extends Cand> = {
  /**
   * 一份清单的行(热门 / 分类 / 搜索命中;排在前面的当代表行)。
   */
  rows: T[]

  /**
   * 码 → 组键(行自己带短名时以行为准,没带的查这张表)。
   */
  keys: KeyMap
}

/**
 * occKeyOf 的入参(2026-10-05)。
 */
export type OccKeyIn = {
  /**
   * NOC 五位码。
   */
  noc: string

  /**
   * 码 → 组键。
   */
  keys: KeyMap
}

/**
 * occKeysOf 的入参(2026-10-05):控件手里的几份清单与点选 / 逐码查询记下的组键。
 */
export type OccKeysIn = {
  /**
   * 点选 / 逐码查询记下的组键(useOccPicker 的那一格状态)。
   */
  keys: KeyMap

  /**
   * 热门榜。
   */
  top: Top[]

  /**
   * 已查过的分类清单。
   */
  catalog: CatalogMap

  /**
   * 搜索命中的候选。
   */
  cands: Cand[]
}

/**
 * pickedOf 的入参(2026-10-05)。
 */
export type PickedIn = {
  /**
   * 已选的 NOC 码。
   */
  nocs: string[]

  /**
   * 码 → 组键。
   */
  keys: KeyMap
}

/**
 * itemOnOf 的入参(2026-10-05)。
 */
export type ItemOnIn = {
  /**
   * 这颗胶囊的组键。
   */
  key: string

  /**
   * 已选的职业。
   */
  picked: OccGroup[]
}

/**
 * makeKeysMerge 的入参(2026-10-05)。
 */
export type KeysMergeIn = {
  /**
   * 要并进去的组键。
   */
  patch: KeyMap
}

/**
 * 兜底热门清单的入参。
 */
export type OccBaseIn = {
  /**
   * 取词函数(内置常用清单的名字现取)。
   */
  t: TFn

  /**
   * 已有的热门榜;空列就整份退回内置常用清单。
   */
  top: Top[]

  /**
   * 按专业取的清单还在路上(这时不拿内置常用清单顶,整排用骨架占位,到了原位替换;2026-10-04 A2)。
   */
  hold: boolean
}

/**
 * 重名计数表的入参。
 */
export type DupCountIn = {
  /**
   * 这一屏要摆的职业(2026-10-05 起同组几个码已合成一个,按职业数)。
   * 2026-10-05 OccItem<Top> 放宽成 OccItem<Cand>(只按显示名数;大号档一列行 OccLines 对命中那一列也数)。
   */
  list: OccItem<Cand>[]

  /**
   * 界面语言码。
   */
  lang: string
}

/**
 * 内置常用清单变成榜行的入参。
 */
export type PopularRowsIn = {
  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * 进来时已选那几个职业的名字的入参。
 */
export type InitialTitlesIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 进来时已选的 NOC 码。
   */
  initial: string[]
}

/**
 * 要补几颗骨架的入参。
 */
export type SkelFillIn = {
  /**
   * 这一屏已经摆出来几颗。
   */
  shown: number
}

/**
 * 目标省控件此刻的两格状态(判「下一题」能不能点)。
 */
export type ProvStateIn = {
  /**
   * 已选的省码。
   */
  selected: string[]

  /**
   * 是不是「还不确定」。
   */
  anyProv: boolean
}

/**
 * applyPick 的入参。
 */
export type ApplyPickIn = {
  /**
   * 手柄工厂的入参(已选码、三个 setter 与回传)。
   */
  p: PickOfIn

  /**
   * 被点的那个职业。
   */
  i: PickItemIn
}

/**
 * 按分隔符取第一段的入参。
 */
export type OccSegIn = {
  /**
   * 原文。
   */
  text: string

  /**
   * 分隔符。
   */
  sep: RegExp
}

/**
 * 字段库算出来的一格引擎值;没答那一格压根不存在。
 */
export type EngineValue = string | number | boolean | string[] | undefined

/**
 * profilePatchOf 的入参。
 */
export type ProfilePatchIn = {
  /**
   * 三问的三个答案。
   */
  a: QuizAnswers

  /**
   * 既有档案。
   */
  old: ProfileJson
}

/**
 * 合并后要整组 PATCH 上去的档案(旧档没碰的字段原样带回)。
 */
export type ProfileSaved = ProfileJson & ProfilePatch

/**
 * putProfile 的入参。
 */
export type PutProfileIn = {
  /**
   * 用户 id。
   */
  uid: string

  /**
   * 合并好的整份档案。
   */
  profile: ProfileSaved
}

/**
 * 组件还活着没有的一格标记(effect 收尾时翻成 dead,在途回来的那一发就不再落格)。
 * ⚠️ 唯一的可变格:它是 effect 与在途请求之间**唯一**的接缝,
 * 换成 state 会引一次重渲,而这一格根本不影响渲染。
 */
export type DeadFlag = {
  /**
   * 已经收尾了没有。
   */
  dead: boolean
}

/**
 * 在途工作的启动器(effect 里调它开跑,拿回收尾器)。
 */
export type StartFn = () => StopFn

/**
 * 在途工作的收尾器(交给 effect 的返回值)。
 */
export type StopFn = () => void

/**
 * 防抖计时器的句柄。
 */
export type TimerRef = {
  /**
   * 在途的计时器;没有在途的给 null。
   */
  current: ReturnType<typeof setTimeout> | null
}

/**
 * 只带计时器句柄的入参(掐计时器用)。
 */
export type TimerHolderIn = {
  /**
   * 计时器句柄。
   */
  timer: TimerRef
}

/**
 * 热门榜的 updater。
 */
export type TopUpdateFn = (rows: Top[]) => Top[]

/**
 * 热门榜的落格(收 updater)。
 */
export type SetTopFn = (f: TopUpdateFn) => void

/**
 * 名字表的 updater。
 */
export type TitleUpdateFn = (m: TitleMap) => TitleMap

/**
 * 名字表的落格(收 updater)。
 */
export type SetTitlesFn = (f: TitleUpdateFn) => void

/**
 * 分类目录的 updater。
 */
export type CatalogUpdateFn = (m: CatalogMap) => CatalogMap

/**
 * 分类目录的落格(收 updater)。
 */
export type SetCatalogFn = (f: CatalogUpdateFn) => void

/**
 * 布尔标的落格。
 */
export type SetFlagFn = (v: boolean) => void

/**
 * 候选清单的落格。
 */
export type SetCandsFn = (rows: Cand[]) => void

/**
 * 一个职业的在招数(counts 报文里的一格)。
 */
export type CountRow = {
  /**
   * 在招数。
   */
  open: number
}

/**
 * `/api/quiz?counts=` 的报文(归一前形状)。
 */
export type CountsJson = {
  /**
   * 码 → 在招数;拿不到时整格缺席。
   */
  counts?: Record<string, CountRow>
}

/**
 * `/api/quiz?top=` 与 `/api/quiz?broad=` 的报文(归一前形状,两处同形)。
 */
export type TopJson = {
  /**
   * 榜行;拿不到时整格缺席。
   */
  top?: Top[]
}

/**
 * `/api/quiz?q=` 的报文(归一前形状)。
 */
export type CandsJson = {
  /**
   * 命中的候选;拿不到时整格缺席。
   */
  candidates?: Cand[]
}

/**
 * `/api/quiz?noc=` 的报文(归一前形状;本页只读名字面那几格)。
 */
export type FactsJson = {
  /**
   * 事实卡的名字面;查不到给 null 或整格缺席。
   */
  facts?: Cand | null
}

/**
 * makeBootstrap 的入参。
 */
export type BootstrapIn = {
  /**
   * 热门榜落格。
   */
  setTop: SetTopFn

  /**
   * 「真榜到没到」落格。
   */
  setTopLoaded: SetFlagFn

  /**
   * 名字表落格。
   */
  setTitles: SetTitlesFn

  /**
   * 进来时已选的 NOC 码(顺手从热门榜补它们的名字)。
   */
  nocs: string[]

  /**
   * 界面语言码。
   */
  lang: string

  /**
   * 专业的 CIP class 码;空串 = 取全站热门榜。
   */
  majorCode: string
}

/**
 * fetchCounts 的入参。
 */
export type CountsFetchIn = {
  /**
   * 存活标记。
   */
  flag: DeadFlag

  /**
   * 中止信号。
   */
  signal: AbortSignal

  /**
   * 热门榜落格。
   */
  setTop: SetTopFn
}

/**
 * makeCountsMerge 的入参。
 */
export type CountsMergeIn = {
  /**
   * 码 → 在招数。
   */
  counts: Record<string, CountRow>
}

/**
 * fetchTop 的入参。
 */
export type TopFetchIn = {
  /**
   * 存活标记。
   */
  flag: DeadFlag

  /**
   * 中止信号。
   */
  signal: AbortSignal

  /**
   * 热门榜落格。
   */
  setTop: SetTopFn

  /**
   * 「真榜到没到」落格。
   */
  setTopLoaded: SetFlagFn

  /**
   * 名字表落格。
   */
  setTitles: SetTitlesFn

  /**
   * 已选的 NOC 码。
   */
  nocs: string[]

  /**
   * 界面语言码。
   */
  lang: string

  /**
   * 取榜的地址(全站热门榜或按专业取;topUrlOf 给)。
   */
  url: string

  /**
   * 取回来的榜整份换上(按专业取 = true),不并进手上那份。2026-10-05 访客向导开屏就挂选职业机器时立:手上先有全站热门,
   * 并进去会把按专业那份挤到后面(Frank 实走第 3 题仍是厨师打头)。
   */
  swap: boolean
}

/**
 * makeTopSwap 的入参(2026-10-05 立)。
 */
export type TopSwapIn = {
  /**
   * 取回来的榜行。
   */
  rows: Top[]
}

/**
 * topGivenOf 的入参。
 */
export type TopGivenIn = {
  /**
   * 服务端送下来的热门榜;没送就缺席。
   */
  initialTop?: Top[]
}

/**
 * makeTopMerge 的入参。
 */
export type TopMergeIn = {
  /**
   * 真实热门榜的行。
   */
  rows: Top[]
}

/**
 * knownTitlesOf 的入参。
 */
export type KnownTitlesIn = {
  /**
   * 榜行。
   */
  rows: Top[]

  /**
   * 已选的 NOC 码。
   */
  nocs: string[]

  /**
   * 界面语言码。
   */
  lang: string
}

/**
 * makeTitlesMerge 的入参。
 */
export type TitlesMergeIn = {
  /**
   * 要并进去的名字表。
   */
  patch: TitleMap
}

/**
 * makeCatalogLoad 的入参。
 */
export type CatalogLoadIn = {
  /**
   * 分类 slug。
   */
  cat: string

  /**
   * 分类目录落格。
   */
  setCatalogByCat: SetCatalogFn
}

/**
 * fetchCatalog 的入参。
 */
export type CatalogFetchIn = {
  /**
   * 分类 slug。
   */
  cat: string

  /**
   * 分类目录落格。
   */
  setCatalogByCat: SetCatalogFn

  /**
   * 中止信号。
   */
  signal: AbortSignal
}

/**
 * makeCatalogPut 的入参。
 */
export type CatalogPutIn = {
  /**
   * 分类 slug。
   */
  cat: string

  /**
   * 这一类的行。
   */
  rows: Top[]
}

/**
 * makeSearchRun 的入参。
 */
export type SearchRunIn = {
  /**
   * 搜索框现值。
   */
  q: string

  /**
   * 防抖计时器句柄。
   */
  timer: TimerRef

  /**
   * 候选清单落格。
   */
  setCands: SetCandsFn

  /**
   * 「搜索在途」落格。
   */
  setSearching: SetFlagFn
}

/**
 * makeSearchStop 的入参。
 */
export type SearchStopIn = {
  /**
   * 防抖计时器句柄。
   */
  timer: TimerRef

  /**
   * 中止把手。
   */
  ctl: AbortController
}

/**
 * makeSearchFire / fetchCands 的入参。
 */
export type SearchFireIn = {
  /**
   * 已去空白的查询词。
   */
  query: string

  /**
   * 中止信号。
   */
  signal: AbortSignal

  /**
   * 中止把手(finally 里要看它中止了没有)。
   */
  ctl: AbortController

  /**
   * 候选清单落格。
   */
  setCands: SetCandsFn

  /**
   * 「搜索在途」落格。
   */
  setSearching: SetFlagFn
}

/**
 * makeTitlesFill 的入参。
 */
export type TitlesFillIn = {
  /**
   * 已选的 NOC 码。
   */
  nocs: string[]

  /**
   * 已有的名字表(缺哪几个就补哪几个)。
   */
  titles: TitleMap

  /**
   * 此刻知道的组键(2026-10-05:缺组键的码也查一次 —— 名字从内置常用清单来的码手里没有短名,不查就合不了组)。
   */
  keys: KeyMap

  /**
   * 界面语言码。
   */
  lang: string

  /**
   * 名字表落格。
   */
  setTitles: SetTitlesFn

  /**
   * 组键表落格(2026-10-05)。
   */
  setKeys: SetKeysFn
}

/**
 * fetchTitles 的入参。
 */
export type TitlesFetchIn = {
  /**
   * 启动器的入参。
   */
  fill: TitlesFillIn

  /**
   * 存活标记。
   */
  flag: DeadFlag
}

/**
 * fetchOneTitle 的入参。
 */
export type OneTitleIn = {
  /**
   * NOC 五位码。
   */
  noc: string

  /**
   * 界面语言码。
   */
  lang: string
}

/**
 * 查回来的一个名字。
 */
export type TitleHit = {
  /**
   * NOC 五位码。
   */
  noc: string

  /**
   * 显示名。
   */
  name: string

  /**
   * 组键(中文短名);查不到或库里没压出短名给空串(2026-10-05)。
   */
  key: string
}

/**
 * topSeedOf 的入参(2026-10-04 A2)。
 */
export type TopSeedIn = {
  /**
   * 取词函数(内置常用清单的名字现取)。
   */
  t: TFn

  /**
   * 服务端送下来的热门榜;没送就缺席。
   */
  initialTop?: Top[]

  /**
   * 专业的 CIP class 码;空串 = 没给。
   */
  majorCode: string
}

/**
 * topUrlOf 的入参(2026-10-04 A2)。
 */
export type TopUrlIn = {
  /**
   * 专业的 CIP class 码;空串 = 取全站热门榜。
   */
  majorCode: string
}

/**
 * 大号档左栏的切换手柄(tabs 桶 RailTabs 的 onChange 形,参数是目标项的键;2026-10-05 Frank「也改成左右 两部分吗?」「改啊」)。
 * (原在此处的 NocsMergeFn / NocsSetFn / NocsSetIn / NocName / OccNamesIn / OccShownIn —— 大号档借 profile 桶
 * OnboardingTags 当已选标签时要的落格、名字与「这一屏摆着哪些码」—— 与 OccLgPillIn / OccPillsIn 同日随大号胶囊那一屏撤:
 * 已选一行改由本桶 OccTags 用 tag 桶 TagRow + Tag 自己摆,全部已选职业都摆、× 走与胶囊同一只 pickOf 整组撤掉。)
 */
export type RailPickFn = (key: string) => void

/**
 * 大号档左栏的一项(键 + 文字;形状照 tabs 桶 TabItem 真读的两格自抄,types 不许 import;2026-10-05「改啊」)。
 */
export type OccRailItem = {
  /**
   * 项的键:「推荐」是 OCC_CAT_REC,大类是它的中文大类名(与分类状态里记的 slug 同一个)。
   */
  key: string

  /**
   * 项上的字(界面语言)。
   */
  label: string
}

/**
 * occRailItemsOf 的入参(2026-10-05「改啊」)。
 */
export type OccRailItemsIn = {
  /**
   * 取词函数(「推荐」与各大类的名字现取)。
   */
  t: TFn

  /**
   * 全部大类(broadCats 给的那份,顺序即左栏顺序)。
   */
  cats: string[]
}

/**
 * railBusyOf 的入参:右边那块此刻要不要摆「加载中」(2026-10-05「改啊」)。
 */
export type RailBusyIn = {
  /**
   * 当前分类 slug;空串 = 推荐(热门那一屏)。
   */
  cat: string

  /**
   * 点了大类、它的目录还在路上。
   */
  catLoading: boolean

  /**
   * 按专业取的推荐还在路上(给了专业码、榜没到)。
   */
  hold: boolean
}

/**
 * OccRail(大号档正文:搜索框 → 已选一行 → 两栏或单列命中)与它的两块 OccTags(已选一行)、OccCards(右边那块)共用的 props
 * (2026-10-05「改啊」;OccTags 原先那份 OccTagsIn 多一格 searchMode,改成全部已选都摆以后不读了,并进本形)。
 * 2026-10-05 同日收口:OccTags 改回自己的 OccTagsIn(本形的界面语言码它不读;types 只声明真读的格),本形只剩 OccRail 与 OccCards 用。
 */
export type OccRailIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语言码(行上的职业名按它挑;OccTags 不读 —— 名字取整机的名字表)。
   * (2026-10-05 起 OccTags 不收本形,上面括号里那半句只是来由。)
   */
  lang: string

  /**
   * 选职业整机(状态与手柄)。
   */
  d: OccPanel
}

/**
 * OccTags(大号档已选一行)的 props(2026-10-05 收口:自 OccRailIn 分出,只有它真读的两格)。
 */
export type OccTagsIn = {
  /**
   * 取词函数(× 的读屏名「移除 {名字}」与名字没到时的泛称)。
   */
  t: TFn

  /**
   * 选职业整机(读已选职业、名字表与点选手柄工厂)。
   */
  d: OccPanel
}

/**
 * OccLines(一列职业行:右边那块的白卡里、在搜时的单列命中)的 props(2026-10-05「改啊」)。
 */
export type OccLinesIn = {
  /**
   * 这一列的职业(同组的几个码一行;推荐 / 大类那一屏是 OccItem<Top>,命中是 OccItem<Cand>,都按候选行读)。
   */
  items: OccItem<Cand>[]

  /**
   * 要标主色的检索词(空串 = 不标)。
   */
  mark: string

  /**
   * 已选的职业(判行亮不亮:同组任一个码选着就亮)。
   */
  picked: OccGroup[]

  /**
   * 界面语言码(行上的职业名按它挑)。
   */
  lang: string

  /**
   * 逐职业的点选手柄工厂(推荐 / 大类那一屏是 pickOf,命中是选完即清空搜索框的 candPickOf)。
   */
  pickOf: PickOfFn
}
