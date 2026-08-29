/**
 * companies 域(公司详情页与公司弹框)的死值:面包屑地址与记号、返回落点、版式档、
 * 钮与框的变体档,以及公司本体族(简介五节 / 担保股别 / 四维评分 / 在招职位 / 相似雇主)
 * 用到的接口地址、正则、档位阈值与色阶。
 * 2026-08-27 换装批自 Company.tsx(页面壳半)的散值收拢挂注释(值一个不改);
 * 2026-08-28 拆域批把 jobs/Company.tsx(公司本体半)重写进本桶,它的散值一并收拢到这里。
 *
 * @author Frank
 * @time 2026-08-27 02:10:00
 */

/**
 * 面包屑首项的去处(职位板 = 本站首页;「公司」没有独立索引页,面包屑不做死链 ——
 * 中间那一格给省筛选,末项是不可点的当前页)。
 */
export const URL_HOME = '/'

/**
 * 面包屑省格的地址头(拼上编码后的省码 = 职位板按省筛选;省在这里是**可点的筛选**,
 * 不是一个不存在的省页)。
 */
export const URL_PROV_HEAD = '/?prov='

/**
 * 右上返回无历史可回时的落点(带 `back=1` 让职位板回放筛选快照 —— 与职位详情页同口径)。
 */
export const URL_BACK = '/?back=1'

/**
 * 面包屑各格之间的记号(两侧留空格;全站禁「·」杂糅,这里是层级不是并列)。
 */
export const CRUMB_SEP = ' › '

/**
 * 公司名与译名之间的间隔(全角空格 —— 灰字小注跟在人话名后面,不用「/」也不用括号)。
 */
export const ALIAS_GAP = '　'

/**
 * 中文界面的语言码(译名只在对应语言的界面出)。
 */
export const LANG_ZH = 'zh'

/**
 * 韩文界面的语言码。
 */
export const LANG_KO = 'ko'

/**
 * 英文界面的语言码(中文对照整条不出:译文与主文案同语,挂一遍就是一行两遍)。
 */
export const LANG_EN = 'en'

/**
 * 「没有」的空文本(译名不出、省码缺席时的返回值)。与 cases/account 域同名同义,各家一份。
 */
export const TEXT_NONE = ''

/**
 * 省名显示是否只出界面语(false = 出「Ontario(安大略省)」两段式 ——
 * 面包屑有横向空间,英文在前的全站口径在这里成立)。
 */
export const PROV_LOCALE_ONLY = false

/**
 * 正文轨的上内衬档(px;Shell 的档位之一,详情页统一 14)。
 */
export const SHELL_TOP = 14

/**
 * 定制样式钮的统一底座(2026-08-26 Frank「<button 这种不允许直接使用」——
 * 裸 <button> 一律改经 button 族):ghost 底最素,视觉全由本域的加倍类定形。
 */
export const PLAIN_BTN_KIND = 'ghost'

/**
 * 查无公司提示框的色档(info 灰蓝:slug 还在但岗全下线不是错误,只是这页暂时没内容)。
 */
export const NOTICE_KIND_INFO = 'info'

/**
 * 拼 className 时各类之间的分隔符。HTML 的 class 属性按**空白**切词,一个空格就是
 * 一次分隔 —— 写错不会报错,只会让基座类和修饰类粘成一个匹配不上的长类名,
 * 那一块当场变成没样式的裸元素。
 * (account / employers / notice 域各有一份同名同义的私有常量;跨域不互相取常量。)
 */
export const CLS_SEP = ' '

/**
 * 白卡壳的全局类名(main.css 第 9 段:白底 + 描边 + 12 圆角 + 12/16 内衬 + 下边距 14)。
 * 21 处消费页按这个固定串直写,不是 CSS Module 生成的哈希名,所以取不到 `css.cardMd`
 * —— 与 employers 的 CARD_CLS 同一形态。
 */
