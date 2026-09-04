'use client'
/**
 * pte 域的结构:/pte/[type]/[id] 单题页正文 —— Shell 轨(右上返回走壳的 back 槽)+ 头行(人话题型名 #题号)+
 * 三栏(左:目录树;中:答题卡 + 题下留言;右:事实卡;手机叠成单栏,目录树垫底)。壳件拼装归页面门。
 * 2026-09-04 Frank「页面也是分不同的 section」「就考过就完事了」:评论机器在这里装配,
 * 「考过 (N)」钮挂题卡头,评论卡只剩留言 + 「写评论」。批四(同日 Frank「可以」):免费每日 20 次提交,
 * 第 21 次开闸 —— 未登录弹注册框、已登录弹升级框,两框都由这里渲。
 * 2026-09-03 批二新立(效果图 img/PTE单题*-*);同日 Frank「详情页返回按钮都在右上,样式位置固定统一」
 * → 返回钮改用 button 桶 BackButton 经 Shell back 槽钉位,本域不再自绘。
 *
 * @author Frank
 * @time 2026-09-03 12:00:00
 */
import { AuthModal } from '@/components/auth'
import { UpgradeModal } from '@/components/pricing'
import { BackButton, Button } from '@/components/button'
import { useLang } from '@/components/i18n'
import { Shell } from '@/components/shell'
import { GATE_LOGIN, GATE_UPGRADE, KIND_PRIMARY, NUM_HEAD, SHELL_TOP, SPACE, STATE_IDLE } from './constants'
import { listHrefOf, typeAtOr, typeNameOf } from './functions'
import { usePteAnswer, usePteComments, usePteDict } from './hooks'
import { PteAnswer } from './pteanswer'
import { PteComments } from './ptecomments'
import { PteDict } from './ptedict'
import { PteFacts } from './ptefacts'
import { PteNav } from './ptenav'
import type { PteItemIn } from './types'
import css from './pte.module.css'

/**
 * 单题页正文。
 *
 * @param props 题型维度、题、评论与登录态(逐格注释见 PteItemIn)。
 * @returns 正文。
 */
export function PteItem({ types, item, comments, loggedIn, pro, rowsByType }: PteItemIn) {
  const [lang, , t] = useLang()
  const type = typeAtOr({ types, code: item.q.type })
  const a = usePteAnswer({ q: item.q, type, loggedIn, pro })
  const d = usePteDict()
  const c = usePteComments({ qid: item.q.qid, comments, times: item.q.times })
  let seen = <Button kind={KIND_PRIMARY} sm onClick={c.onLoginOpen}>{t('pte.c.seen', { n: c.seenN })}</Button>
  if (loggedIn) {
    seen = (
      <Button kind={KIND_PRIMARY} sm onClick={c.onExamSubmit} disabled={c.examState !== STATE_IDLE}>
        {t('pte.c.seen', { n: c.seenN })}
      </Button>
    )
  }
  return (
    <Shell top={SHELL_TOP} back={<BackButton fallback={listHrefOf({ type: item.q.type })} label={t('detail.back')} />}>
      <PteDict t={t} d={d} lang={lang} />
      {c.loginOpen && <AuthModal t={t} onClose={c.onLoginClose} onDone={c.onLoginDone} />}
      {a.gate === GATE_LOGIN && <AuthModal t={t} onClose={a.onGateClose} onDone={c.onLoginDone} />}
      {a.gate === GATE_UPGRADE && <UpgradeModal t={t} onClose={a.onGateClose} reason={t('pte.quotaHit')} />}
      <div className={css.track}>
        <div className={css.headRow}>
          <h1 className={css.h1}>{typeNameOf({ type, lang })}{SPACE}{NUM_HEAD}{item.q.num}</h1>
        </div>
        <div className={css.grid}>
          <PteNav t={t} types={types} type={item.q.type} rowsByType={rowsByType} qid={item.q.qid} lang={lang} />
          <div className={css.col}>
            <PteAnswer t={t}
              q={item.q}
              type={type}
              pos={t('pte.pos', { i: item.index, n: item.total })}
              a={a}
              seen={seen}
              pro={pro}
              tiers={item.tiers}
              onHoverWord={d.onHoverWord}
              prevHref={item.prevHref}
              nextHref={item.nextHref} />
            <PteComments t={t} c={c} loggedIn={loggedIn} />
          </div>
          <PteFacts t={t} q={item.q} />
        </div>
      </div>
    </Shell>
  )
}
