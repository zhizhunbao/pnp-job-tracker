'use client'
/**
 * 域内小件:手机卡上的市/省两段(E8-12 Frank「手机卡片呢?」+「省和市没法分开点」)——
 * 市名与省码各自可点、各开各的弹框;`href` 语义保留给爬虫 / 长按新开对应层级的地图。
 * 2026-08-28 换装批自 Jobs.tsx 提出成文件。
 * 2026-10-09 N6 批(Frank「职位名、公司名、地点同形,省市分开」「城市 和 省份 点击 跳 google 地图」):两段换全站名字组件
 * name 桶的 CityName / ProvName —— 市、省各是一个名字,各自英文蓝链在上、界面语译名灰字在下(英文界面一行),
 * 点了新标签开 Google 地图;省码改出英文全名。原先两段的点击走职位板字段路由(onField 的市 / 省格),随之撤 ——
 * 上面「各开各的弹框」一句作废,两段之间的逗号照旧。
 *
 * @author Frank
 * @time 2026-08-28 19:15:06
 */
import { cssOf } from '@/components/css'
import { CityName, ProvName } from '@/components/name'
import { LOC_SEP, TEXT_NONE } from './constants'
import type { CardLocationIn } from './types'
import css from './jobs.module.css'

/**
 * 渲染卡上的地点。
 *
 * @param props 市名、省码与市名的两种译名。
 * @returns 市(、省)两个名字。
 */
export function CardLocation({ city, province, zh, ko }: CardLocationIn) {
  return (
    <>
      <CityName city={city} province={province} zh={zh} ko={ko} />
      {province !== TEXT_NONE && (
        <>
          <span className={cssOf(css.cardSep)}>{LOC_SEP}</span>
          <ProvName code={province} />
        </>
      )}
    </>
  )
}