export const CARD_MD_CLS = 'cardMd'

/**
 * 卡片小标题的全局类名(main.css 第 9 段:13.5px 700 近黑 + 下边距 6)。
 * advisor / pnp 等域按同一个串直写,是跨域共用的词汇,留在全局层。
 */
export const CARD_HEAD_CLS = 'mcardHead'

/**
 * 中文对照行的全局类名(main.css 第 15 段 `.jdZh`:蓝色左竖条 + 深蓝字)。
 * 原本从 jobs/Jd.tsx 取 `JD_ZH_LINE` 这个导出常量,拆域后本桶自己声明一份
 * —— 跨域不互相取常量,值(类名)与 JD 逐句对照同一个,规范才对得上。
 */
export const JD_ZH_CLS = 'jdZh'

/**
 * 正文蓝链的全局类名(main.css 第 5 段 `.link`:品牌蓝 + 无下划线)。
 * 链接经 button 族的 LinkButton 渲染,它只管标签语义不带样式,所以颜色仍由这个类给。
 */
export const LINK_CLS = 'link'

/**
 * 新开页的 target(公司弹框里点出去的链接一律新标签页 —— 别把弹框关掉)。
 */
export const TARGET_BLANK = '_blank'

/**
 * K 调查简介五节的标记,数组顺序 = 渲染顺序(#158:先说做什么,再说在哪、多大、
 * 何时成立,最后补注)。正则也按这张表拼,加一节要三处一起改(marks / 题键表 / 正则)。
 */
export const CO_SEC_MARKS = ['WHAT', 'BASE', 'SIZE', 'FOUNDED', 'NOTE']

/**
 * 五节标记 → 小标题的文案键(#158 公司简介三节起家,后补 FOUNDED / NOTE 两节)。
 */
export const CO_SEC_KEYS: Record<string, string> = {
  /**
   * 这家公司做什么。
   */
  WHAT: 'co.f.what',

  /**
   * 总部/主要经营地(DB 有精确地址时这节让位,见 skipBase)。
   */
  BASE: 'co.f.base',

  /**
   * 规模(雇员数一档)。
   */
  SIZE: 'co.f.size',

  /**
   * 成立年份。
   */
  FOUNDED: 'co.f.founded',

  /**
   * 补注(前四节装不下的一句)。
   */
  NOTE: 'co.f.note',
}

/**
 * 按五节标记切分简介原文的正则(带捕获组 —— `split` 会把标记本身也留在结果里,
 * 于是「标记, 正文, 标记, 正文…」交替成对取)。
 */
export const CO_SEC_SPLIT_RE = /\[(WHAT|BASE|SIZE|FOUNDED|NOTE)\]/

/**
 * 判简介是不是存量散文(整段没有任何五节标记 = 老格式,整段渲一块不切节)。
 */
export const CO_SEC_HAS_RE = /\[(WHAT|BASE|SIZE|FOUNDED|NOTE)\]/

/**
 * 「所在地」那一节的标记(#199:DB 有精确地址时这一节让位,不重复说同一件事)。
 */
export const CO_SEC_BASE = 'BASE'

/**
 * 可点的来源网址(#191 看来源折叠只列真的 http(s) 链接 —— 存量里混过非链接的字串)。
 */
export const HTTP_URL_RE = /^https?:\/\//i

/**
 * 政府/公共机构判定的强信号名称关键词(Frank 2026-07-24)之一:政体与部门的说法。
 * 宁可漏标不错标 —— 私企名里含 Commission 这类词的不误伤,只认整词边界上的政府说法。
 * 原先是一条超长的正则,2026-08-28 按语义切成三条(行宽闸 120):三条是**或**的关系,
 * 判定函数逐条 test,与原来的一条大 alternation 完全等价。
 */
export const GOV_BODY_RE = /\b(government|gouvernement|ministry|minist[eè]re|public service|department of)\b/i

/**
 * 政府/公共机构关键词之二:市镇一级的说法。
 */
