/**
 * 域内小件:公司页的 Organization 结构化数据(rich result)。不带 `'use client'` ——
 * 由服务端页面门直接渲染,只吐一段 script、不带任何交互,进不了客户端包才对。
 * 串由 lib/jobs 的 companyJsonOf 拼好(公开事实层;缺值不编)。
 * 2026-08-29 页面规范化批自页面门提出成件(页面只许拼大写组件,裸 script 不留在门里;
 * 形照 jobs 的 JobJsonLd)。
 *
 * @author Frank
 * @time 2026-08-29 09:10:00
 */
import { MIME_LD_JSON } from './constants'
import type { CompaniesJsonLdIn } from './types'

/**
 * 渲染公司页 Organization 的 JSON-LD 脚本。
 *
 * @param props 已序列化好的 JSON 串。
 * @returns 结构化数据脚本标签。
 */
export function CompaniesJsonLd({ json }: CompaniesJsonLdIn) {
  return (
    <script type={MIME_LD_JSON} dangerouslySetInnerHTML={{ __html: json }} />
  )
}
