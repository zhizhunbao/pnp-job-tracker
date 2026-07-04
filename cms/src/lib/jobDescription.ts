import { getPayload } from 'payload'
import config from '@/payload.config'

// 按 applyUrl 取真实 JD 正文(DB jobs.description,mart 灌入)。jobtext + advisor 共用,
// 去掉运行时扫 .md 文件 → 上云不再依赖 data/ 文件在场。走 pg pool 轻量查询(绕开 Payload 读管线)。

// PII 脱敏(E4-03,D6):JB 帖常带 "By email: hr@x.com" / 电话 —— 雇主联系方式不出前台,
// 投递入口统一走「查看官方原帖」按钮(applyUrl)。出口统一在这里脱敏 = jobtext/advisor 都干净。
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g
const PHONE_RE = /(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}(\s*(ext|x|poste)\.?\s*\d+)?/gi
export function scrubPii(text: string): string {
  return text.replace(EMAIL_RE, '[见官方原帖]').replace(PHONE_RE, '[见官方原帖]')
}

export async function jobDescription(applyUrl: string): Promise<string> {
  if (!applyUrl) return ''
  const payload = await getPayload({ config: await config })
  const { rows } = await (payload.db as any).pool.query(
    'SELECT description FROM jobs WHERE apply_url = $1 AND description IS NOT NULL LIMIT 1',
    [applyUrl],
  )
  return scrubPii(rows[0]?.description ?? '')
}
