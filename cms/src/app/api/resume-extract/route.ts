// POST /api/resume-extract — 简历文件抽纯文本(G3 上传,2026-08-03 Frank 把文件上传从二期提上来)。
// 只做解析不碰 LLM(零成本,不占免费池;登录墙照旧防白嫖解析器)。pdf/docx 进这;md/txt 前端直读不进来。
// 铁律同 /api/resume:原件内存解析完即弃,不落盘不入库,日志只记长度。文本回填前端粘贴框 →
// 用户看得见、能删改,LLM 链路(/api/resume-match)一条不加。
import { NextRequest } from 'next/server'

import { getUser } from '@/lib/quota/server'
import { extractText, RESUME_MAX_BYTES } from '@/lib/resume'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_OUT = 20_000   // 回填文本上限(resume-match 侧还有 CLAMP 截断,这里只防离谱大文件)

export async function POST(req: NextRequest) {
  const user = await getUser(req.headers)
  if (!user) return Response.json({ error: 'auth' }, { status: 401 })

  let file: File | null = null
  try { file = (await req.formData()).get('file') as File | null } catch { /* 非 multipart */ }
  if (!file || typeof file === 'string') return Response.json({ error: 'nofile' }, { status: 400 })
  if (file.size > RESUME_MAX_BYTES) return Response.json({ error: 'size' }, { status: 413 })

  const buf = Buffer.from(await file.arrayBuffer())
  // 保留换行(回填 textarea 要可读),只压回车与行内连空格
  const { text: raw, err } = await extractText(file.name || '', buf)
  const text = raw?.replace(/\r/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim() ?? null
  if (text == null) {
    // 真实解析错误只回给 @test.local(生产排障用;普通用户只见统一 parse 码)
    const dbg = String((user as any).email || '').endsWith('@test.local')
    return Response.json({ error: 'parse', ...(dbg ? { detail: err.slice(0, 300) } : {}) }, { status: 422 })
  }
  if (text.length < 120) return Response.json({ error: 'scan' }, { status: 422 })  // 扫描件/空文件:无文本层

  console.log(`[resume-extract] ok user=${(user as any).id} file=${file.size}b text=${text.length}ch`)
  return Response.json({ text: text.slice(0, MAX_OUT) })
}
