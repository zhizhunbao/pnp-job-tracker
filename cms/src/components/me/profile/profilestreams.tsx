'use client'
/**
 * me 桶子桶 profile 的结构:「我的通道」一页的正文(2026-11-11 Frank「我的通道拿出来」:原先接在档案卡下面,单独成页)。
 * 档案取到了出通道卡(mystreams.tsx);没答身份的那张卡里有「去回答」,开的是档案同一张右侧表单,答完按新答案重出。
 * 取的时候一个加载占位,取不到一句。
 *
 * @author Frank
 * @time 2026-11-12 10:00:00
 */
import { cssOf } from '@/components/css'
import { GateForm } from '@/components/gate'
import { Loading } from '@/components/loading'
import { CARD_MD_CLS, PF_FAIL_KEY, PF_LOAD_FAIL, PF_LOAD_OK, PF_LOADING_KEY } from './constants'
import { profileSeedOf } from './functions'
import { MyStreams } from './mystreams'
import type { ProfilePartIn } from './types'
import css from './profile.module.css'

/**
 * 「我的通道」一页的正文。
 *
 * @param props 我的档案状态与取词。
 * @returns 通道卡,答题时叠右侧表单;没到一个占位,取不到一句。
 */
export function ProfileStreams({ p, t }: ProfilePartIn) {
  const v = p.view
  if (p.load === PF_LOAD_FAIL) {
    return <section className={CARD_MD_CLS}><div className={cssOf(css.note)}>{t(PF_FAIL_KEY)}</div></section>
  }
  if (p.load !== PF_LOAD_OK || v == null) {
    return <Loading text={t(PF_LOADING_KEY)} />
  }
  return (
    <>
      <MyStreams key={v.who + v.edu.join()} v={v} lang={p.lang} t={t} onEdit={p.onAsk} />
      {p.editing && (
        <GateForm t={t} seed={profileSeedOf(v)} onClose={p.onClose} onSaved={p.onSaved} />
      )}
    </>
  )
}
