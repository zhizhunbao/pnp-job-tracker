/**
 * news 域(移民动态列表 / 详情 / 评论区)的死值:地区码、图与地址、接口地址与请求词、
 * 轮播与评论的档位、全局规范类名。2026-08-27 换装批自 News.tsx 的散值收拢挂注释,
 * 值一个不改。
 *
 * @author Frank
 * @time 2026-08-27 23:30:00
 */

/**
 * 联邦档的地区码(IRCC 发布的动态;库里省码那一列用它占位,不是省)。
 */
export const REGION_FEDERAL = 'federal'

/**
 * 魁北克省码(QC 走自己的移民体系,列表与详情都要挂一句「不属 PNP」的提示)。
 */
export const REGION_QC = 'QC'

/**
 * chips 与分组的展示顺序:联邦在前,省按职位板惯例。
 */
export const NEWS_REGIONS = ['federal', 'ON', 'BC', 'AB', 'SK', 'MB', 'QC', 'NS']

/**
 * 联邦档在图块与头条角标上的代号(库里那条是 `federal`,给用户看的是发布机关的名字)。
 */
export const TEXT_IRCC = 'IRCC'

/**
 * 联邦档在图块副行与头条角标上的地名(联邦的「地区」就是加拿大本身)。
 */
export const TEXT_CANADA = 'Canada'

/**
 * 联邦档的 © 出处方(转载姿势四件套之一)。
 */
export const PUBLISHER_FEDERAL = 'Government of Canada'

/**
 * 魁北克的 © 出处方:用官方法文名(它的官方发布本来就是法文口径)。
 */
export const PUBLISHER_QC = 'Gouvernement du Québec'

/**
 * 其余省的 © 出处方前缀(拼上省全名)。
 */
export const PUBLISHER_PROV_HEAD = 'Government of '

/**
 * 省份地标图的路径头(本站静态图,来源见 `public/img/regions/SOURCES.md`)。
 */
export const REGION_IMG_HEAD = '/img/regions/'

/**
 * 省份地标图的扩展名。
 */
export const REGION_IMG_TAIL = '.jpg'

/**
 * 有真实地标图的省码(全小写,与文件名一致)。
 * #206(第 26 轮体检):NB/NL/PE 没有地标图,原来照拼路径 → `/img/regions/nb.jpg` 404 裂图
 * (全站唯一 4xx)。缺图退联邦通用图,不拿别省照片冒充;补齐真实地标照后把省码加进来即可。
 */
export const REGION_IMG_CODES = ['ab', 'bc', 'mb', 'ns', 'on', 'qc', 'sk']

/**
 * 地标图的致谢(挂 img 的 title 悬停 —— Frank 2026-07-18「水印去掉」,
 * CC BY/BY-SA 的致谢不能全删,挪到 hover)。
 */
export const IMG_CREDIT = 'Wikimedia Commons'

/**
 * 单条动态详情页的地址头(拼上 slug)。
 */
export const URL_NEWS_HEAD = '/news/'

/**
 * 动态列表页自身的地址(二级导航当前页 + 详情页的返回落点)。
 */
export const URL_NEWS = '/news'

/**
 * 时间线页的地址(二级导航的另一格)。
 */
export const URL_TIMELINE = '/timeline'

/**
 * 未登录时评论区那条引导的去处(首页带 `login=1` 自动弹登录框 ——
 * 全站登录入口只有那一个)。
 */
export const URL_LOGIN = '/?login=1'

/**
 * 发评论的接口(POST;落库为 pending,人工审核过了才公开)。
 */
export const API_COMMENTS = '/api/comments'

/**
 * AI 速读按需生成的接口(POST;服务端写回 DB = 永久缓存)。
 */
export const API_NEWS_SUMMARIZE = '/api/news/summarize'

/**
 * 懒翻译的接口(POST;编号协议服务端校验对齐后写回 DB)。
 */
export const API_NEWS_TRANSLATE = '/api/news/translate'

/**
 * 请求方法(三个接口都是 POST)。
 */
export const METHOD_POST = 'POST'

/**
 * 带上同源 cookie(发评论要认登录态)。
 */
export const CRED_INCLUDE = 'include'

