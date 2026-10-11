/**
 * 站内投递域的桶(浏览器也能打包的那半):投递页与服务端共用的求职信填空 / 换回占位 / 位置跟随 / 字符判定 / 署名判定,
 * 信的上限。(2026-10-07 投递页撤、放进「我的」,起始态改由 /api/apply/start 取,`loadApplyStart` 不再出桶。)
 * 门里只有转发(闸 door-forward-only)。
 * 2026-10-10 Frank「删吧」(「今日待投 / 智能投递」整条撤):只给 queue 域用的那批出桶(模板信与写信参数、取简历原件 / 署名 /
 * 简历清单、存署名)随之收回,域内照用。
 * 2026-10-10 批 3「收件箱」:出测试号收件人换算 recipientOf 与发件人显示 senderFromOf(收件箱的转发 / 回信由 lib/inbox 的 routes 注入用,
 * 同一个口径不复制第二份)。
 *
 * @author Frank
 * @time 2026-10-07 01:30:00
 */

export { COVER_MAX } from './constants'
export {
  coverFileOf, coverNormOf, isSenderName, mailSubjectOf, mailTextOf, pdfBadCharsOf, recipientOf, senderFromOf,
} from './functions'
export type { ApplyStart } from './types'
