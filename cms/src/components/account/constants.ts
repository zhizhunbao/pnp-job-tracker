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
 * 昵称输入框外壳的全局类名(`main.css` 里 `.acctNickBox { display:inline-block;
 * width:160px }`)—— 它定死编辑态输入框的宽,不随内容伸缩。本页专属,留在全局层是
 * 历史位置,迁类时原样保留,别改名(改名要连 main.css 一起改)。
 */
export const NICK_BOX_CLS = 'acctNickBox'

/**
 * 改名铅笔钮的字符。图标是**内容**不是样式,归常量不进 css;这里用字符而不是
 * icons 域的 lucide 件,是因为原样式按 15px 字号排版(换成 svg 会改变基线)。
 */
export const NICK_EDIT_MARK = '✎'

/**
 * 保存类钮忙态的钮面文字(三点省略号;昵称保存与档案保存共用)。它不是文案是
 * **状态指示**,三语一样,所以不进 i18n —— 进了反而要为三门语言各写一遍同一个字符。
 * (2026-08-27 换装批自 NICK_BUSY_MARK 扩名:档案保存钮的忙态是同一枚记号。)
 */
export const BUSY_MARK = '…'

/**
 * 邮箱的域名分隔符。昵称为空时显示名回退成邮箱的 @ 前缀 —— 切错这个字符
 * 会把整个邮箱当成名字显示在身份行上,而那是**泄露**不是显示。
 */
export const EMAIL_AT = '@'

/**
 * 昵称最大字数。40 是「够写中英文全名 + 一点花样」又不至于把身份行撑破的档
 * (身份行的名字不许折行,见 account.module.css 的 .nickName)。
 */
export const NICK_LEN_MAX = 40

/**
 * 昵称输入框的尺寸档(input 域的 sm = 32px 高)。身份行是**行内**编辑,
 * 用最矮那档才不会把 52px 头像那一行顶高。
 */
export const NICK_INPUT_SIZE = 'sm'

/**
 * 身份行头像的直径像素。52 比全站默认 36 大一档 —— 账户页是「这是我」的确认页,
 * 头像在这里是主角;这个数同时撑着昵称那一行的行高(见 .nickEdit 的注释)。
 */
export const AVATAR_SIZE_PX = 52

/**
 * 正文轨(Shell)的上内衬档(px)。2026-08-28 骨架归一批:上下留白从 AccountColumns
 * 自带的 `margin: 2.5rem` 交给正文轨 —— 那是 45px(main.css 把 rem 基准冻结在 18px),
 * 而 Shell 的档位表里没有 45,取最近的 40 档,余下的 5px 留在 .columns 的 margin 上,
 * 成品间距仍与旧页逐像素相等(不为一个页面往全站档位表里加档)。
 */
export const SHELL_TOP = 40

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
 * 节导航表:键 = 节标识(同 URL 深链 `?sec=` 的取值),labelKey = 该节标题的 i18n 键。
 * 侧栏标签**复用各节标题键**而不是另起一套侧栏文案 —— 两处叫法必须一致,
 * 分成两套键迟早对不上(裁括号说明的活交给 functions 的 navLabelOf)。
 * 顺序即侧栏从上到下的顺序。
 */
export const SEC_TABS = [
  { sec: 'overview', labelKey: 'acct.title' },
  { sec: 'profile', labelKey: 'prof.title' },
  { sec: 'favs', labelKey: 'fav.title' },
  { sec: 'sjobs', labelKey: 'sj.title' },
  { sec: 'saved', labelKey: 'ss.title' },
  { sec: 'buy', labelKey: 'acct.buyTitle' },
] as const

/**
 * 退出登录钮的变体(组件统一 P2 #113:退出登录 = ghost 灰,危险性弱的操作走 B 映射 ——
 * 它不是危险操作,重新登录就回来了,所以不用 danger 红)。
 */
export const LOGOUT_BTN_KIND = 'ghost'

/**
 * 定制样式钮的统一底座(2026-08-26 Frank「<button 这种不允许直接使用」——
 * 裸 <button> 一律改经 button 族):ghost 底最素,视觉全由本域的加倍类定形,
 * Button 只出统一的语义与可达性(disabled/aria)。
 */
export const PLAIN_BTN_KIND = 'ghost'

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
 */
export const SEC_DEFAULT = 'overview'

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
 * 登出接口(POST;清的是服务端会话,本地答案内存另由 resetAnswersMemory 清)。
 */
export const URL_LOGOUT = '/api/users/logout'

