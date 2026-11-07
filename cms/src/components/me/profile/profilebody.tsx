'use client'
/**
 * me 桶子桶 profile 的结构:我的档案正文(效果图 docs/design/我的/我的框架-20261107.md 2.4):
 * 一张分区卡装档案几行(照 Azure Essentials 左标签右值,手机标签在上值在下;不另放卡头,页标题已写「我的档案」),
 * 下面接「我的通道」卡(2026-10-13 Frank「我的档案回答完了,自动在下面出一个 section 列出我的通道」)。
 * 「修改」与「去回答」弹访客向导同一个弹框(gate 桶 GateEdit:一屏一题,末尾英文姓名,最后一题保存;Frank「答题还是之前弹框的那种干净」)。
 * 取的时候一个加载占位,取不到一句。
 *
 * @author Frank
 * @time 2026-11-07 16:05:00
 */
import { cssOf } from '@/components/css'
import { GateEdit } from '@/components/gate'
import { Loading } from '@/components/loading'
import { CARD_MD_CLS, PF_FAIL_KEY, PF_LOAD_FAIL, PF_LOAD_OK, PF_LOADING_KEY } from './constants'
import { profileSeedOf } from './functions'
import { MyStreams } from './mystreams'
import { ProfileRows } from './profilerows'
import type { ProfilePartIn } from './types'
import css from './profile.module.css'

/**
 * 我的档案正文。
 *
 * @param props 我的档案状态与取词。
 * @returns 档案卡 + 「我的通道」卡,修改时叠编辑弹框;没到一个占位,取不到一句。
 */
export function ProfileBody({ p, t }: ProfilePartIn) {
  const v = p.view
  if (p.load === PF_LOAD_FAIL) {
    return <section className={CARD_MD_CLS}><div className={cssOf(css.note)}>{t(PF_FAIL_KEY)}</div></section>
  }
  if (p.load !== PF_LOAD_OK || v == null) {
    return <Loading text={t(PF_LOADING_KEY)} />
  }
  return (
    <>
      <section className={CARD_MD_CLS}>
        <ProfileRows v={v} lang={p.lang} t={t} />
      </section>
      <MyStreams key={v.who + v.edu.join()} v={v} lang={p.lang} t={t} onEdit={p.onAsk} />
      {p.editing && (
        <GateEdit t={t} seed={profileSeedOf(v)} start={p.start} onClose={p.onClose} onSaved={p.onSaved} />
      )}
    </>
  )
}
