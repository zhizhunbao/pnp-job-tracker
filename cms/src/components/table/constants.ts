/**
 * table 域的死值:拖列与量宽的几个门槛数。
 *
 * @author Frank
 * @time 2026-08-24 02:30:00
 */

/**
 * 拖列宽下限(px)—— 再窄列头字都挤没了。
 */
export const COL_W_MIN = 60

/**
 * 拖列起点兜底宽(px):th 还没量到宽时用。
 */
export const COL_W_FALLBACK = 100

/**
 * 量宽百分比小数位(锁列用:auto 量真实宽 → 换算百分比锁 fixed 布局)。
 */
export const PCT_DECIMALS = 3

/**
 * 量宽签名的列间分隔符(列 key 拼串比对;数据换了才重量)。
 */
export const SIG_SEP = '|'

/**
 * 量宽签名里列串与行数的分界。
 */
export const SIG_TAIL = '#'

/**
 * 排序标记:降序。
 */
export const MARK_DESC = ' ▼'

/**
 * 排序标记:升序。
 */
export const MARK_ASC = ' ▲'

/**
 * 排序标记:本列可排但未排(灰提示)。
 */
export const MARK_HINT = ' ⇅'

/**
 * 单元格空值兜底(取不到值时显示,同 row 域口径)。
 */
export const EMPTY_MARK = '—'

/**
 * 指针移动事件名(拖列宽:按下后在窗口级跟手,平台定值)。
 */
export const EV_POINTERMOVE = 'pointermove'

/**
 * 指针松开事件名(拖列宽收尾)。
 */
export const EV_POINTERUP = 'pointerup'

/**
 * 对齐档:右(数字列;缺省左)。
 */
export const ALIGN_RIGHT = 'right'

/**
 * 拼 className 时各类之间的分隔符,`cls()` 用它把基类和一串开关修饰类连起来
 * (表壳、表头、单元格三处都走那一个函数)。HTML 的 class 属性按**空白**切词,
 * 一个空格就是一次分隔 —— 写错不会报错,只会让基类和修饰类粘成一个谁也匹配不上的
 * 长类名,表当场掉回没有边框、没有对齐、没有排序态的裸 table。
 * ⚠️ 与上面 SIG_SEP 的 `|` 是两回事:那个切的是量宽签名里的列 key,这个切的是类名。
 */
export const CLS_SEP = ' '

/**
 * 量完列宽后锁死的表格布局。fixed 让列宽只由第一行(与 colgroup)决定,
 * 后面几百行再长的单元格也不会把列撑开 —— 这正是「百分比固定布局永不横滚」的实现。
 */
export const LAYOUT_LOCKED = 'fixed'

/**
 * 列宽的单位。用百分比而不是像素:容器宽度随视口变,百分比跟着变,
 * 像素不跟 —— 手机上就会横滚。
 */
export const PCT_UNIT = '%'

/**
 * 序列表的「表」态:列是时间点时的默认视图,一格一个原值。
 */
export const SERIES_VIEW_TABLE = 'table'

/**
 * 序列表的「趋势」态:表体换成一张多折线指数图。
 */
export const SERIES_VIEW_CHART = 'chart'

/**
 * 时间窗「近 N 期」:只显 pointKeys 的末 N 列(N 由调用方的 recent 给)。
 */
export const SERIES_RANGE_RECENT = 'recent'

/**
 * 时间窗「全部」:pointKeys 全显。
 */
export const SERIES_RANGE_ALL = 'all'

/**
 * 两态时间窗之间的记号(`近 5 年 · 全部`)。它是**控件记号**不是文案 ——
 * 分隔的是同一个开关的两档,不是把两条信息挤成一行(全站「禁 ·」那条禁的是后者),
 * 所以不进 words:调用方给的是两档的名字,记号是控件自己的形。
 */
export const SERIES_RANGE_SEP = '·'

/**
 * 工具条上四枚钮走的 button 变体:幽灵(无底无边),形由本域的加倍类给
 * —— 通用形态单一出口那条:钮只许从 button 桶出,长相归本域 css。
 */
export const SERIES_BTN_KIND = 'ghost'

/**
 * 折线配色表(按行序取,超过九行循环)。九色都是同一饱和度档的深色,
 * 白底上任意两条相邻线都分得开;顺序按「先冷后暖」排,前几条最常出现的线
 * (总人口、临时居民)拿到最稳的蓝红。
 */
export const SERIES_COLORS = [
  '#2563eb',
  '#dc2626',
  '#16a34a',
  '#9333ea',
  '#ea580c',
  '#0891b2',
  '#db2777',
  '#ca8a04',
  '#475569',
]

/**
 * 取色兜底:索引取值在类型上可空(noUncheckedIndexedAccess),而取模后不可能越界 ——
 * 这一格是类型规定不是业务态,给中性灰。
 */
