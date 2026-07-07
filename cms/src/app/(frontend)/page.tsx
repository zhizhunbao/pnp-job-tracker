// 根路径 → /jobs(产品主页)。原 Payload 模板欢迎页已删——公网访客不该看到脚手架页。
// query 原样透传(E7-03 冷启动:/?utm_source=xhs 这类分享链的归因不能在跳转时丢)。
import { redirect } from 'next/navigation'

export default async function HomePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(sp)) {
    for (const val of Array.isArray(v) ? v : v != null ? [v] : []) qs.append(k, val)
  }
  const s = qs.toString()
  redirect('/jobs' + (s ? `?${s}` : ''))
}