export const GOV_PLACE_RE = /\b(city of|town of|municipalit|regional municipalit)\b/i

/**
 * 政府/公共机构关键词之三:法定机构与教育局的说法。
 */
export const GOV_ORG_RE = /\b(health authority|crown corporation|conseil scolaire|commission scolaire)\b/i

/**
 * LMIA 股别串的分股记号(「High Wage 58 · Low Wage 1008」——「·」「•」两种都出现过)。
 */
export const CO_STREAM_SPLIT_RE = /[·•]/

/**
 * 单股「名 + 份数」的拆分(名字里可能带空格,所以份数按行尾的数字取,支持千分位逗号)。
 * 用具名捕获组:按下标取值看不出取的是什么(闸 no-literal-index)。
 */
export const CO_STREAM_COUNT_RE = /^(?<name>.+?)\s+(?<count>[\d,]+)$/

/**
 * 简介分节表的步长:`split` 带捕获组的结果是「标记, 正文」交替成对,所以两个两个走。
 */
export const SEC_PAIR_STEP = 2

/**
 * 在招职位卡标题里那对括号的左半(裹在招总数)。
 */
export const PAREN_OPEN = '('

/**
 * 在招职位卡标题里那对括号的右半。
 */
export const PAREN_CLOSE = ')'

/**
 * 高薪股(技能类;match.ts 口径,前端只展示不判定)。
 */
export const STREAM_HIGH_RE = /high wage/

/**
 * 全球人才通道股(技能类)。
 */
export const STREAM_GTS_RE = /global talent/

/**
 * 永居类股(技能类)。
 */
export const STREAM_PR_RE = /\bpr\b|permanent/

/**
 * 低薪股(非技能类)。
 */
export const STREAM_LOW_RE = /low wage/

/**
 * 农业股(非技能类)。
 */
export const STREAM_AGRI_RE = /agricultur/

/**
 * 名录厚简介的字数门槛(≥120 字才算「有正文可读」,不够长的按没有算,让位 AI 五节)。
 * 阈值统一 120 —— 原公司弹框那份 200 的私有阈值 2026-07 退役。
 */
export const DESC_MIN_LEN = 120

/**
 * 在招职位首屏显示的条数(#198:其余的原地展开,不跳转)。
 */
export const JOBS_FIRST_N = 8

/**
 * 获批职业逐行列出的条数(#286:Top 6 逐行,余量并成一行)。
 */
export const NOCS_TOP_N = 6

/**
 * 「跨省在招」成立的省数门槛(知名度维的依据之一:覆盖 2 个省以上才算跨省)。
 */
export const FAME_PROVS_MIN = 2

/**
 * 担保档档位的深绿线(常年担保)。
 */
export const CH_GRADE_DEEP_MIN = 5

/**
 * 担保档档位的绿线。
 */
export const CH_GRADE_GREEN_MIN = 4

/**
 * 担保档档位的中性线(灰字,不褒不贬)。
 */
export const CH_GRADE_GRAY_MIN = 3

/**
 * 担保档档位的琥珀线(偏弱)。
 */
export const CH_GRADE_AMBER_MIN = 2

/**
 * 深绿(常年担保档的字色;与列表「通道」列同源色阶)。
 */
export const CH_C_DEEP = '#166534'

/**
 * 绿(有担保记录)。
 */
export const CH_C_GREEN = '#15803d'

/**
 * 深灰(中性档:有记录但不足以说明什么)。
 */
export const CH_C_GRAY = '#374151'

/**
 * 琥珀(偏弱档)。
 */
export const CH_C_AMBER = '#b45309'

/**
 * 浅灰(未评 / 无记录 —— 无记录 ≠ 不担保,色阶上也不给负判定的暗示)。
 */
export const CH_C_NONE = '#9ca3af'

/**
 * 公司 K 调查(懒探索)接口:首开自动调查,命中缓存秒回。
 */
