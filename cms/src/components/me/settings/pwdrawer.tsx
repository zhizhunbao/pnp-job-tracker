'use client'
/**
 * me 桶子桶 settings 的「修改密码」面板(drawer 桶右侧编辑面板,照「修改档案」;
 * 效果图 docs/design/我的/账户设置-20261107.md 2.2):当前密码、新密码、再输一次;底栏保存 / 取消。
 *
 * @author Frank
 * @time 2026-11-07 23:55:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { Drawer } from '@/components/drawer'
import { Input } from '@/components/input'
import { AC_CUR_PW, AC_NEW_PW, EDIT_KIND, HINT_NONE, PRIMARY_KIND, ROLE_ALERT, TYPE_PW } from './constants'
import { SettingsField } from './settingsfield'
import type { SettingsDrawerIn } from './types'
import css from './settings.module.css'

/**
 * 渲染修改密码面板。
 *
 * @param props 取词与整机。
 * @returns 面板。
 */
export function PwDrawer({ t, s }: SettingsDrawerIn) {
  const foot = (
    <>
      <Button kind={PRIMARY_KIND} onClick={s.submitPw} disabled={s.busy}>{t('set.save')}</Button>
      <Button kind={EDIT_KIND} onClick={s.close}>{t('set.cancel')}</Button>
    </>
  )
  return (
    <Drawer title={t('set.pwTitle')} onClose={s.close} foot={foot}>
      <SettingsField label={t('set.pwCur')} hint={HINT_NONE}>
        <Input type={TYPE_PW} autoComplete={AC_CUR_PW} value={s.cur} onChange={s.setCur} autoFocus />
      </SettingsField>
      <SettingsField label={t('set.pwNew')} hint={t('set.pwHint')}>
        <Input type={TYPE_PW} autoComplete={AC_NEW_PW} value={s.next} onChange={s.setNext} />
      </SettingsField>
      <SettingsField label={t('set.pwAgain')} hint={HINT_NONE}>
        <Input type={TYPE_PW} autoComplete={AC_NEW_PW} value={s.again} onChange={s.setAgain} />
      </SettingsField>
      {s.err !== '' && <div role={ROLE_ALERT} className={cssOf(css.err)}>{s.err}</div>}
    </Drawer>
  )
}
