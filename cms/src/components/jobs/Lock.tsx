'use client'
// 打码锁区:付费/限额内容永不留空白,最低给打码占位 + 一行出路(§3.6 地板规则)。
//
// #160 打码占位(Frank 拍板「打码比直接不显示更能让用户有付费意愿」):
// 空白=零信息,用户不知道这儿有东西,也就没有失去感;打码=看得见摸不着,缺口才具体。
// 关键:**打码不需要真跑**——额度判定本就在调用之前,拦下就不生成(不预跑、不占朋友那台 qwen、不排队),
// 这里糊掉的是**假文本**,零成本。真内容只在放行时才生成,一次都不浪费。
// 真值同理不下发:blur 是视觉效果不是访问控制,右键就能读,故服务端剥离 + 前端渲假值(与 #130/#152 同一套)。
//
// ⚠️ 与 ui/Card 的 ProCard / LockedRows 是同一类东西,但**不能并进 ui/**:本件要 UpgradeCta,
// 那条链拖着 UpgradeModal → AuthModal + Stripe + track;ui/ 现在是零外部依赖的叶子,并进去等于
// 每个 import ui 的页面都背上整套登录与支付。要合并,得先把 CTA 改成插槽 prop 让本件退化成纯样式件。
import { IconLock } from '@/components/icons'
import { UpgradeCta } from './UpgradeModal'
import type { TFn } from '@/lib/i18n'

const MASK_TEXT = ['████████████████████████████████', '██████████████████████████', '███████████████████████████████████', '████████████████████']

// 锁行(打码块脚注)单独成件:全站所有打码位共用同一形态(锁 + 灰注 + UpgradeCta 文字链),不许各处自造。
// ctaLabel:未登录 429 场景的出路是「登录/注册」不是「升级 Pro」,文案随场景、行为同一个组件。
export function LockFoot({ t, loggedIn, msg, ctaLabel }: { t: TFn; loggedIn: boolean; msg?: string; ctaLabel?: string }) {
  return (
    <div className="lkFoot">
      <IconLock />{msg || t('up.quota')}<UpgradeCta t={t} loggedIn={loggedIn} link label={ctaLabel} style={{ fontSize: 11.5 }} />
    </div>
  )
}

// #175(Frank「限额了不应该正常显示内容,但是模糊化吗」):429 限流态也走本件——
// 黄条 Notice 退役,改打码假文本 + 锁行
export function LockedText({ t, loggedIn, lines = 3, msg, ctaLabel }: { t: TFn; loggedIn: boolean; lines?: number; msg?: string; ctaLabel?: string }) {
  return (
    <div className="lkText">
      <div aria-hidden className="lkMask">
        {MASK_TEXT.slice(0, lines).map((s, i) => <div key={i}>{s}</div>)}
      </div>
      <LockFoot t={t} loggedIn={loggedIn} msg={msg} ctaLabel={ctaLabel} />
    </div>
  )
}
