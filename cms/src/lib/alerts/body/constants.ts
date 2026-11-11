/**
 * alerts 桶的子桶 body 的死值:信的外壳、职位块、各封信的文案与纯文本版模板(2026-11-11 自父桶 constants 原样搬来)。
 *
 * @author Frank
 * @time 2026-11-11 03:00:00
 */

// =========================================================================
// 1. 四种提醒信
// =========================================================================

/**
 * A 档案匹配信的大标题。
 */
export const HI_LINE = 'New jobs that match your profile'

/**
 * 尾部「去职位板」链接文案。
 */
export const OPEN_BOARD = 'Open job board'

/**
 * 「可提名」小标签(只挂在符合的那一行;2026-11-10 Frank「很多人是不是不在乎 pnp」:标题与数字格都不再提)。
 */
export const TAG_PNP = ' <span style="display:inline-block;margin-left:8px;padding:1px 8px;border-radius:999px;background:#dcfce7;color:#166534;font-size:12px">PNP-eligible</span>'

/**
 * 职位块的外层表。
 */
export const JOB_LIST = '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid #e5e7eb">{rows}</table>'

/**
 * 抽选段落(黄底)。
 */
export const DRAW_P = '<p style="margin:0 0 12px;background:#fef3c7;padding:8px 12px;border-radius:8px;font-size:14px;line-height:20px">{line}</p>'

/**
 * 纯文本版的标签字:可提名。
 */
export const TEXT_TAG_PNP = 'PNP-eligible'

/**
 * 纯文本版的标签字:在招。
 */
export const TEXT_TAG_OPEN = 'Open'

/**
 * 纯文本版的标签字:已下架。
 */
export const TEXT_TAG_CLOSED = 'Closed'

/**
 * 纯文本版里收藏周报「本周新增」一行(newN>0 才出)。
 */
export const TEXT_WEEKLY_NEW = '{n} new jobs were posted this week in the fields you saved.'

/**
 * 大标题下的一行小灰字。
 */
export const MAIL_SUB = '<p style="margin:0 0 16px;font-size:13px;line-height:20px;color:#6b7280">{text}</p>'

/**
 * 「我的」页的路径(信里的按钮与设置链接落这里)。
 */
export const ACCOUNT_PATH = '/account'

/**
 * 在招标签。
 */
export const BADGE_OPEN = '<span style="display:inline-block;padding:1px 8px;border-radius:999px;background:#dcfce7;color:#166534;font-size:12px">Open</span>'

/**
 * 已下架标签。
 */
export const BADGE_CLOSED = '<span style="display:inline-block;padding:1px 8px;border-radius:999px;background:#f3f4f6;color:#6b7280;font-size:12px">Closed</span>'

/**
 * C 收藏版周报的大标题。
 */
export const SAVED_HEAD = 'Your saved jobs this week'

/**
 * C 收藏版周报的按钮。
 */
export const SAVED_CTA = 'View my saved jobs'

/**
 * C 收藏版周报「本周新增」段(newN>0 才出)。
 */
export const WEEKLY_NEW_P = '<strong>{n}</strong> new jobs were posted this week in the fields you saved. <a href="{site}" style="color:#2563eb">View new jobs</a>'

/**
 * C 收藏版周报「本周新增」段的**不出**态:newN=0 时这一格填空串,
 * 整段从信里消失 —— 不写「本周新增 0 岗」,那是把「没有新岗」这件事
 * 再念一遍给用户听,收件人只会更想退订。
 */
export const WEEKLY_NEW_NONE = ''

/**
 * C2 档案版周报的大标题(数字来自库内当周真实新增)。
 */
export const WK_HEAD = '{n} new jobs for you this week'

/**
 * C2 档案版周报大标题下的小灰字:按档案里的哪些职业和省份配的。
 */
export const WK_SUB = 'Matched to your profile: {d}'

/**
 * C2 档案版周报的按钮。
 */
export const WK_CTA = 'View all {n} jobs'

/**
 * 详情页路径段(邮件链接 = SITE + 它 + id)。
 */
export const JOB_PATH = '/jobs/'

/**
 * 拼 HTML 片段时 `join` 的分隔符:一个字都不插。
 * 被 join 的每一片都是 `fill()` 出来的**完整块级标签**(`<tr>` / `<p>`),
 * 首尾相接就已经是最终正文;塞任何分隔符都会落在两个兄弟标签**之间**,
 * 那个位置的字符不是标记而是裸文本,会跟着正文一起渲染出来。
 * 用在 `emailHtml` 的抽选行、`jobsTable` 与 `weeklyHtml` 的表行、`weeklyProfileHtml` 的头行与表行。
 */
export const HTML_SEP = ''

/**
 * 每日推送的大标题。
 */
export const DAILY_HEAD = "Today's picks: {n} jobs"

/**
 * 每日推送的按钮。
 */
export const DAILY_CTA = 'View all picks'

// =========================================================================
// 2. 确认信
// =========================================================================

/**
 * 确认信的大标题。
 */
export const CONFIRM_HEAD = 'Confirm your email address'

