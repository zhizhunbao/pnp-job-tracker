'use client'
/**
 * 域内小件:一张通道清单卡(清单名 + 条数 + 职业行 + 末尾的展开开关)。
 * Frank 走查#14:清单头改纯 title(不再作折叠开关),开关移到列表末尾;默认只显命中「本岗」项,
 * 点「展开其他」才全量(取舍在 streamRowsOf 里)。
 * 2026-07-25 Frank:清单可折叠 + 职业带界面语言译名 + 展开不内嵌滚动。
 * 2026-08-28 换装批自 Pnp.tsx 的 PnpListSection 拆出成文件。
 * 2026-10-02 Frank「全站统一 都改成 展开 20 和 收起。全部统一」:末尾开关换成 pager 桶 FoldLine(展开 20 个 → 再展开 20 个 → 展开其余 N 个 → 收起),开合由本卡
 * useFold 自管。
 *
 * @author Frank
 * @time 2026-08-28 17:59:16
 */
import { FoldLine, useFold } from '@/components/pager'
import { streamDisplay } from '@/lib/jobs'
import { BOX_GAP_NONE, K_FOLD_UNIT_ITEM } from './constants'
import { boxClsOf, hiddenCountOf, streamRowsOf } from './functions'
import { StreamRow } from './streamrow'
import type { StreamCardIn } from './types'
import css from './pnp.module.css'

/**
 * 渲染一张通道清单卡。
 *
 * @param props 取词函数、界面语言、译名开关、这张清单、本岗职业码、字典、展开态与 ref 盒。
 * @returns 清单卡。
 */
export function StreamCard({ t, lang, showZh, stream, noc, nocRows, matchRef }: StreamCardIn) {
  const hidden = hiddenCountOf({ stream, noc })
  const fold = useFold({ hidden })
  const rows = []
  for (const r of streamRowsOf({ t, lang, showZh, stream, noc, nocRows, extra: fold.extra })) {
    rows.push(<StreamRow key={r.key} r={r} matchRef={matchRef} />)
  }
  return (
    <div className={css.card}>
      <div className={css.cardHead}>
        {streamDisplay({ t, label: stream.label })}
        <span className={css.count}>{t('eelist.count', { n: stream.occupations.length })}</span>
      </div>
      <div className={boxClsOf({ clip: false, gap: BOX_GAP_NONE })}>{rows}</div>
      <FoldLine t={t}
        unit={t(K_FOLD_UNIT_ITEM)}
        hidden={hidden}
        extra={fold.extra}
        busy={false}
        onMore={fold.onMore}
        onFold={fold.onFold} />
    </div>
  )
}
