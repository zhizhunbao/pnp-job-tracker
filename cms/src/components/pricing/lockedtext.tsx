'use client'
/**
 * pricing 域的打码锁区:付费 / 限额内容永不留空白,最低给打码占位 + 一行出路(§3.6 地板规则)。
 *
 * #160 打码占位(Frank 拍板「打码比直接不显示更能让用户有付费意愿」):空白 = 零信息,
 * 用户不知道这儿有东西,也就没有失去感;打码 = 看得见摸不着,缺口才具体。
 * 关键:**打码不需要真跑** —— 额度判定本就在调用之前,拦下就不生成(不预跑、不占那台
 * qwen、不排队),这里糊掉的是**假文本**,零成本;真内容只在放行时才生成,一次都不浪费。
 * 真值同理不下发:blur 是视觉效果不是访问控制,右键就能读,故服务端剥离 + 前端渲假值
 * (与 #130 / #152 同一套)。
 * #175(Frank「限额了不应该正常显示内容,但是模糊化吗」):429 限流态也走本件 ——
 * 黄条 Notice 退役,改打码假文本 + 锁行。
 *
 * ⚠️ 与 card 域的 ProCard / LockedRows 是同一类东西,但**不能并进通用件**:本件要
 * UpgradeCta,那条链拖着 UpgradeModal → AuthModal + Stripe + track;通用件是零外部依赖的
 * 叶子,并进去等于每个引它的页面都背上整套登录与支付。要合并,得先把 CTA 改成插槽 prop
 * 让本件退化成纯样式件。
 *
 * 2026-08-28 换装批自 Lock.tsx 重写成小写件形制:假文本与三个全局类名进 constants、
 * 拼装进 functions、锁行拆成自己的文件。打码块改成一个文本节点靠 pre-line 断行
 * (逐行造节点要在组件体内声明内嵌函数,闸 no-nested-function 不许),
 * 断出来的行数、字形与断行位置与逐行渲染一模一样。
 *
 * @author Frank
 * @time 2026-08-28 16:40:00
 */
import { ARIA_TRUE, LK_TEXT_CLS, MASK_LINES_DEFAULT } from './constants'
import { maskClsOf, maskTextOf } from './functions'
import { LockFoot } from './lockfoot'
import type { LockedTextIn } from './types'

/**
 * 打码锁区。
 *
 * @param props 取词函数、登录态、行数、灰注与 CTA 文案(逐格注释见 LockedTextIn)。
 * @returns 打码块与锁行。
 */
export function LockedText({ t, loggedIn, lines = MASK_LINES_DEFAULT, msg, ctaLabel }: LockedTextIn) {
  return (
    <div className={LK_TEXT_CLS}>
      <div aria-hidden={ARIA_TRUE} className={maskClsOf()}>{maskTextOf({ lines })}</div>
      <LockFoot t={t} loggedIn={loggedIn} msg={msg} ctaLabel={ctaLabel} />
    </div>
  )
}
