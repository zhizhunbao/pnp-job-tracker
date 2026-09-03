/**
 * occupations 域(紧缺职业清单页)的死值:版式档、文案键前缀、锚点与去处的地址头、
 * 三列的身份与空表头、名字缺席的横杠、职业码的称谓。
 * 2026-08-28 换装批自 Occupations.tsx 的散值收拢挂注释(值一个不改)。
 *
 * @author Frank
 * @time 2026-08-28 00:10:00
 */

/**
 * 正文轨的上内衬档(px;Shell 的档位之一,列表页统一 16)。
 */
export const SHELL_TOP = 16

/**
 * 页头横幅的模块档(jobs = 主品牌蓝那一套;本页是职位板的同族清单页,不发明新色)。
 */
export const BANNER_MODULE = 'jobs'

/**
 * 省码标签的变体档(region = 省/地区那一套配色)。
 */
export const TAG_VARIANT_REGION = 'region'

/**
 * 省名文案键的前缀(拼上两位省码 = i18n 里那条省名;三语表在 lib/i18n)。
 */
export const PROV_KEY_HEAD = 'pr.'

/**
 * 省小节锚点 id 的前缀(拼上省码 = 这一节在页内的身份)。
 */
export const PROV_ANCHOR_HEAD = 'prov-'

/**
 * 页内锚点地址的记号(拼在锚点 id 前面 —— 页内跳转不出本页)。
 */
export const ANCHOR_HREF_HEAD = '#'

/**
 * 「在职位板查看」的地址头(拼上编码后的职业码 = 职位板按这个职业搜)。
 */
export const JOBS_SEARCH_HEAD = '/?q='

/**
 * 「职业码」列的身份(排序态与列宽都按它记)。
 */
export const COL_NOC_KEY = 'noc'

/**
 * 「职业名」列的身份。
 */
export const COL_NAME_KEY = 'name'

/**
 * 「去职位板」列的身份。
 */
export const COL_GO_KEY = 'go'

/**
 * 「去职位板」列的空表头(这一列是行动入口,列名写什么都是废话 —— 站规「解释类文案默认删」)。
 */
export const COL_GO_LABEL = ''

/**
 * 职业名缺席时的横杠(清单只给了码、字典没收录名字;空着会被读成「这一格漏渲了」)。
 */
export const NAME_NONE_MARK = '—'

/**
 * 职业码的通用称谓,跟在条数后面(「12 NOC」)。三语 i18n 表里逐字相同
 * (zh/en/ko 的 `dir.occ.colNoc` 都是 NOC)—— 它是代码令牌不是可翻译文案,
 * 不进 lib/i18n 免得同一个值存三份。
 */
export const NOC_UNIT = 'NOC'

/**
 * 条数与职业码称谓之间的空格(「12 NOC」;全站禁「·」杂糅,这里是数量+单位不是并列)。
 */
export const COUNT_GAP = ' '

/**
 * 「没有」的空文本(抓取日缺席、职业名缺席时的判空基准)。与 companies/cases 域同名同义,各家一份。
 */
export const TEXT_NONE = ''

/**
 * 本页的 SEO 头(清单页是收录主体:标题带「省提名通道紧缺职业清单」,
 * 描述里先说清「命中 = 粗筛信号,非资格认定」)。
 * 住这里而不是页面门里:门里不留死值常量,页面门只 `export const metadata = OCC_META`
 * 一行转发(2026-08-29 Frank「框架导出的内容也一律来自桶」,形照 start 的 START_META;
 * 原先那个 generateMetadata 无参、返回死值,改成常量形)。
 */
export const OCC_META = {
  /**
   * 浏览器标签与搜索结果标题。
   */
  title: 'Provincial in-demand occupation lists (PNP named streams) | Offer2PR',

  /**
   * 搜索结果摘要(英文优先 —— 88% 流量来自 Google;中文一句压在后面)。
   * 「命中 = 粗筛信号,非资格认定」是站规四类保留解释之一,不许删。
   */
  description:
    'Named occupation lists of provincial nominee streams across Canada, refreshed weekly from official pages,'
    + ' with NOC codes and official source links. Being listed is a rough signal, not an eligibility decision.'
    + ' 各省省提名通道紧缺职业清单,NOC 码+官方来源链,周更。',
}

/**
 * 资料库二级导航:紧缺职业清单(2026-09-04 Frank「这两个也改成选项卡模式,不要下拉了」:顶栏「资料库」
 * 下拉撤,三页各自顶上一条 SectionTabs;三域各自声明去处,域间不互取常量)。
 */
export const LIB_URL_OCC = '/occupations'

/**
 * 资料库二级导航:官方资源。
 */
export const LIB_URL_RESOURCES = '/resources'

/**
 * 资料库二级导航:常见案例。
 */
export const LIB_URL_CASES = '/cases'