/**
 * 确认信的说明。
 */
export const CONFIRM_TEXT = 'Select the button below and your job alerts will be sent to this address.'

/**
 * 确认信的按钮。
 */
export const CONFIRM_CTA = 'Confirm email'

// =========================================================================
// 3. 外壳与共用块
// =========================================================================

/**
 * 站点根 URL(邮件里的链接一律绝对地址;显式取 env,不信运行时推断)。
 */
export const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://offer2pr.com').replace(/\/$/, '')

/**
 * 各封信右上角的小字:这是哪一种信(2026-11-10 Frank「统一成英文」「格式也美化一下」:四种信共用一个外壳)。
 */
export const KICKER = {
  /**
   * A 档案匹配信。
   */
  match: 'Job alert',

  /**
   * 档案版周报。
   */
  weekly: 'Weekly job alert',

  /**
   * 每日推送。
   */
  daily: 'Daily job alert',

  /**
   * 收藏版周报。
   */
  saved: 'Saved jobs update',

  /**
   * 确认收件邮箱。
   */
  confirm: 'Email confirmation',
} as const

/**
 * 信里一个职位一块:职位名、公司与地点、薪资与标签各一行(2026-11-10 取代四种表格行)。
 */
export const JOB_BLOCK = `<tr><td style="padding:14px 0;border-top:1px solid #e5e7eb;font-size:14px;line-height:20px">
      {title}
      <div style="color:#4b5563;margin-top:2px">{meta}</div>{line}
    </td></tr>`

/**
 * 职位名:带链接(落本站详情页 —— 2026-08-03 Frank:直跳 Job Bank 原帖=流量白送)。
 */
export const JOB_TITLE_LINK = '<a href="{href}" style="font-weight:600;color:#2563eb;text-decoration:none">{title}</a>'

/**
 * 职位名:没有链接可落时只出字(收藏的岗下架后库里可能已无行)。
 */
export const JOB_TITLE_PLAIN = '<span style="font-weight:600;color:#111827">{title}</span>'

/**
 * 职位块的第三行:薪资加标签。
 */
export const JOB_LINE = '<div style="margin-top:6px"><span style="font-weight:600;color:#111827">{salary}</span>{tag}</div>'

/**
 * 职位名显示时首字母大写用:整个都是小写字母的词(Job Bank 的职位名全小写)。
 * 带大写的词(IT、iOS、雇主自己的写法)匹配不上,原样不动。
 */
export const TITLE_WORD_RE = /\b[a-z]+\b/g

/**
 * 职位名里保持小写的虚词。
 */
export const TITLE_SMALL = ['a', 'an', 'and', 'at', 'for', 'in', 'of', 'on', 'or', 'the', 'to', 'with']

/**
 * 页脚第一段:为什么收到这封信,以及数据来源(提醒类的信)。
 */
export const MAIL_REASON_ALERT = 'Offer2PR is a job board for Canada, updated every day from public postings.<br>You are receiving this email because job alerts are turned on in your Offer2PR account.'

/**
 * 页脚的链接:退订、提醒设置、站点(提醒类的信)。
 */
export const MAIL_LINKS_ALERT = '<a href="{unsubUrl}" style="color:#4b5563">Unsubscribe</a>, <a href="{site}/account" style="color:#4b5563">Alert settings</a>, <a href="{site}" style="color:#4b5563">offer2pr.com</a>'

/**
 * 纯文本版正文里的换行。
 */
export const TEXT_NL = '\n'

/**
 * 纯文本版正文(提醒类的信):标题、每个职位一行、查看全部的链接、页脚说明与退订链接。
 */
export const MAIL_TEXT_ALERT = `{head}

{lines}

{cta}: {href}

--
Offer2PR is a job board for Canada, updated every day from public postings.
You are receiving this email because job alerts are turned on in your Offer2PR account.
Unsubscribe: {unsubUrl}
Alert settings: {site}/account
`

/**
 * 纯文本版里一个职位一行:各格之间的分隔。
 */
export const TEXT_JOB_SEP = ', '

/**
 * 纯文本版里一个职位一行的行首。
 */
export const TEXT_JOB_BULLET = '- '

/**
 * 纯文本版里职位行的标签模板(可提名、在招、已下架)。
 */
export const TEXT_JOB_TAG = ' [{tag}]'

/**
 * 纯文本版里职位行的链接模板。
 */
export const TEXT_JOB_HREF = ' {href}'

/**
 * 邮件里城市与省的分隔。
 */
export const SEP_LOC = ', '

/**
 * 上游没给这一格时的空串占位:payload 文档展开不出的关联字段(owner 邮箱)、
 * 库行里的可空列(标题、公司名、薪资文本、省码、职业名)。
 * 空串进邮件模板 = 这一格什么都不显示;与 `TITLE_NONE` / `SAL_NONE` 的「—」不同 ——
 * 那两个是明说「这项没有」,这个是整格不出现(公司名缺了就不占一行,不摆个横线在那儿)。
 */
export const FIELD_NONE = ''
