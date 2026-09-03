/**
 * pte 域(PTE Core 刷题)的死值:路由与接口地址、默认题型、窗口档、三段动线的秒数、
 * 浏览器朗读与录音的参数、练过落盘键、请求词、钮档与文本记号,以及两页的 SEO 头。
 * 2026-09-03 批二新立(设计稿 docs/design/PTE刷题-20260903.md)。
 *
 * @author Frank
 * @time 2026-09-03 12:00:00
 */

/**
 * 题单页地址头(一页一型:`/pte/wfd`)。
 */
export const URL_PTE = '/pte'

/**
 * 路径段分隔。
 */
export const URL_SEP = '/'

/**
 * 题段里源与源内 id 的分隔(`ynwac-11`;题键里的冒号进 URL 换成它)。
 */
export const ID_SEP = '-'

/**
 * 题键分隔(源:题型:源内 id,与 etl/pte 的 QID_SEP 同字)。
 */
export const QID_SEP = ':'

/**
 * 默认题型(Frank 故事一「默认 WFD」)。
 */
export const PTE_DEFAULT_TYPE = 'WFD'

/**
 * 未登录发评论的去处(就地开登录框,与新闻评论同口径)。
 */
export const URL_LOGIN = '/?login=1'

/**
 * 评论接口(Payload REST;闸在 collections/Comments 的 beforeChange)。
 */
export const API_COMMENTS = '/api/comments'

/**
 * 练过档接口(lib/pte;登录态 GET / PUT,服务端取并集)。
 */
export const API_PTE_DONE = '/api/pte/done'

/**
 * 写练过档的请求方法。
 */
export const METHOD_PUT = 'PUT'

/**
 * 字典接口(Free Dictionary API,无 key、CORS 开;Frank 2026-09-03「选中单词应该有字典功能」)。
 */
export const DICT_API = 'https://api.dictionaryapi.dev/api/v2/entries/en/'

/**
 * 算「一个单词」的形:字母开头,只含字母、撇号、连字符。
 */
