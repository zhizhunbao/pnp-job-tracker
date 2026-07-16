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
  let rows: unknown
  try {
    // gzip 魔数判定(不依赖 header——中间代理可能改写/吞掉 Content-Encoding)
    const body = raw.length > 2 && raw[0] === 0x1f && raw[1] === 0x8b ? gunzipSync(raw) : raw
    rows = JSON.parse(body.toString('utf8'))
  } catch (e) {
    return Response.json({ ok: false, error: `bad payload: ${(e as Error).message}` }, { status: 400 })
  }
  if (!Array.isArray(rows)) {
    return Response.json({ ok: false, error: 'payload is not an array' }, { status: 400 })
  }
  const dir = path.join(os.tmpdir(), 'mart')
  fs.mkdirSync(dir, { recursive: true })
  // 原子写:先临时名再 rename,防并发 seed 读到半写文件
  const tmp = path.join(dir, `.${name}.json.tmp`)
  fs.writeFileSync(tmp, JSON.stringify(rows))
  fs.renameSync(tmp, path.join(dir, `${name}.json`))
  return Response.json({ ok: true, table: name, rows: rows.length })
}
