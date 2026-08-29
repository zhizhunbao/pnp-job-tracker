/**
 * stats 域(就业把脉统计主图)的死值:档位串、i18n 键头、量纲与阈值、
 * echarts option 里的每一格固定配置、全局类名与外部接口地址。
 * 2026-08-28 换装批自 charts.tsx 的散值收拢挂注释(值一个不改)。
 * 色值分两半:静态排版的那半迁 stats.module.css 走 CSS 变量,
 * **画布里的那半留在这里** —— canvas 读不到 CSS 变量,echarts 只认字面量。
 *
 * @author Frank
 * @time 2026-08-28 12:43:43
 */

/**
 * 「没有」的空文本(译名不出、筛选未选时的值)。与 companies/news 域同名同义,各家一份。
 */
export const TEXT_NONE = ''

/**
 * 类名之间的分隔(拼多类时用)。
 */
export const CLS_SEP = ' '

/**
 * 白卡壳的全局类(main.css 第 9 段唯一一份描边+圆角+白底;本域只用不迁)。
 */
export const CARD_CLS = 'card'

/**
 * 统计主图控件行的全局类(main.css 640 断点把它抬到 44px 触控靶 —— #300 第 38 轮体检;
 * 那条是**跨页规范**,单一来源在 main.css,本域只挂类不搬规则)。
 */
export const MKT_CTL_CLS = 'mktCtl'

/**
 * 定制样式钮的统一底座(2026-08-26 Frank「<button 这种不允许直接使用」——
 * 裸 <button> 一律改经 button 族):ghost 底最素,视觉全由本域的加倍类定形。
 */
export const PLAIN_BTN_KIND = 'ghost'

/**
 * 控件行里搜索框的尺寸档(它与下拉挤在同一行,用最小那一档)。
 */
export const SEARCH_SIZE = 'sm'

/**
 * 全屏钮在非全屏态的文案键。
 */
export const KEY_FS = 'mkt.fs'

/**
 * 全屏钮在全屏态的文案键。
 */
export const KEY_FS_EXIT = 'mkt.fs.exit'

/**
 * 三级分类下拉里「全部」那一档的文案键(它是空值档,不是一个真的分类)。
 */
export const KEY_CAT_ALL = 'mkt.cat.all'

/**
 * 主图数据的接口地址(SSR 瘦身,手法照 /jobs 的 /api/jobs/dims):主图四份数据与用户无关、
 * mart 日更,不该 SSR 直出(occ ~3400 行占 /start HTML 大头)。/start 与 /stats 首页同吃这一个端点。
 */
export const MARKET_API = '/api/stats/market'

/**
 * 中文界面的语言码(职业名、城市名的译名按它取)。
 */
export const LANG_ZH = 'zh'

/**
 * 韩文界面的语言码。
 */
export const LANG_KO = 'ko'

/**
 * 界面语言的默认档(调用方不传时按中文渲染,与原 `lang = 'zh'` 默认值同值)。
 */
export const LANG_DEFAULT = 'zh'

/**
 * 省名 i18n 键的头(拼上两位省码 —— #58 口径:界面显示全名,两字码只在幕后)。
 */
export const KEY_PROV_HEAD = 'pr.'

/**
 * 职业大类 i18n 键的头(拼上大类名 —— 库里的 broad 列存的就是中文大类名)。
 */
export const KEY_BROAD_HEAD = 'broad.'

/**
 * 维度表里「不分」那一档的值:职业行的 province、统计行的 broad 与 mid 都用它
 * 表示「全国 / 全大类 / 全中类」。
 */
export const ROW_ALL = 'all'

/**
 * 横轴档:按职业(默认)。
 */
export const X_OCC = 'occ'

/**
 * 横轴档:按省份。
 */
export const X_PROV = 'prov'

/**
 * 横轴档:按城市。
 */
export const X_CITY = 'city'

/**
 * 簇内分组档:不分组。
 */
export const G_NONE = 'none'

/**
 * 簇内分组档:按省份(横轴=职业时的默认档,一根柱一个省)。
 */
export const G_PROV = 'prov'

/**
 * 簇内分组档:按职业大类(只有横轴=省份时成立)。
 */
export const G_BROAD = 'broad'

