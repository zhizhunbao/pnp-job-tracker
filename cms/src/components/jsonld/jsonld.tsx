/**
 * 通用件:JSON-LD 结构化数据脚本(schema.org)。`<script type="application/ld+json">`
 * 这层壳 2026-08-29 前散着五份逐字克隆(layout 内联 + cases/companies/resources/jobs
 * 各裹一个域内小件)—— Frank「这个怎么哪哪都有」点名,按「通用形态单一出口」收拢:
 * 壳只此一件,数据串照旧各域自己拼(casesJsonLd / companyJsonOf / jobPostingJsonOf …),
 * 门里 `<JsonLd json={xxxOf()} />` 一行拼装。不带 `'use client'` —— 由服务端门直接渲,
 * 内容是死的,进不了客户端包才对。
 *
 * @author Frank
 * @time 2026-08-29 07:30:00
 */
import { MIME_LD_JSON } from './constants'
import type { JsonLdIn } from './types'

/**
 * 渲染一段 JSON-LD 脚本(页面不可见,只给搜索引擎)。
 *
 * @param props 拼好的 JSON 串(见 JsonLdIn)。
 * @returns 结构化数据脚本标签。
 */
export function JsonLd({ json }: JsonLdIn) {
  return (
    <script type={MIME_LD_JSON} dangerouslySetInnerHTML={{ __html: json }} />
  )
}
