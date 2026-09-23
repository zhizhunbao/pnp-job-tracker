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
 *
 * @author Frank
 * @time 2026-08-28 19:15:06
 */
import { AdvisorModal, PeekStack } from '@/components/advisor'
import { AuthModal } from '@/components/auth'
import { UpgradeModal } from '@/components/pricing'
import { OnboardingWizard } from '@/components/profile'
import { AUTH_REGISTER } from './constants'
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
      {m.popup != null && (
        <AdvisorModal group={m.popup.group} field={m.popup.srcField}
          job={m.popup.job}
          title={m.popup.title}
          lang={b.lang}
          plan={b.plan}
          pnpOcc={b.data.dims.pnpOccupations}
          pnpDraws={b.data.dims.pnpDraws}
          news={b.data.dims.news}
          eeOcc={b.data.dims.eeCategories}
          desigEmp={b.data.dims.designatedEmployers}
          nocDesc={b.data.dims.nocDescriptions}
          fieldSources={b.data.dims.fieldSources}
          onClose={m.onPopupClose}
          onOpenJob={b.onDesc}
          onOpenCompany={m.onPeekCo} />
      )}
      <PeekStack stack={m.stack} lang={b.lang} plan={b.plan} nocDesc={b.data.dims.nocDescriptions} />
      {m.wizard && <OnboardingWizard t={b.t} initial={b.plan.profile} onClose={m.onWizardClose} />}
      {m.upsell !== false && b.plan.loggedIn && (
        <UpgradeModal t={b.t} onClose={m.onUpsellClose}
          reason={upsellReasonOf({ t: b.t, upsell: m.upsell })} />
      )}
      {m.upsell !== false && b.plan.loggedIn === false && (
        <AuthModal t={b.t} mode={AUTH_REGISTER} onClose={m.onUpsellClose}
          onDone={m.onUpsellDone} />
      )}
    </>
  )
}
