'use client'
/**
 * account 域的结构:「我的」页的模块页头(banner 桶 Banner;图标 + 页名 + 一句副题,与职位板、雇主板、资讯同一形)。
 * 2026-10-05 Frank「我的 也需要 banner 吧」立:图标、页名与页头导航的「我的」同一套;没有专属图组,走渐变带。
 * 同日「可以,下吧」:挂上专属图组(banner 桶 BANNER_IMGS.account),走图版。
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
 * @param props 取词函数。
 * @returns 模块页头。
 */
export function AccountBanner({ t }: AccountBannerIn) {
  return (
    <Banner module={ACCT_BANNER_MODULE}
      icon={<IconUser />}
      title={t(ACCT_BANNER_TITLE_KEY)}
      sub={t(ACCT_BANNER_SUB_KEY)}
      images={BANNER_IMGS.account} />
  )
}
