'use client'
/**
 * me 桶子桶 settings 的「修改登录邮箱」面板(效果图 docs/design/我的/账户设置-20261107.md 2.3):
 * 新邮箱、当前密码;底栏「发送确认邮件」/ 取消。点了信里的链接才真改。
 *
 * @author Frank
 * @time 2026-11-07 23:55:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { Drawer } from '@/components/drawer'
import { Input } from '@/components/input'
import { AC_CUR_PW, AC_EMAIL, EDIT_KIND, HINT_NONE, PRIMARY_KIND, ROLE_ALERT, TYPE_EMAIL, TYPE_PW } from './constants'
import { SettingsField } from './settingsfield'
import type { SettingsDrawerIn } from './types'
import css from './settings.module.css'

/**
 * 渲染修改登录邮箱面板。
 *
 * @param props 取词与整机。
 * @returns 面板。
 */
export function EmailDrawer({ t, s }: SettingsDrawerIn) {
  const foot = (
    <>
      <Button kind={PRIMARY_KIND} onClick={s.submitEmail} disabled={s.busy}>{t('set.emSend')}</Button>
      <Button kind={EDIT_KIND} onClick={s.close}>{t('set.cancel')}</Button>
    </>
  )
  return (
    <Drawer title={t('set.emTitle')} onClose={s.close} foot={foot}>
      <SettingsField label={t('set.emNew')} hint={t('set.emHint')}>
        <Input type={TYPE_EMAIL} autoComplete={AC_EMAIL} value={s.email} onChange={s.setEmail} autoFocus />
      </SettingsField>
      <SettingsField label={t('set.pwCur')} hint={HINT_NONE}>
        <Input type={TYPE_PW} autoComplete={AC_CUR_PW} value={s.cur} onChange={s.setCur} />
      </SettingsField>
      {s.err !== '' && <div role={ROLE_ALERT} className={cssOf(css.err)}>{s.err}</div>}
    </Drawer>
  )
}
