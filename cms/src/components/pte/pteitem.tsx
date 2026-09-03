'use client'
/**
 * pte 域的结构:/pte/[type]/[id] 单题页正文 —— Shell 轨(右上返回走壳的 back 槽)+ 头行(人话题型名 #题号)+
 * 双栏(左:答题卡 + 题下评论;右:事实卡;手机叠成单栏)。壳件拼装归页面门。
 * 2026-09-03 批二新立(效果图 img/PTE单题*-*);同日 Frank「详情页返回按钮都在右上,样式位置固定统一」
 * → 返回钮改用 button 桶 BackButton 经 Shell back 槽钉位,本域不再自绘。
 *
 * @author Frank
 * @time 2026-09-03 12:00:00
 */
import { BackButton } from '@/components/button'
import { useLang } from '@/components/i18n'
import { Shell } from '@/components/shell'
import { NUM_HEAD, SHELL_TOP, SPACE } from './constants'
import { listHrefOf, typeAtOr, typeNameOf } from './functions'
import { usePteAnswer, usePteDict } from './hooks'
import { PteAnswer } from './pteanswer'
import { PteComments } from './ptecomments'
import { PteDict } from './ptedict'
import { PteFacts } from './ptefacts'
import type { PteItemIn } from './types'
import css from './pte.module.css'

/**
 * 单题页正文。
 *
 * @param props 题型维度、题、评论与登录态(逐格注释见 PteItemIn)。
 * @returns 正文。
 */
export function PteItem({ types, item, comments, loggedIn }: PteItemIn) {
  const [lang, , t] = useLang()
  const type = typeAtOr({ types, code: item.q.type })
  const a = usePteAnswer({ q: item.q, type, loggedIn })
  const d = usePteDict()
  return (
    <Shell top={SHELL_TOP} back={<BackButton fallback={listHrefOf({ type: item.q.type })} label={t('detail.back')} />}>
      <PteDict t={t} d={d} />
      <div className={css.track}>
        <div className={css.headRow}>
          <h1 className={css.h1}>{typeNameOf({ type, lang })}{SPACE}{NUM_HEAD}{item.q.num}</h1>
        </div>
        <div className={css.grid}>
          <div className={css.col}>
            <PteAnswer t={t}
              q={item.q}
              type={type}
              pos={t('pte.pos', { i: item.index, n: item.total })}
              a={a}
              prevHref={item.prevHref}
              nextHref={item.nextHref} />
            <PteComments t={t} qid={item.q.qid} comments={comments} loggedIn={loggedIn} />
          </div>
          <PteFacts t={t} q={item.q} />
        </div>
      </div>
    </Shell>
  )
}