/**
 * 请求体类型头的名字。
 */
export const HDR_CONTENT_TYPE = 'Content-Type'

/**
 * 请求体类型头的值。
 */
export const MIME_JSON = 'application/json'

/**
 * 头条轮播的换片间隔(毫秒;hover 暂停,单条不轮)。
 */
export const SLIDE_MS = 5000

/**
 * 开始轮播所需的最少条数(只有一条就没有「下一条」)。
 */
export const SLIDE_MIN = 2

/**
 * 右列并排显示的其余头条条数(v4 BBC/Reuters 式 1 大 + 4 小)。
 */
export const SIDE_MAX = 4

/**
 * 上一张(轮播左箭头一次退一格)。
 */
export const STEP_PREV = -1

/**
 * 下一张(轮播右箭头一次进一格)。
 */
export const STEP_NEXT = 1

/**
 * 左箭头的字形(单书名号,不用图标字体)。
 */
export const ARROW_PREV = '‹'

/**
 * 右箭头的字形。
 */
export const ARROW_NEXT = '›'

/**
 * 上一张箭头的无障碍名。⚠️ 这三条 aria 文案与原版一样是**未翻译的英文** ——
 * 可翻译文案的家是 lib/i18n,但本批的范围只到 components/news,加键属于另一批;
 * 挪进来至少让它们有名字、有注释,补三语时改这一处即可。
 */
export const ARIA_PREV = 'prev'

/**
 * 下一张箭头的无障碍名(说明同 ARIA_PREV)。
 */
export const ARIA_NEXT = 'next'

/**
 * 轮播圆点无障碍名的前缀,拼上从 1 数的张序(说明同 ARIA_PREV)。
 */
export const ARIA_SLIDE_HEAD = 'slide '

/**
 * 挂红「重要」徽标的重要度下限(P1d 立、P1f 收窄:只给满分 5 挂 ——
 * 琥珀「关注」档 Frank 拍板删,没用)。
 */
export const IMP_MIN = 5

/**
 * 徽标悬停提示里两截之间的换行(属性也是 UI 文案,全站禁「·」杂糅,一行一条)。
 */
export const TIP_SEP = '\n'

/**
 * 正文段落之间的分隔(两个及以上换行 = 分段;段内单个换行保真渲成 `<br>`)。
 */
export const PARA_SEP_RE = /\n{2,}/

/**
 * 段内换行(联系人块这类要逐行保真)。
 */
export const LINE_SEP = '\n'

/**
 * 「没有」的空文本(取不到译名/摘要时的返回值)。与 companies/account 域同名同义,各家一份。
 */
export const TEXT_NONE = ''

/**
 * 中文界面的语言码(速读与对照译文按界面语言取)。
 */
export const LANG_ZH = 'zh'

/**
 * 韩文界面的语言码。
 */
export const LANG_KO = 'ko'

/**
 * 英文界面的语言码(原文即英文,不出对照开关)。
 */
export const LANG_EN = 'en'

/**
 * 右列小卡上的日期只留「月-日」:从第 5 个字符起截(`2026-08-27` → `-08-27`),
 * 与原版逐字一致。
 */
export const DATE_MMDD_FROM = 5

/**
 * 评论输入框的字数上限(顶层与回复同一档)。
 */
export const CMT_MAX_LEN = 1000

/**
 * 顶层评论输入框的行高档。
 */
export const CMT_ROWS = 3

/**
 * 回复输入框的行高档(比顶层矮一档,它是楼中楼)。
 */
export const REPLY_ROWS = 2

/**
 * 楼内回复直接展开的条数上限:超过这个数才折叠成「展开 N 条回复」。
 */
export const REPLIES_OPEN_MAX = 3

/**
 * 评论区的锚点 id(详情页可用 `#comments` 直达)。
 */
export const ANCHOR_COMMENTS = 'comments'

/**
 * 头像取名字首字母;名字为空时的占位字符。
 */
export const AVATAR_FALLBACK = '?'

/**
 * 评论区总开关(#95 暂藏后亮回:Frank「新闻资讯板块完全参考」内容站评论形态,
 * 拍板 = 开;日审归 Frank)。
 */
export const COMMENTS_ON = true

