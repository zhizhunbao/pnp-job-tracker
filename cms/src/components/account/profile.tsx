'use client'
/**
 * 「我的」页的「我的档案」一节(2026-10-09「我的档案」批,Frank「用户需要知道自己之前回答的问题」;
 * 设计稿 docs/design/我的档案-照Azure-20261009.md):一张「求职」卡,照 Azure 卡的 Essentials —— 左标签右值,
 * 卡头右上一颗「✎ 修改」;只放找工作真在用的五样(目标 / 专业 / 想做的工作 / 所在地 / 英文姓名),PR 那十几题不在这里铺。
 * 「修改」弹访客向导同一个弹框(gate 桶 GateEdit:一屏一题,末尾英文姓名,最后一题保存;Frank「答题还是之前弹框的那种干净」)。
 *
 * @author Frank
 * @time 2026-10-09 23:30:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { GateEdit } from '@/components/gate'
import { IconPencil } from '@/components/icons'
import { Loading } from '@/components/loading'
import {
  CARD_HEAD_CLS, CARD_MD_CLS, PF_CARD_KEY, PF_EDIT_KEY, PF_FAIL_KEY, PF_LOAD_FAIL, PF_LOAD_OK, PLAIN_BTN_KIND,
} from './constants'
import { profileSeedOf } from './functions'
import { useProfile } from './hooks'
import { ProfileRows } from './profilerows'
import type { ProfileIn } from './types'
import css from './account.module.css'

/**
 * 我的档案节。
 *
 * @param props 取词函数。
 * @returns 一张卡(加载占位 / 取不到一行),修改时叠编辑弹框。
 */
export function Profile({ t }: ProfileIn) {
  const p = useProfile()
  if (p.load === PF_LOAD_FAIL) {
    return <div className={cssOf(css.pfNote)}>{t(PF_FAIL_KEY)}</div>
  }
  if (p.load !== PF_LOAD_OK || p.view == null) {
    return <Loading text={t('act.loadingText')} />
  }
  return (
    <div className={CARD_MD_CLS}>
      <div className={CARD_HEAD_CLS}>
        <div className={cssOf(css.pfHead)}>
          <span>{t(PF_CARD_KEY)}</span>
          <Button kind={PLAIN_BTN_KIND} onClick={p.onEdit} className={cssOf(css.pfEdit)}>
            <IconPencil />{t(PF_EDIT_KEY)}
          </Button>
        </div>
      </div>
      <ProfileRows v={p.view} lang={p.lang} t={t} />
      {p.editing && <GateEdit t={t} seed={profileSeedOf(p.view)} onClose={p.onClose} onSaved={p.onSaved} />}
    </div>
  )
}
