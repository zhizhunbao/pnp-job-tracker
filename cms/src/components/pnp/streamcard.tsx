'use client'
/**
 * 域内小件:一张通道清单卡(清单名 + 条数 + 职业行 + 末尾的展开开关)。
 * Frank 走查#14:清单头改纯 title(不再作折叠开关),开关移到列表末尾;默认只显命中「本岗」项,
 * 点「展开其他」才全量(取舍在 streamRowsOf 里)。
 * 2026-07-25 Frank:清单可折叠 + 职业带界面语言译名 + 展开不内嵌滚动。
 * 2026-08-28 换装批自 Pnp.tsx 的 PnpListSection 拆出成文件。
 *
 * @author Frank
 * @time 2026-08-28 17:59:16
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { streamDisplay } from '@/lib/jobs'
import { BOX_GAP_NONE, PLAIN_BTN_KIND } from './constants'
import { boxClsOf, foldLabelOf, hiddenCountOf, streamRowsOf } from './functions'
import { StreamRow } from './streamrow'
import type { StreamCardIn } from './types'
import css from './pnp.module.css'

/**
 * 渲染一张通道清单卡。
 *
 * @param props 取词函数、界面语言、译名开关、这张清单、本岗职业码、字典、展开态与 ref 盒。
 * @returns 清单卡。
 */
export function StreamCard({ t, lang, showZh, stream, noc, nocRows, open, onToggle, matchRef }: StreamCardIn) {
  const rows = []
  for (const r of streamRowsOf({ t, lang, showZh, stream, noc, nocRows, open })) {
    rows.push(<StreamRow key={r.key} r={r} matchRef={matchRef} />)
  }
  const hidden = hiddenCountOf({ stream, noc })
  return (
    <div className={css.card}>
      <div className={css.cardHead}>
        {streamDisplay({ t, label: stream.label })}
        <span className={css.count}>{t('eelist.count', { n: stream.occupations.length })}</span>
      </div>
      <div className={boxClsOf({ clip: false, gap: BOX_GAP_NONE })}>{rows}</div>
      {hidden > 0 && (
        <Button kind={PLAIN_BTN_KIND} className={cssOf(css.foldMore)} onClick={onToggle}>
          {foldLabelOf({ t, open, hidden })}
        </Button>
      )}
    </div>
  )
}
