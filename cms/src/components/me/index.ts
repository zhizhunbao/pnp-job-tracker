/**
 * me 组件域的桶 —— 「我的」页框架(2026-11-07 Frank「我的」整页照 Fluent 2 / Azure 重做,新开域整体替换 account 桶的
 * 横幅 + 横排页签 + 窄读列;docs/design/我的/我的框架-20261107.md)。父桶管框架(左侧导航、窄屏抽屉、页标题、整页状态)与
 * 各节一整页的拼装;各节的行为与界面件住子桶 jobs / apps / inbox / resume / profile / sub(同日 Frank「全部在新域重写」,
 * 替 account / myjobs / inbox 三桶)。顶栏铃铛整桶重写后仍住 notify 桶,简历 PDF 预览提成通用 pdf 桶(都为破环)。
 * 对应 lib 域:无。
 *
 * @author Frank
 * @time 2026-11-07 15:30:00
 */
export { AppViewHost, openAppView } from './apps'
export { MeDrawer } from './medrawer'
export { MeHead } from './mehead'
export { MeInbox } from './meinbox'
export { MeJobs } from './mejobs'
export { MeNav } from './menav'
export { MeProfile } from './meprofile'
export { MeRedirect } from './meredirect'
export { MeResume } from './meresume'
export { MeSub } from './mesub'
export { useMeFrame, useMePage } from './hooks'
export { SEC_INBOX, SEC_PROFILE, SEC_RESUME, SEC_SJOBS, SEC_SUB } from './constants'
