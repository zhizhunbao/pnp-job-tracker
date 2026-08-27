'use client'
/**
 * account 域的结构:账户页的购买节(E3-03 时长包 30/90 天)——
 * 标题 + 两档钮 + 错误行 + 注脚。Pro 也可续买,到期日顺延;前端只拿 Checkout URL
 * 跳转,到期日由 webhook 拨(回跳 /account?ok=1 出成功提示)。
 * 2026-08-26 自 app/(frontend)/account/page.tsx 迁出(页面「纯拼装门」改造批):
 * 原先共用的 btn 样式对象与两钮配色全部迁进 account.module.css,忙态压暗改修饰类。
 *
 * @author Frank
 * @time 2026-08-26 20:30:20
 */
import { PLAN_30, PLAN_90 } from './constants'
import { buyBtnClsOf, makeBuyPick } from './functions'
import type { AccountBuyPanelIn } from './types'
import css from './account.module.css'

/**
 * 账户页购买节。
 *
 * @param props 取词函数、下单忙态与错误话术、选档回调。
 * @returns 购买节的内容。
 */
export function AccountBuyPanel({ t, buying, buyErr, onBuy }: AccountBuyPanelIn) {
  return (
    <>
      <div className={css.buyTitle}>{t('acct.buyTitle')}</div>
      <div className={css.buyRow}>
        <button onClick={makeBuyPick({ plan: PLAN_30, onBuy })}
          disabled={buying}
          className={buyBtnClsOf({ plan: PLAN_30, busy: buying })}>{t('acct.buy30')}</button>
        <button onClick={makeBuyPick({ plan: PLAN_90, onBuy })}
          disabled={buying}
          className={buyBtnClsOf({ plan: PLAN_90, busy: buying })}>{t('acct.buy90')}</button>
      </div>
      {buyErr !== '' && <div className={css.buyErr}>{buyErr}</div>}
      <div className={css.buyNote}>{t('acct.buyNote')}</div>
    </>
  )
}
