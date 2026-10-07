/**
 * streams 域(资讯 →「通道与门槛」页)的死值:版式档、二级导航与站内地址、省份胶囊、SEO 头。
 * 2026-09-30 通道与门槛批 2 立(Frank「各省门槛 我觉得 应该放到资讯下面」「盘点各种通道,各种门槛」;
 * 设计 docs/design/通道与门槛-20260930.md)。
 * 2026-10-03 资讯页签四分(Frank「申请步骤应该是另一个选项卡吧」):本桶多出「申请步骤」页(/steps)—— 第四个页签的去处与它的 SEO 头住这里,
 * 版式档、省份胶囊两页共用。
 *
 * @author Frank
 * @time 2026-09-30 21:46:44
 */

/**
 * 正文轨的上内衬档(px;与 /news、/timeline 同一档 —— 三页互为切换,上距对不齐切页时页面会跳)。
 */
export const SHELL_TOP = 16

/**
 * 页头 banner 的模块档:同属「移民动态」模块,与 /news、/timeline 共用配色与图组。
 */
export const BANNER_MODULE = 'news'

/**
 * 二级 tab 条的模块色档(teal 青 = 移民动态模块)。
 */
export const TABS_TONE = 'teal'

/**
 * 二级 tab 条里「最新公告」的去处。
 */
export const URL_NEWS = '/news'

/**
 * 二级 tab 条里「时间线」的去处。
 */
export const URL_TIMELINE = '/timeline'

/**
 * 二级 tab 条里「通道与门槛」的去处(= 当前页,渲成不可点的当前页签;2026-10-03 页签改叫「通道」)。
 */
export const URL_STREAMS = '/streams'

/**
 * 二级 tab 条里「申请步骤」的去处(2026-10-03 资讯页签四分:申请步骤从本页拆出,资讯第四个页签;在 /steps 渲成当前页签)。
 */
export const URL_STEPS = '/steps'

/**
 * 省份胶囊:九个参加省提名的省,自西向东(魁省另成体系、AIP 是联邦项目,两处的门槛卡下一批再接)。
 */
export const STREAM_PROVS = ['BC', 'AB', 'SK', 'MB', 'ON', 'NB', 'NS', 'PE', 'NL']

/**
 * 设备时区对不上这九省时(人在国内、魁省、三个地区)先看哪一省:第一枚胶囊。
 */
export const PROV_DEFAULT = 'BC'

/**
 * 还没选省(首帧:服务端不知道时区,挂载后才按时区预选)。
 */
export const TEXT_NONE = ''

/**
 * 地址里带省份的查询参数(2026-10-04 Frank 勾「卡上加钮 + 页签带省份」:「通道」「申请步骤」两页互切、卡上互跳钮都带着它,
 * 落地页先认它再看时区;与 components/pnp 的 P_PROV 同字)。
 */
export const P_PROV = 'prov'

/**
 * 拼带省份地址的查询串开头。
 */
export const URL_QUERY_HEAD = '?'

/**
 * 拼带省份地址的键值分隔。
 */
export const URL_KV_SEP = '='

/**
 * 省份胶囊上的字:词条头 `prov.` + 省码(界面语言全名,同时间线的省份胶囊)。
 */
export const PROV_KEY_HEAD = 'prov.'

/**
 * 这页的 SEO 头(页面门只 `export const metadata = STREAMS_META` 一行转发;形照 news 的 NEWS_META)。
 */
export const STREAMS_META = {
  /**
   * 浏览器标签与搜索结果标题。
   */
  title: 'Canada PNP streams and requirements by province | Offer2PR',

  /**
   * 搜索结果摘要(英文优先 —— 88% 流量来自 Google;中文一句压在后面)。
   */
  description:
    'Every current provincial nominee program (PNP) stream in nine provinces with its official requirements:'
    + ' status and work permit, job offer, language (CLB), work experience, wage and employer criteria, with sources.'
    + ' 加拿大九省省提名(PNP)现行通道与官方门槛:身份、雇主 offer、语言、工作经验、工资、雇主条件,逐条注明出处。',
}

/**
 * 「申请步骤」页的 SEO 头(2026-10-03 资讯页签四分;页面门只 `export const metadata = STEPS_META` 一行转发,形照 STREAMS_META)。
 */
export const STEPS_META = {
  /**
   * 浏览器标签与搜索结果标题。
   */
  title: 'Canada PNP application steps by province | Offer2PR',

  /**
   * 搜索结果摘要(英文优先 —— 88% 流量来自 Google;中文一句压在后面)。
   */
  description:
    'Step-by-step application process for every current provincial nominee program (PNP) stream in nine provinces:'
    + ' job offer, EOI registration, draws, application, provincial review and PR, with official sources.'
    + ' 加拿大九省省提名(PNP)各现行通道的申请步骤:雇主 offer、EOI 注册、抽选、递交、省里审批、递永居,逐条注明出处。',
}