export const WORD_RE = /^[A-Za-z][A-Za-z'-]*$/

/**
 * 最短查词长度(单字母不查)。
 */
export const DICT_MIN_LEN = 2

/**
 * 弹层里最多列几条释义。
 */
export const DICT_DEFS_MAX = 2

/**
 * 弹层离选区底边的距离(px)。
 */
export const DICT_GAP_PX = 8

/**
 * 弹层宽(px;定位时不出屏)。
 */
export const DICT_W_PX = 300

/**
 * 弹层离视口边的最小留白(px)。
 */
export const DICT_EDGE_PX = 8

/**
 * 查词状态:闲置(没选词)。
 */
export const DICT_IDLE = 'idle'

/**
 * 查词状态:在查。
 */
export const DICT_BUSY = 'busy'

/**
 * 查词状态:查到。
 */
export const DICT_OK = 'ok'

/**
 * 查词状态:没查到。
 */
export const DICT_NONE = 'none'

/**
 * 选区事件(桌面松开鼠标 / 手机松开手指)。
 */
export const EV_MOUSEUP = 'mouseup'

/**
 * 选区事件(手机)。
 */
export const EV_TOUCHEND = 'touchend'

/**
 * 占分权重不足 1% 的灰注。
 */
export const WEIGHT_LT_ONE = '<1%'

/**
 * 百分号。
 */
export const PERCENT = '%'

/**
 * 题型分栏顺序(Frank 2026-09-03「题型应该听说读写分开来」:胶囊按 section 一栏一行;扩到 19 型各归各栏)。
 */
export const SECTION_ORDER = ['Speaking', 'Writing', 'Reading', 'Listening']

/**
 * section → 栏名词键。
 */
export const SECTION_KEY: Record<string, string> = {
  /**
   * 口语。
   */
  Speaking: 'pte.sec.speaking',

  /**
   * 写作。
   */
  Writing: 'pte.sec.writing',

  /**
   * 阅读。
   */
  Reading: 'pte.sec.reading',

  /**
   * 听力。
   */
  Listening: 'pte.sec.listening',
}

/**
 * 窗口档(天);0 = 全部。默认 30(设计稿)。
 */
export const WIN_7 = 7

/**
 * 窗口档:近 30 天(默认)。
 */
export const WIN_30 = 30

/**
 * 窗口档:近 90 天。
 */
export const WIN_90 = 90

/**
 * 窗口档:全部。
 */
export const WIN_ALL = 0

/**
 * 窗口档顺序(胶囊按此排)。
 */
export const WINS = [WIN_7, WIN_30, WIN_90, WIN_ALL]

/**
 * 首屏显示条数;「显示更多」每次再加这么多。
 */
export const PAGE_STEP = 50

/**
 * 一天的毫秒数(算「N 天前」)。
 */
export const DAY_MS = 86400000

/**
 * 日期串长度(ISO 前十位 YYYY-MM-DD)。
 */
export const DATE_LEN = 10

/**
 * 题型码:朗读。
 */
export const T_RA = 'RA'

/**
 * 题型码:复述句子。
 */
export const T_RS = 'RS'

/**
 * 题型码:简答题。
 */
export const T_ASQ = 'ASQ'

/**
 * 题型码:听写句子。
 */
export const T_WFD = 'WFD'

/**
 * 准备秒数(其余型没有准备段,表里没有 = 0)。
 */
export const PREP_S: Record<string, number> = {
  /**
   * 朗读:官方 30–40 s,两家都给 33–35。
   */
  RA: 35,
}

/**
 * 录音上限秒数(WFD 不录,表里没有 = 0)。
 */
export const REC_CAP_S: Record<string, number> = {
  /**
   * 朗读:官方 40 s。
   */
  RA: 40,

  /**
   * 复述句子:官方 15 s。
   */
  RS: 15,

  /**
   * 简答题:官方 10 s。
   */
  ASQ: 10,
}

/**
 * 题型 → 官方一句指令的词键。
 */
export const INST_KEY: Record<string, string> = {
  /**
   * 朗读。
   */
  RA: 'pte.inst.RA',

  /**
   * 复述句子。
   */
  RS: 'pte.inst.RS',

  /**
   * 简答题。
   */
  ASQ: 'pte.inst.ASQ',

  /**
   * 听写句子。
   */
  WFD: 'pte.inst.WFD',
}

/**
 * 题键里源内 id 从第几段起(源:题型:源内 id —— 第三段起;源内 id 自己可能带冒号,余下整段拼回)。
 */
export const QID_ID_AT = 2

/**
 * 窗口档 → 胶囊词键。
 */
export const WIN_KEY: Record<number, string> = {
  /**
   * 近 7 天。
   */
  7: 'pte.win7',

  /**
   * 近 30 天。
   */
  30: 'pte.win30',

  /**
   * 近 90 天。
   */
  90: 'pte.win90',

  /**
   * 全部。
   */
  0: 'pte.winAll',
}

/**
 * 留言提交状态 → 提示词键(闲置与在途没有提示)。
 */
export const NOTE_HINT_KEY: Record<string, string> = {
  /**
   * 已提交,过审才显示。
   */
  sent: 'pte.c.sent',

  /**
   * 没发出去。
   */
  err: 'pte.c.err',
}

/**
 * 考试记录提交状态 → 提示词键。
 */
export const EXAM_HINT_KEY: Record<string, string> = {
  /**
   * 已记录(免审当场入栏)。
   */
  sent: 'pte.c.examOk',

  /**
   * 没发出去。
   */
  err: 'pte.c.err',
}

/**
 * 秒表节拍。
 */
export const TICK_MS = 1000

/**
 * 一分钟的毫秒数(本地日期串换算时区偏移)。
 */
export const MS_PER_MIN = 60000

/**
 * 单题页标题里题面截断长度。
 */
export const TITLE_LEN_MAX = 60

/**
 * MediaRecorder 的停机态(浏览器定的字面量)。
 */
export const REC_STATE_INACTIVE = 'inactive'

/**
 * 中文界面的语言码(题型名取 nameZh)。
 */
export const LANG_ZH = 'zh'

/**
 * 韩文界面的语言码。
 */
export const LANG_KO = 'ko'

/**
 * 一分钟的秒数(`m:ss`)。
 */
export const SEC_PER_MIN = 60

/**
 * 秒位补零到两位。
 */
export const CLOCK_PAD = 2

/**
 * 补零字符。
 */
export const PAD_CHAR = '0'

/**
 * `m:ss` 的分隔。
 */
export const CLOCK_SEP = ':'

/**
 * 浏览器朗读的语言(题面全英文)。
 */
export const TTS_LANG = 'en-US'

/**
 * 浏览器朗读的语言前缀(挑声音用)。
 */
export const TTS_LANG_HEAD = 'en'

/**
 * 浏览器朗读语速(1.0x;两家默认同档)。
 */
export const TTS_RATE = 1

/**
 * 朗读兜底定时器的底数(毫秒):onend 不来时按「底数 + 词数 × 每词」估时长放行。
 */
export const TTS_GUARD_BASE_MS = 2500

/**
 * 朗读兜底定时器的每词毫秒(1.0x 英语约 2.5 词/秒,取宽一点)。
 */
export const TTS_MS_PER_WORD = 500

/**
 * 录音的 MIME(MediaRecorder 默认交回的容器;回放只在本机)。
 */
export const REC_MIME = 'audio/webm'

/**
 * 练过落盘键(localStorage;匿名用户按浏览器记,登录合并留批三)。
 */
export const DONE_KEY = 'pte.done'

/**
 * 服务端快照用的空练过集(同一引用,useSyncExternalStore 才不会当作每次都变)。
 */
export const EMPTY_DONE: Set<string> = new Set()

/**
 * 评论类:考试记录(免审)。
 */
export const KIND_EXAM = 'exam'

/**
 * 评论类:留言(待审)。
 */
export const KIND_NOTE = 'note'

/**
 * 考点城市上限字数(与 collection 闸同值)。
 */
export const CITY_MAX = 40

/**
 * 留言上限字数(与 collection 闸同值)。
 */
export const NOTE_MAX = 1000

/**
 * 留言框行数。
 */
export const NOTE_ROWS = 3

/**
 * WFD 打字框行数。
 */
export const TYPED_ROWS = 3

/**
 * 发评论的请求方法。
 */
export const METHOD_POST = 'POST'

/**
 * 带 cookie(登录态在 httpOnly cookie 里)。
 */
export const CRED_INCLUDE = 'include'

/**
 * 请求头名。
 */
export const HDR_CONTENT_TYPE = 'Content-Type'

/**
 * JSON 的 MIME。
 */
export const MIME_JSON = 'application/json'

/**
 * 在途状态:闲置。
 */
export const STATE_IDLE = 'idle'

/**
 * 在途状态:在途。
 */
export const STATE_BUSY = 'busy'

/**
 * 在途状态:已提交。
 */
export const STATE_SENT = 'sent'

/**
 * 在途状态:失败。
 */
export const STATE_ERR = 'err'

/**
 * 段位:准备。
 */
export const PHASE_READY = 'ready'

/**
 * 段位:作答。
 */
export const PHASE_ANSWERING = 'answering'

/**
 * 段位:对照。
 */
export const PHASE_CHECKED = 'checked'

/**
 * 主钮(一排只有一颗:作答段 = 提交,对照段 = 下一题)。
 */
export const KIND_PRIMARY = 'primary' as const

/**
 * 次钮(重做 / 再听一遍 / 上一题;同形白底描边)。
 */
export const KIND_SECONDARY = 'secondary' as const

/**
 * 行内文字动作(跳过准备 / 停止 / 返回):幽灵档 —— 全站文字钮都走它(button 桶 css 里控件档
 * 只有名字没有类,2026-09-03 实撞 CssClassMissing 500)。
 */
export const KIND_LINK = 'ghost'

/**
 * 播放钮:白底描边档。
 */
export const KIND_ICON = 'secondary'

/**
 * 播放记号。
 */
export const PLAY_MARK = '▶'

/**
 * 停止记号(在播时)。
 */
export const STOP_MARK = '■'

/**
 * 录音红点里的记号。
 */
export const REC_MARK = '●'

/**
 * 日期输入框类型。
 */
export const INPUT_DATE = 'date'

/**
 * 文本输入框类型。
 */
export const INPUT_TEXT = 'text'

/**
 * 通知件的信息档。
 */
export const NOTICE_INFO = 'info'

/**
 * 类名拼接的空格。
 */
export const CLS_SEP = ' '

/**
 * Shell 轨的上内衬档(与公司详情页同档)。
 */
export const SHELL_TOP = 14

/**
 * 空串。
 */
export const TEXT_NONE = ''

/**
 * 空格(拼句)。
 */
export const SPACE = ' '

/**
 * 题号前缀。
 */
export const NUM_HEAD = '#'

/**
 * 练过勾。
 */
export const CHECK_MARK = '✓'

/**
 * 题面里切词的空白。
 */
export const WORD_SPLIT_RE = /\s+/

/**
 * 对词时去掉的标点(只留字母数字与撇号;大小写不计)。
 */
export const PUNCT_RE = /[^\p{L}\p{N}']/gu

/**
 * 题单列宽:题号。
 */
export const W_NUM = '9%'

/**
 * 题单列宽:题面。
 */
export const W_TEXT = '49%'

/**
 * 题单列宽:最近考过。
 */
export const W_SEEN = '14%'

/**
 * 题单列宽:考过次数。
 */
export const W_TIMES = '12%'

/**
 * 题单列宽:押题。
 */
export const W_HOT = '8%'

/**
 * 题单列宽:练过。
 */
export const W_DONE = '8%'

/**
 * 列身份。
 */
export const COL_NUM = 'num'

/**
 * 列身份。
 */
export const COL_TEXT = 'text'

/**
 * 列身份。
 */
export const COL_SEEN = 'seen'

/**
 * 列身份。
 */
export const COL_TIMES = 'times'

/**
 * 列身份。
 */
export const COL_HOT = 'hot'

/**
 * 列身份。
 */
export const COL_DONE = 'done'

/**
 * 对齐档。
 */
export const ALIGN_LEFT = 'left'

/**
 * 对齐档。
 */
export const ALIGN_RIGHT = 'right'

/**
 * 题单页 SEO 头(内容住桶;英文优先 —— 88% 流量来自 Google)。
 */
export const PTE_META = {
  /**
   * 浏览器标签与搜索结果标题。
   */
  title: 'PTE Core practice — recent exam questions by type | Offer2PR',

  /**
   * 搜索结果摘要。
   */
  description: 'PTE Core question bank sorted by most recently seen in real exams: Read Aloud, Repeat Sentence, '
    + 'Answer Short Question, Write From Dictation. Compiled from test-taker recollections. PTE Core 机经,按最近考过日排。',
}

/**
 * 题单页标题模板(`{type}` = 英文题型名)。
 */
export const LIST_TITLE_TPL = '{type} — PTE Core recent exam questions | Offer2PR'

/**
 * 题单页描述模板。
 */
export const LIST_DESC_TPL = '{n} PTE Core {type} questions sorted by most recently seen in real exams, '
  + 'with exam sightings and predicted picks. Compiled from test-taker recollections.'

/**
 * 单题页标题模板。
 */
export const ITEM_TITLE_TPL = '{type} #{num} — {title} | PTE Core practice | Offer2PR'

/**
 * 单题页描述模板。
 */
export const ITEM_DESC_TPL = 'Practice PTE Core {type} #{num}: {text}'

/**
 * 查无此题的标题。
 */
export const NOT_FOUND_TITLE = 'Question not found | Offer2PR'

/**
 * 描述截断长度。
 */
export const DESC_LEN_MAX = 150

/**
 * 模板占位:题型。
 */
export const VAR_TYPE = '{type}'

/**
 * 模板占位:题号。
 */
export const VAR_NUM = '{num}'

/**
 * 模板占位:标题。
 */
export const VAR_TITLE = '{title}'

/**
 * 模板占位:题面。
 */
export const VAR_TEXT = '{text}'

/**
 * 模板占位:题数。
 */
export const VAR_N = '{n}'

/**
 * 自家记录 LIKE 模式的两端通配。
 */
export const LIKE_ANY = '%'
