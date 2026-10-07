/**
 * majors 组件域(专业选择器)的契约:各件 props、选择器机器的面板与入参、专业行 / 大类 / 专业类树的形状、
 * 各函数入参与 /api/majors 的响应原文。形状本域自己声明,不从别的域取(types 不许 import)。
 * 2026-10-05 自 gate 桶整段迁入(原 gate/types.ts 的「专业题」一段与 2026-10-05 照掌上高考加的左栏一段):
 * 逐条注释原样带过来,各条末尾补一句搬家记录;改了名的几件(原 Gate* / MajorPanel / GateMajorsHookIn)在注释里记原名。
 * 同日改多选:选中从一个码换成码清单(至多 MAJOR_PICK_MAX 个),「手上那一行」换成手上的行清单,多一行已选标签。
 *
 * @author Frank
 * @time 2026-10-05 12:24:22
 */

/**
 * 界面语取词函数(与 lib/i18n 的 TFn 同形:键 + 可选插值;本域自抄,types 不许 import)。
 */
export type TFn = (key: string, vars?: Record<string, string | number>) => string

/**
 * MajorPicker 的 props(2026-10-05 立;原 gate 的 GateMajors 收整台访客向导,搬家后只收选择器自己的机器)。
 */
export type MajorPickerIn = {
  /**
   * 选择器机器(useMajorPicker 出;宿主开屏就挂,走到这一题时热门与大类多半已到)。
   */
  picker: MajorPickerPanel

  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语言码(专业名、大类名按它挑)。
   */
  lang: string
}

/**
 * 选择器各件(已选一行、左栏右边那块)共用的 props:机器 + 取词函数 + 界面语言码(2026-10-05 立,替掉 gate 的 GatePartIn)。
 */
export type MajorPartIn = {
  /**
   * 选择器机器。
   */
  m: MajorPickerPanel

  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语言码。
   */
  lang: string
}

/**
 * MajorLines 的 props(一列专业行)。
 * 2026-10-05 自 gate 桶迁入(原名 GateMajorLinesIn);同日多选:选中的码从一个换成清单(亮哪几行、满了灰哪几行都按它判)。
 */
export type MajorLinesIn = {
  /**
   * 这一列的专业。
   */
  rows: MajorRow[]

  /**
   * 要标主色的检索词(不是搜索结果给空串)。
   */
  mark: string

  /**
   * 现在选中的专业码(至多 MAJOR_PICK_MAX 个,选的先后序)。
   */
  codes: string[]

  /**
   * 界面语言码。
   */
  lang: string

  /**
   * 点选手柄工厂。
   */
  pickOf: MajorPickOfFn
}

/**
 * 专业选择器面板(useMajorPicker 出;2026-10-04 A2):上面一排热门(选中的若不在热门里排到最前)、搜索框、搜索结果。
 * 2026-10-05 自 gate 桶迁入(原名 MajorPanel);同日多选:多两格 codes(选中的码清单)与 picked(已选那一行的专业)。
 */
export type MajorPickerPanel = {
  /**
   * 现在选中的专业码(宿主给的值,原样交回;至多 MAJOR_PICK_MAX 个,选的先后序)。2026-10-05 多选时加。
   */
  codes: string[]

  /**
   * 已选那一行摆的专业(codes 里认得名字的那些,按 codes 的序;按码查回之前认不出名字的先不摆)。2026-10-05 多选时加。
   */
  picked: MajorRow[]

  /**
   * 上面那一排:热门清单,选中的不在热门里时排到最前。
   */
  top: MajorRow[]

  /**
   * 热门清单到了没有(没到出占位;到了是空的就只剩搜索框)。
   */
  hotLoaded: boolean

  /**
   * 搜索框现值。
   */
  q: string

  /**
   * 搜索词够起搜(中日韩字 1 个起、其余 2 个起)—— 够了才摆结果。
   */
  searchOn: boolean

  /**
   * 搜索在途(2026-10-04 收口审查:够起搜的词一落下就算起,防抖等待也算在内,结果到了 / 换词作废才落;
   * 在途时结果那一排摆占位,不摆上一次的结果 —— 与第 3 题选职业的搜索同一条规矩)。
   */
  searching: boolean

  /**
   * 搜索结果(最多 MAJOR_HITS_MAX 条)。
   */
  hits: MajorRow[]

  /**
   * 搜索框改值。
   */
  onSearch: (v: string) => void

  /**
   * 逐专业的点选手柄工厂(热门、结果两排共用)。
   * 2026-10-05 多选:点没选的 = 选上,点选中的 = 摘掉(已选一行的 × 也走它)。
   */
  pickOf: MajorPickOfFn

  /**
   * 左栏的大类(16 个,按数据层排好的序;还没取到 = 空列,左栏只有「热门」)。2026-10-05 照掌上高考改版加,下同。
   */
  cats: MajorCat[]

  /**
   * 左栏当前项(MAJOR_CAT_HOT = 热门;否则大类键)。
   */
  cat: string

  /**
   * 点左栏一项。
   */
  onCat: (key: string) => void

  /**
   * 当前大类的专业类树(热门时 / 还没取到 = null)。
   */
  tree: MaybeTree

  /**
   * 展开着的那一个专业类键(一次开一张;空串 = 都收着)。
   */
  open: string

  /**
   * 专业类头行的点击手柄工厂(给专业类键,交出展开 / 收起它的手柄)。
   */
  foldOf: FoldOfFn
}

