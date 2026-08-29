'use client'
/**
 * plan 域的结构:一个省的对照结论块。对照锚按可信度排序:①本岗所在通道的最近一次抽选;
 * ②官方申请门槛;③都没有 → 只摆近期各通道分数线区间,**不给差分结论**
 * (拿别的通道的线判你差多少分是编)。
 * 打分表可以自报它属于哪条通道(分制全名结尾的括号)—— ON 已公布的分数线全是改制前
 * 已关停通道的 EOI 分,与新通道不是同一套分制,拿来对照就是错的锚。声明了通道的省
 * 只认同一条通道的抽选;没声明的(BC SIRS / SK)照旧全取。
 * 2026-08-28 换装批自 PnpScoreCard.tsx 的结论块提出成件。
 *
 * @author Frank
 * @time 2026-08-28 05:40:00
 */
import { lineCutTextOf, lineEmptyTextOf, lineMarginTextOf, lineNoteClsOf } from './functions'
import type { ProvinceLineIn } from './types'

/**
 * 渲染对照结论块。
 *
 * @param props 取词函数、这个省的估分与对照锚。
 * @returns 结论块。
 */
export function ProvinceLine({ t, s, anchor }: ProvinceLineIn) {
  return (
    <div className={lineNoteClsOf({ t, score: s, anchor })}>
      {anchor.line == null && lineEmptyTextOf({ t, anchor })}
      {anchor.line != null && (
        <>
          {lineCutTextOf({ t, anchor })}
          <br />
          {lineMarginTextOf({ t, score: s, anchor })}
        </>
      )}
    </div>
  )
}
