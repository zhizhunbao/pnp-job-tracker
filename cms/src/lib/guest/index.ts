/**
 * 访客域的桶(浏览器那半:读写本地存储、注册时交接答案档)。门里只有转发(闸 door-forward-only)。
 * 2026-10-03 付费闭环批 A1 立:职位弹框 / 职位整页记浏览、职位弹框判起弹、访客向导读写草稿与交接。
 * 同日审查后补:交接戳三件(走到注册屏落、× 撤、补交钩子取)与「向导里刚登录过」一对。
 * 2026-10-04 进站即弹:全站骨架判这一页要不要弹(takeEntryGate)。
 *
 * @author Frank
 * @time 2026-10-03 20:10:00
 */

export {
  clearGateHandoff, gateDueFor, isGateSignedIn, markGateHandoff, markGateSignedIn, markSeenJob, readGateDraft,
  readGateSeed, syncGateDraft, takeEntryGate, takeGateHandoff, writeGateDraft,
} from './functions'
