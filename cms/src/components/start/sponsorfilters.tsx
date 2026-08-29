'use client'
/**
 * 域内小件:橱窗单表的筛选行。每表按人群逻辑配筛选(职业筛 2026-08-08 Frank
 * 「大类种类小类联动过滤要加上」;小类一级 08-09 补,Frank「全部小类呢?」—— 此前把
 * 「职业」下拉错当小类,从中类直接跳职业。现为大类→中类→小类→职业四级联动,
 * 形态 / 词汇与职位板的 broad/mid/fine 一致):
 *   lmia(没工签找肯办 LMIA 的雇主):职业(大→中→小→职业)→ 省;
 *   named(有工签打包省提名):省(省提名绑省,居首)→ 清单 → 职业;
 *   aip(奔大西洋):省 → 职业。
 * 搜雇主名文本框 08-08 拍掉(「文本框是干啥的」+ 手机零打字):筛选全点选;
 * 「只看技能类获批」钮 08-10 也拍掉(技能类获批数已是表内一列,自己点列排序即可)。
 * 控件一行等高照职位板站规(#282 教训),量宽下拉 2026-08-24 收拢进 components/select。
 * 2026-08-28 换装批自 Pulse.tsx 提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 14:20:00
 */
import { Select } from '@/components/select'
import {
  KIND_AIP, KIND_LMIA, KIND_NAMED, SELECT_SIZE, SEL_BROAD, SEL_FINE, SEL_MID, SEL_OCC, SEL_PROV,
  SEL_STREAM,
} from './constants'
import type { SponsorFiltersIn } from './types'
import css from './start.module.css'

/**
 * 渲染橱窗单表的筛选行。
 *
 * @param props 取词函数、人群档、六格现值、五只下拉的选项与显示名。
 * @returns 筛选行。
 */
export function SponsorFilters({ t, kind, f, opts, labels }: SponsorFiltersIn) {
  const provSel = (
    <Select key={SEL_PROV} size={SELECT_SIZE} tap
      value={f.fProv} onChange={f.onProv} all={t('all.prov')} opts={opts.prov} labelOf={labels.prov} />
  )
  const streamSel = (
    <Select key={SEL_STREAM} size={SELECT_SIZE} tap
      value={f.fStream} onChange={f.onStream} all={t('se.allStreams')} opts={opts.stream} labelOf={labels.stream} />
  )
  const broadSel = (
    <Select key={SEL_BROAD} size={SELECT_SIZE} tap
      value={f.fBroad} onChange={f.onBroad} all={t('all.broad')} opts={opts.broad} labelOf={labels.broad} />
  )
  const midSel = (
    <Select key={SEL_MID} size={SELECT_SIZE} tap
      value={f.fMid} onChange={f.onMid} all={t('all.mid')} opts={opts.mid} labelOf={labels.mid} />
  )
  const fineSel = (
    <Select key={SEL_FINE} size={SELECT_SIZE} tap
      value={f.fFine} onChange={f.onFine} all={t('all.fine')} opts={opts.fine} labelOf={labels.fine} />
  )
  const occSel = (
    <Select key={SEL_OCC} size={SELECT_SIZE} tap
      value={f.fNoc} onChange={f.onNoc} all={t('se.allOcc')} opts={opts.occ} labelOf={labels.occ} />
  )
  const items = []
  if (kind === KIND_LMIA) {
    items.push(broadSel, midSel, fineSel, occSel, provSel)
  }
  if (kind === KIND_NAMED) {
    items.push(provSel, streamSel, broadSel, midSel, fineSel, occSel)
  }
  if (kind === KIND_AIP) {
    items.push(provSel, broadSel, midSel, fineSel, occSel)
  }
  return <div className={css.filterRow}>{items}</div>
}
