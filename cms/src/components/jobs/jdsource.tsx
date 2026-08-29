'use client'
/**
 * 域内小件:底部来源行(republish 合规)。只在整理版**没渲出**时兜底(#167③;
 * 2026-07-21 Frank「去掉 source 链接」)—— 整理版在屏时「怎么投」整节已链官方原帖,出处不丢。
 * #239(第 30 轮体检):原来整条 URL 直铺,375 上折两行又长又丑 —— 改显**域名**,
 * 出处照样看得见、点得开,合规不受影响。
 * 2026-08-28 换装批自 Jd.tsx 提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 19:15:06
 */
import { LinkButton } from '@/components/button'
import { cssOf } from '@/components/css'
import { COLON, SPACE, TARGET_BLANK } from './constants'
import type { JdSourceIn } from './types'
import css from './jobs.module.css'

/**
 * 渲染来源行。
 *
 * @param props 标签、原帖链接与它的域名。
 * @returns 一行灰字出处。
 */
export function JdSource({ label, url, host }: JdSourceIn) {
  return (
    <div className={cssOf(css.src)}>
      {label}{COLON}{SPACE}
      <LinkButton href={url} target={TARGET_BLANK} className={cssOf(css.srcLink)}>{host}</LinkButton>
    </div>
  )
}
