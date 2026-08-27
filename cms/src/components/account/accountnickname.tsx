'use client'
/**
 * account 域的结构:身份行里昵称的两态(E11-01)—— 看态是「名字 + 改名铅笔」,
 * 编态是「输入框 + 保存钮」。改名走 Payload PATCH /api/users/:id(本人可改),
 * 提交与忙态归调用方(state 留在页面),本件只负责这两态长什么样。
 * 2026-08-26 自 app/(frontend)/account/page.tsx 迁出(页面「纯拼装门」改造批):
 * 原先的三目改成两支 if/else 各自 return,内联样式逐格迁进 account.module.css。
 * 域内自用件,不出桶(只有 AccountOverview 在用)。
 *
 * @author Frank
 * @time 2026-08-26 20:30:20
 */
import { Input } from '@/components/input'
import { Button } from '@/components/button'
import { NICK_BOX_CLS, NICK_EDIT_MARK, NICK_INPUT_SIZE, NICK_LEN_MAX } from './constants'
import { nickSaveLabelOf } from './functions'
import type { AccountNicknameIn } from './types'
import css from './account.module.css'

/**
 * 昵称的看/编两态。
 *
 * @param props 显示名、编辑值与忙态、取词函数、进编辑/改值/保存/键盘四个回调。
 * @returns 昵称那一行。
 */
export function AccountNickname({ shown, nick, nickBusy, t, onEdit, onChange, onSave, onKey }: AccountNicknameIn) {
  if (nick == null) {
    return (
      <div className={css.nickView}>
        <span className={css.nickName}>{shown}</span>
        <button onClick={onEdit}
          title={t('acct.nick')}
          aria-label={t('acct.nick')}
          className={css.nickEdit}>{NICK_EDIT_MARK}</button>
      </div>
    )
  }
  return (
    <div className={css.nickEditRow}>
      <span className={NICK_BOX_CLS}>
        <Input value={nick}
          onChange={onChange}
          placeholder={t('acct.nickPh')}
          maxLength={NICK_LEN_MAX}
          autoFocus
          size={NICK_INPUT_SIZE}
          onKeyDown={onKey} />
      </span>
      <Button sm onClick={onSave} disabled={nickBusy}>{nickSaveLabelOf({ busy: nickBusy, t })}</Button>
    </div>
  )
}
