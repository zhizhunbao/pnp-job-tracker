/**
 * review 子桶 mail 的行为:存本人改过的邮件正文。
 * 2026-11-11 按「大于 1000 就拆子桶」(样张 apply/letter):review 的 functions.ts 贴线,存邮件正文这一件切出来。
 * 依赖只许 review → 本子桶(经 index.ts);本子桶不取 review 的任何东西,常量自抄、形状自声明。
 *
 * @author Frank
 * @time 2026-11-12 01:00:00
 */
import { CRED_INCLUDE, ERR_MAIL, HDR_CONTENT_TYPE, METHOD_PUT, MIME_JSON, TEXT_NONE, URL_MAIL } from './constants'
import type { MailSaveIn } from './types'

/**
 * 存这一封的邮件正文(null = 恢复默认):存上了改页面上的正文并关右侧栏,没存上留在栏里报一句。
 *
 * @param x 职位 id、正文与几个落格。
 * @returns 无。
 */
export async function saveMailEdit(x: MailSaveIn): Promise<void> {
  try {
    const r = await fetch(URL_MAIL, {
      method: METHOD_PUT,
      credentials: CRED_INCLUDE,
      headers: { [HDR_CONTENT_TYPE]: MIME_JSON },
      body: JSON.stringify({ jobId: x.jobId, body: x.body }),
    })
    if (r.ok === false) {
      x.setErr(ERR_MAIL)
      return
    }
  } catch {
    x.setErr(ERR_MAIL)
    return
  }
  let next = TEXT_NONE
  if (x.body != null) {
    next = x.body
  }
  x.setMail(next)
  x.close()
}
