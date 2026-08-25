/**
 * version 域的桶:部署身份(线上跑的是哪个提交)。
 * 对应路由:/api/version。
 *
 * 边界(2026-08-24 立域时答的三问):
 * ① 回答什么问题 —— 线上**此刻**跑的是哪一份代码。
 * ② 与谁分界 —— 与 seo 域最近(都是运维元信息端点的芯),但 seo 回答的是
 *    「搜索引擎该看到什么」,这里回答的是「我们部署对了没有」。不同问题。
 * ③ 谁先死 —— 它绑在部署平台上(三个 RENDER_* 变量名),换平台这个域整个要改;
 *    比页面活得久,比 Render 合约短。
 *
 * @author Frank
 * @time 2026-08-24 23:40:00
 */
export { deployIdentOf } from './functions'
export type { DeployIdent } from './types'
