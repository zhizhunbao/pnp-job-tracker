'use client'
/**
 * account 域的结构:账户页的概览节 —— 标题 + 支付成功提示(Stripe 回跳 ?ok=1)
 * + 身份头(E11-01:头像 + 昵称(可改,空回退邮箱前缀)+ 邮箱)+ 套餐行。
 * 2026-08-26 自 app/(frontend)/account/page.tsx 迁出(页面「纯拼装门」改造批):
 * 内联样式逐格迁进 account.module.css,昵称两态与套餐两态各拆成域内自用的小件。
 *
 * @author Frank
 * @time 2026-08-26 20:30:20
 */
import { Avatar } from '@/components/auth'
import { Notice } from '@/components/notice'
import { cssOf } from '@/components/css'
import { AVATAR_SIZE_PX, PAY_OK_KIND } from './constants'
import { nickShownOf } from './functions'
import { AccountNickname } from './accountnickname'
import { AccountPlanLine } from './accountplanline'
import type { AccountOverviewIn } from './types'
import css from './account.module.css'

/**
 * 账户页概览节。
 *
 * @param props 用户、Pro 与支付回跳标记、昵称编辑态、取词函数、昵称四个回调。
 * @returns 概览节的内容。
 */
export function AccountOverview({
  me,
  pro,
  payOk,
  nick,
  nickBusy,
  t,
  onNickEdit,
  onNickChange,
  onNickSave,
  onNickKey,
}: AccountOverviewIn) {
  return (
    <>
      <h1 className={css.h1}>{t('acct.title')}</h1>
      {payOk && <Notice kind={PAY_OK_KIND} className={cssOf(css.payOk)}>{t('acct.payOk')}</Notice>}
      <div className={css.idRow}>
        <Avatar src={me.avatar} name={me.displayName || me.email} email={me.email} size={AVATAR_SIZE_PX} />
        <div className={css.idCol}>
          <AccountNickname shown={nickShownOf({ displayName: me.displayName, email: me.email })}
            nick={nick}
            nickBusy={nickBusy}
            t={t}
            onEdit={onNickEdit}
            onChange={onNickChange}
            onSave={onNickSave}
            onKey={onNickKey} />
          <div className={css.email}>{me.email}</div>
        </div>
      </div>
      <AccountPlanLine pro={pro} until={me.proUntil} t={t} />
    </>
  )
}
