/**
 * myjobs 子桶 thread 的常量(2026-10-10 批 3「点已投行『打开』」:只读投递框 —— 职位信息 / 雇主回复 / 投递内容 / 邮件预览;
 * docs/design/我的/我的求职-20261009.md 1.6 / 2.6)。
 * 父桶 functions.ts 逼近 1000 行闸,按关注点切出这一族(照 apply/letter、myjobs/prefs 子桶);依赖只许父桶 → 子桶(经本目录 index.ts),
 * 子桶不取父桶任何东西,要用的常量各自抄、形状本桶自声明。框本身(appview.tsx)仍住父桶(拼父桶的单元格与样式)。
 *
 * @author Frank
 * @time 2026-10-10 23:50:00
 */

/**
 * 一条投递的往来接口(后接投递行 id)。
 */
export const URL_THREAD_HEAD = '/api/inbox/thread?app='

/**
 * 只读投递框的查询参数(`?app=<投递行 id>`;邮件链接、收件箱「打开这次投递」都走这个口)。
 */
export const P_APP = 'app'

/**
 * 开 / 关只读投递框时通知宿主重读地址栏的事件名。
 */
export const EV_APP_NAV = 'myjobs:app'

/**
 * 浏览器后退 / 前进的事件名(手机返回键先关框)。
 */
export const EV_POPSTATE = 'popstate'

/**
 * fetch 的凭据档:同源带 cookie。
 */
export const CRED_INCLUDE = 'include'

/**
 * 空串。
 */
export const TEXT_NONE = ''
