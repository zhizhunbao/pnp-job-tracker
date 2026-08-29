/**
 * E8-07:职位页动态 og 分享图(1200×630)—— 链接贴进微信/小红书/TG 出卡片图,
 * 模板一次写好两万岗零手工。2026-08-29 Frank 拍板立 og 域:版式与尺寸常量迁
 * components/og(JobOgCard);取数、洗行与「查库失败 → 兜底品牌图」的 catch 在
 * lib/jobs 的 loadJobOg(og 请求不该 500)。本壳只剩框架定名导出 + 取数一行 + 裹卡 ——
 * 文件名与 size/contentType/alt/default 四个导出名都是 Next 元数据图约定,必须留在此处。
 *
 * @author Frank
 * @time 2026-07-20 14:25:54
 */
import { ImageResponse } from 'next/og'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { JobOgCard, OG_JOB_ALT, OG_SIZE, OG_TYPE } from '@/components/og'
import { dbOf } from '@/lib/db/server'
import { loadJobOg } from '@/lib/jobs/server'

export const size = OG_SIZE
export const contentType = OG_TYPE
export const alt = OG_JOB_ALT

/**
 * 职位分享图的壳:取数一行(db 注入)+ 裹卡出图。
 *
 * @param x Next 递来的路由参数。
 * @returns 分享卡片图。
 */
export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const og = await loadJobOg({ db: dbOf(await getPayload({ config: await config })), id })
  return new ImageResponse(<JobOgCard og={og} id={id} />, size)
}