/**
 * useMajorPicker 的入参。
 * 2026-10-05 自 gate 桶迁入(原名 GateMajorsHookIn,两格是 major / onMajor);同日多选改成码清单的值与上报口。
 */
export type MajorPickerHookIn = {
  /**
   * 现在选中的专业码(选的先后序;空列 = 没选)。
   */
  value: string[]

  /**
   * 报新的码清单(宿主落格;选上追加在尾、摘掉保序删去)。
   */
  onChange: (v: string[]) => void
}

/**
 * 专业题的点选手柄工厂:给一行专业,交出点它的手柄。
 * 2026-10-05 自 gate 桶迁入。
 */
export type MajorPickOfFn = (row: MajorRow) => () => void

/**
 * 专业类头行的点击手柄工厂。
 * 2026-10-05 自 gate 桶迁入。
 */
export type FoldOfFn = (key: string) => () => void

/**
 * 一个专业(majors 域 /api/majors 的行,只声明本域真读的格;to* 洗净后的形)。2026-10-04 A2。
 * 2026-10-05 自 gate 桶迁入。
 */
export type MajorRow = {
  /**
   * CIP 2021 class 码(52.0203)—— 答案存的就是它。
   */
  code: string

  /**
   * 官方英文名(中韩名没译成时回退它)。
   */
  titleEn: string

  /**
   * 英文显示名(数据层写的短名;空串 = 照用 titleEn)。2026-10-05 照掌上高考改版加。
   */
  titleEnShort: string

  /**
   * 中文名;null = 数据层没译成。
   */
  titleZh: string | null

  /**
   * 韩文名;null = 数据层没译成。
   */
  titleKo: string | null

  /**
   * 本站职业大类清单(注册完没选职业时取第一个回职位板筛;数据层推好的)。
   */
  broads: string[]
}

/**
 * 一个专业或没有(按码查无此码 / 取挂了)。
 * 2026-10-05 自 gate 桶迁入。
 */
export type MaybeMajor = MajorRow | null

/**
 * 有三语名的一样东西(大类 / 专业类;catNameOf 按界面语言挑)。
 * 2026-10-05 自 gate 桶迁入。
 */
export type MajorTitled = {
  /**
   * 英文名(显示名;中韩名缺时回退它)。
   */
  titleEn: string

  /**
   * 中文名;null = 没有。
   */
  titleZh: string | null

  /**
   * 韩文名;null = 没有。
   */
  titleKo: string | null
}

/**
 * 一个大类(左栏一项)。
 * 2026-10-05 自 gate 桶迁入。
 */
export type MajorCat = MajorTitled & {
  /**
   * 大类键(biz / fin / it …;取专业类树时带上)。
   */
  key: string
}

/**
 * 一个专业类(右边一张可展开白卡)。
 * 2026-10-05 自 gate 桶迁入。
 */
export type MajorGroup = MajorTitled & {
  /**
   * 专业类键(CIP 子系码如 52.03,或数据层自定的键)。
   */
  key: string

  /**
   * 这一类的专业(数据层排好的序)。
   */
  majors: MajorRow[]
}

/**
 * 一个大类的专业类树。
 * 2026-10-05 自 gate 桶迁入。
 */
export type MajorTree = {
  /**
   * 装两个以上专业的专业类(一张卡一个,可展开)。
   */
  groups: MajorGroup[]

  /**
   * 只装一个专业的专业类里的那些专业(合成一张卡,直接点选)。
   */
  singles: MajorRow[]
}

/**
 * 一个大类的专业类树或没有(热门时 / 还没取到)。
 * 2026-10-05 自 gate 桶迁入。
 */
export type MaybeTree = MajorTree | null

