'use client'
/**
 * me 桶子桶 profile 的结构:档案下面的「我的通道」卡(2026-10-13 Frank「我的档案回答完了,自动在下面出一个 section 列出我的通道」;
 * 设计 docs/design/资讯/通道-合并申请步骤-20261012.md:省份胶囊 + 能走的通道表,点一行弹门槛与步骤):
 * 身份没答 → 一句引导 +「去回答」(开档案同一个编辑弹框);答了 → 按档案的身份与教育经历留通道(pnp 桶 usePnpMyStreams),
 * 一条一行(通道 / 全程 / 条件),点通道名叠窗口形弹框(pnp 桶 PnpStreamDetail);窄于 768 一条一张卡(MyStreamCard)。
 * 2026-11-07 随「我的」在新域重写搬进本子桶,行为不变。
 * 2026-11-11 单独成页后卡头「我的通道」撤(页标题已经写了)。
 *
 * @author Frank
 * @time 2026-11-07 16:05:00
 */
import { Button } from '@/components/button'
import { Chip } from '@/components/chip'
import { cssOf } from '@/components/css'
import { eduPicksOf } from '@/components/gate'
import { useIsNarrow } from '@/components/modal'
import { usePnpMyStreams } from '@/components/pnp'
import { Table } from '@/components/table'
import {
  CARD_MD_CLS, MS_ASK_BTN_KEY, MS_ASK_BTN_KIND, MS_ASK_KEY, MS_COL_KEYS, MS_COL_NAME, MS_COL_TAGS,
  MS_COL_TOTAL, MS_EMPTY_KEY, MS_NARROW_MAX, MS_PROV_HEAD, MS_PROVS, MS_TABLE_MIN_W, PF_FAIL_KEY,
  TEXT_NONE,
} from './constants'
import { msRowKeyOf, msTotalOf } from './functions'
import { useMyStreams } from './hooks'
import { MyStreamCard } from './mystreamcard'
import { MyStreamModal } from './mystreammodal'
import { MyStreamNameCell } from './mystreamnamecell'
import { MyStreamTagsCell } from './mystreamtagscell'
import type { MyStreamCellRow, MyStreamsIn } from './types'
import css from './profile.module.css'

/**
 * 我的通道卡。
 *
 * @param props 档案、界面语、取词函数与「去回答」。
 * @returns 一张分区卡(点通道名时叠弹框)。
 */
export function MyStreams({ v, lang, t, onEdit }: MyStreamsIn) {
  const m = useMyStreams({ prov: v.prov })
  const s = usePnpMyStreams({ lang, province: m.prov, filter: { who: v.who, edu: eduPicksOf(v.edu) } })
  const narrow = useIsNarrow(MS_NARROW_MAX)
  if (v.who === TEXT_NONE) {
    return (
      <section className={CARD_MD_CLS}>
        <div className={cssOf(css.msAsk)}>
          <span className={cssOf(css.none)}>{t(MS_ASK_KEY)}</span>
          <Button kind={MS_ASK_BTN_KIND} onClick={onEdit}>{t(MS_ASK_BTN_KEY)}</Button>
        </div>
      </section>
    )
  }
  const chips = []
  for (const code of MS_PROVS) {
    chips.push(<Chip key={code} onClick={m.provPickOf(code)} active={m.prov === code}>{t(MS_PROV_HEAD + code)}</Chip>)
  }
  const rows: MyStreamCellRow[] = []
  const cards = []
  let title = TEXT_NONE
  let sub = TEXT_NONE
  for (const r of s.rows) {
    const row = { key: r.key, title: r.title, sub: r.sub, total: r.total, tags: r.tags, onOpen: m.openOf(r.key) }
    rows.push(row)
    cards.push(<MyStreamCard key={r.key} r={row} />)
    if (r.key === m.open) {
      title = r.title
      sub = r.sub
    }
  }
  return (
    <section className={CARD_MD_CLS}>
      <div className={cssOf(css.msChips)}>{chips}</div>
      {s.ready && narrow && rows.length > 0 && <div>{cards}</div>}
      {s.ready && narrow && rows.length === 0 && <div className={cssOf(css.none)}>{t(MS_EMPTY_KEY)}</div>}
      {s.ready && narrow === false && (
        <Table<MyStreamCellRow> rows={rows} rowKey={msRowKeyOf} bare minWidth={MS_TABLE_MIN_W}
          empty={<div className={cssOf(css.none)}>{t(MS_EMPTY_KEY)}</div>}
          cols={[
            { key: MS_COL_NAME, label: t(MS_COL_KEYS.name), render: MyStreamNameCell },
            { key: MS_COL_TOTAL, label: t(MS_COL_KEYS.total), render: msTotalOf },
            { key: MS_COL_TAGS, label: t(MS_COL_KEYS.tags), render: MyStreamTagsCell },
          ]} />
      )}
      {s.failed && <div className={cssOf(css.none)}>{t(PF_FAIL_KEY)}</div>}
      {m.open !== TEXT_NONE && (
        <MyStreamModal lang={lang} province={m.prov} streamKey={m.open} title={title} sub={sub}
          kicker={t(MS_PROV_HEAD + m.prov)} onClose={m.onClose} />
      )}
    </section>
  )
}
