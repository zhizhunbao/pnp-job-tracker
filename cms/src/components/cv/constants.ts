/**
 * 生成简历桶的常量 —— 接口地址、草稿的本地存储键、三种窗口的默认尺寸、各分区的表单配置(哪几格、叫什么、日期怎么写)、
 * 词条键与错误键。分区与字段照 Job Bank Resume Builder(2026-11-07 Frank「以后都按这个来」);界面照站内通用桶。
 *
 * @author Frank
 * @time 2026-11-07 16:00:00
 */

/**
 * 生成简历存成一份的接口。
 */
export const URL_BUILD = '/api/resume/build'

/**
 * 「导入职责」按职位名找职业的接口(后面接 `?q=`)。
 */
export const URL_DUTIES = '/api/noc/duties?q='

/**
 * 我的档案(英文姓名、城市、省份)。
 */
export const URL_PROFILE = '/api/quiz/profile'

/**
 * 登录人(邮箱)。
 */
export const URL_ME = '/api/users/me'

/**
 * 带会话 cookie。
 */
export const CRED_INCLUDE = 'include'

/**
 * 提交方法。
 */
export const METHOD_POST = 'POST'

/**
 * JSON 请求头名。
 */
export const HDR_CONTENT_TYPE = 'Content-Type'

/**
 * JSON 请求头值。
 */
export const MIME_JSON = 'application/json'

/**
 * 草稿的本地存储键(关了窗口、刷了页面再开还在;存成简历后也留着,改一改再生成一份)。
 */
export const DRAFT_KEY = 'cv_draft_v1'

/**
 * 「导入职责」边打边搜的停顿(ms)。
 */
export const DUTY_DEBOUNCE_MS = 300

/**
 * 「导入职责」检索词最短几个字。
 */
export const DUTY_Q_MIN = 2

/**
 * 冲突(简历满了)。
 */
export const HTTP_CONFLICT = 409

/**
 * 超限。
 */
export const HTTP_TOO_MANY = 429

/**
 * 没登录。
 */
export const HTTP_UNAUTHORIZED = 401

/**
 * 服务端回的「有写不进 PDF 的字」错误码。
 */
export const E_CHARS = 'chars'

/**
 * 生成简历窗口的尺寸记忆键。
 */
export const CV_MODAL_PREF = 'cv_modal_pref'

/**
 * 生成简历窗口默认宽。
 */
export const CV_MODAL_W = 760

/**
 * 生成简历窗口默认高。
 */
export const CV_MODAL_H = 760

/**
 * 填一条的窗口尺寸记忆键。
 */
export const CV_FORM_PREF = 'cv_form_pref'

/**
 * 填一条的窗口默认宽。
 */
export const CV_FORM_W = 680

/**
 * 填一条的窗口默认高。
 */
export const CV_FORM_H = 720

/**
 * 预览窗口的尺寸记忆键。
 */
export const CV_PREVIEW_PREF = 'cv_preview_pref'

/**
 * 预览窗口默认宽。
 */
export const CV_PREVIEW_W = 820

/**
 * 预览窗口默认高。
 */
export const CV_PREVIEW_H = 820

/**
 * 白卡分区的全局类名(main.css 第 9 段;apply 的 CARD_MD_CLS 同值,各域自抄)。
 */
export const CARD_MD_CLS = 'cardMd'

/**
 * 分区小标题的全局类名(main.css 第 9 段;apply 的 CARD_HEAD_CLS 同值,各域自抄)。
 */
export const CARD_HEAD_CLS = 'mcardHead'

/**
 * 次钮。
 */
export const BTN_SECONDARY = 'secondary'

/**
 * 删除钮。
 */
export const BTN_DANGER = 'danger'

/**
 * 灰胶囊(已隐藏、职业码、还能写几个字)。
 */
export const TAG_GRAY = 'gray'

/**
 * 选中胶囊(选中的职业)。
 */
export const TAG_PICK = 'pick'

/**
 * 输入框尺寸档。
 */
export const INPUT_MD = 'md'

