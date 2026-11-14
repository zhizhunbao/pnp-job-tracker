/**
 * tailor 域子桶 profile 的常量:用档案生成基础简历的模型参数、限流、输出形状与文字清洗规矩。
 * 2026-11-12 Frank「右侧弹 sidebar 用户一项一项填,最后用 sonnet 生成简历,可以选择模板。这部分功能是收费的」。
 * 子桶不取父桶,同名的几枚各自抄。
 *
 * @author Frank
 * @time 2026-11-12 17:00:00
 */

/**
 * 没有 / 没填的空文本。
 */
export const TEXT_NONE = ''

/**
 * 模型用量账里的功能名。
 */
export const PROFILE_FEATURE = 'tailor.profile'

/**
 * 模型输出上限(一份简历的简介、各段要点与技能)。
 */
export const PROFILE_TOKENS_MAX = 3000

/**
 * 每人每天生成的限流键词头(只拦脚本;收费走额度账)。
 */
export const PROFILE_USER_PREFIX = 'tailor-profile:'

/**
 * 每人每天至多生成几次。
 */
export const PROFILE_USER_DAILY = 20

/**
 * 错误码:档案不够生成(缺英文姓名,或工作经历与教育经历都没有)。
 */
export const E_NEED = 'need'

/**
 * 错误码:写出来的简历排不成 PDF(没内容,或有排不了的字)。
 */
export const E_RESUME_BAD = 'resumeBad'

/**
 * 模板:带色条的现代款(别的值一律按传统单栏)。
 */
export const TPL_MODERN = 'modern'

/**
 * 生成的 PDF 文件名的尾巴(前面是英文姓名)。
 */
export const PROFILE_FILE_TAIL = ' Resume.pdf'

/**
 * 额度账里这一类的记账号用负数(职位 id 都是正数,不会撞):负的八位日期,同一天再生成不另扣。
 */
export const REF_SIGN = -1

/**
 * ISO 时刻里日期那一段的长度(YYYY-MM-DD)。
 */
export const DATE_LEN = 10

/**
 * 日期里的连字符。
 */
export const DASH_RE = /-/g

/**
 * 年月里年与月的分隔。
 */
export const YM_SEP = '-'

/**
 * 给模型的事实里教育经历的专业名之间的分隔。
 */
export const NAME_SEP = ', '

/**
 * 简历「技能」分区里一行一项的换行。
 */
export const LINE_SEP = '\n'

/**
 * 要点行的行首记号(排版函数认它,印成圆点)。
 */
export const BULLET_HEAD = '- '

/**
 * 一段工作经历至多几条要点。
 */
export const BULLETS_MAX = 6

/**
 * 技能至多几项。
 */
export const SKILLS_MAX = 16

/**
 * 一行字(标题、机构、城市、技能一项)至多几个字。
 */
export const LINE_MAX = 120

/**
 * 一条要点至多几个字。
 */
export const BULLET_MAX = 260

/**
 * 简介至多几个字。
 */
export const SUMMARY_MAX = 700

/**
 * 弯引号(单)→ 直引号(PDF 用的 Helvetica 只认西文字符)。
 */
export const QUOTE1_RE = /[‘’]/g

/**
 * 弯引号(双)→ 直引号。
 */
export const QUOTE2_RE = /[“”]/g

/**
 * 长短破折号 → 连字符。
 */
export const DASHES_RE = /[–—]/g

/**
 * 省略号 → 三个点。
 */
export const ELLIPSIS_RE = /…/g

/**
 * 排不了的字:可见 ASCII 与 Latin-1 以外的(中文、表情等),清掉。
 */
export const NON_LATIN_RE = /[^\x20-\x7e\xa0-\xff]/g

/**
 * 直单引号。
 */
export const QUOTE1 = "'"

/**
 * 直双引号。
 */
export const QUOTE2 = '"'

/**
 * 连字符。
 */
export const HYPHEN = '-'

/**
 * 三个点。
 */
export const DOTS = '...'

/**
 * 年月的写法:四位年份,可带两位月份(具名捕获组 y / m)。
 */
export const YM_PARTS_RE = /^(?<y>\d{4})(?:-(?<m>\d{2}))?$/

/**
 * JSON 模式里的类型名:对象。
 */
export const SCHEMA_OBJECT = 'object'

/**
 * JSON 模式里的类型名:数组。
 */
export const SCHEMA_ARRAY = 'array'

/**
 * JSON 模式里的类型名:字符串。
 */
export const SCHEMA_STRING = 'string'

/**
 * 模型输出最外层必须有的键。
 */
export const SCHEMA_TOP_KEYS = ['summary', 'work', 'edu', 'skills']

/**
 * 模型输出里一段工作经历必须有的键。
 */
export const SCHEMA_WORK_KEYS = ['title', 'org', 'city', 'bullets']

/**
 * 模型输出里一条教育经历必须有的键。
 */
export const SCHEMA_EDU_KEYS = ['credential', 'school']

/**
 * 查询参数:模板(取模板示例 PDF 用)。
 */
export const P_TPL = 'tpl'

/**
 * 模板示例 PDF 的缓存头:内容只随代码变,浏览器与边缘都可存一天。
 */
export const CACHE_SAMPLE = 'public, max-age=86400'

/**
 * 模板示例用的一份虚构简历(2026-11-13 Frank「这个应该有个预览功能吧」:选模板时看一页示例排版,不调模型、不扣额度);
 * 形同排版草稿 ProfileDraft,人名、公司、学校都是编的。
 */
export const SAMPLE_DRAFT = {
  /**
   * 联系方式。
   */
  contact: { name: 'Alex Chen', email: 'alex.chen@example.com', phone: '613-555-0142', city: 'Ottawa', region: 'ON' },

  /**
   * 简介。
   */
  summary: 'Software developer with four years of experience building web applications and internal tools. '
    + 'Comfortable across the stack, from database design to accessible front ends.',

  /**
   * 工作经历。
   */
  work: [
    {
      title: 'Software Developer', org: 'Maple Leaf Software', city: 'Ottawa, ON', fromY: '2023', fromM: '5', toY: '', toM: '',
      now: true,
      desc: 'Built a scheduling service used by 40 clinics, cutting booking errors by 30%.\n'
        + 'Moved nightly reports from manual scripts to an automated pipeline.\n'
        + 'Reviewed code and mentored two junior developers.',
    },
    {
      title: 'Junior Developer', org: 'Rideau Digital', city: 'Toronto, ON', fromY: '2021', fromM: '6', toY: '2023', toM: '4',
      now: false,
      desc: 'Added search and filtering to a customer portal with 12,000 monthly users.\n'
        + 'Wrote integration tests that caught regressions before release.',
    },
  ],

  /**
   * 教育经历。
   */
  edu: [
    {
      title: 'Diploma, Computer Programming', org: 'Example College', city: 'Ottawa, ON', fromY: '2019', fromM: '9',
      toY: '2021', toM: '4', now: false, desc: '',
    },
  ],

  /**
   * 技能(一行一条)。
   */
  skills: 'TypeScript, React, Node.js\nPostgreSQL, Redis\nDocker, GitHub Actions',
}