/**
 * 已取到的专业类树(大类键 → 树;切回来不重取)。
 * 2026-10-05 自 gate 桶迁入。
 */
export type TreeMap = Map<string, MajorTree>

/**
 * 左栏一项(tabs 桶 TabItem 的形,本域自抄)。
 * 2026-10-05 自 gate 桶迁入(原名 GateRailItem)。
 */
export type MajorRailItem = {
  /**
   * 页签键(热门 = MAJOR_CAT_HOT,否则大类键)。
   */
  key: string

  /**
   * 页签文字。
   */
  label: string
}

/**
 * majorNameOf 的入参。
 * 2026-10-05 自 gate 桶迁入。
 */
export type MajorNameIn = {
  /**
   * 一个专业。
   */
  row: MajorRow

  /**
   * 界面语言码。
   */
  lang: string
}

/**
 * catNameOf 的入参。
 * 2026-10-05 自 gate 桶迁入。
 */
export type CatNameIn = {
  /**
   * 大类或专业类。
   */
  titled: MajorTitled

  /**
   * 界面语言码。
   */
  lang: string
}

/**
 * pickedRowsOf 的入参(2026-10-05 多选立:已选那一行摆哪几个)。
 */
export type PickedRowsIn = {
  /**
   * 现在选中的码(选的先后序)。
   */
  codes: string[]

  /**
   * 热门清单(选中的在热门里就从这里取名字)。
   */
  hot: MajorRow[]

  /**
   * 手上的行(点选过的、按码查回来的)。
   */
  known: MajorRow[]
}

/**
 * rowOfCode 的入参(2026-10-05 多选立)。
 */
export type RowOfCodeIn = {
  /**
   * 在哪几行里找。
   */
  rows: MajorRow[]

  /**
   * 专业码。
   */
  code: string
}

/**
 * majorTopOf 的入参。
 * 2026-10-05 自 gate 桶迁入;同日多选:「手上那一行」换成手上的行清单,选中的码换成清单。
 */
export type MajorTopIn = {
  /**
   * 热门清单。
   */
  hot: MajorRow[]

  /**
   * 手上的行(点选过的、按码查回来的;原是「最近点选 / 按码查回来的那个专业」一行)。
   */
  known: MajorRow[]

  /**
   * 现在选中的专业码(原是一个码)。
   */
  codes: string[]
}

/**
 * isMajorOff 的入参(2026-10-05 多选立:选满时这一行灰不灰)。
 */
export type MajorOffIn = {
  /**
   * 现在选中的码。
   */
  codes: string[]

  /**
   * 这一行的码。
   */
  code: string
}

/**
 * majorHitsOf 的入参。
 * 2026-10-05 自 gate 桶迁入。
 */
export type MajorHitsIn = {
  /**
   * 检索词够起搜。
   */
  searchOn: boolean

  /**
   * 搜索在途(在途时摆占位,不摆上一次的结果;2026-10-04 收口审查)。
   */
  searching: boolean

  /**
   * 搜索结果。
   */
  hits: MajorRow[]
}

/**
 * missingCodesOf 的入参。
 * 2026-10-05 自 gate 桶迁入(原 isPickedMissing 的 PickedMissingIn);同日多选:码与手上的行都换成清单。
 */
export type MissingCodesIn = {
  /**
   * 现在选中的专业码。
   */
  codes: string[]

  /**
   * 热门清单。
   */
  hot: MajorRow[]

  /**
   * 热门清单到了没有。
   */
  hotLoaded: boolean

  /**
   * 手上已有的行。
   */
  known: MajorRow[]
}

/**
 * makeMajorPickOf 的入参。
 * 2026-10-05 自 gate 桶迁入;同日多选:多收现在选中的码清单,上报口改报整份清单,「记下那一行」改成往手上的行里添。
 */
export type MajorPickOfIn = {
  /**
   * 现在选中的码(判这一点是选上还是摘掉、满没满)。
   */
  codes: string[]

  /**
   * 往手上的行里添(热门外的靠它排到最前、已选一行靠它拿名字)。
   */
  setKnown: KnownSetFn

  /**
   * 搜索框落格(选上后清空)。
   */
  setQ: (v: string) => void

  /**
   * 报新的码清单。
   */
  onChange: (v: string[]) => void
}

/**
 * codesWithout 的入参(2026-10-05 多选立)。
 */
export type CodesWithoutIn = {
  /**
   * 现在选中的码。
   */
  codes: string[]

  /**
   * 要摘掉的那一个。
   */
  code: string
}

/**
 * 手上的行的落格(React 的函数式更新;本域自抄形)。2026-10-05 多选立。
 */