/**
 * 空串:格子没填 / 没有错。
 */
export const TEXT_NONE = ''

/**
 * 新加一条时的位置(不是清单里已有的哪一条)。
 */
export const NEW_INDEX = -1

/**
 * 多行格一行一条。
 */
export const LINE_SEP = '\n'

/**
 * 导入的职责在描述里一条一行,行首带要点记号。
 */
export const BULLET_HEAD = '• '

/**
 * 年份:四位数字。
 */
export const YEAR_RE = /^\d{4}$/

/**
 * 年份框最长几个字。
 */
export const YEAR_LEN = 4

/**
 * 月份下拉的选项(1~12)。
 */
export const MONTH_OPTS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']

/**
 * 月份显示名的词条键前缀(后面接 1~12)。
 */
export const MONTH_KEY_HEAD = 'cv.m.'

/**
 * 年月之间(列表里显示「2015-04」)。
 */
export const YM_SEP = '-'

/**
 * 月份补成两位。
 */
export const MONTH_PAD = 2

/**
 * 补位的字。
 */
export const PAD_CHAR = '0'

/**
 * 城市与省份之间(列表里显示)。
 */
export const PLACE_SEP = ', '

/**
 * 坏字之间(报错里列出来)。
 */
export const CHARS_SEP = ' '

/**
 * 条目式分区的表单配置(照 Job Bank 各分区的表单):
 * card = 分区卡标题;whatCard / title = 第一张卡的标题与「名称」格;orgCard / org = 第二张卡与机构格(空串 = 没有这格);
 * orgReq = 机构必填;place = 有城市与省份;dates = 起止 / 一个时间 / 不写;now = 有「至今」;duties = 能导入 NOC 职责;
 * desc = 描述格的名字。
 */
export const CV_LIST = {
  /**
   * 工作经历。
   */
  work: {
    key: 'work',
card: 'cv.sec.work',
whatCard: 'cv.card.job',
title: 'cv.f.jobTitle',
orgCard: 'cv.card.employer',
    org: 'cv.f.employer',
orgReq: false,
place: true,
dates: 'range',
now: true,
duties: true,
desc: 'cv.f.workDesc',
  },

  /**
   * 教育经历。
   */
  edu: {
    key: 'edu',
card: 'cv.sec.edu',
whatCard: 'cv.card.program',
title: 'cv.f.program',
orgCard: 'cv.card.school',
    org: 'cv.f.school',
orgReq: true,
place: true,
dates: 'range',
now: false,
duties: false,
desc: 'cv.f.desc',
  },

  /**
   * 证书执照。
   */
  creds: {
    key: 'creds',
card: 'cv.sec.creds',
whatCard: 'cv.card.cred',
title: 'cv.f.cred',
orgCard: 'cv.card.issuer',
    org: 'cv.f.issuer',
orgReq: false,
place: false,
dates: 'one',
now: false,
duties: false,
desc: 'cv.f.desc',
  },

  /**
   * 志愿经历。
   */
  volunteer: {
    key: 'volunteer',
card: 'cv.sec.volunteer',
whatCard: 'cv.card.role',
title: 'cv.f.role',
orgCard: 'cv.card.org',
    org: 'cv.f.org',
orgReq: false,
place: true,
dates: 'range',
now: true,
duties: false,
desc: 'cv.f.desc',
  },

  /**
   * 奖项荣誉。
   */
  awards: {
    key: 'awards',
card: 'cv.sec.awards',
whatCard: 'cv.card.award',
title: 'cv.f.award',
orgCard: 'cv.card.issuer',
    org: 'cv.f.issuer',
orgReq: false,
place: false,
dates: 'one',
now: false,
duties: false,
desc: 'cv.f.desc',
  },

  /**
   * 自定义分区(一条一个分区)。
   */
  extra: {
    key: 'extra',
card: 'cv.sec.extra',
whatCard: 'cv.card.sec',
title: 'cv.f.secName',
orgCard: '',
org: '',
    orgReq: false,
place: false,
dates: 'none',
now: false,
duties: false,
desc: 'cv.f.content',
  },
} as const

