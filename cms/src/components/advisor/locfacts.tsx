'use client'
/**
 * 地点组里单字段的事实块:点哪级只看哪级(含上级路径,07-06 用户拍板)。
 * 省弹框不再摆「国家 Canada」凑数行(2026-07-12 用户反馈「说明没看懂」—— 重复行是噪音);
 * 地图行给明确标签「地图 · 在 Google 地图查看」,不再用裸图标当行名 + 重复地名当链接文案。
 * 点「省」= 移民视角高价值内容(用户拍板:每字段要有料):该省具名通道数 + 最近抽选。
 * ⚠️ 与走专用面板的地点组(LocationPanel)是两条路:这一件是**按字段**铺的那条。
 * 2026-08-28 换装批自 Advisor.tsx 重写落位。
 *
 * @author Frank
 * @time 2026-08-28 22:40:00
 */
import { LinkButton } from '@/components/button'
import { cssOf } from '@/components/css'
import { IconMap } from '@/components/icons'
import { PnpDrawsBlock } from '@/components/pnp'
import { Row } from '@/components/row'
import { makeT } from '@/lib/i18n'
import { mapsUrl, parseLoc } from '@/lib/location'
import {
  ARROW_EXTERNAL, CLS_SEP, DEPTH_ADDRESS, DEPTH_CITY, DEPTH_DISTRICT, DEPTH_PROVINCE, DRAWS_LIMIT_ONE,
  FIELD_PROVINCE, LINK_CLS, MAP_PAREN_CLOSE, MAP_PAREN_OPEN, PROV_QC, TARGET_BLANK, TEXT_NONE,
} from './constants'
import { FactsBox } from './factsbox'
import { locCountryOf, locDepthOf, locNoteOf, mapQueryOf, provStreamsOf } from './functions'
import type { FieldFactsIn } from './types'
import css from './advisor.module.css'

/**
 * 渲染地点字段的事实块。
 *
 * @param props 点开的是哪一格与取数包。
 * @returns 逐级地点行 + 地图行 + 省级移民信息。
 */
export function LocFacts({ field, f }: FieldFactsIn) {
  const t = makeT(f.lang)
  const loc = parseLoc(f.job)
  const depth = locDepthOf(field)
  const mapQ = mapQueryOf({ job: f.job, depth })
  const streams = provStreamsOf({ field, job: f.job, pnpOcc: f.pnpOcc })
  const isProv = field === FIELD_PROVINCE
  return (
    <FactsBox note={locNoteOf({ t, field, job: f.job })}>
      {isProv === false && <Row k={t('col.country')}>{locCountryOf({ job: f.job })}</Row>}
      {depth >= DEPTH_PROVINCE && <Row k={t('col.province')}>{loc.prov}</Row>}
      {depth >= DEPTH_CITY && <Row k={t('col.city')}>{loc.city}</Row>}
      {depth >= DEPTH_DISTRICT && <Row k={t('col.district')}>{loc.district}</Row>}
      {depth >= DEPTH_ADDRESS && <Row k={t('col.address')}>{f.job.address}</Row>}
      {mapQ !== TEXT_NONE && (
        <Row k={t('fact.map')}>
          <LinkButton href={mapsUrl(mapQ)} target={TARGET_BLANK}
            className={cssOf(css.mapLink) + CLS_SEP + LINK_CLS}>
            <IconMap /> {t('fact.mapView')}{MAP_PAREN_OPEN}{mapQ}{MAP_PAREN_CLOSE}{ARROW_EXTERNAL}
          </LinkButton>
        </Row>
      )}
      {isProv && f.job.province === PROV_QC && <Row k={t('col.pnp')}>{t('pnplist.qc')}</Row>}
      {streams > 0 && <Row k={t('col.pnp')}>{t('fact.provStreams', { n: streams })}</Row>}
      {isProv && f.job.province !== TEXT_NONE && (
        <PnpDrawsBlock province={f.job.province} lang={f.lang} draws={f.pnpDraws} limit={DRAWS_LIMIT_ONE} />
      )}
    </FactsBox>
  )
}
