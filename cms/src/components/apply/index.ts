/**
 * apply 组件桶 —— 站内投递(2026-10-07 B2:简历 → 求职信 → 预览 → 发送;对应 lib 域:apply)。
 * 同日独立页 /apply/<id> 撤,投递并进「我的求职」(投递区 ApplySection 摆在投递记录表上方,/account?sec=sjobs&job=<id>)。
 * 2026-10-09 A 批投递搬进弹框:桶门出投递框宿主 ApplyHost(挂全站骨架)、开框 openApply(各入口调)、发出接收件 ApplySentSync
 * (「我的」页门里摆,刷新投递表);ApplySection 只剩投递框自己用,不再出门。
 *
 * @author Frank
 * @time 2026-10-07 03:00:00
 */

export { ApplyHost } from './applyhost'
export { ApplyMail } from './applymail'
export { ApplySentSync } from './applysentsync'
export { checkRowsOf, makeResumeLabel, openApply, pickOptsOf, resumeValueOf } from './functions'
export { useCheckPreview } from './hooks'