/**
 * 个人简介分区卡标题。
 */
export const SEC_SUMMARY = 'cv.sec.summary'

/**
 * 技能分区卡标题。
 */
export const SEC_SKILLS = 'cv.sec.skills'

/**
 * 没错。
 */
export const ERR_NONE = ''

/**
 * 网络或服务端出错。
 */
export const ERR_NET = 'cv.err.net'

/**
 * 简历满了。
 */
export const ERR_FULL = 'cv.err.full'

/**
 * 今天次数用完了。
 */
export const ERR_LIMIT = 'cv.err.limit'

/**
 * 没填英文姓名。
 */
export const ERR_NAME = 'cv.err.name'

/**
 * 有写不进 PDF 的字。
 */
export const ERR_CHARS = 'cv.err.chars'

/**
 * 带 * 的没填。
 */
export const ERR_REQ = 'cv.err.req'

/**
 * 年份不是四位数字。
 */
export const ERR_YEAR = 'cv.err.year'

/**
 * 登录过期。
 */
export const ERR_AUTH = 'cv.err.auth'

/**
 * 段落式分区键:个人简介。
 */
export const KEY_SUMMARY = 'summary'

/**
 * 段落式分区键:技能。
 */
export const KEY_SKILLS = 'skills'

/**
 * 勾选框的 input 类型。
 */
export const INPUT_CHECKBOX = 'checkbox'

/**
 * 「导入职责」那块的 aria 角色(一组勾选框)。
 */
export const ROLE_GROUP = 'group'

/**
 * 一条里的描述格键。
 */
export const KEY_DESC = 'desc'

/**
 * 日期写法:起止。
 */
export const DATES_RANGE = 'range'

/**
 * 日期写法:一个时间。
 */
export const DATES_ONE = 'one'

/**
 * 日期写法:不写。
 */
export const DATES_NONE = 'none'

/**
 * 一条的名称格键。
 */
export const KEY_TITLE = 'title'

/**
 * 一条的机构格键。
 */
export const KEY_ORG = 'org'

/**
 * 城市格键(一条与联系方式同名)。
 */
export const KEY_CITY = 'city'

/**
 * 省份或国家格键(一条与联系方式同名)。
 */
export const KEY_REGION = 'region'

/**
 * 开始年格键。
 */
export const KEY_FROM_Y = 'fromY'

/**
 * 开始月格键。
 */
export const KEY_FROM_M = 'fromM'

/**
 * 结束年格键。
 */
export const KEY_TO_Y = 'toY'

/**
 * 结束月格键。
 */
export const KEY_TO_M = 'toM'

/**
 * 联系方式:英文姓名格键。
 */
export const KEY_NAME = 'name'

/**
 * 联系方式:邮箱格键。
 */
export const KEY_EMAIL = 'email'

/**
 * 联系方式:电话格键。
 */
export const KEY_PHONE = 'phone'

/**
 * 日期卡各写法的词条:卡标题、年格、月格(起止的写「开始年 / 开始月」,一个时间的写「年份 / 月份」)。
 */
export const DATE_KEYS = {
  /**
   * 起止。
   */
  range: { card: 'cv.card.period', y: 'cv.f.fromY', m: 'cv.f.fromM' },

  /**
   * 一个时间。
   */
  one: { card: 'cv.card.when', y: 'cv.f.y', m: 'cv.f.m' },

  /**
   * 不写(不出日期卡;占位与起止同)。
   */
  none: { card: 'cv.card.period', y: 'cv.f.fromY', m: 'cv.f.fromM' },
} as const

/**
 * 段落式分区的词条:卡标题与多行框占位提示(照 Job Bank 的写法建议)。
 */
export const TEXT_CONF = {
  /**
   * 个人简介。
   */
  summary: { head: 'cv.sec.summary', ph: 'cv.ph.summary' },

  /**
   * 技能。
   */
  skills: { head: 'cv.sec.skills', ph: 'cv.ph.skills' },
} as const