export type KnownSetFn = (f: (prev: MajorRow[]) => MajorRow[]) => void

/**
 * makeKnownAdd 的入参(2026-10-05 多选立)。
 */
export type KnownAddIn = {
  /**
   * 要添上的行(手上已有同码的跳过)。
   */
  rows: MajorRow[]
}

/**
 * 在途取数的存活标记(卸载 / 换词后置 dead,迟到的结果不落格)。
 * 2026-10-05 自 gate 桶迁入。
 */
export type DeadFlag = {
  /**
   * 已作废。
   */
  dead: boolean
}

/**
 * makeHotMajorsLoad 的入参。
 * 2026-10-05 自 gate 桶迁入。
 */
export type HotLoadIn = {
  /**
   * 热门清单落格。
   */
  setHot: (v: MajorRow[]) => void

  /**
   * 「热门到了」落格。
   */
  setHotLoaded: (v: boolean) => void
}

/**
 * fetchHotMajors 的入参。
 * 2026-10-05 自 gate 桶迁入。
 */
export type HotFetchIn = {
  /**
   * 存活标记。
   */
  flag: DeadFlag

  /**
   * 热门清单落格。
   */
  setHot: (v: MajorRow[]) => void

  /**
   * 「热门到了」落格。
   */
  setHotLoaded: (v: boolean) => void
}

/**
 * makePickedLoad 的入参。
 * 2026-10-05 自 gate 桶迁入;同日多选:要查回的码换成清单,落格改成往手上的行里添。
 */
export type PickedLoadIn = {
  /**
   * 要查回的专业码(手上与热门里都没有的那几个)。
   */
  codes: string[]

  /**
   * 往手上的行里添。
   */
  setKnown: KnownSetFn
}

/**
 * fetchPicked 的入参。
 * 2026-10-05 自 gate 桶迁入;同日多选同上。
 */
export type PickedFetchIn = {
  /**
   * 存活标记。
   */
  flag: DeadFlag

  /**
   * 要查回的专业码。
   */
  codes: string[]

  /**
   * 往手上的行里添。
   */
  setKnown: KnownSetFn
}

/**
 * makeMajorSearch 的入参。
 * 2026-10-05 自 gate 桶迁入。
 */
export type MajorSearchIn = {
  /**
   * 搜索框现值(未去首尾空白)。
   */
  q: string

  /**
   * 搜索结果落格。
   */
  setHits: (v: MajorRow[]) => void

  /**
   * 「搜索在途」落格(2026-10-04 收口审查)。
   */
  setSearching: (v: boolean) => void
}

/**
 * 防抖到点后真正去搜的那一发(makeMajorFire / fetchMajorHits)的入参。
 * 2026-10-05 自 gate 桶迁入。
 */
export type MajorFireIn = {
  /**
   * 已去首尾空白、够起搜的检索词。
   */
  q: string

  /**
   * 存活标记(换词 / 卸载后迟到的结果不落格)。
   */
  flag: DeadFlag

  /**
   * 搜索结果落格。
   */
  setHits: (v: MajorRow[]) => void

  /**
   * 「搜索在途」落格(结果到了落 false;2026-10-04 收口审查)。
   */
  setSearching: (v: boolean) => void
}

/**
 * makeMajorStop 的入参。
 * 2026-10-05 自 gate 桶迁入。
 */
export type MajorStopIn = {
  /**
   * 存活标记。
   */
  flag: DeadFlag

  /**
   * 防抖计时器。
   */
  timer: ReturnType<typeof setTimeout>

  /**
   * 「搜索在途」落格(作废这一发时落 false;2026-10-04 收口审查)。
   */
  setSearching: (v: boolean) => void
}

/**
 * railItemsOf 的入参。
 * 2026-10-05 自 gate 桶迁入。
 */
export type RailItemsIn = {
  /**
   * 大类清单。
   */
  cats: MajorCat[]

  /**
   * 界面语言码。
   */
  lang: string

  /**
   * 「热门」那一项的文字(调用方取词)。
   */
  hot: string
}

/**
 * makeCatsLoad 的入参。
 * 2026-10-05 自 gate 桶迁入。
 */
export type CatsLoadIn = {
  /**
   * 大类清单落格。
   */
  setCats: (v: MajorCat[]) => void
}

/**
 * fetchMajorCats 的入参。
 * 2026-10-05 自 gate 桶迁入。
 */
export type CatsFetchIn = {
  /**
   * 存活标记(卸载后迟到的结果不落格)。
   */
  flag: DeadFlag

  /**
   * 大类清单落格。
   */
  setCats: (v: MajorCat[]) => void
}