/**
 * 簇内分组档:按 TEER。
 */
export const G_TEER = 'teer'

/**
 * TEER 这一档的显示名(职业技能等级的官方缩写,三语同形,不进 i18n)。
 */
export const G_TEER_LABEL = 'TEER'

/**
 * 右轴档:ESDC 官方中位年薪 —— **权威基线**,不随我们抓到多少帖子漂,
 * 规划类结论只能站在它上面。默认档。
 */
export const Y2_WAGE = 'wage'

/**
 * 右轴档:帖面中位(本站折算)—— 当下行情;**样本 < MIN_SAMPLE_N 的点留空**
 * (1 个帖的「中位」不是中位)。
 */
export const Y2_POSTED = 'posted'

/**
 * 右轴档:不显示中位年薪(只看岗位数)。
 */
export const Y2_OFF = 'off'

/**
 * 排序主键:按在招岗位数(默认)。
 */
export const SORT_JOBS = 'jobs'

/**
 * 排序主键:按中位年薪(取哪一档随右轴档走)。
 */
export const SORT_MED = 'med'

/**
 * 排序方向:从高到低(默认)。
 */
export const DIR_DESC = 'desc'

/**
 * 排序方向:从低到高。
 */
export const DIR_ASC = 'asc'

/**
 * 通道筛选:不筛(默认)。
 */
export const CHAN_ALL = 'all'

/**
 * 通道筛选:省提名具名清单里的职业。
 */
export const CHAN_PNP = 'pnp'

/**
 * 通道筛选:联邦 EE 类别里的职业。
 */
export const CHAN_EE = 'ee'

/**
 * 帖面中位的最小样本量:统计上中位数至少要几个观测才有意义。实核 489 个职业里
 * 73 个帖面样本 <5(其中 17 个只有 1 个岗)—— 这些点在「帖面」档留空,但官方档照常有数。
 */
export const MIN_SAMPLE_N = 5

/**
 * 一张图最多画多少个类目(职业档与城市档各自截断):再多轴上也读不出东西,
 * 缩放窗仍在,拉 dataZoom 看全。
 */
export const AXIS_MAX = 200

/**
 * 百分之百(dataZoom 的窗口用百分比表达,首屏窗算出来要跟它取小)。
 */
export const PCT_FULL = 100

/**
 * 横轴=职业时首屏露几个职业(dataZoom 初窗的默认档)。Top N 选择器 2026-07-31
 * Frank「这个 top 去掉」撤:排行职责移交 landing 职位榜「最多」tab,主图回归完整分布。
 */
export const FIRST_SCREEN_DEFAULT = 12

/**
 * 横轴=城市时首屏露几个城市(城市名短,一屏放得下比职业多两个)。
 */
export const FIRST_SCREEN_CITY = 14

/**
 * 最低在招岗数的默认档(Frank 2026-07-28 点「从低到高」实拍:最前面全是只有 1 个岗的职业,
 * 柱子齐刷刷是 1)。1 个岗的职业进「分布图」没有意义 —— 默认 5,想看全部把它调回 1。
 */
export const MIN_JOBS_DEFAULT = 5

/**
 * 最低在招岗数下拉的档位清单。
 */
export const MIN_JOBS_OPTS = [1, 5, 10, 20, 50]

/**
 * 图的常规高度(px;非全屏态固定这一档,调用侧靠它占位防 CLS)。
 */
export const CHART_H = 420

/**
 * 全屏态图高的下限(px;视口太矮时不再往下压)。
 */
export const FS_H_MIN = 320

/**
 * 全屏态图高与视口高之间留的余量(px;给系统状态条留一线)。
 */
export const FS_H_PAD = 24

/**
 * 量算标签宽时假定的页面左右留白(px;窗口宽减掉它才是容器可用宽)。
 */
export const VW_PAD = 80

/**
 * 量算标签宽时的容器宽上限(px;桌面再宽,图也就画到这么宽)。
 */
export const VW_MAX = 1200

/**
 * 服务端渲染时拿不到 window,量算标签宽用的兜底容器宽(px)。
 */
export const VW_FALLBACK = 1100

