/**
 * legal 域(法务四页正文)的函数:支持邮箱取值、邮件地址拼接、段落按邮箱记号切片。
 * 零 JSX 零 hook —— 排版归三个 tsx,死值归 constants.ts。
 *
 * @author Frank
 * @time 2026-08-27 23:08:05
 */
import { EMAIL_SLOT, MAILTO_HEAD, SUPPORT_EMAIL_FALLBACK } from './constants'
import type { EmailPartsOfIn, LegalPart, MailtoOfIn } from './types'

/**
 * 公开支持邮箱:env 配了用 env 的,没配用兜底地址(正式域名定了换 env 即可)。
 * 读的是 NEXT_PUBLIC_ 前缀的公开变量,浏览器侧由 Next 在构建期原地替换,
 * 所以这里必须逐字写全 `process.env.NEXT_PUBLIC_SUPPORT_EMAIL`,不能拆成变量。
 *
 * @returns 支持邮箱地址。
 */
export function supportEmailOf(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SUPPORT_EMAIL
  if (fromEnv == null) {
    return SUPPORT_EMAIL_FALLBACK
  }
  if (fromEnv === '') {
    return SUPPORT_EMAIL_FALLBACK
  }
  return fromEnv
}

/**
 * 支持邮箱的可点地址。
 *
 * @param x 支持邮箱地址。
 * @returns mailto 链接。
 */
export function mailtoOf(x: MailtoOfIn): string {
  return MAILTO_HEAD + x.email
}

/**
 * 一段正文按支持邮箱占位记号切片:每片带自己的文本,以及后面跟不跟一个邮箱链接。
 * 切片数永远比记号数多一,所以**末片不跟**链接 —— 原先写成三目按下标比长度判,
 * 这里改成「先全标跟、再把末片翻成不跟」,不用算下标。
 *
 * @param x 段落原文。
 * @returns 切片清单(段里没有记号时只有一片,不跟链接)。
 */
export function emailPartsOf(x: EmailPartsOfIn): LegalPart[] {
  const parts: LegalPart[] = []
  for (const seg of x.text.split(EMAIL_SLOT)) {
    parts.push({ text: seg, email: true })
  }
  const last = parts.pop()
  if (last != null) {
    parts.push({ text: last.text, email: false })
  }
  return parts
}
