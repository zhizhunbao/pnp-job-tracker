'use client'
/**
 * 简历存档(E11-08 §2「账户页能看能删」):档案节里的下半段 —— 存档时间 + 字符数
 * + 就地展开只读 + 清除。数据来自父页已拉到的 /api/users/me(本件不自己拉);
 * 清除走 Payload PATCH `/api/users/:id`(工厂 makeResumeClear:先本地移除再跟投)。
 * 清除要二次确认(简历是用户资产,删了不可逆):清除钮就地变「确认清除 / 取消」,
 * 不上弹框。形态照 SavedJobsList:标题 + 灰字小注 + 右侧文字钮组(经 Button,
 * ghost 底 + .raBtn 族加倍类)。状态机器住 hooks 的 useResumeArchive。
 * 2026-08-27 换装批自 ResumeArchive.tsx(PascalCase 迁移存量)整体重写。
 *
 * @author Frank
 * @time 2026-08-27 22:00:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { ymd } from '@/lib/time'
import { CLS_SEP, PLAIN_BTN_KIND } from './constants'
import { archViewLabelOf, makeFlagSet } from './functions'
import { useResumeArchive } from './hooks'
import type { ResumeArchiveIn } from './types'
import css from './account.module.css'

/**
 * 简历存档节。
 *
 * @param props 取词函数、登录人 id 与档案两格(见 ResumeArchiveIn 逐格注释)。
 * @returns 档案节的简历存档块。
 */
export function ResumeArchive({ t, userId, text, savedAt }: ResumeArchiveIn) {
  let textIn = null
  if (text != null) {
    textIn = text
  }
  let atIn = null
  if (savedAt != null) {
    atIn = savedAt
  }
  const p = useResumeArchive({ userId, text: textIn, savedAt: atIn })
  let danger = (
    <Button kind={PLAIN_BTN_KIND}
      onClick={makeFlagSet({ set: p.setSure, v: true })}
      className={cssOf(css.raBtn) + CLS_SEP + cssOf(css.raPlain)}>
      {t('rm.arch.clear')}
    </Button>
  )
  if (p.sure) {
    danger = (
      <>
        <Button kind={PLAIN_BTN_KIND}
          onClick={p.onClear}
          className={cssOf(css.raBtn) + CLS_SEP + cssOf(css.raSure)}>
          {t('rm.arch.sure')}
        </Button>
        <Button kind={PLAIN_BTN_KIND}
          onClick={makeFlagSet({ set: p.setSure, v: false })}
          className={cssOf(css.raBtn) + CLS_SEP + cssOf(css.raPlain)}>
          {t('rm.arch.cancel')}
        </Button>
      </>
    )
  }
  let body = <div className={css.raEmpty}>{t('rm.arch.empty')}</div>
  if (p.cur !== '') {
    body = (
      <>
        <div className={css.raMetaRow}>
          <span className={css.raMeta}>{t('rm.arch.meta', { d: ymd(p.at), n: p.cur.length })}</span>
          <div className={css.raCtl}>
            <Button kind={PLAIN_BTN_KIND}
              onClick={makeFlagSet({ set: p.setOpen, v: p.open === false })}
              className={cssOf(css.raBtn) + CLS_SEP + cssOf(css.raView)}>
              {archViewLabelOf({ open: p.open, t })}
            </Button>
            {danger}
          </div>
        </div>
        {p.open && <div className={css.raText}>{p.cur}</div>}
      </>
    )
  }
  return (
    <div className={css.raWrap}>
      <div className={css.secTitle}>{t('rm.arch.title')}</div>
      {body}
    </div>
  )
}