/**
 * 发起时长包购买的接口(POST plan → 回 Checkout URL,E3-03)。
 */
export const URL_CHECKOUT = '/api/stripe/checkout'

/**
 * 改用户资料的接口前缀(PATCH `/api/users/:id`,本人可改;昵称保存走这里)。
 */
export const URL_USER_HEAD = '/api/users/'

/**
 * fetch 的凭据档:同源带 cookie(账户页所有请求都要认人)。
 */
export const CRED_INCLUDE = 'include'

/**
 * POST 方法字(登出与发起购买)。
 */
export const METHOD_POST = 'POST'

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
 * Checkout 发起的统计事件名(E7-02;umami 由环境注入,没有就不发)。
 */
export const EV_CHECKOUT = 'checkout'

/**
 * 30 天时长包的档位标识(发给 /api/stripe/checkout 的 plan 值,也是 umami 事件的属性值)。
 */
export const PLAN_30 = '30'

/**
 * 90 天时长包的档位标识(同上;Pro 也可续买,到期日顺延)。
 */
export const PLAN_90 = '90'

/**
 * 收藏岗清单的拉取地址(E9-01;access 本人,按更新时间新前旧后)。
 */
export const URL_SAVED_JOBS_LIST = '/api/saved-jobs?limit=200&depth=0&sort=-updatedAt'

/**
 * 单条收藏的接口前缀(PATCH 改看板状态 / DELETE 移除,拼上记录 id)。
 */
export const URL_SAVED_JOB_HEAD = '/api/saved-jobs/'

/**
 * 已存筛选清单的拉取地址(E5-03;access 本人)。
 */
export const URL_SAVED_SEARCHES_LIST = '/api/saved-searches?limit=20&depth=0'

/**
 * 单条已存筛选的接口前缀(DELETE,拼上记录 id)。
 */
export const URL_SAVED_SEARCH_HEAD = '/api/saved-searches/'

/**
 * DELETE 方法字(移除收藏 / 删已存筛选)。
 */
export const METHOD_DELETE = 'DELETE'

/**
 * 收藏行「查看」链接的前缀:回职位板按职位名搜(拼上 encodeURIComponent 后的职位名)。
 */
export const Q_SEARCH_HEAD = '/?q='

/**
 * 看板状态下拉的档表(E9-01:想投/已投/面试中/offer)。key = 档名的 i18n 键
 * (sj.st.*)。2026-08-27 自 SavedJobsList.tsx 的 STATUSES 迁入,键从拼串改整键落表。
 */
export const SJ_STATUS_TABS = [
  { st: 'wish', key: 'sj.st.wish' },
  { st: 'applied', key: 'sj.st.applied' },
  { st: 'interview', key: 'sj.st.interview' },
  { st: 'offer', key: 'sj.st.offer' },
] as const

/**
 * 看板状态的默认档(没标过 = 想投;与旧渲染 `status || 'wish'` 同口径)。
 */
export const SJ_STATUS_DEFAULT = 'wish'

/**
 * 收藏节看板视图的标题键(sjTitleKeysOf 按 variant 二选一)。
 */
export const SJ_TITLE_KEY = 'sj.title'

/**
 * 收藏节看板视图的灰字小注键。
 */
export const SJ_NOTE_KEY = 'sj.note'

/**
 * 收藏节纯收藏视图(#62A variant='favs')的标题键。
 */
export const FAV_TITLE_KEY = 'fav.title'

/**
 * 收藏节纯收藏视图的灰字小注键。
 */
export const FAV_NOTE_KEY = 'fav.note'

/**
 * 职位名快照缺席时的占位横杠(不是数据,是「这格没有」的显示记号)。
 */
export const TITLE_NONE_MARK = '—'

/**
 * 收藏行里公司名与「查看」链接之间的全角空格(拉开一个汉字位,不用「·」——
 * 全站禁点号杂糅)。
 */
export const SJ_SEP = '　'

/**
 * 移除收藏 × 钮的字符(同 NICK_EDIT_MARK 的理由:图标是内容不是样式)。
 */
export const DEL_MARK = '×'

/**
 * 周报开关的统计事件名(E5-07 §3.4 漏斗第 3 步:周报是留存钩的主力,
 * 订阅/退订都要能看见 —— 退订量本身就是信号)。
 */
export const EV_WEEKLY = 'weekly-optin'

/**
 * 周报开关勾选框的 input 类型字(DOM 定值;平台串起名挂注释)。
 */
export const CHECKBOX_TYPE = 'checkbox'
