/**
 * 发信基建叶的行为:怎么发出一封(Resend HTTP 直调)+ 退订 token 机制。
 * 「提醒谁、发什么」归 lib/alerts(业务域,2026-08-23 两域拍板);本叶与业务无关,
 * 换掉它业务一个字不用改 —— 基础设施判据。发信失败留痕不抛(调用方按 false 不回写游标)。
 *
 * @author Frank
 * @time 2026-08-23 02:00:00
 */

import crypto from 'crypto'
import { log, MAIL_LOG } from '../log'
import {
  BEARER_PREFIX,
  FROM,
  HEX_ENC,
  HMAC_ALGO,
  HMAC_KEY_NONE,
  JSON_MIME,
  MAIL_ENABLED,
  METHOD_POST,
  RESEND_URL,
  UNSUB_PREFIX,
} from './constants'
import type { MailUserId, SendMailIn, SentOut } from './types'
import { HDR_CONTENT_TYPE } from '../http'

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
      headers: { Authorization: BEARER_PREFIX + process.env.RESEND_API_KEY, [HDR_CONTENT_TYPE]: JSON_MIME },
      body: JSON.stringify({ from: FROM, to: [input.to], subject: input.subject, html: input.html }),
    })
    if (r.ok === false) {
      log({ tag: MAIL_LOG.tag, text: MAIL_LOG.sendFailed + r.status + MAIL_LOG.sep + (await r.text()).slice(0, 200) })
    }
    return r.ok
  } catch (e) {
    let why = String(e)
    if (e instanceof Error) {
      why = e.message
    }
    log({ tag: MAIL_LOG.tag, text: MAIL_LOG.sendFailed + why })
    return false
  }
}

/**
 * 周报一键退订 token(E9-02b,CASL:退订必须免登录可达):
 * HMAC(PAYLOAD_SECRET) 截 16 hex,无新密钥无新表。
 *
 * @param userId 用户 id。
 * @returns 16 位 hex token。
 */
export function unsubToken(userId: MailUserId): string {
  return crypto.createHmac(HMAC_ALGO, process.env.PAYLOAD_SECRET || HMAC_KEY_NONE).update(UNSUB_PREFIX + userId).digest(HEX_ENC).slice(0, 16)
}
