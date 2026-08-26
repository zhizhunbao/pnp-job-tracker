/**
 * 交接域的 HTTP 芯(第十一抽屉):/api/mart/[name](ETL 产物上传落盘)与
 * /seed(纯加载器)。seed 段 2026-08-23 自 app/seed/route.ts 原样搬入;
 * 2026-08-26 形制批把灌库芯下沉进 functions 的 runSeed(设计史随芯迁至彼处文件头),
 * 这里只剩门禁、取参、拿池注入与拼响应 —— 它仍是全站最危险的一条路(直灌生产库),
 * 行为语义零改动,由 tests/int/martSpec 与四道闸对拍。
 *
 * @author Frank
 * @time 2026-08-23 14:20:00
 */
import fs from 'fs'
import path from 'path'
import { gunzipSync } from 'zlib'

import { getDb } from '../db/server'
import {
  BYTE_LBRACKET, BYTE_RBRACKET, BYTE_WS_MAX, E_BAD_GZIP, E_BAD_NAME, E_NOT_ARRAY, GZIP_HEAD_LEN, GZIP_MAGIC_0,
  GZIP_MAGIC_1, JSON_EXT, P_RESET, P_TOKEN, S_BAD_REQUEST, S_UNAUTHORIZED, T_UNAUTHORIZED, TABLE_NAME_RE,
  TMP_PREFIX, TMP_SUFFIX,
} from './constants'
import { martCounterpart, martTmpDir, runSeed, seedTokenOk } from './functions'
import type { UploadCtx } from './types'

/**
 * POST /api/mart/[name]:mart 上传端点(E7-04,Supabase Storage 退役后的交接层)。
 * etl/upload_mart.py 逐表 gzip POST 到这里 → 落 &lt;tmpdir&gt;/mart/&lt;name&gt;.json,
 * 同轮管线随后触发的 /seed 优先读该目录。完整性由 gzip CRC 保证
 * (gunzipSync 已校验),ETL 侧上传前已验 JSON;这里只查首尾是数组括号 ——
 * 坏 JSON 的最终防线在 seed 读取时的 JSON.parse(失败即整事务回滚,不会半灌)。
 * 原子写:先临时名再 rename,防并发 seed 读到半写文件。
 *
 * @param req 请求(gzip 或裸 JSON 数组字节)。
 * @param ctx 路由参数(表名;形状 Next 定 —— 双参是框架签名)。
 * @returns { ok, table, bytes };未授权 401、表名/载荷非法 400。
 */
export async function martUploadRoute(req: Request, ctx: UploadCtx): Promise<Response> {
  if (seedTokenOk({ req: req, queryToken: null }) === false) {
    return new Response(T_UNAUTHORIZED, { status: S_UNAUTHORIZED })
  }
  const { name } = await ctx.params
  if (TABLE_NAME_RE.test(name) === false) {
    return Response.json({ ok: false, error: E_BAD_NAME }, { status: S_BAD_REQUEST })
  }
  const raw = Buffer.from(await req.arrayBuffer())
  let body: Buffer
  try {
    if (raw.length > GZIP_HEAD_LEN && raw.subarray(0, GZIP_HEAD_LEN).equals(Buffer.from([GZIP_MAGIC_0, GZIP_MAGIC_1]))) {
      body = gunzipSync(raw)
    } else {
      body = raw
    }
  } catch (e) {
    let msg = String(e)
    if (e instanceof Error) {
      msg = e.message
    }
    return Response.json({ ok: false, error: E_BAD_GZIP + msg }, { status: S_BAD_REQUEST })
  }
  let head = 0
  while (head < body.length) {
    const b = body[head]
    if (b == null || b > BYTE_WS_MAX) {
      break
    }
    head = head + 1
  }
  let tail = body.length - 1
  while (tail > head) {
    const b = body[tail]
    if (b == null || b > BYTE_WS_MAX) {
      break
    }
    tail = tail - 1
  }
  if (body.length === 0 || body[head] !== BYTE_LBRACKET || body[tail] !== BYTE_RBRACKET) {
    return Response.json({ ok: false, error: E_NOT_ARRAY }, { status: S_BAD_REQUEST })
  }
  const dir = martTmpDir()
  fs.mkdirSync(dir, { recursive: true })
  const tmp = path.join(dir, TMP_PREFIX + name + JSON_EXT + TMP_SUFFIX)
  fs.writeFileSync(tmp, body)
  fs.renameSync(tmp, path.join(dir, name + JSON_EXT))
  const counterpart = martCounterpart(name)
  if (counterpart != null) {
    fs.rmSync(counterpart, { force: true })
  }
  return Response.json({ ok: true, table: name, bytes: body.length })
}

/**
 * GET /seed:纯加载器(?reset=1 清库重建;token 必带 —— 直连生产!)。
 * 芯在 functions 的 runSeed:门禁 → 取参 → 拿池注入 → 拼响应,四步之外这里没有逻辑。
 *
 * @param req 请求(token 与 reset 都在 URL 上)。
 * @returns 灌库计数响应;未授权 401。
 */
export async function seedRoute(req: Request): Promise<Response> {
  const url = new URL(req.url)
  if (seedTokenOk({ req: req, queryToken: url.searchParams.get(P_TOKEN) }) === false) {
    return new Response(T_UNAUTHORIZED, { status: S_UNAUTHORIZED })
  }
  const resetParam = url.searchParams.get(P_RESET)
  let reset = false
  if (resetParam != null && resetParam !== '') {
    reset = true
  }
  const db = await getDb()
  const out = await runSeed({ db: db, reset: reset })
  return Response.json(out)
}
