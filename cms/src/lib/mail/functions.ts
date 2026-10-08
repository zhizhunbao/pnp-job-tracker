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
  BEARER_PREFIX, ERR_BODY_LEN, FROM, HDR_IDEMPOTENCY, HEX_ENC, HMAC_ALGO, HMAC_KEY_NONE, ID_NONE, JSON_MIME,
  MAIL_ENABLED, METHOD_POST, RESEND_URL, UNSUB_PREFIX, UNSUB_TOKEN_LEN, WHY_DISABLED, WHY_THROWN,
} from './constants'
import type {
  MailUserId, PostMailIn, PostMailOut, ResendBodyJson, ResendHeaders, ResendRespJson, SendMailIn, SentOut,
} from './types'
import { HDR_CONTENT_TYPE } from '../http'

/**
 * 发一封信;没配密钥或发失败返回 false(调用方据此不回写游标),失败留痕不抛。
 * 2026-10-07 改调 postMail(代投批抽出的底层),行为不变:默认发件人、不带附件与回复地址。
 *
 * @param input 收件人、标题与正文。
 * @returns 发出去了 true。
 */
export async function sendMail(input: SendMailIn): SentOut {
  const r = await postMail({
    to: input.to, subject: input.subject, html: input.html, text: ID_NONE, from: ID_NONE, replyTo: ID_NONE,
    attachments: [], idemKey: ID_NONE,
  })
  return r.ok
}

/**
 * 发一封信并拿回 Resend 的邮件 id(2026-10-07 代投批):可带附件、回复地址、自定义发件人、纯文本正文与幂等键。
 * 没配密钥不发(why = disabled,不当成发出去了);HTTP 失败与异常都留痕不抛,结果里带原因。
 *
 * @param input 收件人、标题、正文与可选各格。
 * @returns 发没发出去、邮件 id 与失败原因。
 */
export async function postMail(input: PostMailIn): PostMailOut {
  if (MAIL_ENABLED === false) {
    return { ok: false, id: ID_NONE, why: WHY_DISABLED }
  }
  try {
    const r = await fetch(RESEND_URL, {
      method: METHOD_POST,
      headers: resendHeadersOf(input.idemKey),
      body: JSON.stringify(resendBodyOf(input)),
    })
    if (r.ok === false) {
      const why = r.status + MAIL_LOG.sep + (await r.text()).slice(0, ERR_BODY_LEN)
      log({ tag: MAIL_LOG.tag, text: MAIL_LOG.sendFailed + why })
      return { ok: false, id: ID_NONE, why }
    }
    const body = await r.json() as ResendRespJson
    let id = ID_NONE
    if (typeof body.id === 'string') {
      id = body.id
    }
    return { ok: true, id, why: ID_NONE }
  } catch (e) {
    let why = String(e)
    if (e instanceof Error) {
      why = e.message
    }
    log({ tag: MAIL_LOG.tag, text: MAIL_LOG.sendFailed + why })
    return { ok: false, id: ID_NONE, why: WHY_THROWN + why }
  }
}

/**
 * Resend 请求头:鉴权、类型,有幂等键就带上。
 *
 * @param idemKey 幂等键(空串 = 不带)。
 * @returns 请求头。
 */
function resendHeadersOf(idemKey: string): ResendHeaders {
  const h: ResendHeaders = {
    Authorization: BEARER_PREFIX + process.env.RESEND_API_KEY,
    [HDR_CONTENT_TYPE]: JSON_MIME,
  }
  if (idemKey !== ID_NONE) {
    h[HDR_IDEMPOTENCY] = idemKey
  }
  return h
}

/**
 * Resend 请求体:空的可选格不发键(缺席 = 不设,是线格式语义)。
 *
 * @param input 一封信。
 * @returns 请求体。
 */
function resendBodyOf(input: PostMailIn): ResendBodyJson {
  let from = FROM
  if (input.from !== ID_NONE) {
    from = input.from
  }
  const body: ResendBodyJson = { from, to: [input.to], subject: input.subject, html: input.html }
  if (input.text !== ID_NONE) {
    body.text = input.text
  }
  if (input.replyTo !== ID_NONE) {
    body.reply_to = input.replyTo
  }
  if (input.attachments.length > 0) {
    body.attachments = input.attachments
  }
  return body
}

/**
 * 周报一键退订 token(E9-02b,CASL:退订必须免登录可达):
 * HMAC(PAYLOAD_SECRET) 截 16 hex,无新密钥无新表。
 *
 * @param userId 用户 id。
 * @returns 16 位 hex token。
 */
export function unsubToken(userId: MailUserId): string {
  return crypto.createHmac(HMAC_ALGO, process.env.PAYLOAD_SECRET || HMAC_KEY_NONE).update(UNSUB_PREFIX + userId).digest(HEX_ENC).slice(0, UNSUB_TOKEN_LEN)
}
