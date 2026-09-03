/**
 * rankings 页面域(/rankings/[slug] 榜单页)的死值:榜 slug 与它们的口径分叉、
 * 拼 i18n 键的键头、两张表的列身份、链接落点与记号,以及这一页的 SEO 文案表。
 * 2026-08-28 换装批自 Ranking.tsx 与 page.tsx 的散值收拢挂注释(值一个不改)。
 * SEO 文案不进 lib/i18n:那是给搜索引擎与分享卡看的英文主体(站规「给人看的文案」
 * 指的是界面上会随界面语言变的那些),它随这一页的路由走,家在这里。
 *
 * @author Frank
 * @time 2026-08-28 12:49:56
 */

/**
 * 公司口径那一榜的 slug(最可能担保雇主榜)。整页的表形、卡形与列组都按它分叉:
 * 命中 = 公司榜,其余一律职位榜。
 */
export const SLUG_SPONSOR = 'sponsor-likely'

/**
 * 每日榜的 slug 头。每日总榜就是它本身,分类榜是它后面再接一段大类
 * (`daily-top-tech`),所以判「是不是每日榜」用前缀而不是全等。
 */
export const SLUG_DAILY = 'daily-top'

/**
 * 每日分类榜的前缀(带连字符):从 slug 上剥掉它,剩下的那段就是大类码。
 */
export const SLUG_DAILY_HEAD = 'daily-top-'

/**
 * 周榜的 slug。它在导航里**恒定出现**(不管当天有没有数据)——
 * 周榜是这一组榜单的落点,导航里没有它,用户就没有回到主榜的路。
 */
export const SLUG_WEEKLY = 'weekly-top'

/**
 * 榜名文案的键头(拼上 slug = 该榜的标题键)。
 */
export const KEY_TITLE_HEAD = 'rank.title.'

/**
 * 每日榜标题的键(全部每日榜共用这一条,大类名另外拼在后面)。
 */
export const KEY_TITLE_DAILY = 'rank.title.daily-top'

/**
 * 口径注的键头(拼上 slug = 该榜的口径注键)。
 */
export const KEY_NOTE_HEAD = 'rank.note.'

/**
 * 每日榜口径注的键(全部每日榜共用一条口径)。
 */
export const KEY_NOTE_DAILY = 'rank.note.daily-top'

/**
 * 大类人话名的键头(拼上大类中文名 = 该大类的三语显示名)。
 */
export const KEY_BROAD_HEAD = 'broad.'

/**
 * 「没有」的空文本(译名不出、缺数、不套类时的值)。与 companies/employers 域同名同义,各家一份。
 */
export const TEXT_NONE = ''

/**
 * 缺数横杠。🔴 它表示**本站没有这一项**,不是 0 —— 官方可空的数值折成 0 等于替官方编数。
 */
export const DASH_MARK = '—'

/**
 * 名次前面的井号(卡片标题行与表格首列共用一个记号)。
 */
export const RANK_MARK = '#'

/**
 * 名次列的表头(它就是那个记号本身:列名再写一遍「名次」是同一件事说两遍)。
 */
export const COL_RANK_LABEL = '#'

/**
 * 操作列的表头(空 —— 「在职位板查看」那句话本身就是列名)。
 */
export const COL_GO_LABEL = ''

/**
 * 榜名与大类名之间的间隔(全角空格 —— 全站禁「·」「/」杂糅,这里是同一个名字的两段)。
 */
export const TITLE_GAP = '　'

/**
 * 城市与省之间的记号(一格地点里的两级行政区,不是两条并列信息)。
 */
export const LOC_SEP = ', '

/**
 * 卡片页脚里标签与数字之间的间隔(「移民价值分 87」)。
 */
export const LABEL_GAP = ' '

/**
 * 公司卡标题行里名次与公司名之间的间隔。它是**一个真空格**不是外边距:
 * 名次与公司名同处一行连着读,靠 margin 撑开会在折行时把空隙留在行尾。
 */
export const RANK_GAP = ' '

/**
 * 榜单页的路径头(导航里各榜互链)。
 */
export const URL_RANK_HEAD = '/rankings/'

/**
 * 职位板按公司名搜索的地址头(拼上编码后的公司名 = 这家公司的在招岗)。
 * (裸路径 302 与 sponsor-likely 下架 301 两枚地址常量 2026-08-29 随纯转发门
 * 降位 next.config redirects 一并退役 —— #120 与 08-08 的决策记录随迁配置行注释。)
 */
export const URL_JOBS_SEARCH_HEAD = '/?q='

/**
 * 外链新开页的 target(官方原帖与公司官网都不该顶掉本站这一页)。
 */
export const TARGET_BLANK = '_blank'

/**
 * 纯日期的长度(`YYYY-MM-DD` 十位):库里的发布时间带时分秒,比日期前先裁到这一位。
 * (同位置原有「更新于」取当天日期用的 DATE_LOCALE='en-CA' 与 DATE_TZ='America/Toronto',
 * 2026-09-03 随更新时间收单一出口撤编 —— en-CA 是为了排出 `YYYY-MM-DD` 与帖面日期同形好比,
 * ET 是为了服务端 UTC 与浏览器本地时区两端同算一个日期,过午夜不出 hydration 文本不匹配
 * [#218 第 28 轮:生产 console React #418,本地 dev 复现不出];现更新时间走 ETL 心跳,
 * 值由页面门 SSR 取好递下来,两端只有一个来源。)
 */
export const YMD_LEN = 10

/**
 * 榜单页正文轨的上内衬档(px;原内联外框的 1rem 上外边距,Shell 档位里的 16 那一档)。
 * 轨宽不在这里:#67 宽度统一(1100 → 1320,与头轨/职位板同宽)已经是 Shell 的定值,
 * 本页跟着全站走,不自造容器。
 */
