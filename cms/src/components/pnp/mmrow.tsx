'use client'
/**
 * 域内小件:依据链的一行(一维度一段)。维度名左、判定药丸右;「本岗 / 我的」标签列
 * max-content 自适应,值一行放全 —— 长值窄屏悬挂缩进折行,永不截断省略。
 * 分隔线分组(Frank「不要卡片套卡片更清晰」—— #172 的灰内卡随之铺平)。
 * 2026-08-28 换装批自 Pnp.tsx 的 MeansForMe 拆出成文件。
 *
 * @author Frank
 * @time 2026-08-28 17:59:16
 */
import { MmCell } from './mmcell'
import { MmVerdict } from './mmverdict'
import type { MmRowIn } from './types'
import css from './pnp.module.css'

/**
 * 渲染依据链的一行。
 *
 * @param props 洗好的这一行与两列标签。
 * @returns 一段。
 */
export function MmRow({ r, jobLabel, youLabel }: MmRowIn) {
  return (
    <div className={css.mmRow}>
      <div className={css.mmHead}>
        <span className={css.mmDim}>{r.dim}</span>
        <MmVerdict tone={r.tone} text={r.text} tip={r.tip} />
      </div>
      <div className={css.mmKv}>
        <span className={css.mmK}>{jobLabel}</span>
        <span><MmCell cell={r.job} /></span>
        {r.you != null && <>
          <span className={css.mmK}>{youLabel}</span>
          <span><MmCell cell={r.you} /></span>
        </>}
      </div>
    </div>
  )
}
