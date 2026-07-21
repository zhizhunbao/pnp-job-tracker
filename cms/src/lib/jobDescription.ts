import { getPayload } from 'payload'
import config from '@/payload.config'
import { lazyFetchJd } from './jdLazyFetch'

// 按 applyUrl 取真实 JD 正文(DB jobs.description,mart 灌入)。jobtext + advisor 共用,
// 去掉运行时扫 .md 文件 → 上云不再依赖 data/ 文件在场。走 pg pool 轻量查询(绕开 Payload 读管线)。

// PII 脱敏(E4-03,D6):JB 帖常带 "By email: hr@x.com" / 电话 —— 雇主联系方式不出前台,
// 投递入口统一走「查看官方原帖」按钮(applyUrl)。出口统一在这里脱敏 = jobtext/advisor 都干净。
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g
const PHONE_RE = /(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}(\s*(ext|x|poste)\.?\s*\d+)?/gi
// #155(Frank「这个怎么有中文」):占位符原先写死中文,被插进**雇主自己的英/法文原文**里 ——
// 「Apply on Indeed, email resume to [见官方原帖]」中英混排,英文界面用户看更是莫名其妙。
// 这段文字属于原帖(不是我们的界面文案),占位符跟原文语言走:统一用中性英文标记。
const PII_MASK = '[see original posting]'
export function scrubPii(text: string): string {
  return text.replace(EMAIL_RE, PII_MASK).replace(PHONE_RE, PII_MASK)
}

export async function jobDescription(applyUrl: string): Promise<string> {
  if (!applyUrl) return ''
  const payload = await getPayload({ config: await config })
  const pool = (payload.db as any).pool
  const { rows } = await pool.query(
    'SELECT description FROM jobs WHERE apply_url = $1 AND description IS NOT NULL LIMIT 1',
    [applyUrl],
  )
  if (rows[0]?.description) return scrubPii(rows[0].description)
  // #123 懒抓(lazy-first):聚合帖 JB 页无正文 → 现场抓原站正文写回缓存;抓不到返 ''(空态照旧)
  return scrubPii(await lazyFetchJd(applyUrl, pool))
}
