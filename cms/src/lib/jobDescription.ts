import { getPayload } from 'payload'
import config from '@/payload.config'

// 按 applyUrl 取真实 JD 正文(DB jobs.description,mart 灌入)。jobtext + advisor 共用,
// 去掉运行时扫 .md 文件 → 上云不再依赖 data/ 文件在场。走 pg pool 轻量查询(绕开 Payload 读管线)。
export async function jobDescription(applyUrl: string): Promise<string> {
  if (!applyUrl) return ''
  const payload = await getPayload({ config: await config })
  const { rows } = await (payload.db as any).pool.query(
    'SELECT description FROM jobs WHERE apply_url = $1 AND description IS NOT NULL LIMIT 1',
    [applyUrl],
  )
  return rows[0]?.description ?? ''
}
