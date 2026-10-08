'use client'
/**
 * account 域的结构:「我的」页的模块页头(banner 桶 Banner;图标 + 页名 + 一句副题,与职位板、雇主板、资讯同一形)。
 * 2026-10-05 Frank「我的 也需要 banner 吧」立:图标、页名与页头导航的「我的」同一套;没有专属图组,走渐变带。
 * 同日「可以,下吧」:挂上专属图组(banner 桶 BANNER_IMGS.account),走图版。
 * 2026-10-08 照 AIApply 重设计:副题改「已投 N 封」(别的页 banner 副题也是计数);一封没投过不出副题。
 * 同日晚进度板一度换成页标题行,Frank「banner 怎么没了」→ 换回来,banner 是「我的」页定了的形。
 *
 * @author Frank
 * @time 2026-10-05 17:40:00
 */
import { Banner, BANNER_IMGS } from '@/components/banner'
import { IconUser } from '@/components/icons'
import { ACCT_BANNER_MODULE, ACCT_BANNER_SUB_KEY, ACCT_BANNER_TITLE_KEY } from './constants'
import type { AccountBannerIn } from './types'

/**
 * 「我的」页页头。
 *
 * @param props 取词函数与已投几封。
 * @returns 模块页头。
 */
export function AccountBanner({ t, sent }: AccountBannerIn) {
  let sub = null
  if (sent > 0) {
    sub = t(ACCT_BANNER_SUB_KEY, { n: sent })
  }
  return (
    <Banner module={ACCT_BANNER_MODULE}
      icon={<IconUser />}
      title={t(ACCT_BANNER_TITLE_KEY)}
      sub={sub}
      images={BANNER_IMGS.account} />
  )
}