/**
 * 相邻标签盒之间要留的沟(px)。标签盒宽要**比格距窄一截**:等宽时相邻盒子边缘相接,
 * echarts 判为重叠 —— 上一版为救「只剩一个名字」把 hideOverlap 整个关了,
 * 结果缩放到多组时全撞一起(Frank 实拍)。正解 = 留沟 + hideOverlap 照常开:
 * 挤得下就全显,挤不下自动隐,放大即回。
 */
export const LABEL_GAP = 14

/**
 * 标签盒宽的下限(px;再窄一个字也放不下)。
 */
export const LABEL_W_MIN = 30

/**
 * 年薪显示的进位单位(除以它再取整 = 多少 K)。
 */
export const MONEY_UNIT = 1000

/**
 * 金额前缀(加元与美元同符号,本站只出加元,不再加币种前缀)。
 */
export const MONEY_SIGN = '$'

/**
 * 金额的千元后缀。
 */
export const MONEY_SUFFIX = 'K'

/**
 * 同一行里两段文字之间的间隔(全角空格 —— 全站禁「·」「/」杂糅,这里是同一条信息的两段)。
 */
export const CELL_GAP = '　'

/**
 * tooltip 首行加粗的开标签(echarts 的 formatter 收的是 HTML 串)。
 */
export const TIP_B_OPEN = '<b>'

/**
 * tooltip 首行加粗的闭标签。
 */
export const TIP_B_CLOSE = '</b>'

/**
 * tooltip 里的换行(echarts 的 formatter 收的是 HTML 串)。
 */
export const TIP_BR = '<br/>'

/**
 * 全屏态的浏览器事件名(用户按 ESC / 返回手势退出时也要还原图高,所以听它不自己记状态)。
 */
export const FS_EVENT = 'fullscreenchange'

/**
 * 全屏后要锁的屏幕朝向(Frank 2026-08-02「变成横屏的全屏」)。
 */
export const ORIENT_LANDSCAPE = 'landscape'

/**
 * 伪全屏时给 body 挂的溢出档(锁滚动:身后那页不许再跟着手指走)。
 */
export const OVERFLOW_HIDDEN = 'hidden'

/**
 * 窗口尺寸变化的事件名(图要跟着重算尺寸)。
 */
export const WINDOW_RESIZE_EVENT = 'resize'

/**
 * echarts 实例的点击事件名(下钻靠它)。
 */
export const CHART_CLICK_EVENT = 'click'

/**
 * 没挂点击回调时给每个系列改成的光标。铁律「不能点就不要 hover 和小手」
 * (Frank 2026-07-31):echarts 系列默认 cursor:pointer,没挂点击回调的图
 * (landing 主图、末级下钻)柱子悬停会出小手但点了没反应 → 集中归 default。
 */
export const CURSOR_DEFAULT = 'default'

/**
 * 主图簇内各系列的配色轮盘(按序号取模取用;10 个够 10 个省一省一色)。
 */
export const MC_PAL = [
  '#2563eb',
  '#f59e0b',
  '#10b981',
  '#8b5cf6',
  '#ef4444',
  '#06b6d4',
  '#84cc16',
  '#ec4899',
  '#6366f1',
  '#94a3b8',
]

/**
 * 柱系列的 echarts 类型名。
 */
export const SERIES_BAR = 'bar'

/**
 * 中位年薪线的 echarts 类型名。
 */
export const SERIES_LINE = 'line'

/**
 * 分省形态下各省系列的柱间距:'-100%' = 各省系列叠在同一格里 → 每格只有一根柱,占满该格。
 */
export const BAR_GAP_OVERLAP = '-100%'

/**
 * 分省形态下类目之间的留白(占格宽的百分比)。
 */
export const BAR_CATEGORY_GAP = '12%'

/**
 * tooltip 的触发方式(整条类目触发,不是单根柱)。
 */
export const TIP_TRIGGER = 'axis'

/**
 * tooltip 的指示器(整格投影,不画竖线)。
 */
export const TIP_POINTER = {
  /**
   * 指示器形状:整格投影。
   */
  type: 'shadow',
}

/**
 * tooltip 的字号档(手机上不能再大,否则一屏放不下)。
 */
