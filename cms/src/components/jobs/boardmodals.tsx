'use client'
/**
 * 职位板的弹框层:字段弹框(点一格看这一格背后的事实)、职位描述弹框(C1 走查拍板
 * 2026-07-07:删两套公司弹窗,它只剩 JD 快看)、首访引导、升级/登录弹框。
 * 三问弹框已删(2026-07-31 统一答题):答题只在 /plan/*,这页只读答案做回显与筛选。
 * 匹配全放开(Frank 2026-07-21):匹配不再限额 → 底部「升级看全量」升级卡退役;
 * 升级动力改由表内 Pro 数据列打码承担。
 * 2026-08-28 换装批自 Jobs.tsx 提出成文件。
 * 2026-09-19 Frank「这种里面的链接都改成弹框显示」:公司组里点相似雇主 → 公司弹框(不带职位)接手,不再新开页。
 * 2026-09-21 Frank「点公司就弹公司的框?然后还能点回来」:职位描述弹框与公司弹框并进弹框栈(advisor 的 PeekStack 画),
 * 一层层叠、只关最上面一层;字段弹框仍单独一格,垫在栈底下。
 * 2026-09-23「我的匹配」整拆:登录档(登录成功落匹配视图)与匹配锁由头随之撤 —— 匿名弹框一律注册框、落回原页,
 * 升级弹框的由头只剩「保存筛选满额」一种。
 * 2026-09-26 /fe 首页 Frank:省提名清单与抽选两张整表不再随首屏内联,字段弹框打开时自己懒取(advisor 域 usePnpData),
 * 这里不再递这两格。
 * 2026-09-28 省提名弹框自立(Frank「pnp 弹框自己管自己」):省提名那一组直开 pnp 桶的 PnpModal,不再经 advisor 的字段弹框;
 * 别的组照旧 AdvisorModal。
 * 2026-10-03 付费闭环批 A1:匿名点收藏不再走升级 / 登录弹框,改弹访客向导(profile 桶 GateWizard,注册完补收那一岗);
 * 升级 / 登录弹框的由头只剩 Pro 锁格与保存筛选满额。
 * 2026-10-04 访客四题改版:GateWizard 自 profile 桶迁入 gate 桶,改从 gate 桶取(契约不变)。
 * 2026-10-09「我的档案」批:首访引导(profile 桶 OnboardingWizard)撤,这里不再挂它。
 * 同日收口审查:收藏那一路旁边多挂一路筛选的访客向导(访客关掉进站向导后动筛选 / 搜索再弹;设计稿 10-04),照收藏那一路的形挂。
 * 2026-10-09 N 批(Frank「一个全站宿主,并掉各页那 5 套」):本页不再自己画 PeekStack,改摆 modal 桶的报件 PeekContext
 * (报本页的分层态与职业名表),弹框由全站骨架上的 PeekHost 画。
 * 2026-10-09 N6b 批:字段弹框里的名字(公司组在招职位 / 相似雇主、AIP 名单招牌)N6 起由 name 桶自开弹框,递给字段弹框的两个回调撤;
 * 09-19「字段弹框让位给公司弹框」那只手柄(onPeekCo)随之退役 —— 现在点相似雇主是公司弹框叠在字段弹框上面。
 *
 * @author Frank
 * @time 2026-08-28 19:15:06
 */
import { AdvisorModal } from '@/components/advisor'
import { PeekContext } from '@/components/modal'
import { AuthModal } from '@/components/auth'
import { GateWizard } from '@/components/gate'
import { PnpModal } from '@/components/pnp'
import { UpgradeModal } from '@/components/pricing'
import { AUTH_REGISTER, GATE_INTENT_FILTER, GATE_INTENT_SAVE, GROUP_PNP } from './constants'
import { upsellReasonOf } from './functions'
import type { BoardPanelIn } from './types'

/**
 * 渲染弹框层。
 *
 * @param props 职位板整台状态机。
 * @returns 当前开着的那些浮层。
 */
export function BoardModals({ b }: BoardPanelIn) {
  const m = b.modals
  return (
    <>
      {m.popup != null && m.popup.group === GROUP_PNP && (
        <PnpModal job={m.popup.job} lang={b.lang} title={m.popup.title} field={m.popup.srcField}
          nocDesc={b.data.dims.nocDescriptions}
          onClose={m.onPopupClose} />
      )}
      {m.popup != null && m.popup.group !== GROUP_PNP && (
        <AdvisorModal group={m.popup.group} field={m.popup.srcField}
          job={m.popup.job}
          title={m.popup.title}
          lang={b.lang}
          plan={b.plan}
          news={b.data.dims.news}
          eeOcc={b.data.dims.eeCategories}
          nocDesc={b.data.dims.nocDescriptions}
          fieldSources={b.data.dims.fieldSources}
          onClose={m.onPopupClose} />
      )}
      <PeekContext plan={b.plan} nocDesc={b.data.dims.nocDescriptions} />
      {m.upsell !== false && b.plan.loggedIn && (
        <UpgradeModal t={b.t} onClose={m.onUpsellClose}
          reason={upsellReasonOf({ t: b.t, upsell: m.upsell })} />
      )}
      {m.upsell !== false && b.plan.loggedIn === false && (
        <AuthModal t={b.t} mode={AUTH_REGISTER} onClose={m.onUpsellClose}
          onDone={m.onUpsellDone} />
      )}
      {m.saveGate != null && (
        <GateWizard t={b.t} intent={GATE_INTENT_SAVE} onClose={m.onSaveGateClose} onDone={b.onSaveGateDone} />
      )}
      {m.filterGate && (
        <GateWizard t={b.t} intent={GATE_INTENT_FILTER} onClose={m.onFilterGateClose} onDone={m.onFilterGateDone} />
      )}
    </>
  )
}
