'use client'
/**
 * 本域的链接:弹框里点出去要新开页(别把弹框关掉),公司详情页上同标签页。
 * 这条分叉在三处出现(在招职位、去职位板看全部、相似雇主),收成一件 ——
 * 「有重复才抽公共」,这里是三个消费者。
 *
 * @author Frank
 * @time 2026-08-28 18:13:09
 */
import { LinkButton } from '@/components/button'
import { TARGET_BLANK } from './constants'
import type { CompanyLinkIn } from './types'

/**
 * 一条链接(新开页与否由调用方的语境定)。
 *
 * @param props 去处、新开页、类名与内容(逐格注释见 CompanyLinkIn)。
 * @returns 链接。
 */
export function CompanyLink({ href, newTab, className, children }: CompanyLinkIn) {
  if (newTab) {
    return <LinkButton href={href} target={TARGET_BLANK} className={className}>{children}</LinkButton>
  }
  return <LinkButton href={href} className={className}>{children}</LinkButton>
}