export const URL_CO_INFO = '/api/employers/info'

/**
 * 公司简介翻译接口(#185 中文对照:懒翻,拿到存一份切换零延迟)。
 */
export const URL_CO_TRANSLATE = '/api/employers/translate'

/**
 * 公司弹框取数接口(与 /companies/[slug] 页面同一份 CompanyDetail,免额度)。
 */
export const URL_JOBS_COMPANY = '/api/jobs/company'

/**
 * 职位详情页地址头(拼岗位号)。
 */
export const URL_JOB_HEAD = '/jobs/'

/**
 * 公司详情页地址头(拼 slug)。
 */
export const URL_COMPANY_HEAD = '/companies/'

/**
 * 职位板按公司名搜索的地址头(拼编码后的公司名 —— 载入上限之外的在招岗回退到这里)。
 */
export const URL_BOARD_QUERY_HEAD = '/?q='

/**
 * 判定页地址头(#287 批D:公司弹框的判定卡入口,拼岗位号)。
 */
export const URL_PLAN_PR_HEAD = '/plan/pr?job='

/**
 * 取数一律 POST(公司名/岗位号进请求体,不进 URL)。
 */
export const METHOD_POST = 'POST'

/**
 * 请求体类型头的名字。
 */
export const HDR_CONTENT_TYPE = 'Content-Type'

/**
 * 请求体类型头的值。
 */
export const MIME_JSON = 'application/json'

/**
 * JSON-LD 脚本标签的 MIME(结构化数据的约定值;跨域不互相取常量,本域自抄一份)。
 */
export const MIME_LD_JSON = 'application/ld+json'

/**
 * 「查到了」的状态码(K 调查接口 204/202 这类非 200 的成功码都算没查到,不渲孤儿块)。
 */
export const HTTP_OK = 200

/**
 * AI 速读的埋点事件名(#129 功能级 umami 埋点)。
 */
export const TRACK_AI_READ = 'ai-read-cat'

/**
 * 判定卡入口的埋点事件名。
 */
export const TRACK_TV_ENTRY = 'tv-entry'

/**
 * 判定卡入口埋点的来路值(公司弹框)。
 */
export const TRACK_KIND_COMPANY = 'company'

/**
 * AI 速读取的字段(coRead = 公司级接地速读:只吃库里的公司事实,不联网、不凭名字编)。
 */
export const AI_FIELD_CO_READ = 'coRead'

/**
 * 公司弹框里 B1 雇主线卡的来路标记(SponsorLeadCard 按它决定渲哪一半)。
 */
export const LEAD_SRC_COMPANY = 'company'

/**
 * AI 检索声明行的火花记号(✨ = 这段是机器查的,披露红线)。
 */
export const SPARKLE = '✨'

/**
 * 展开态的折叠记号。
 */
export const CARET_DOWN = '▾'

/**
 * 收起态的折叠记号。
 */
export const CARET_RIGHT = '▸'

/**
 * 外链记号(跟在链接文字后面,前面带空格)。
 */
export const ARROW_EXTERNAL = ' ↗'

/**
 * 缺值的破折号(担保批数没记时的占位;不折 0 —— 折 0 是替官方编数)。
 */
export const DASH_EM = '—'

/**
 * 枚举记号(知名度依据多条并列时用顿号,全站禁「·」「/」杂糅)。
 */
export const SEP_ENUM = '、'

/**
 * AI 检索声明行在简介卡内的位置档。
 */
export const AI_NOTE_BRIEF = 'brief'

/**
 * AI 检索声明行在懒查 bare 态的位置档(#197:顶部无缓存不能预挂声明,紧贴内容渲一行)。
 */
export const AI_NOTE_LAZY = 'lazy'

/**
 * AI 检索声明行在基本信息卡内的位置档(#200:卡片化后浮注显孤,收进卡内接在简介前)。
 */
export const AI_NOTE_PANEL = 'panel'

