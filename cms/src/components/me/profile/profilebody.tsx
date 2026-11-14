'use client'
/**
 * me 桶子桶 profile 的结构:我的档案正文(效果图 docs/design/我的/我的框架-20261107.md 2.4):
 * 一张分区卡装档案几行(照 Azure Essentials 左标签右值,手机标签在上值在下;不另放卡头,页标题已写「我的档案」),
 * 下面接「我的通道」卡(2026-10-13 Frank「我的档案回答完了,自动在下面出一个 section 列出我的通道」)。
 * 「修改」与「去回答」弹访客向导同一个弹框(gate 桶 GateEdit:一屏一题,末尾英文姓名,最后一题保存;Frank「答题还是之前弹框的那种干净」)。
 * 2026-11-07 Frank「按 Azure 的改」:换成右侧一页表单(gate 桶 GateForm,七格同在一页、改哪格改哪格、底部一次保存)。
 * 同日 Frank「删了吧」:gate 桶 GateEdit 已删,上面「弹访客向导同一个弹框」那句只剩来历。
 * 取的时候一个加载占位,取不到一句。
 * 2026-11-11 第 4 批(Frank「左边我的档案,右面我的简历。然后我的通道拿出来」):这里只剩档案卡 —— 卡头「我的档案」加「修改」
 * (原先在页标题右边);「我的通道」卡挪去单独一页(profilestreams.tsx)。
 * 2026-11-12 Frank「这两个加载中也太扯淡了吧」:两栏并排后,左边一行没有卡的「加载中…」和右边预览里的「加载中」同时转;
 * 取档案时改成先出卡和卡头、下面一块不出字的占位(同右边简历卡的做法),一页只剩预览里那一个加载提示。
 *
 * @author Frank
 * @time 2026-11-07 16:05:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { GateForm } from '@/components/gate'
import {
  BUSY_ON, CARD_HEAD_CLS, CARD_MD_CLS, ONE_SPACE, PF_EDIT_KEY, PF_FAIL_KEY, PF_LOAD_FAIL, PF_LOAD_OK, PF_LOADING_KEY,
  PF_START_CV, PF_TITLE_KEY, SECONDARY_KIND,
} from './constants'
import { profileSeedOf } from './functions'
import { ProfileRows } from './profilerows'
import type { ProfilePartIn } from './types'
import css from './profile.module.css'

/**
 * 我的档案正文。
 *
 * @param props 我的档案状态与取词。
 * @returns 档案卡,修改时叠右侧表单;没到出带卡头的占位卡,取不到一句。
 */
export function ProfileBody({ p, t }: ProfilePartIn) {
  const v = p.view
  if (p.load === PF_LOAD_FAIL) {
    return <section className={CARD_MD_CLS}><div className={cssOf(css.note)}>{t(PF_FAIL_KEY)}</div></section>
  }
  if (p.load !== PF_LOAD_OK || v == null) {
    return (
      <section className={CARD_MD_CLS} aria-busy={BUSY_ON} aria-label={t(PF_LOADING_KEY)}>
        <div className={CARD_HEAD_CLS + ONE_SPACE + cssOf(css.cardHead)}>
          <span>{t(PF_TITLE_KEY)}</span>
        </div>
        <div className={cssOf(css.skel)} />
      </section>
    )
  }
  return (
    <>
      <section className={CARD_MD_CLS}>
        <div className={CARD_HEAD_CLS + ONE_SPACE + cssOf(css.cardHead)}>
          <span>{t(PF_TITLE_KEY)}</span>
          <Button kind={SECONDARY_KIND} sm onClick={p.onEdit}>{t(PF_EDIT_KEY)}</Button>
        </div>
        <ProfileRows v={v} lang={p.lang} t={t} />
      </section>
      {p.editing && (
        <GateForm t={t} seed={profileSeedOf(v)} onClose={p.onClose} onSaved={p.onSaved}
          cv={p.start === PF_START_CV} />
      )}
    </>
  )
}
