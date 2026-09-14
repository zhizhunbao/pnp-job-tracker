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
 * 2026-09-14 Frank「打开完整页按钮和前面的保持一致,背景用白色的」:第三颗改走前两颗同一形
 * (ghost + PILL_CLS,href 交 Button 转 LinkButton),蓝底 `.pillLink` 退役。
 * 2026-09-14 Frank「有 AI 整理就不需要 AI 速读了吧,重复的功能」:职位弹框的「AI 速读」钮撤(整理版已是 AI 产物);
 * 公司 / 地点 / 分类弹框没有整理版,它们的速读钮照旧。
 * 2026-09-14 Frank「这个按钮去掉吧」:「打开完整页」也撤,钮行只剩中文对照。
 *
 * @author Frank
 * @time 2026-08-28 19:15:06
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import {
  BTN_GHOST, JD_LOADING, LANG_EN, PILL_CLS, TRANS_LOADING,
} from './constants'
import { transBusyClsOf, transLabelOf } from './functions'
import type { JdActsIn } from './types'
import css from './jobs.module.css'

/**
 * 渲染顶部钮行。
 *
 * @param props JD 身体状态机与界面语言。
 * @returns 一行胶囊钮。
 */
export function JdActs({ d, lang }: JdActsIn) {
  const ready = d.status !== JD_LOADING
  return (
    <div className={cssOf(css.acts)}>
      {ready && lang !== LANG_EN && d.fmt != null && d.showOrig === false && (
        <Button kind={BTN_GHOST} disabled={d.transStatus === TRANS_LOADING} onClick={d.onToggleTrans}
          className={`${PILL_CLS} ${transBusyClsOf(d.transStatus)}`}>
          {transLabelOf({ t: d.t, status: d.transStatus, shown: d.showTrans })}
        </Button>
      )}
    </div>
  )
}
