/**
 * 发信域的行为:退订 token 与发信本体(dry-run 语义见 constants 头)。
 *
 * @author Frank
 * @time 2026-08-22 23:00:00
 */

import crypto from 'crypto'

import { log, MAILER_LOG } from '../log'
import { BEARER_PREFIX, FROM, HEX_ENC, HMAC_ALGO, JSON_MIME, MAIL_ENABLED, METHOD_POST, RESEND_URL, UNSUB_PREFIX } from './constants'
import type { MailUserId, SendMailIn, SentOut } from './types'

/**
 * 周报一键退订 token(E9-02b,CASL:退订必须免登录可达):
 * HMAC(PAYLOAD_SECRET) 截 16 hex,无新密钥无新表。
 *
 * @param userId 用户 id。
 * @returns 16 位 hex token。
 */
export function unsubToken(userId: MailUserId): string {
  return crypto.createHmac(HMAC_ALGO, process.env.PAYLOAD_SECRET || '').update(UNSUB_PREFIX + userId).digest(HEX_ENC).slice(0, 16)
}

/**
 * 发一封信;没配密钥或发失败返回 false(调用方据此不回写游标),失败留痕不抛。
 *
 * @param input 收件人、标题与正文。
 * @returns 发出去了 true。
 */
export async function sendMail(input: SendMailIn): SentOut {
  if (MAIL_ENABLED === false) {
    return false
  }
  try {
    const r = await fetch(RESEND_URL, {
      method: METHOD_POST,
      headers: { Authorization: BEARER_PREFIX + process.env.RESEND_API_KEY, 'Content-Type': JSON_MIME },
      body: JSON.stringify({ from: FROM, to: [input.to], subject: input.subject, html: input.html }),
    })
    if (r.ok === false) {
      log({ tag: MAILER_LOG.tag, text: MAILER_LOG.sendFailed + r.status + MAILER_LOG.sep + (await r.text()).slice(0, 200) })
    }
    return r.ok
  } catch (e) {
    let why = String(e)
    if (e instanceof Error) {
      why = e.message
    }
    log({ tag: MAILER_LOG.tag, text: MAILER_LOG.sendFailed + why })
    return false
  }
}