export const TIP_TEXT_STYLE = {
  /**
   * 字号(手机上不能再大,否则一屏放不下)。
   */
  fontSize: 12,
}

/**
 * 图例的滚动形态(系列多到一行放不下时横向滚动,不折成三行占掉图高)。
 */
export const LEGEND_TYPE = 'scroll'

/**
 * 图例距图底的距离(px;要让开下面的缩放滑块)。
 */
export const LEGEND_BOTTOM = 36

/**
 * 图例色块的宽(px)。
 */
export const LEGEND_ITEM_W = 11

/**
 * 图例色块的高(px)。
 */
export const LEGEND_ITEM_H = 11

/**
 * 图例文字的样式(灰字小号 —— 它是索引不是内容)。
 */
export const LEGEND_TEXT_STYLE = {
  /**
   * 字号(小注档)。
   */
  fontSize: 11.5,

  /**
   * 灰字。
   */
  color: '#6b7280',
}

/**
 * 绘图区距容器左边(px)。
 */
export const GRID_LEFT = 8

/**
 * 有右轴时绘图区距容器右边(px)。
 */
export const GRID_RIGHT_MED = 8

/**
 * 无右轴时绘图区距容器右边(px;不用给薪资刻度留位置)。
 */
export const GRID_RIGHT_PLAIN = 4

/**
 * 绘图区距容器顶(px)。
 */
export const GRID_TOP = 12

/**
 * 多系列时绘图区距容器底(px;要同时容下图例与缩放滑块)。
 */
export const GRID_BOTTOM_MULTI = 62

/**
 * 单系列时绘图区距容器底(px;没有图例,只留滑块)。
 */
export const GRID_BOTTOM_ONE = 40

/**
 * 横轴的类目型。
 */
export const AXIS_TYPE_CATEGORY = 'category'

/**
 * 纵轴的数值型。
 */
export const AXIS_TYPE_VALUE = 'value'

/**
 * 横轴不画刻度小竖线(类目名自己就是刻度)。
 */
export const AXIS_TICK_HIDDEN = {
  /**
   * 不画刻度小竖线。
   */
  show: false,
}

/**
 * 横轴轴线的颜色档(与全站描边灰同值)。
 */
export const AXIS_LINE_STYLE = {
  /**
   * 轴线的线型。
   */
  lineStyle: {
    /**
     * 描边灰(与全站 --border 同值;canvas 读不到 CSS 变量,只能写字面量)。
     */
    color: '#e5e7eb',
  },
}

/**
 * 横轴标签的字号(px)。
 */
export const X_LABEL_FONT = 10.5

/**
 * 横轴标签的字色(灰 —— 名字是索引不是内容)。
 */
export const X_LABEL_COLOR = '#6b7280'

/**
 * 横轴标签的旋转角:0 = 不斜排。轴标签**往下折行显示全名**
 * (Frank 2026-07-28「名字可以往下扩展,显示完整,因为有很多空间」)——
 * 原来横排斜切 7 个字,中文短名勉强,英文直接成了「Transpo…」「Food co…」(他实拍),
 * 而英文用户是主要人群。
 */
export const X_LABEL_ROTATE = 0

/**
 * 横轴标签超宽时折行(echarts 原生 overflow:'break';Frank「echart 本身就有这个功能」)。
 */
export const X_LABEL_OVERFLOW = 'break'

/**
 * 横轴标签区的高度上限(px;配 lineOverflow 封顶三行,底部留出三行的位置)。
 */
export const X_LABEL_H = 38

/**
 * 折到超过高度上限时截断(echarts 原生 lineOverflow:'truncate')。
 */
export const X_LABEL_LINE_OVERFLOW = 'truncate'

/**
 * 横轴标签的行距(px)。
 */
export const X_LABEL_LINE_H = 12.5

/**
 * 横轴标签与轴线之间的留白(px;grid.containLabel 会据此自动留边距)。
 */
export const X_LABEL_MARGIN = 10

/**
 * 左轴的刻度最小步长:岗位数是整数(Frank 实拍「0.2 个岗位」—— 排到只有 1 个岗的职业时
 * 轴会自动切小数)。
 */
export const Y_MIN_INTERVAL = 1

/**
 * 左轴的分隔线颜色档(极浅灰,只是给眼睛一个横向参照)。
 */
