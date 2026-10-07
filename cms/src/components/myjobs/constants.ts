/**
 * 「我的」页两张岗位表(myjobs 组件桶)的常量:我的求职、我的收藏。
 * 2026-10-06 Frank「先做我的求职」「这个不应该拆成多个字段吗」「进度这个用户会自己点吗」→ 拆成职位板那样的多列,
 * 进度只读(现在只有点「邮箱投递」自动记的「已投」;B2 站内投递上线后换成系统记的 已发出 / 已送达 / 雇主回复);
 * 同日「也重新改一下」(我的收藏)→ 同一套列与格子。数据口 lib/myjobs。
 *
 * @author Frank
 * @time 2026-10-06 23:20:00
 */

/**
 * 我的求职清单接口。
 */
export const URL_APPLIED = '/api/myjobs/applied'

/**
 * 我的收藏清单接口。
 */
export const URL_SAVED = '/api/myjobs/saved'

/**
 * 取消收藏:收藏记录的 DELETE 地址前缀(Payload REST,本人可删)。
 */
export const URL_SAVED_JOB_HEAD = '/api/saved-jobs/'

/**
 * 职位页地址前缀(后接职位 id)。
 */
export const JOB_HREF_HEAD = '/jobs/'

/**
 * 请求带 cookie(登录态)。
 */
export const CRED_INCLUDE = 'include'

/**
 * 取消收藏的请求方法。
 */
export const METHOD_DELETE = 'DELETE'

/**
 * 投递进度的字样:键 = 收藏表 status,labelKey = 词条(与原收藏看板同一套词;只读显示)。
 */
export const STAGES = [
  {
    st: 'applied',
    labelKey: 'sj.st.applied',
  },
  {
    st: 'interview',
    labelKey: 'sj.st.interview',
  },
  {
    st: 'offer',
    labelKey: 'sj.st.offer',
  },
] as const

/**
 * 我的求职那张表。
 */
export const KIND_APPLIED = 'applied'

/**
 * 我的收藏那张表。
 */
export const KIND_SAVED = 'saved'

/**
 * 职位列键。
 */
export const COL_TITLE = 'title'

/**
 * 公司列键。
 */
export const COL_COMPANY = 'company'

/**
 * 城市列键。
 */
export const COL_CITY = 'city'

/**
 * 薪资列键。
 */
export const COL_SALARY = 'salary'

/**
 * 日期列键(我的求职 = 投递日期,我的收藏 = 发布日期)。
 */
export const COL_DATE = 'date'

/**
 * 投递状态列键。
 */
export const COL_STAGE = 'stage'

/**
 * 职位状态列键(在架 / 已下架)。
 */
export const COL_LISTING = 'listing'

/**
 * 操作列键。
 */
export const COL_ACT = 'act'

/**
 * 空串(没有链接 / 没有字样)。
 */
export const TEXT_NONE = ''

/**
 * 空格的横杠(没投过的投递状态;同职位板空格)。
 */
export const DASH = '—'

/**
 * 操作列「取消收藏」的钮档(ghost 最素,样子由本桶的类定,与「打开」同形)。
 */
export const ACT_KIND = 'ghost'

/**
 * 公司弹框层的种类(advisor 的 PeekStack 按它分职位层 / 公司层)。
 */
export const LAYER_CO = 'company'

/**
 * 公司弹框里职位描述用的职业说明表(本页不带,给空表;同雇主板)。
 */
export const NOC_DESC_NONE = []

/**
 * 城市落职位板按城市筛的地址头(同把脉页城市段)。
 */
export const CITY_HREF_HEAD = '/?city='

/**
 * 表窄于这个宽度时横滚(平板竖屏不把列挤成竖排;手机走卡片)。
 */
export const TABLE_MIN_W = 720
