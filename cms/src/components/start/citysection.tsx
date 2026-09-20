'use client'
/**
 * 域内小件:城市段(2026-09-11 重设计批,设计稿 docs/design/把脉页城市段-20260911.md)。
 * Frank 拍板:「大家选地方的时候,城市才是主要考虑的问题,比省份要具体;省份只是宏观的」——
 * 原 400 张四数字卡 + 40 页翻页(/fe 取证 40 天零交互)整体退役,换成四组表:
 * 主要城市(在招/近7天/中位年薪/人口/都会区失业率)→ 行业对比(2026-09-11 当晚 Frank
 * 「这个应该每个行业一个表吧」「要和雇主的那个行业保持一致吧」:一行业组一张小表照雇主板形,
 * 组与表题 = 全站八行业组 IND_KEYS,原城 × 九业横表退役)→
 * 试点社区(城市级唯一专属通道)→ 留学城市(DLI 三数)。段首搜索框同晚 Frank「这个删掉」退役
 * (试点绿标建议随之下线,试点信号全归表 3)。同晚两补:「改成具体的分类 多个分类」——
 * 子导航「行业对比」拆一业一项,行业小表各挂分表锚(subIdOf,照职业/雇主段);
 * 「这个 更新时间 应该紧贴着 table」—— 段首 Updated 撤,每张表标题行右侧一枚(照雇主板,
 * 09-03「表右上角 Updated」铁律)。
 * 数据挂载后拉 /api/stats/city(读 stats_city 快照;SSR 直出的城市行同批退役);
 * 没到渲占位,五份各自独立 —— 缺一份只丢那组表,全空才整段不出。
 * 2026-09-12 Frank「这个应该加一个 大学 和 学院的 筛选吧」:留学院校表标题下一排胶囊(全部 / 大学 / 学院),
 * 筛的是 dli.kind(etl/dli 按校名派生),客户端筛不回库。
 *
 * @author Frank
 * @time 2026-09-04 22:10:00
 */
import { Chip } from '@/components/chip'
import { Table } from '@/components/table'
import { Updated } from '@/components/time'
import {
  CARD_PAGE_SIZE, DLI_PAGE_SIZE, ID_CITY, ID_CITY_DLI, ID_CITY_IND, ID_CITY_MAIN, PH_PROV,
} from './constants'
import {
  boardGapClsOf, cityAipColsOf, cityDliColsOf, cityIndColsOf, cityMainColsOf, cityPilotColsOf, cityRowKeyOf,
  dliRowKeyOf,
  indRowKeyOf, subIdOf,
} from './functions'
import { useCityPanel } from './hooks'
import { Band } from './band'
import { CityPilotBlock } from './citypilotblock'
import { Placeholder } from './placeholder'
import { Sec } from './sec'
import type { CityDliRow, CityIndRow, CityMainRow, CitySectionIn } from './types'
import css from './start.module.css'

/**
 * 渲染城市段(一搜四表)。
 *
 * @param props 取词函数、语言与更新时刻。
 * @returns 一条色带;数据到了而四张表全空则 null。
 */
export function CitySection({ t, lang, updatedAt }: CitySectionIn) {
  const v = useCityPanel({ t, lang })
  if (v.data != null && v.mainRows.length === 0 && v.pilotTables.length === 0 && v.dliRows.length === 0) {
    return null
  }
  const indCols = cityIndColsOf({ t })
  const indBlocks = []
  for (const tb of v.indTables) {
    indBlocks.push(
      <div key={tb.key} id={subIdOf({ band: ID_CITY_IND, key: tb.key })} className={css.subAnchor}>
        <div className={boardGapClsOf({ gap: true })}>
          <Sec title={tb.label} right={<Updated iso={updatedAt} t={t} />} sub>
            <Table<CityIndRow> rows={tb.rows}
              cols={indCols}
              rowKey={indRowKeyOf} />
          </Sec>
        </div>
      </div>,
    )
  }
  const dliChipEls = []
  for (const c of v.dliChips) {
    dliChipEls.push(<Chip key={c.key} active={c.active} onClick={c.onClick}>{c.label}</Chip>)
  }
  const pilotCols = cityPilotColsOf({ t })
  const aipCols = cityAipColsOf({ t })
  const pilotBlocks = []
  for (const tb of v.pilotTables) {
    pilotBlocks.push(
      <CityPilotBlock key={tb.key} t={t} tb={tb} pilotCols={pilotCols} aipCols={aipCols} updatedAt={updatedAt} />,
    )
  }
  return (
    <Band id={ID_CITY}>
      <Sec title={t('pulse.city')}>
        {v.data == null && <Placeholder size={PH_PROV} />}
        {v.data != null && v.mainRows.length > 0 && (
          <div id={ID_CITY_MAIN} className={css.subAnchor}>
            <Sec title={t('pulse.city.main')} right={<Updated iso={updatedAt} t={t} />} sub>
              <Table<CityMainRow> rows={v.mainRows}
                cols={cityMainColsOf({ t })}
                rowKey={cityRowKeyOf}
                pageSize={CARD_PAGE_SIZE} />
            </Sec>
          </div>
        )}
        {v.data != null && indBlocks}
        {v.data != null && pilotBlocks}
        {v.data != null && v.data.dli.length > 0 && (
          <div id={ID_CITY_DLI} className={css.subAnchor}>
            <div className={boardGapClsOf({ gap: true })}>
              <Sec title={t('pulse.city.dli')} right={<Updated iso={updatedAt} t={t} />} sub>
                <div className={css.filterRow}>{dliChipEls}</div>
                <Table<CityDliRow> rows={v.dliRows}
                  cols={cityDliColsOf({ t, kind: v.dliKind })}
                  rowKey={dliRowKeyOf}
                  pageSize={DLI_PAGE_SIZE} />
              </Sec>
            </div>
          </div>
        )}
      </Sec>
    </Band>
  )
}
