/**
 * pricing 页面域的桶 —— /pricing 定价页,外加定价件本身:价卡与展示价(PricingCard/PRICE)、
 * 定价弹窗、升级弹框、打码锁区。
 * 2026-08-28 拆域批自 components/jobs 迁入 PricingModal.tsx、UpgradeModal.tsx、Lock.tsx
 * 三件(先原样搬,形制归换装批);同日换装批把这三件整体重写成小写件形制 ——
 * 三张价卡、价格行、清单行、卖点行、免费卡 CTA、锁行、升级钮各自一个 tsx(一个 tsx
 * 一个组件),内联样式逐格迁 pricing.module.css、购买流与埋点进 functions.ts、状态进
 * hooks.ts、死值进 constants.ts、env 算出来的展示价进 variables.ts。
 * 升级钮 UpgradeCta 与锁行 LockFoot 各自只有一个域内消费者,不上门。
 * 2026-08-26 自 app/(frontend)/pricing/ 迁入(原文件头 @author Claude
 * @time 2026-08-26 19:28:00);定价页正文同批重写成小写件,壳件拼装归页面门
 * (Frank「组装只许在 (frontend) 页面门里」,样张 account)—— 整页外框走 shell 桶的
 * 通用件 Frame,顶栏与页脚由 page.tsx 直接拼,Pricing 只出正文。
 * 对应 lib 域:lib/quota(免费额度)、lib/stripe。
 *
 * @author Frank
 * @time 2026-08-28 12:45:00
 */
export { LockedText } from './lockedtext'
export { Pricing } from './pricing'
export { PricingCard } from './pricingcard'
export { PricingModal } from './pricingmodal'
export type { PriceCaps } from './types'
export { UpgradeModal } from './upgrademodal'
export { PRICE } from './variables'
