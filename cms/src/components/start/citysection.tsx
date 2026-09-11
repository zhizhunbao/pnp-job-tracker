'use client'
/**
 * 域内小件:城市段(2026-09-11 重设计批,设计稿 docs/design/把脉页城市段-20260911.md)。
 * Frank 拍板:「大家选地方的时候,城市才是主要考虑的问题,比省份要具体;省份只是宏观的」——
 * 原 400 张四数字卡 + 40 页翻页(/fe 取证 40 天零交互)整体退役,换成一搜四表:
 * 搜索(全量直达)→ 主要城市(在招/近7天/中位年薪/专属通道)→ 行业对比(城 × 大类)→
 * 试点社区(城市级唯一专属通道)→ 留学城市(DLI 三数)。
 * 数据挂载后拉 /api/stats/city(jobs 现查,口径与职位板同一份 WHERE;SSR 直出的城市行同批退役);
 * 没到渲占位,五份各自独立 —— 缺一份只丢那张表,四张全空才整段不出。
 *
 * @author Frank
 * @time 2026-09-04 22:10:00
 */
import { Table } from '@/components/table'
import { Updated } from '@/components/time'
import {
  CARD_PAGE_SIZE, DLI_PAGE_SIZE, ID_CITY, ID_CITY_DLI, ID_CITY_IND, ID_CITY_MAIN, ID_CITY_PILOT, PH_PROV,
} from './constants'
import {
  boardGapClsOf, cityDliColsOf, cityIndColsOf, cityMainColsOf, cityPilotColsOf, cityRowKeyOf, dliRowKeyOf,
  indRowKeyOf, pilotRowKeyOf,
} from './functions'
import { useCityPanel } from './hooks'
import { Band } from './band'
import { CitySearch } from './citysearch'
import { Placeholder } from './placeholder'
import { Sec } from './sec'
import type { CityDliRow, CityIndRow, CityMainRow, CityPilotRow, CitySectionIn } from './types'
import css from './start.module.css'

/**
 * 渲染城市段(一搜四表)。
 *
 * @param props 取词函数、语言与更新时刻。
 * @returns 一条色带;数据到了而四张表全空则 null。
 */
export function CitySection({ t, lang, updatedAt }: CitySectionIn) {
  const v = useCityPanel({ t, lang })
  if (v.data != null && v.mainRows.length === 0 && v.pilotRows.length === 0 && v.dliRows.length === 0) {
    return null
  }
  return (
    <Band id={ID_CITY}>
      <Sec title={t('pulse.city')} right={<Updated iso={updatedAt} t={t} />}>
        {v.data == null && <Placeholder size={PH_PROV} />}
        {v.data != null && v.mainRows.length > 0 && <CitySearch t={t} lang={lang} rows={v.data.cities} />}
        {v.data != null && v.mainRows.length > 0 && (
          <div id={ID_CITY_MAIN} className={css.subAnchor}>
            <Sec title={t('pulse.city.main')} sub>
              <Table<CityMainRow> rows={v.mainRows}
                cols={cityMainColsOf({ t })}
                rowKey={cityRowKeyOf}
                pageSize={CARD_PAGE_SIZE} />
            </Sec>
          </div>
        )}
        {v.data != null && v.indRows.length > 0 && (
          <div id={ID_CITY_IND} className={css.subAnchor}>
            <div className={boardGapClsOf({ gap: true })}>
              <Sec title={t('pulse.city.ind')} sub>
                <Table<CityIndRow> rows={v.indRows}
                  cols={cityIndColsOf({ t, broadCols: v.broadCols })}
                  rowKey={indRowKeyOf} />
              </Sec>
            </div>
          </div>
        )}
        {v.data != null && v.pilotRows.length > 0 && (
          <div id={ID_CITY_PILOT} className={css.subAnchor}>
            <div className={boardGapClsOf({ gap: true })}>
              <Sec title={t('pulse.city.pilot')} sub>
                <Table<CityPilotRow> rows={v.pilotRows}
                  cols={cityPilotColsOf({ t })}
                  rowKey={pilotRowKeyOf} />
              </Sec>
            </div>
          </div>
        )}
        {v.data != null && v.dliRows.length > 0 && (
          <div id={ID_CITY_DLI} className={css.subAnchor}>
            <div className={boardGapClsOf({ gap: true })}>
              <Sec title={t('pulse.city.dli')} sub>
                <Table<CityDliRow> rows={v.dliRows}
                  cols={cityDliColsOf({ t })}
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
