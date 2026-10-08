/**
 * account 页面域的死值(2026-08-26 页面「纯拼装门」改造批:page.tsx 里散着的
 * 类名、字符、尺寸、节表全部搬到这里挂注释 —— 闸 local/no-bare-strings 与
 * local/no-magic-number 要的就是「每个值都有名字和说明书」)。
 *
 * @author Frank
 * @time 2026-08-26 20:30:20
 */

/**
 * 拼 className 时各类之间的分隔符。HTML 的 class 属性按**空白**切词,一个空格就是
 * 一次分隔 —— 写错不会报错,只会让基座类和修饰类粘成一个匹配不上的长类名,
 * 那一块当场变成没样式的裸元素。
 * (notice 域有一份同名同义的私有常量;跨域不互相取常量,各域自己声明一份。)
 */
export const CLS_SEP = ' '

/**
 * 切不出东西时的空文本。裁标签、取邮箱前缀这类切分,理论上切完可能一格都不剩
 * (`String.prototype.split` 的返回值在类型上带 undefined)—— 那时**宁可显示空**,
 * 也不要把 `undefined` 或整条原串渲到页面上。
 */
export const TEXT_NONE = ''

/**
 * 白卡壳的全局类名。描边 + 圆角 + 白底那份真身写在 main.css 第 9 段的全局层,
 * 不是 CSS Module 生成的哈希名,所以取不到 `css.card`,只能按这个固定字符串拼。
 * 本域的 `.side` / `.main` 叠在它之上,只管密度与排布。
 */
export const CARD_CLS = 'card'

/**
 * 正文轨(Shell)的上内衬档(px)。2026-08-28 骨架归一批:上下留白从 AccountColumns
 * 自带的 `margin: 2.5rem` 交给正文轨 —— 那是 45px(main.css 把 rem 基准冻结在 18px),
 * 而 Shell 的档位表里没有 45,取最近的 40 档,余下的 5px 留在 .columns 的 margin 上,
 * 成品间距仍与旧页逐像素相等(不为一个页面往全站档位表里加档)。
 * 2026-10-05 页头加了 banner(Frank「我的 也需要 banner 吧」):上内衬改 16,与资讯这类带 banner 的列表页同档。
 */
export const SHELL_TOP = 16

/**
 * 正文轨(Shell)的下内衬档(px)。同上内衬:原 `margin-bottom: 2.5rem` = 45px
 * 拆成 40 档 + .columns 留的 5px。⚠️ 必须点名 —— Shell 不传 bottom 是 32px 默认档。
 */
export const SHELL_BOTTOM = 40

/**
 * sidebar 标签的裁切点:中英文两种左括号。侧栏标签复用各节的标题键,裁掉括号里的
 * 说明(「升级 Pro(一次性时长包…)」整条进侧栏太长,会把 190px 的一列撑破)。
 */