export const SERIES_COLOR_FALLBACK = '#6b7280'

/**
 * 指数基准:每行**首个有值点**记作 100,其余点按比例换算。
 * 换算而不是画原值:一张图上人口(千万级)与省提名配额(万级)差三个数量级,
 * 画原值时后者被压成一条贴地的直线,看不出任何变化。
 */
export const SERIES_INDEX_BASE = 100

/**
 * 一行至少要有几个有值点才画线:一个点连不成线,也算不出趋势 —— 整行跳过。
 */
export const SERIES_MIN_POINTS = 2

/**
 * y 轴网格步长(指数点):刻度取 20 的倍数,上下各取到最近的整倍数。
 */
export const SERIES_GRID_STEP = 20

/**
 * 画布宽(viewBox 坐标,不是像素):svg 按 viewBox 自适应容器宽,
 * 这个数只决定「横向有多少格可用」,越大线越平滑。
 */
export const SERIES_CHART_W = 1000

/**
 * 画布高(viewBox 坐标)。宽高比 1000:300 ≈ 3.3:1,与效果图的扁长折线区一致。
 */
export const SERIES_CHART_H = 300

/**
 * 左内衬:留给 y 轴刻度数字(三位数 + 一点余量)。
 */
export const SERIES_PAD_L = 44

/**
 * 右内衬:最后一个点的圆点半径 + 一点余量,免得贴边被裁。
 */
export const SERIES_PAD_R = 12

/**
 * 上内衬:最高那条线的圆点不贴顶。
 */
export const SERIES_PAD_T = 12

/**
 * 下内衬:留给 x 轴刻度文字一行。
 */
export const SERIES_PAD_B = 28

/**
 * 数据点的圆点半径(viewBox 坐标):悬停要能点中,又不能盖住线。
 */
export const SERIES_DOT_R = 3

/**
 * 折线与图例色块的线宽(viewBox 坐标)。
 */
export const SERIES_LINE_W = 2

/**
 * 坐标规整的倍数:算出来的坐标按 1/10 格取整再进 path ——
 * 不规整时一条线的 d 串里全是十几位小数,DOM 里没法读也白占体积。
 */
export const SERIES_ROUND = 10

/**
 * viewBox 四个数之间的分隔符(SVG 规定:空白分隔的数字清单)。
 */
export const SERIES_BOX_SEP = ' '

/**
 * path 的抬笔指令:移到起点不画线(每条折线的第一个点)。
 */
export const SERIES_PATH_MOVE = 'M'

/**
 * path 的画线指令:自上一点直线连到这一点。
 */
export const SERIES_PATH_LINE = 'L'

/**
 * path 里指令与坐标、坐标与坐标之间的分隔符(SVG 规定的空白分隔)。
 */
export const SERIES_PATH_GAP = ' '

/**
 * 折线不填充:只描边。不写这一格 svg 会拿默认的黑填满折线下方的闭合区域。
 */
export const SERIES_FILL_NONE = 'none'

/**
 * 千分位格式化用的地区(与站内其余数字同口径:1,234,567)。
 */
export const SERIES_LOCALE = 'en-CA'

/**
 * 拼 React key 时行名与点名之间的分隔符(同一条线上的点要各自唯一)。
 */
export const SERIES_KEY_SEP = '/'

/**
 * 图例色块的画布坐标系(一条短横杠的格子)。
 */
export const SERIES_DASH_BOX = '0 0 14 3'

/**
 * 图例色块的宽(画布坐标,与 SERIES_DASH_BOX 的格子等宽)。
 */
export const SERIES_DASH_W = 14

/**
 * 图例色块的高(画布坐标,与 SERIES_DASH_BOX 的格子等高)。
 */
export const SERIES_DASH_H = 3

/**
 * y 轴刻度文字的画布 x:落在左内衬里、右对齐到折线区左边界前 8 格。
 */
export const SERIES_TEXT_X = 36

/**
 * x 轴刻度文字的画布 y:落在下内衬里,离底边一行字的高度。
 */
export const SERIES_TICK_Y = 292

/**
 * 文字右对齐(y 轴刻度贴着折线区左边界排)。
 */
export const SERIES_ANCHOR_END = 'end'

/**
 * 文字居中对齐(x 轴刻度以点为中心排)。
 */
export const SERIES_ANCHOR_MID = 'middle'

/**
 * 文字竖向居中(y 轴刻度与它那根网格线对齐,不然文字底边贴线、看着高半行)。
 */
export const SERIES_BASELINE_MID = 'middle'

/**
 * 整张图对读屏的角色:一张图(名字由上方那行小字给)——
 * 折线的每个点在 DOM 里都是空节点,不声明角色时读屏会把它们一个个念成空白。
 */
export const SERIES_SVG_ROLE = 'img'
