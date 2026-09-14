'use client'
/**
 * 公司弹框顶部的三钮条(#185):中文对照 / AI 速读 / 完整页。
 * 行业行已挪到弹框页眉(名下副标,Frank「改成职位这种」);知名章在基本信息卡题旁。
 * 2026-08-28 拆域批自 jobs/Company.tsx 的 coActs 段重写成件(药丸开态由类给,不再内联)。
 * 2026-09-14 Frank「公司的和其他弹框的按钮还有图标啊」:三钮去图标 / 折叠角标 / ↗,与职位弹框同形。
 *
 * @author Frank
 * @time 2026-08-28 18:13:09
 */
import { Button, LinkButton } from '@/components/button'
import { cssOf } from '@/components/css'
import {
  CLS_SEP, PLAIN_BTN_KIND, TARGET_BLANK, TEXT_NONE, URL_COMPANY_HEAD,
} from './constants'
import { pillClsOf } from './functions'
import type { CompanyPanelActsIn } from './types'
import css from './companies.module.css'

/**
 * 弹框顶部三钮条。
 *
 * @param props 取词函数、两个开关与 slug(逐格注释见 CompanyPanelActsIn)。
 * @returns 钮条。
 */
export function CompanyPanelActs({
  t,
  canTrans,
  showTrans,
  onToggleTrans,
  aiOn,
  onToggleAi,
  slug,
}: CompanyPanelActsIn) {
  let transLabel = t('cat.showZh')
  if (showTrans) {
    transLabel = t('cat.hideZh')
  }
  return (
    <div className={css.acts}>
      {canTrans && (
        <Button kind={PLAIN_BTN_KIND} onClick={onToggleTrans} className={pillClsOf({ on: showTrans })}>
          {transLabel}
        </Button>
      )}
      <Button kind={PLAIN_BTN_KIND} onClick={onToggleAi} className={pillClsOf({ on: aiOn })}>
        {t('cat.aiRead')}
      </Button>
      {slug !== TEXT_NONE && (
        <LinkButton href={URL_COMPANY_HEAD + slug}
          target={TARGET_BLANK}
          className={cssOf(css.pillLink) + CLS_SEP + pillClsOf({ on: false })}>
          {t('detail.openFull')}
        </LinkButton>
      )}
    </div>
  )
}
