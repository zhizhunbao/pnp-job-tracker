/**
 * JobPosting 的结构化数据(Google 求职富结果)。它是**服务端件**(没有 'use client'):
 * 只吐一段 script,不带任何交互 —— 进不了客户端包才对。
 * 串由 lib/jobs 的 jobPostingJsonOf 拼好并**转义过 `<`**(正文是从雇主站抓来的第三方内容,
 * 里面一旦出现闭合标签就会提前结束脚本、后面的字符当 HTML 解析;信任边界不上砧板)。
 * 2026-08-28 换装批自 app/(frontend)/jobs/[id]/page.tsx 提出成文件 —— 页面门只许拼大写组件。
 *
 * @author Frank
 * @time 2026-08-28 19:15:06
 */
import { LD_MIME } from './constants'
import type { JobJsonLdIn } from './types'

/**
 * 渲染结构化数据。
 *
 * @param props 已序列化并转义过的 JSON 串。
 * @returns 一段 ld+json 脚本。
 */
export function JobJsonLd({ json }: JobJsonLdIn) {
  return (
    <script type={LD_MIME} dangerouslySetInnerHTML={{ __html: json }} />
  )
}