/**
 * 官网是我们搜出来的(不是名录给的)—— 这一档要在官网行下补一句小注。
 */
export const SITE_SRC_SEARCHED = 'searched'

/**
 * 四维网格里担保维那一行的键(React 列表键;维名本身走文案表)。
 */
export const DIM_SPONSOR = 'sponsor'

/**
 * 活跃度维那一行的键。
 */
export const DIM_ACTIVE = 'active'

/**
 * 薪资维那一行的键。
 */
export const DIM_SALARY = 'salary'

/**
 * 知名度维那一行的键。
 */
export const DIM_FAME = 'fame'

/**
 * 担保档名的文案键前缀(拼上档位数字取「常年担保 / 有记录…」)。
 */
export const KEY_SP_TIER_HEAD = 'gr.sp.'

/**
 * AIP 指定但无 LMIA 记录时的担保档名(没有档位数字可拼)。
 */
export const KEY_SP_TIER_AIP = 'gr.sp.aip'

/**
 * 活跃度档名的文案键前缀。
 */
export const KEY_ACT_TIER_HEAD = 'gr.act.'

/**
 * 薪资档名的文案键前缀。
 */
export const KEY_SAL_TIER_HEAD = 'gr.sal.'

/**
 * 知名度档名的文案键前缀。
 */
export const KEY_FM_TIER_HEAD = 'gr.fm.'

/**
 * 担保维依据句(近两年获批总数 + 技能股 + 最近季度)。
 */
export const KEY_SP_EVIDENCE = 'gr.co.sp.d'

/**
 * 担保维依据句的 AIP 变体(名录在册但没有 LMIA 记录)。
 */
export const KEY_SP_EVIDENCE_AIP = 'gr.co.sp.aip'

/**
 * 担保维无记录的灰句(🔴 语义红线:None = 无记录 ≠ 不担保)。
 */
export const KEY_SP_NONE = 'gr.co.sp.na'

/**
 * 活跃度依据句(在招 N 个岗、近 30 天新发 M 个)。
 */
export const KEY_ACT_EVIDENCE = 'gr.co.act.d'

/**
 * 活跃度依据句的单数变体(只在招 1 个岗)。
 */
export const KEY_ACT_EVIDENCE_ONE = 'gr.co.act.d1'

/**
 * 薪资依据句(相对同职业中位的百分比)。
 */
export const KEY_SAL_EVIDENCE = 'gr.co.sal.d'

/**
 * 薪资相对中位为正时的正号(负数自带减号,正数要自己补 —— 不补看不出是高还是低)。
 */
export const SIGN_PLUS = '+'

/**
 * 知名度依据:有维基条目。
 */
export const KEY_FM_WIKI = 'gr.co.fm.wiki'

/**
 * 知名度依据:跨 N 个省在招。
 */
export const KEY_FM_PROVS = 'gr.co.fm.provs'

/**
 * 知名度依据:在招岗数。
 */
export const KEY_FM_OPEN = 'gr.co.fm.open'

/**
 * 知名度依据:在招岗数的单数变体。
 */
export const KEY_FM_OPEN_ONE = 'gr.co.fm.open1'

/**
 * 无数据的灰句(薪资维没算出来时)。
 */
export const KEY_NO_DATA = 'gr.noData'

/**
 * 技能股(High Wage)的显示名文案键。
 */
export const KEY_STREAM_HIGH = 'co.spStream.high'

/**
 * 全球人才通道股的显示名文案键。
 */
export const KEY_STREAM_GTS = 'co.spStream.gts'

/**
 * 永居类股的显示名文案键。
 */
export const KEY_STREAM_PR = 'co.spStream.pr'

/**
 * 低薪股的显示名文案键。
 */
export const KEY_STREAM_LOW = 'co.spStream.low'

/**
 * 农业股的显示名文案键。
 */
export const KEY_STREAM_AGRI = 'co.spStream.agri'
