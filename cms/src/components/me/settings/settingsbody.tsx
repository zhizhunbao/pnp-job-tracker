'use client'
/**
 * me 桶子桶 settings 的正文:一张分区卡「登录」两行(登录邮箱、密码,各一个「修改」),开着的面板挂在下面
 * (2026-11-07 Frank「先做 5 条必备」第 5 条;同日「不加用户删除功能」「不做,只留改邮箱改密码」;
 * 效果图 docs/design/我的/账户设置-20261107.md)。Google 登录的账号两行都写「用 Google 登录」,不给「修改」。
 *
 * @author Frank
 * @time 2026-11-07 23:55:00
 */
import { Button } from '@/components/button'
import { CARD_HEAD_CLS, CARD_MD_CLS, EDIT_KIND, PANEL_EMAIL, PANEL_PW } from './constants'
import { EmailDrawer } from './emaildrawer'
import { isGoogleOf, pwValueOf } from './functions'
import { PwDrawer } from './pwdrawer'
import { SettingsRow } from './settingsrow'
import type { SettingsBodyIn } from './types'

/**
 * 账户设置正文。
 *
 * @param props 取词、当前用户与整机。
 * @returns 分区卡 + 面板。
 */
export function SettingsBody({ t, me, s }: SettingsBodyIn) {
  const google = isGoogleOf(me)
  return (
    <>
      <section className={CARD_MD_CLS}>
        <div className={CARD_HEAD_CLS}>{t('set.login')}</div>
        <SettingsRow label={t('set.email')} value={me.email}
          act={google === false && <Button kind={EDIT_KIND} sm onClick={s.openEmail}>{t('set.edit')}</Button>} />
        <SettingsRow label={t('set.pw')} value={pwValueOf({ t, google })}
          act={google === false && <Button kind={EDIT_KIND} sm onClick={s.openPw}>{t('set.edit')}</Button>} />
      </section>
      {s.panel === PANEL_PW && <PwDrawer t={t} s={s} />}
      {s.panel === PANEL_EMAIL && <EmailDrawer t={t} s={s} />}
    </>
  )
}