export const Y_SPLIT_LINE = {
  /**
   * 分隔线的线型。
   */
  lineStyle: {
    /**
     * 极浅灰(只是给眼睛一个横向参照)。
     */
    color: '#f3f4f6',
  },
}

/**
 * 两根轴的刻度文字样式(灰字小号)。
 */
export const Y_LABEL_STYLE = {
  /**
   * 字号(刻度是索引不是内容)。
   */
  fontSize: 11,

  /**
   * 最浅灰。
   */
  color: '#9ca3af',
}

/**
 * 右轴不画分隔线(左轴那套横线已经够了,再来一套会织成网)。
 */
export const Y2_SPLIT_LINE = {
  /**
   * 不画分隔线(左轴那套横线已经够了,再来一套会织成网)。
   */
  show: false,
}

/**
 * 中位年薪线挂在第几根纵轴上(0 是岗位数轴,1 是薪资轴)。
 * 双轴的理由:量纲差两个数量级,同轴会把薪资线压成一条平线。
 */
export const MED_AXIS_INDEX = 1

/**
 * 中位年薪线的数据点形状。
 */
export const MED_SYMBOL = 'circle'

/**
 * 不分省时中位年薪线的点径(px)。
 */
export const MED_SYMBOL_SIZE = 5

/**
 * 不分省时中位年薪线的层级(压在柱子之上)。
 */
export const MED_Z = 5

/**
 * 不分省时中位年薪线的线型(深色两像素,读得出是主线)。
 */
export const MED_LINE_STYLE = {
  /**
   * 线宽(读得出是主线)。
   */
  width: 2,

  /**
   * 近黑(与全站 --text 同值)。
   */
  color: '#111827',
}

/**
 * 中位年薪线数据点的色(与线同色)。
 */
export const MED_ITEM_STYLE = {
  /**
   * 数据点的色(与线同色)。
   */
  color: '#111827',
}

/**
 * 分省时中位年薪线的点径(px;点多,要更小才不糊成一条带)。
 */
export const PROV_MED_SYMBOL_SIZE = 3

/**
 * 分省时中位年薪线的层级(比不分省那根再高一档,压过密集的柱)。
 */
export const PROV_MED_Z = 6

/**
 * 分省时中位年薪线的线型(细一档)。
 */
export const PROV_MED_LINE_STYLE = {
  /**
   * 线宽(细一档 —— 分省时点密,粗线会糊成一条带)。
   */
  width: 1.4,

  /**
   * 近黑(与全站 --text 同值)。
   */
  color: '#111827',
}

/**
 * 缩放:图内滚轮/双指(不占版面的那一种)。
 */
export const ZOOM_INSIDE = 'inside'

/**
 * 缩放:图底的滑块(手指拖得动的那一种)。
 */
export const ZOOM_SLIDER = 'slider'

/**
 * 缩放窗的左端(恒从第一个类目起,首屏窗只调右端)。
 */
export const ZOOM_START = 0

/**
 * 缩放滑块的高(px)。
 */
export const ZOOM_H = 18

/**
 * 缩放滑块距图底的距离(px)。
 */
export const ZOOM_BOTTOM = 8

/**
 * 缩放滑块不画描边。
 */
export const ZOOM_BORDER = 'transparent'

/**
 * 缩放滑块的槽色(极浅灰)。
 */
export const ZOOM_BG = '#f3f4f6'

/**
 * 缩放滑块选中区的填色(品牌蓝极淡,盖在图上仍看得见柱子)。
 */
export const ZOOM_FILLER = 'rgba(37,99,235,.12)'

/**
 * 缩放滑块两端手柄的样式(品牌蓝实心)。
 */
export const ZOOM_HANDLE_STYLE = {
  /**
   * 品牌蓝实心(与全站 --primary 同值)。
   */
  color: '#2563eb',
}

/**
 * 缩放滑块两端文字的样式(灰字最小号 —— 它只是范围提示)。
 */
export const ZOOM_TEXT_STYLE = {
  /**
   * 字号(全站最小的一档 —— 它只是范围提示)。
   */
  fontSize: 10,

  /**
   * 最浅灰。
   */
  color: '#9ca3af',
}
