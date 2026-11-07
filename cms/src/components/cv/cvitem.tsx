'use client'
/**
 * 条目式分区里的一条:左上标题、机构、地点,右上起止(隐藏的多一枚「已隐藏」胶囊),下面描述各行,
 * 底下「修改」「隐藏 / 显示」「删除」(照 Job Bank 每条的 Modify / Hide / Remove)。
 *
 * @author Frank
 * @time 2026-11-07 16:00:00
 */
import { Button } from '@/components/button'
import { Tag } from '@/components/tag'
import { cvLinesOf } from '@/lib/cv'
import { BTN_DANGER, BTN_SECONDARY, TAG_GRAY, TEXT_NONE } from './constants'
import { CvLines } from './cvlines'
import { periodOf, placeOf } from './functions'
import type { CvItemIn } from './types'
import css from './cv.module.css'

/**
 * 一条。
 *
 * @param props 整机面板、分区配置、这一条与第几条。
 * @returns 一条的框。
 */
export function CvItem({ p, conf, e, index }: CvItemIn) {
  const at = { list: conf.key, index }
  const when = periodOf({ e, kind: conf.dates, t: p.t })
  const place = placeOf(e)
  return (
    <div className={css.item} data-hidden={e.hidden}>
      <div className={css.itemTop}>
        <div>
          <div className={css.itemTitle}>{e.title}</div>
          {e.org !== TEXT_NONE && <div className={css.itemSub}>{e.org}</div>}
          {place !== TEXT_NONE && <div className={css.itemSub}>{place}</div>}
        </div>
        <div className={css.itemSide}>
          {when !== TEXT_NONE && <span>{when}</span>}
          {e.hidden && <Tag variant={TAG_GRAY}>{p.t('cv.hidden')}</Tag>}
        </div>
      </div>
      <div className={css.itemBody}>
        <CvLines lines={cvLinesOf(e.desc)} />
      </div>
      <div className={css.itemActs}>
        <Button kind={BTN_SECONDARY} sm onClick={p.editOf(at)}>{p.t('cv.edit')}</Button>
        {e.hidden && <Button kind={BTN_SECONDARY} sm onClick={p.hideOf(at)}>{p.t('cv.show')}</Button>}
        {e.hidden === false && <Button kind={BTN_SECONDARY} sm onClick={p.hideOf(at)}>{p.t('cv.hide')}</Button>}
        <Button kind={BTN_DANGER} sm onClick={p.delOf(at)}>{p.t('cv.del')}</Button>
      </div>
    </div>
  )
}
