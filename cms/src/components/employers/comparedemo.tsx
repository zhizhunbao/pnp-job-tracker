'use client'
/**
 * 对比页免费态的正文:三行价值点 + 一张模糊的样例表 + 升级钮 —— ⑤ 价值时刻先例,
 * 🔴 真值不出服务端(免费页拿不到,也就泄不了;糊掉的本来就是假数据)。
 * 样例表 2026-08-11(Frank「都改成一套」)从自造的裸 `<table>` 改成公共 Table
 * (bare = 外面这层白卡就是它的壳);它是**转置**表:指标当行、三家假公司当列。
 * 2026-08-27 换装批自 Compare.tsx 的免费分支提出成文件。
 *
 * @author Frank
 * @time 2026-08-27 23:30:00
 */
import { useState } from 'react'
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { IconStar } from '@/components/icons'
import { PricingModal } from '@/components/pricing'
import { Table } from '@/components/table'
import { BTN_PRO, CARD_CLS, CLS_SEP, PRICING_Z } from './constants'
import { compareDemoColsOf, compareDemoRowsOf, demoMetricOf, makePricingSet } from './functions'
import type { CompareDemoIn, CompareDemoRow } from './types'
import css from './employers.module.css'

/**
 * 对比页免费态的正文。
 *
 * @param props 取词函数与登录态(见 CompareDemoIn 逐格注释)。
 * @returns 价值点、模糊样例表与升级钮。
 */
export function CompareDemo({ t, loggedIn }: CompareDemoIn) {
  const [pricing, setPricing] = useState(false)
  return (
    <>
      <ul className={css.valueList}>
        <li>{t('ce.v1')}</li>
        <li>{t('ce.v2')}</li>
        <li>{t('ce.v3')}</li>
      </ul>
      <div className={[CARD_CLS, cssOf(css.demoCard)].join(CLS_SEP)}>
        <Table<CompareDemoRow> bare
          rowKey={demoMetricOf}
          rows={compareDemoRowsOf({ t })}
          cols={compareDemoColsOf()} />
        <div className={css.demoOverlay}>
          <span className={css.demoBadge}>{t('cmp.demo')}</span>
          <Button kind={BTN_PRO} sm onClick={makePricingSet({ setPricing, open: true })}>
            <IconStar /> {t('cmp.demoCta')}
          </Button>
        </div>
      </div>
      {pricing && (
        <PricingModal t={t}
          loggedIn={loggedIn}
          pro={false}
          z={PRICING_Z}
          onClose={makePricingSet({ setPricing, open: false })} />
      )}
    </>
  )
}