export const SEC_LABEL_CUT_RE = /[((]/

/**
 * 我的简历节的节标识(同 URL 深链 `?sec=` 的取值;简历存档件独占这一节)。它同时是**默认落点**,
 * 见下面的 SEC_DEFAULT —— 那一格直接引它,不再抄第二遍字面量(同一个节两个名字,改一处漏一处
 * 就是死链)。2026-09-23 概览节撤掉时立,默认落点的身份从概览节接过来。
 */
export const SEC_RESUME = 'resume'

/**
 * 我的收藏节的节标识(#62A:同一份收藏数据的纯列表视图)。
 * 它也是收藏列表件的视图档名 —— 那一件按 `variant='favs'` 从看板切成纯列表,
 * 说的是同一件事(这一节要的是收藏视图),所以两处共用这一个名字。
 */
export const SEC_FAVS = 'favs'

/**
 * 收藏看板节的节标识(E9-01:想投/已投/面试中/offer 四档看板)。
 */
export const SEC_SJOBS = 'sjobs'

/**
 * 我的订阅节的节标识(2026-10-04 Frank「升级 Pro 这个删了,放到 我的 模块里,加一个我的订阅」:
 * 账户下拉的「升级 Pro」挪进来,当前套餐 + 升级 / 续买一颗钮,钮打开全站同一个定价框)。
 */
export const SEC_SUB = 'sub'

/**
 * 「我的」页 banner 的模块名(2026-10-05 Frank「我的 也需要 banner 吧」:照全站模块页头「图标 + 页名 + 一句副题」;
 * 配色复用主品牌蓝,没有专属图组 = 渐变带 —— 横幅图库每组都已有板块在用,新图要另下载)。
 * 同日 Frank「可以,下吧」:新下三张专属图,图组由 banner 桶的 BANNER_IMGS.account 给。
 */
export const ACCT_BANNER_MODULE = 'account'

/**
 * 「我的」页 banner 的页名词条(与页头导航「我的」同一条,页名与入口同字)。
 */
export const ACCT_BANNER_TITLE_KEY = 'nav.mine'

/**
 * 「我的」页 banner 的副题词条。
 */
export const ACCT_BANNER_SUB_KEY = 'acct.bnSub'

/**
 * 「我的订阅」节 Pro 档的标(本域自抄,与 components/auth 的 PRO_LABEL 同字:产品名不翻)。
 */
export const PRO_LABEL = 'Pro'

/**
 * 「我的订阅」节免费档那颗「升级 Pro」的钮档(这一节唯一的主行动,蓝底)。
 */
export const UPGRADE_BTN_KIND = 'primary'

/**
 * 「我的订阅」节 Pro 档那颗「续买」的钮档(已付费,续买不抢眼:白底描边)。
 */
export const RENEW_BTN_KIND = 'secondary'

/**
 * 「我的简历」取清单的接口(2026-10-06 一人多份;id、是否默认、文件名、类型、大小、上传时刻,不带原件)。
 */
export const URL_RESUME_FILES = '/api/resume/files'

/**
 * 「我的简历」原件接口:GET 取原件、PUT 新加或替换、DELETE 删、PATCH 设默认;哪一份由 `?id=` 指明(PUT 不带 = 新加)。
 */
export const URL_RESUME_FILE = '/api/resume/file'

/**
 * 指明哪一份简历的查询参数头(拼在原件接口后)。
 */
export const Q_ID_HEAD = '?id='

/**
 * 下载参数(拼在 id 之后,服务端按附件给)。
 */
export const Q_DL_TAIL = '&dl=1'

/**
 * 缩略图 / 预览取原件时拼的版本参数头:替换了文件地址就变,浏览器与 pdf.js 都不会拿到上一份。
 */
export const Q_VER_MID = '&v='

/**
 * 每人最多几份简历(与 lib/resume 的 RESUME_FILES_MAX 是同一个数,各域各抄一份;Frank 10-06 选 5 份)。
 * 2026-10-07 Frank「我觉得可能超过 5 个简历」(投递按岗选简历):提到 20 份,两处同改。
 */
export const RESUME_FILES_MAX = 20

/**
 * 份数「2 / 5」的分隔。
 */
export const COUNT_SEP = ' / '

/**
 * 「默认」胶囊的档(tag 桶 ok 档:绿底)。
 */
export const DEFAULT_TAG = 'ok'

/**
 * 预览弹框的尺寸档(modal 桶 lg:电脑上看得清一页 Letter,手机铺满整屏)。
 */
export const PREVIEW_SIZE = 'lg'

/**
 * 上传用的请求方法(替换 = 覆盖,天然幂等,所以是 PUT 不是 POST)。
 */
export const METHOD_PUT = 'PUT'

/**
 * 上传表单里文件那一格的字段名(与 lib/resume 的 FIELD_FILE 是同一份线格式,各域各抄一份)。
 */
export const FIELD_FILE = 'file'

/**
 * 隐藏文件框的 type。
 */
export const RESUME_INPUT_TYPE = 'file'

/**
 * 文件框只让选 PDF 与 .docx(扩展名加 MIME 两种写法都给,审查 #14:手机文件选择器有的只认 MIME)。
 */
export const RESUME_ACCEPT = '.pdf,.docx,application/pdf,'
  + 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

/**
 * 上传前在浏览器里先挡一道的大小上限(5 MB;服务端还会再判一次,这道只为不白传)。
 */
export const RESUME_MAX_BYTES = 5 * 1024 * 1024

/**
 * PDF 的 MIME(决定画缩略图还是画 Word 占位)。
 */
export const MIME_PDF = 'application/pdf'

/**
 * Word 占位页上的类型字样(文件类型代号,不翻译)。
 */
export const DOCX_BADGE = 'DOCX'

/**
 * 下载钮的 target:本页。带了 target 才走裸 <a>(LinkButton 的规矩)—— 不带就走 next/link,
 * 它会预取这条原件地址、点下去还先试客户端切页,白白多拉一次原件。
 */
export const TARGET_SELF = '_self'

/**
 * 一 KB 的字节数。
 */
export const BYTES_KB = 1024

/**
 * 一 MB 的字节数。
 */
export const BYTES_MB = 1024 * 1024

/**
 * 大小的单位字样:KB(带前导空格,接在数字后)。
 */
export const UNIT_KB = ' KB'

/**
 * 大小的单位字样:MB。
 */
export const UNIT_MB = ' MB'

/**
 * MB 保留的小数位。
 */
export const MB_DIGITS = 1

/**
 * 「我的简历」报错为空串 = **没有错**(不出那一行红字)。
 */
export const RF_ERR_NONE = ''

/**
 * 服务端错误码 → 报错文案键;表里没有的(网络断、500)一律落「上传失败,稍后再试」。
 */
export const RF_ERR_KEY: Record<string, string> = {
  /**
   * 不是 PDF / .docx(服务端按文件头判)。
   */
  type: 'rf.err.type',

  /**
   * 超过 5 MB。
   */
  size: 'rf.err.size',

  /**
   * 今天上传次数用完。
   */
  limit: 'rf.err.limit',

  /**
   * 已经 5 份了(2026-10-06 一人多份)。
   */
  full: 'rf.err.full',
}

/**
 * 表里查不到的报错落点。
 */
export const RF_ERR_FALLBACK = 'rf.err.net'

/**
 * 浏览器端先挡的两种错(不发请求,直接给对应文案):文件太大。
 */
export const RF_ERR_SIZE = 'size'

/**
 * 「选择文件 / 替换文件」钮档:第一次来是主行动(蓝底),替换时退成描边。
 */
export const RF_PICK_KIND = 'primary'

/**
 * 卡片上几颗操作钮的钮档(预览 / 替换 / 下载 / 删除:白底描边)。
 */
export const RF_ACT_KIND = 'secondary'

/**
 * 「确认删除」的钮档(删了不可逆,红色)。
 */
export const RF_DANGER_KIND = 'danger'

/**
 * 预览弹框里一页一张画布的标签名。
 */
export const CANVAS_TAG = 'canvas'

/**
 * 缩略图画第几页(第一页就够认出是哪份)。
 */
export const THUMB_PAGE = 1

/**
 * 量 PDF 原始宽度用的缩放(1 = 原尺寸,再按画布宽度算真缩放)。
 */
export const THUMB_BASE_SCALE = 1

/**
 * 预览缩放下限(1 = 整页放得下的大小;2026-10-06 Frank「这个可以鼠标滚动放大缩小吧」「可以,做吧」)。
 */
export const ZOOM_MIN = 1

/**
 * 预览缩放上限(3 倍看得清小字)。
 */
export const ZOOM_MAX = 3

/**
 * 「+ / −」钮点一下的倍率。
 */
export const ZOOM_STEP = 1.25

/**
 * 鼠标滚轮换算缩放的系数:倍率 = e^(−deltaY × 系数);滚一格 deltaY 约 100,约放大 1.2 倍。
 */
export const ZOOM_WHEEL_K = 0.002

/**
 * 触控板双指捏合的系数(浏览器把它报成带 ctrlKey 的滚轮,deltaY 只有个位数,系数要大些)。
 */
export const ZOOM_PINCH_K = 0.01

/**
 * 缩放停下多久后按新倍数重画当前页(毫秒;缩放进行中只拉伸已有画面,停了再画清楚)。
 */
export const ZOOM_SETTLE_MS = 200

/**
 * 重画时画布最长边的像素上限(3 倍 × 高清屏会到四五千像素,手机内存吃不消)。
 */
export const ZOOM_PX_MAX = 4096

/**
 * 倍数换百分比。
 */
export const ZOOM_PCT = 100

/**
 * 百分号。
 */
export const PCT_SIGN = '%'

/**
 * 整页视图(倍数 1、不平移):开框、翻页、双击、点百分比都回到它。
 */
export const ZOOM_HOME = {
  /**
   * 倍数 1。
   */
  zoom: 1,

  /**
   * 不横移。
   */
  x: 0,

  /**
   * 不竖移。
   */
  y: 0,
}

/**
 * 滚轮事件名(要拦掉浏览器默认的滚动 / 整页缩放,只能原生挂、且不能是被动监听)。
 */
export const EV_WHEEL = 'wheel'

/**
 * 滚轮监听的选项:非被动,才能 preventDefault。
 */
export const WHEEL_OPTS = {
  /**
   * 非被动。
   */
  passive: false,
}

/**
 * 求中心用的除数(尺寸 / 2 = 中心;平移上限 = 放大多出来的一半)。
 */
export const CENTER_DIV = 2

/**
 * CSS 像素单位。
 */
export const PX = 'px'

/**
 * transform 串:平移开头。
 */
export const TF_HEAD = 'translate('

/**
 * transform 串:平移两个分量之间。
 */
export const TF_MID = 'px, '

/**
 * transform 串:平移收尾、缩放开头。
 */
export const TF_SCALE = 'px) scale('

/**
 * transform 串:收尾。
 */
export const TF_TAIL = ')'

/**
 * 缩放钮的钮档(白底描边,同卡片操作钮)。
 */
export const RF_ZOOM_KIND = 'secondary'

/**
 * 节导航表:键 = 节标识(同 URL 深链 `?sec=` 的取值),labelKey = 该节标题的 i18n 键。
 * 侧栏标签**复用各节标题键**而不是另起一套侧栏文案 —— 两处叫法必须一致,
 * 分成两套键迟早对不上(裁括号说明的活交给 functions 的 navLabelOf)。
 * 顺序即侧栏从上到下的顺序。
 * 2026-09-23 Frank:「只保留一个 我的简历 我的收藏 我的求职 其他的能删都删了」(起因:他截图说
 * 移民档案节「基本上是完全没法用」)—— 撤概览 overview、移民档案 profile、已保存的筛选 saved、
 * 升级 Pro buy 四节,只剩三节;我的简历 resume 是新节,顶在最上面并当默认落点。它照样复用标题键:
 * rm.arch.title 只有简历存档件在用,三语值直接改成「我的简历」,不另起侧栏键。
 * 2026-10-05 简历存档件退役(换成原件卡片 ResumeFile),rm.arch.title 照旧当这一节的侧栏与节标题。
 * 旧深链 `?sec=` 带着撤掉的四个值进来,不在这张表里 → 落回默认节(见 functions 的 secLinkOf)。
 * 2026-10-04 Frank「升级 Pro 这个删了,放到 我的 模块里,加一个我的订阅」:末尾加回一节 我的订阅 sub(深链 `?sec=sub`)。
 */
export const SEC_TABS = [
  { sec: 'resume', labelKey: 'rm.arch.title' },
  { sec: 'favs', labelKey: 'fav.title' },
  { sec: 'sjobs', labelKey: 'sj.title' },
  { sec: 'sub', labelKey: 'sub.title' },
] as const

/**
 * 定制样式钮的统一底座(2026-08-26 Frank「<button 这种不允许直接使用」——
 * 裸 <button> 一律改经 button 族):ghost 底最素,视觉全由本域的加倍类定形,
 * Button 只出统一的语义与可达性(disabled/aria)。
 */
export const PLAIN_BTN_KIND = 'ghost'

/**
 * 页签条的 id 前缀(拼成 aria id;同页只有这一条,起个本域的名字免得和别处撞)。
 */
export const ACCT_TAB_ID = 'acct-tab'

/**
 * 支付成功提示的色档(notice 四色里的绿:成功)。Stripe 回跳带 `?ok=1` 时出这一条 ——
 * 钱已经付了,这是**成功**不是警告,所以不是琥珀。
 */
export const PAY_OK_KIND = 'ok'

/**
 * 未登录时的去处。登录入口全站只有一个 = /jobs 顶栏的弹框(Frank 定),
 * 本站没有独立登录页 —— 回首页并带上 `?login=1` 让它自动弹框。
 * 路径打错是**静默 404**,所以必须在这里有名字有注释。
 */
export const LOGIN_URL = '/?login=1'

/**
 * 默认落点节:进页先看概览(深链 `?sec=` 命中时由 effect 再改)。
 * 值直接引 SEC_OVERVIEW —— 「默认是哪一节」是这一格要说的事,「概览节叫什么」是那一格的事,
 * 两格同值但不是同一件事,所以留两个名字、只留一份字面量。
 * 2026-09-23 概览节撤了(Frank「只保留一个 我的简历 我的收藏 我的求职」),默认落点改成
 * 「我的简历」,值改引 SEC_RESUME —— 两个名字、一份字面量的理由照旧。
 */
export const SEC_DEFAULT = SEC_RESUME

/**
 * Stripe 回跳成功标记的查询参数名(`/account?ok=1`,由 checkout 的 success_url 带回)。
 */
export const QP_OK = 'ok'

/**
 * 回跳成功标记的「真」值(E3-03:只认 `ok=1`,别的值一律当没付)。
 */
export const QP_OK_ON = '1'

/**
 * 账户下拉深链的查询参数名(E11-02:`?sec=` 直落对应节,取值域 = SEC_TABS 的键)。
 */
export const QP_SEC = 'sec'

/**
 * 当前登录人接口(Payload 的 me 端点;带 cookie 才认得出人)。
 */
export const URL_ME = '/api/users/me'


/**
 * 改用户资料的接口前缀(PATCH `/api/users/:id`,本人可改;昵称保存走这里)。
 */
export const URL_USER_HEAD = '/api/users/'

/**
 * fetch 的凭据档:同源带 cookie(账户页所有请求都要认人)。
 */
export const CRED_INCLUDE = 'include'

/**
 * PATCH 方法字(改昵称)。
 */
export const METHOD_PATCH = 'PATCH'

/**
 * JSON 请求体的头名。
 */
export const HDR_CONTENT_TYPE = 'Content-Type'

/**
 * JSON 请求体的媒体类型。
 */
export const MIME_JSON = 'application/json'

/**
 * DELETE 方法字(移除收藏 / 删已存筛选)。
 */
export const METHOD_DELETE = 'DELETE'

/**
 * 周报开关的统计事件名(E5-07 §3.4 漏斗第 3 步:周报是留存钩的主力,
 * 订阅/退订都要能看见 —— 退订量本身就是信号)。
 * 2026-09-26 /fe Frank:同名进第一方漏斗白名单(lib/funnel 的 ALIAS;只计数不成链),
 * 订阅 / 退订按开关值分组(true / false)。
 */
export const EV_WEEKLY = 'weekly-optin'

/**
 * 周报开关勾选框的 input 类型字(DOM 定值;平台串起名挂注释)。
 */
export const CHECKBOX_TYPE = 'checkbox'
