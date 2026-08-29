'use client'
/**
 * plan 域的结构:「估分与抽选线」独立 section 的门(2026-08-16 Frank:「估分的答题和结论
 * 放到单独一个 section,不要和基础题放一块」)。与 08-13 那次「合并成 17 项」不矛盾 ——
 * 那时估分只是多问九道题,现在它要出的是一个**独立结论**:你这分够不够被捞。
 * 结论独立,容器就该独立。
 *
 * 三层内容(顺序即优先级):
 *   ① 最近几轮抽选线 —— **未答题也给看**。官方事实,免费(收费原则:简化操作的才收费)。
 *      它同时是这张卡的空态:比一句「请先答题」有说服力得多。
 *   ② 你的估分 —— 下界/上界两个数,来自服务端与排序同源的 row.score(客户端不算分)。
 *   ③ 一行结论 —— 走 lib/points 的三态:够得着 / 够不着 / 取决于加分项。
 *      **只到「够不够线」为止**:不许延伸成「多久能被捞」「概率多大」(禁概率红线)。
 *
 * 页签走**站内通用选项卡**(tabs 域的 Tabs,与条件格那排同一个组件):真 tablist ——
 * 键盘 ←→、读屏报「第 n 项共 m 项」、窄屏横滚不换行。先前这里自造了一排胶囊按钮,
 * 与全站的筛选胶囊撞脸,而且语义是「点了发生一件事」而不是「当前在哪一面」
 * (2026-08-16 Frank「我不是有专门的 tabs 组件吗」)。
 * 2026-08-28 换装批第二段整体重写成小写件形制:内联样式与那段内联 <style> 逐格迁
 * plan.module.css、排版拆成八件、派生与洗行进 functions.ts、死值进 constants.ts。
 *
 * @author Frank
 * @time 2026-08-28 02:15:00
 */
import { useEffect, useState } from 'react'
import { Tabs } from '@/components/tabs'
import { ScoreLineDraws } from './scorelinedraws'
import { ScoreLineEmpty } from './scorelineempty'
import { ScoreLineHead } from './scorelinehead'
import { ScoreLineNote } from './scorelinenote'
import { ScoreLineVerdict } from './scorelineverdict'
import { TAB_ID_LINE_PROV, TEXT_NONE, TONE_MUTE } from './constants'
import { activeLineProvOf, firstLineProvOf, lineListOf, lineScoreOf, lineTabItemsOf } from './functions'
import type { ScoreLineCardIn } from './types'
import css from './plan.module.css'

/**
 * 渲染估分与抽选线卡。
 *
 * @param props 取词函数、界面语、通道行、抽选记录、页签省序与两段的计数、出口与渲染口。
 * @returns 估分卡。
 */
export function ScoreLineCard({
  t, lang, rows, draws, provinces, provDisp, done, total, onEdit, onPickProv,
  gridProvinces, tiles, pendingOf, onProv, noGridNote, children,
}: ScoreLineCardIn) {
  const [active, setActive] = useState(firstLineProvOf(provinces))
  const prov = activeLineProvOf({ provinces, active })
  useEffect(function reportProv() {
    if (prov === TEXT_NONE || onProv == null) {
      return
    }
    onProv(prov)
  }, [prov, onProv])
  const score = lineScoreOf({ rows, province: prov })
  const list = lineListOf({ draws, province: prov, score })
  return (
    <div className={css.card}>
      <ScoreLineHead t={t} prov={prov} done={done} total={total} onEdit={onEdit} onPickProv={onPickProv} />
      {provinces.length > 0 && (
        <div className={css.lineTabs}>
          <Tabs ariaLabel={t('dp.prov')} idPrefix={TAB_ID_LINE_PROV} value={prov} onChange={setActive}
            items={lineTabItemsOf({ provinces, provDisp, pendingOf })} />
        </div>
      )}
      {prov !== TEXT_NONE && score == null && (
        <ScoreLineEmpty t={t} prov={prov} total={total} gridProvinces={gridProvinces} noGridNote={noGridNote} />
      )}
      {prov !== TEXT_NONE && score != null && (
        <ScoreLineVerdict t={t} prov={prov} provDisp={provDisp} score={score} list={list} />
      )}
      {prov !== TEXT_NONE && tiles != null && <div className={css.lineTiles}>{tiles(prov)}</div>}
      {list.length > 0 && <ScoreLineDraws t={t} lang={lang} score={score} list={list} />}
      {list.length === 0 && prov !== TEXT_NONE && (
        <ScoreLineNote tone={TONE_MUTE}>{t('sl.noDraws', { prov: provDisp(prov) })}</ScoreLineNote>
      )}
      {children}
    </div>
  )
}
