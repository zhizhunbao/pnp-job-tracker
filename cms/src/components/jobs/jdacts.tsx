'use client'
/**
 * 顶部钮行(2026-07-21 Frank「参考类别」):中文对照(英文界面不出;整理版在屏才可翻)+
 * AI 速读(点了才生成,不点不烧)+ 打开完整页(仅弹框;页面自己就是完整页)。
 * AI 速读是**常驻折叠开关**(Frank 2026-07-22「按钮怎么没了」「可以折叠的」):点开点收都是它,
 * 不再点一次就消失;内容有会话缓存,收起再开秒回不重烧额度。
 * 2026-08-28 换装批自 Jd.tsx 提出成文件。
 * 2026-08-29 Frank 落锤三颗的分工:「打开完整页」是**胶囊**(几何照 verdict 的 `.tvPill`,
 * 见 `.pillLink`),前两颗定死是**纯文链形**(蓝、无边、无底)—— 它们走 button 族 ghost 型,
 * ghost 的活儿正是把钮清成一截可点文字,所以不给它们挂任何胶囊几何。
 *
 * @author Frank
 * @time 2026-08-28 19:15:06
 */
import { Button, LinkButton } from '@/components/button'
import { cssOf } from '@/components/css'
import { IconCompass } from '@/components/icons'
import {
  ARROW_LINK, BTN_GHOST, JD_LOADING, LANG_EN, PILL_CLS, SPACE, TARGET_BLANK, TEXT_NONE, TRANS_LOADING,
} from './constants'
import { aiOnClsOf, caretOf, transBusyClsOf, transLabelOf } from './functions'
import type { JdActsIn } from './types'
import css from './jobs.module.css'

/**
 * 渲染顶部钮行。
 *
 * @param props JD 身体状态机、界面语言与「打开完整页」的去处。
 * @returns 一行胶囊钮。
 */
export function JdActs({ d, lang, fullHref }: JdActsIn) {
  const ready = d.status !== JD_LOADING
  return (
    <div className={cssOf(css.acts)}>
      {ready && lang !== LANG_EN && d.fmt != null && d.showOrig === false && (
        <Button kind={BTN_GHOST} disabled={d.transStatus === TRANS_LOADING} onClick={d.onToggleTrans}
          className={`${PILL_CLS} ${transBusyClsOf(d.transStatus)}`}>
          {transLabelOf({ t: d.t, status: d.transStatus, shown: d.showTrans })}
        </Button>
      )}
      {ready && (
        <Button kind={BTN_GHOST} onClick={d.onToggleAi} className={`${PILL_CLS} ${aiOnClsOf(d.aiOn)}`}>
          <IconCompass />{SPACE}{d.t('cat.aiRead')}{SPACE}{caretOf(d.aiOn)}
        </Button>
      )}
      {fullHref !== TEXT_NONE && (
        <LinkButton href={fullHref} target={TARGET_BLANK} className={`${PILL_CLS} ${cssOf(css.pillLink)}`}>
          {d.t('detail.openFull')}{ARROW_LINK}
        </LinkButton>
      )}
    </div>
  )
}
