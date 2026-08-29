'use client'
/**
 * 联邦 EE 类别抽选区(点 EE 字段时显示)。与 PnpListSection 同理:清单来自 DB 维度表
 * (ee-categories,经 props 传入),全国单一源。命中 → 只展开该类别清单 + 高亮本岗;
 * 未命中 → 只列出各类别名 + 数量概览。**EE ≠ PNP,是独立信号。**
 * 2026-07-25 Frank「拆成三个卡片吧」:判定卡 / 最近抽选卡 / 类别清单卡,块无数据整卡不出(无空壳);
 * 中间还夹一张联邦抽选近况卡(E6-10)—— 原来那儿只有一句写死的口径注,现在给活数据。
 * 2026-08-28 换装批自 Pnp.tsx 整体重写成小写件形制。
 *
 * @author Frank
 * @time 2026-08-28 17:59:16
 */
import { caretOf, eeAllLabelOf, eeDrawsCatsOf, eeVerdictTextOf } from './functions'
import { EeCatList } from './eecatlist'
import { EeDrawsCard } from './eedrawscard'
import { EeVerdictCard } from './eeverdictcard'
import { FederalRoundsCard } from './federalroundscard'
import { useEeCategory } from './hooks'
import type { EeCategorySectionIn } from './types'
import { MULTI_CAT_MIN } from './constants'
import css from './pnp.module.css'

/**
 * 渲染联邦 EE 类别区。
 *
 * @param props 本岗、界面语言、扁平类别、抽选行与两个显示开关(逐格注释见 EeCategorySectionIn)。
 * @returns 一组卡片。
 */
export function EeCategorySection({ job, lang, cats, draws = [], nocDesc = [], showZh = true }: EeCategorySectionIn) {
  const p = useEeCategory({ job, lang, cats, draws, nocDesc })
  const drawsCats = eeDrawsCatsOf({ shown: p.shown })
  const lists = []
  for (const c of p.shown) {
    lists.push(<EeCatList key={c.key}
      t={p.t}
      lang={lang}
      showZh={showZh}
      cat={c}
      noc={job.noc}
      nocRows={p.nocRows}
      open={p.closed.has(c.key) === false}
      onToggle={p.listToggleOf(c.key)}
      matchRef={p.matchRef} />)
  }
  return (
    <>
      <EeVerdictCard t={p.t}
        text={eeVerdictTextOf({ t: p.t, hit: p.hit, noc: job.noc })}
        hit={p.hit.length > 0}
        allLabel={eeAllLabelOf({ t: p.t, hit: p.hit, grouped: p.grouped })}
        caret={caretOf(p.showAll)}
        onToggle={p.onShowAll} />
      {drawsCats.length > 0 && (
        <EeDrawsCard t={p.t}
          cats={drawsCats}
          showName={p.shown.length >= MULTI_CAT_MIN}
          histOf={p.histOf}
          openCat={p.openCat}
          toggleOf={p.catToggleOf} />
      )}
      <FederalRoundsCard t={p.t} draws={draws} />
      {lists.length > 0 && <div className={css.card}>{lists}</div>}
    </>
  )
}