/**
 * 专业类树表的落格(React 的函数式更新;本域自抄形)。
 * 2026-10-05 自 gate 桶迁入。
 */
export type TreesSetFn = (f: (prev: TreeMap) => TreeMap) => void

/**
 * makeTreeLoad 的入参。
 * 2026-10-05 自 gate 桶迁入。
 */
export type TreeLoadIn = {
  /**
   * 大类键。
   */
  cat: string

  /**
   * 树表落格。
   */
  setTrees: TreesSetFn
}

/**
 * fetchMajorTree 的入参。
 * 2026-10-05 自 gate 桶迁入。
 */
export type TreeFetchIn = {
  /**
   * 存活标记。
   */
  flag: DeadFlag

  /**
   * 大类键。
   */
  cat: string

  /**
   * 树表落格。
   */
  setTrees: TreesSetFn
}

/**
 * makeTreeAdd 的入参。
 * 2026-10-05 自 gate 桶迁入。
 */
export type TreeAddIn = {
  /**
   * 大类键。
   */
  cat: string

  /**
   * 取到的树。
   */
  tree: MajorTree
}

/**
 * treeOfCat 的入参。
 * 2026-10-05 自 gate 桶迁入。
 */
export type TreeOfIn = {
  /**
   * 已取到的树表。
   */
  trees: TreeMap

  /**
   * 左栏当前项。
   */
  cat: string
}

/**
 * makeCatPick 的入参。
 * 2026-10-05 自 gate 桶迁入。
 */
export type CatPickIn = {
  /**
   * 左栏当前项落格。
   */
  setCat: (v: string) => void

  /**
   * 展开着的专业类落格(换大类时收起)。
   */
  setOpen: (v: string) => void
}

/**
 * makeFoldOf 的入参。
 * 2026-10-05 自 gate 桶迁入。
 */
export type FoldOfIn = {
  /**
   * 展开着的那一个专业类键。
   */
  open: string

  /**
   * 展开着的专业类落格。
   */
  setOpen: (v: string) => void
}

/**
 * /api/majors 一行的原文(归一前:接口报文在信任边界外,哪格都可能缺)。
 * 2026-10-05 自 gate 桶迁入。
 */
export type MajorRowJson = {
  /**
   * class 码。
   */
  code?: string

  /**
   * 官方英文名。
   */
  titleEn?: string

  /**
   * 英文显示名(2026-10-05 加)。
   */
  titleEnShort?: string

  /**
   * 中文名。
   */
  titleZh?: string | null

  /**
   * 韩文名。
   */
  titleKo?: string | null

  /**
   * 本站职业大类清单。
   */
  broads?: string[]
}

/**
 * /api/majors 热门 / 搜索两支的响应(归一前)。
 * 2026-10-05 自 gate 桶迁入。
 */
export type MajorsJson = {
  /**
   * 专业清单。
   */
  majors?: MajorRowJson[]
} | null

/**
 * /api/majors 按码那一支的响应(归一前;查无此码时 major 是 null)。
 * 2026-10-05 自 gate 桶迁入。
 */
export type MajorOneJson = {
  /**
   * 那一个专业。
   */
  major?: MajorRowJson | null
} | null

/**
 * /api/majors?cats=1 一个大类的原文(归一前)。
 * 2026-10-05 自 gate 桶迁入。
 */
export type MajorCatJson = {
  /**
   * 大类键。
   */
  key?: string

  /**
   * 英文名。
   */
  titleEn?: string

  /**
   * 中文名。
   */
  titleZh?: string | null

  /**
   * 韩文名。
   */
  titleKo?: string | null
}

/**
 * /api/majors?cats=1 的响应(归一前)。
 * 2026-10-05 自 gate 桶迁入。
 */
export type MajorCatsJson = {
  /**
   * 大类清单。
   */
  cats?: MajorCatJson[]
} | null

/**
 * /api/majors?cat= 一个专业类的原文(归一前)。
 * 2026-10-05 自 gate 桶迁入。
 */
export type MajorGroupJson = MajorCatJson & {
  /**
   * 这一类的专业。
   */
  majors?: MajorRowJson[]
}

/**
 * /api/majors?cat= 的响应(归一前)。
 * 2026-10-05 自 gate 桶迁入。
 */
export type MajorTreeJson = {
  /**
   * 装两个以上专业的专业类。
   */
  groups?: MajorGroupJson[]

  /**
   * 只装一个专业的专业类里的那些专业。
   */
  singles?: MajorRowJson[]
} | null
