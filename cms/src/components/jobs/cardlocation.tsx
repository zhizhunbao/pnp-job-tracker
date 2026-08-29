'use client'
/**
 * 域内小件:手机卡上的市/省两段(E8-12 Frank「手机卡片呢?」+「省和市没法分开点」)——
 * 市名与省码各自可点、各开各的弹框;`href` 语义保留给爬虫 / 长按新开对应层级的地图。
 * 2026-08-28 换装批自 Jobs.tsx 提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 19:15:06
 */
import { LinkButton } from '@/components/button'
import { cssOf } from '@/components/css'
import { LOC_SEP, TARGET_BLANK, TEXT_NONE } from './constants'
import type { CardLocationIn } from './types'
import css from './jobs.module.css'

/**
 * 渲染卡上的地点。
 *
 * @param props 市名、省码、两条地图链接与两个手柄。
 * @returns 市(、省)两段。
 */
export function CardLocation({ city, prov, cityHref, provHref, onCity, onProv }: CardLocationIn) {
  return (
    <>
      <LinkButton href={cityHref} target={TARGET_BLANK} onClick={onCity} className={cssOf(css.cardLink)}>
        {city}
      </LinkButton>
      {prov !== TEXT_NONE && (
        <>
          <span className={cssOf(css.cardSep)}>{LOC_SEP}</span>
          <LinkButton href={provHref} target={TARGET_BLANK} onClick={onProv} className={cssOf(css.cardLink)}>
            {prov}
          </LinkButton>
        </>
      )}
    </>
  )
}