export const SHELL_TOP = 16

/**
 * 页头 Banner 的模块名(#65 五模块统一浅色带,榜单 = 金)。
 */
export const BANNER_MODULE = 'rank'

/**
 * 名次列的列身份。
 */
export const COL_RANK_KEY = 'rank'

/**
 * 公司名列的列身份。
 */
export const COL_COMPANY_KEY = 'company'

/**
 * 省列的列身份。
 */
export const COL_PROV_KEY = 'prov'

/**
 * LMIA 获批职位数列的列身份。
 */
export const COL_LMIA_KEY = 'lmia'

/**
 * 省提名清单命中岗数列的列身份。
 */
export const COL_NAMED_KEY = 'named'

/**
 * 在招岗数列的列身份。
 */
export const COL_OPEN_KEY = 'open'

/**
 * 平均移民价值分列的列身份。
 */
export const COL_AVG_KEY = 'avg'

/**
 * 「在职位板查看」操作列的列身份。
 */
export const COL_GO_KEY = 'go'

/**
 * 职位名列的列身份。
 */
export const COL_TITLE_KEY = 'title'

/**
 * 城市列的列身份。
 */
export const COL_CITY_KEY = 'city'

/**
 * 薪资列的列身份。
 */
export const COL_SALARY_KEY = 'salary'

/**
 * 省提名通道列的列身份。
 */
export const COL_PNP_KEY = 'pnp'

/**
 * 联邦 EE 类别列的列身份。
 */
export const COL_EE_KEY = 'ee'

/**
 * 移民价值分列的列身份。
 */
export const COL_SCORE_KEY = 'score'

/**
 * 发布时间列的列身份。
 */
export const COL_DATE_KEY = 'date'

/**
 * 两榜的 SEO 文案(每日榜是一族,按大类拼,见下面 META_DAILY_* 几格)。
 * 键 = 榜 slug,值 = 该榜的 title 与 description。中英合写是这一站的既定口径:
 * 英文给 Google(88% 流量),中文给分享卡上的中文读者。
 */
export const RANK_META: Record<string, {
  /**
   * 这一榜的页标题(浏览器标签、搜索结果标题、分享卡标题都是它)。
   */
  title: string

  /**
   * 这一榜的页描述(搜索结果摘要与分享卡正文)。
   */
  desc: string
}> = {
  /**
   * 周榜:近 7 天新增,按移民价值评分排。
   */
  'weekly-top': {
    title: 'New Canadian jobs this week — TOP 50 by immigration value | Offer2PR',
    desc: 'Top 50 jobs posted across Canada in the last 7 days, ranked by immigration-value score '
      + '(PNP streams, EE categories, wages vs median). Updated daily. '
      + '本周全加拿大新增职位 TOP 50,按移民价值评分排序,每日更新。',
  },

  /**
   * 公司榜:近两年 LMIA 获批记录 + 省提名清单命中。🔴 描述里那句「粗筛信号非担保承诺」
   * 是保留类文案(法律免责),不许删。
   */
  'sponsor-likely': {
    title: 'Employers most likely to support PNP — LMIA track record | Offer2PR',
    desc: 'First-party employers ranked by approved LMIA positions in the past two years '
      + '(ESDC open data, skilled streams) and named provincial-stream hiring. '
      + 'A rough signal, not a sponsorship promise. '
      + '最可能担保雇主榜:近两年 LMIA 获批记录 + 省提名清单命中,每日更新。',
  },
}

/**
 * 每日分类榜(E9-02)的 SEO 大类名:slug 段 → 英文大类名。
 * 只给**有分类榜**的那几段(键与 lib/rankings 的 RANKING_SLUGS 里的 `daily-top-*` 对齐);
 * 查不到就退回不带大类的通用文案,不硬拼一个英文名。
 */
export const DAILY_META_EN: Record<string, string> = {
  /**
   * 科技。
   */
  tech: 'Tech',

  /**
   * 医疗。
   */
  health: 'Healthcare',

  /**
   * 技工。
   */
  trades: 'Trades',

  /**
   * 服务业。
   */
  service: 'Service',

  /**
   * 商务。
   */
  business: 'Business',

  /**
   * 教育。
   */
  education: 'Education',

  /**
   * 制造。
   */
  manufacturing: 'Manufacturing',

  /**
   * 资源。
   */
  resources: 'Resources',

  /**
   * 艺术与体育。
   */
  arts: 'Arts & sports',

  /**
   * 管理层。
   */
  management: 'Management',
}

/**
 * 每日榜 title 的前半段(拼在大类段前面)。
 */
export const META_DAILY_TITLE_HEAD = 'Daily picks — top '

/**
 * 每日榜 title 的后半段。
 */
export const META_DAILY_TITLE_TAIL = ' in Canada by immigration value | Offer2PR'

/**
 * 每日榜 description 的前半段。
 */
export const META_DAILY_DESC_HEAD = 'Top '

/**
 * 每日榜 description 的后半段(口径 = 近 48 小时新发布按移民价值评分精选,每小时刷新)。
 */
export const META_DAILY_DESC_TAIL = ' posted across Canada in the last 48 hours, '
  + 'ranked by immigration-value score (PNP streams, EE categories, wages). Refreshed hourly. '
  + '每日精选:近 48 小时新发布按移民价值评分精选,每小时刷新。'

/**
 * 没收录英文大类名时的通用段(「jobs」)。
 */
export const META_SEG_PLAIN = 'jobs'

/**
 * 收录了英文大类名时接在它后面的那段(「Tech jobs」)。
 */
export const META_SEG_TAIL = ' jobs'
