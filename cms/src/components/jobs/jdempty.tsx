'use client'
/**
 * 域内小件:这一岗没有正文。原站拦抓取的走空态**说事实**(是谁拦的),不绕过访问控制,
 * 也不谎报成「本站暂未收录」;下面给一颗「查看官方页」,别让人停在死路上。
 * 2026-08-28 换装批自 Jd.tsx 提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 19:15:06
 */
import { LinkButton } from '@/components/button'
import { cssOf } from '@/components/css'
import { TARGET_BLANK, TEXT_NONE } from './constants'
import type { JdEmptyIn } from './types'
import css from './jobs.module.css'

/**
 * 渲染空态。
 *
 * @param props 空态说明、原帖链接与钮面文案。
 * @returns 一句灰注 + 可能的官方页出口。
 */
export function JdEmpty({ note, url, label }: JdEmptyIn) {
  return (
    <div>
      <p className={`${cssOf(css.mutedNote)} ${cssOf(css.mutedM4b)}`}>{note}</p>
      {url !== TEXT_NONE && (
        <LinkButton href={url} target={TARGET_BLANK} className={cssOf(css.emptyBtn)}>{label}</LinkButton>
      )}
    </div>
  )
}
