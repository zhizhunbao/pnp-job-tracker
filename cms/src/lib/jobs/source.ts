// 岗位来源:Job Bank 渠道(含它聚合的 indeed/talent 等)统一显示「Job Bank」;是否雇主直发;原站是否拦抓取。
// `origin`(jobbank/ats/directory)是**发布渠道**,不代表雇主真假 —— 中介已按公司名过滤。
import type { JobRow } from './types'

// #136/#137(Frank 问「外链是 Indeed 就没办法了吗」「为什么不能转载」):这些原站对我们的请求返回 403
// (实测连首页都 403 = 有意拦截)。不绕过——那是规避访问控制。文案只陈述实测到的事实「该站拒绝本站自动读取」,
// 不替对方做版权断言(职位描述文字多为雇主所写,版权通常归雇主而非平台)。仅列**实测确认拦截**的站;
// 抓不到但没拦截的(如 Québec emploi 是前端渲染的政府站)走通用空态。
const BLOCKED_SRC: Record<string, string> = { 'indeed.com': 'Indeed', '86network': '86network' }
export const blockedSrc = (j: JobRow): string => BLOCKED_SRC[(j.source || '').toLowerCase()] || ''

const fromJobBank = (j: JobRow) => /jobbank\.gc\.ca/i.test(j.applyUrl)
// 来源显示标签已在数据层(etl/09_build_mart.py)洗好存 job.sourceLabel,前端只读
export const sourceLabel = (j: JobRow): string => j.sourceLabel || '—'
// 直接雇主:ATS 第一方=直接;Job Bank 渠道仅 source=='Job Bank'(雇主直发)算直接,其余是聚合转贴
export const isDirect = (j: JobRow): boolean => (fromJobBank(j) ? j.source === 'Job Bank' : true)
