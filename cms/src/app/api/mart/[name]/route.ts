/**
 * mart 上传端点(E7-04,Supabase Storage 退役后的交接层):
 * ETL 的 upload_mart.py 逐表 gzip POST 到这里 → 落 <tmpdir>/mart/<name>.json,
 * 同轮管线随后触发的 /seed 优先读该目录(读取链见 seed/route.ts)。
 * /tmp 随部署即弃无妨——上传与 seed 前后脚;若恰逢重启丢文件,seed 读不到会响亮失败不空灌。
 */
import fs from 'fs'
import os from 'os'
import path from 'path'
import { gunzipSync } from 'zlib'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: Request, { params }: { params: Promise<{ name: string }> }) {
  // 门禁与 /seed 同一把 token(生产必设;本地 dev 未设则放行)
  const token = process.env.SEED_TOKEN
  if (token && req.headers.get('x-seed-token') !== token) {
    return new Response('unauthorized', { status: 401 })
  }
  const { name } = await params
  if (!/^[a-z0-9_]{1,64}$/.test(name)) {
    return Response.json({ ok: false, error: 'bad table name' }, { status: 400 })
  }
  const raw = Buffer.from(await req.arrayBuffer())
  let body: Buffer
  try {
    // gzip 魔数判定(不依赖 header——中间代理可能改写/吞掉 Content-Encoding)
    body = raw.length > 2 && raw[0] === 0x1f && raw[1] === 0x8b ? gunzipSync(raw) : raw
  } catch (e) {
    return Response.json({ ok: false, error: `bad gzip: ${(e as Error).message}` }, { status: 400 })
  }
  // 不做全量 JSON.parse:jobs 解压 64MB,parse+重 stringify 在 512MB 实例上内存翻几倍(上线首日 502 实撞)。
  // 完整性由 gzip CRC 保证(gunzipSync 已校验),ETL 侧上传前已验 JSON;这里只查首尾是数组括号。
  // 坏 JSON 的最终防线在 seed 读取时的 JSON.parse——失败即整事务回滚,不会半灌。
  let head = 0
  let tail = body.length - 1
  while (head < body.length && body[head]! <= 0x20) head++
  while (tail > head && body[tail]! <= 0x20) tail--
  if (body.length === 0 || body[head] !== 0x5b /* [ */ || body[tail] !== 0x5d /* ] */) {
    return Response.json({ ok: false, error: 'payload is not a JSON array' }, { status: 400 })
  }
  const dir = path.join(os.tmpdir(), 'mart')
  fs.mkdirSync(dir, { recursive: true })
  // 原子写:先临时名再 rename,防并发 seed 读到半写文件
  const tmp = path.join(dir, `.${name}.json.tmp`)
  fs.writeFileSync(tmp, body)
  fs.renameSync(tmp, path.join(dir, `${name}.json`))
  // 形态切换清残留:seed 按「有 __meta 走分片,否则走单文件」选路,旧形态文件留着会被误读。
  // 单文件落地 → 删同表旧 meta;meta 落地(分片集提交)→ 删同表旧单文件。
  const counterpart = name.endsWith('__meta')
    ? path.join(dir, `${name.slice(0, -'__meta'.length)}.json`)
    : name.includes('__') ? null : path.join(dir, `${name}__meta.json`)
  if (counterpart) fs.rmSync(counterpart, { force: true })
  return Response.json({ ok: true, table: name, bytes: body.length })
}
