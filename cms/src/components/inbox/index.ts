/**
 * inbox 组件桶 ——「我的」收件箱页签(2026-10-10 批 3,docs/design/我的/我的求职-20261009.md 1.5 / 2.5):
 * 专属投递邮箱 + 转发开关、雇主回信清单 / 阅读区(手机弹阅读框)、站内回信框、「打开这次投递」(myjobs 桶的只读投递框)。
 * 对应 lib 域:inbox(/api/inbox/*)。页签红点由 account 桶自己拉 /api/inbox/count(经本桶会成环)。
 *
 * @author Frank
 * @time 2026-10-10 23:50:00
 */

export { Inbox } from './inbox'