/**
 * 在途状态:闲置(可以再发一次)。发评论、AI 速读、懒翻译三处共用同一套档名。
 */
export const STATE_IDLE = 'idle'

/**
 * 在途状态:在途(钮禁用,防重复发)。
 */
export const STATE_BUSY = 'busy'

/**
 * 在途状态:已提交(评论落库成 pending,显示「待审核」提示)。
 */
export const STATE_SENT = 'sent'

/**
 * 在途状态:失败(挂一句错误提示;不静默降级、不留白)。
 */
export const STATE_ERR = 'err'

/**
 * 转载姿势里 © 出处方与原文链接之间的记号(两侧留空格;这里是同一条来源的两段,
 * 不是并列的多条信息 —— 全站「一行一条」的禁令针对的是拿它杂糅多条)。
 */
export const SRC_SEP = ' · '

/**
 * AI 速读标题与「机器生成」小注之间的记号(两侧留空格;同一条说明的两段,
 * 不是并列的多条信息)。
 */
export const GEN_SEP = ' · '

/**
 * AI 速读的闪电前缀(钮面与速读框标题共用)。
 */
export const BOLT_PREFIX = '⚡ '

/**
 * 列表行脚上评论数的气泡前缀。
 */
export const CMT_PREFIX = '💬 '

/**
 * banner 与本页在 banner 域里的模块名(定配色档与图组)。
 */
export const BANNER_MODULE = 'news'

/**
 * 二级导航的模块色档(资讯 = 青)。
 */
export const TABS_TONE = 'teal'

/**
 * 列表页正文轨的上内衬档(px)。
 */
export const SHELL_TOP_LIST = 16

/**
 * 详情页正文轨的上内衬档(px)。
 */
export const SHELL_TOP_DETAIL = 18

/**
 * 定制样式钮的统一底座(2026-08-26 Frank「<button 这种不允许直接使用」——
 * 裸 `<button>` 一律改经 button 族):ghost 底最素,视觉全由本域的加倍类定形。
 */
export const PLAIN_BTN_KIND = 'ghost'

/**
 * 新开页的 target(原文链接指向官方站,LinkButton 见到它自动补 `rel="noreferrer"`)。
 */
export const TARGET_BLANK = '_blank'

/**
 * 手机触控靶的全局类名(真身在 main.css,整段裹在 `max-width: 640px` 里,桌面不生效)。
 * 🔴 地区筛选这排药丸是例外:第 27 轮实测伪元素热区**会被相邻元素抢点**(成排小控件
 * 光靠 `::after` 点不中),所以全局层另有一条 `.nwChips button.tapPad` 给它们补真实高度
 * (min-height 36)。也就是说这个类挂在筛选药丸上时真正起作用的是那条限定规则,
 * 所以它必须和下面的 CHIPS_SCOPE_CLS 一起出现,单挂这一个点不中。
 * 是全局层的类、不是本域 module.css 的哈希名,所以只能按这个固定字符串写。
 */
export const CLS_TAP_PAD = 'tapPad'

/**
 * 地区筛选行的全局作用域类名。它自己不画样式,是给 main.css 那条
 * `.nwChips button.tapPad` 当**限定前缀**用的 —— 触控靶的真实高度只在这一排药丸上加,
 * 别处的 tapPad 不受影响。与本域 module.css 的 `chips` 叠着写:全局类管跨页统一的
 * 触控行为,module 类管这一行自己的排布(形制同 footer 域的 SF_LINKS_CLS)。
 */
export const CHIPS_SCOPE_CLS = 'nwChips'

/**
 * 整行可点的全局 hover 类(2026-07-31 hover 统一:行 = 底色高亮,不整块变暗发灰)。
 * 真身在 main.css 第 2 段,靠 `!important` 压行内,全站共用 —— 留全局,不进本域。
 */
export const CLS_ROW_HOVER = 'rowHover'

/**
 * 整卡可点的全局 hover 类(卡 = 蓝框 + 浅底)。同上留全局。
 */
export const CLS_CARD_HOVER = 'cardHover'

/**
 * 类名之间的分隔(拼全局规范类与本域 module 类时用)。
 */
export const CLS_SEP = ' '
