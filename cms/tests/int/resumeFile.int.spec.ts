// @vitest-environment node
// 「我的简历」原件存取(2026-10-05 Frank「先做我的简历吧」;10-06 改一人多份、最多 5 份、一份默认;
// 设计稿 docs/design/我的模块v2-20261005.md「定稿」)。
// 性质:① 五个接口未登录一律 401、不碰库;② 类型按文件头判,不信扩展名:PDF 文件头 → 收;zip 文件头 + .docx → 收;
//       zip 文件头 + 别的扩展名、改了后缀的文本 → 400 且不写库;空文件 400、超 5 MB 413;
//       ③ 存下的原件逐字节取回,取原件带防嗅探、不许缓存,默认在浏览器打开、带 dl 按下载,中文文件名百分号编码;
//          别人的那一份取不到(404),不带 id 400;
//       ④ 限流两位:同一人每天 20 次到顶 429;同一 IP 轮换新号到 100 次 429,换个 IP 照常;
//       ⑤ 多份:第一份自动默认;第 6 份 409;替换原地覆盖、默认不变;设默认只留一份默认;删掉默认那份,最新的补成默认;
//       ⑥ 删到一份不剩,简历对照存档的文字一起清空(隐私条款「删除时原件与存档文本一并删除」);还剩的时候不清。
// 探针:路由去掉 user == null 闸 → ①红;fileMimeOf 改成只看扩展名 → ②「改了后缀」红;dispositionOf 去掉
//       encodeURIComponent → ③中文名红;限流去掉每 IP 那一位 → ④ IP 那条红;PUT 去掉份数判断 → ⑤第 6 份红;
//       删除路由去掉「一份不剩才清」的判断 → ⑥红。
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { RF_IP_DAILY, RF_USER_DAILY, RESUME_FILES_MAX, RESUME_MAX_BYTES } from '@/lib/resume/constants'
import { dispositionOf, fileMimeOf, fileNameOf } from '@/lib/resume/functions'
import {
  resumeFileDeleteRoute, resumeFileGetRoute, resumeFilePatchRoute, resumeFilePutRoute, resumeFilesRoute,
} from '@/lib/resume/server'
import { CACHE as QUOTA } from '@/lib/quota/variables'
import { SQL } from '@/lib/db'
import type { QueryResult, SqlParam } from '@/lib/db'

type Row = {
  id: number, user_id: string, file_b64: string, file_name: string, mime: string, size_bytes: number,
  uploaded_at: string, is_default: boolean,
}

const h = vi.hoisted(() => {
  const user: { current: { id: number, email: string, role: string } | null } = { current: null }
  const rows: Row[] = []
  const seq = { n: 0 }
  const patches: { userId: number | string, patch: object }[] = []
  return { user, rows, seq, patches }
})

vi.mock('payload', () => ({ getPayload: async () => ({ auth: async () => ({ user: h.user.current }) }) }))
vi.mock('@/payload.config', () => ({ default: Promise.resolve({}) }))
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }), headers: async () => new Headers() }))
vi.mock('@/lib/profile/server', () => ({
  patchProfile: async (x: { userId: number | string, patch: object }) => {
    h.patches.push(x)
  },
}))

function mine(uid: string) {
  return h.rows.filter((r) => r.user_id === uid)
}

// 库桩:按语句分账,照 user_resumes 多份语义(默认那份在前,其余新到旧)
const query = vi.fn(async (sql: string, p: SqlParam[] = []): Promise<QueryResult> => {
  const uid = String(p[0])
  const ok = (rows: object[], n = rows.length) => ({ rows, rowCount: n }) as QueryResult
  if (sql === SQL.RESUME_FILE_LIST) {
    const list = mine(uid).sort((a, b) => Number(b.is_default) - Number(a.is_default) || b.uploaded_at.localeCompare(a.uploaded_at))
    return ok(list)
  }
  if (sql === SQL.RESUME_FILE_COUNT) {
    return ok([{ n: mine(uid).length }])
  }
  if (sql === SQL.RESUME_FILE_GET) {
    return ok(mine(uid).filter((r) => r.id === Number(p[1])))
  }
  if (sql === SQL.RESUME_FILE_INSERT) {
    h.seq.n += 1
    const row: Row = {
      id: h.seq.n, user_id: uid, file_b64: String(p[1]), file_name: String(p[2]), mime: String(p[3]),
      size_bytes: Number(p[4]), uploaded_at: String(p[5]) + String(h.seq.n).padStart(4, '0'), is_default: mine(uid).length === 0,
    }
    h.rows.push(row)
    return ok([{ id: row.id, is_default: row.is_default }])
  }
  if (sql === SQL.RESUME_FILE_REPLACE) {
    const row = mine(uid).find((r) => r.id === Number(p[1]))
    if (row == null) {
      return ok([])
    }
    Object.assign(row, { file_b64: String(p[2]), file_name: String(p[3]), mime: String(p[4]), size_bytes: Number(p[5]) })
    return ok([{ id: row.id, is_default: row.is_default }])
  }
  if (sql === SQL.RESUME_FILE_DELETE) {
    const i = h.rows.findIndex((r) => r.user_id === uid && r.id === Number(p[1]))
    if (i >= 0) {
      h.rows.splice(i, 1)
    }
    return ok([])
  }
  if (sql === SQL.RESUME_FILE_PROMOTE) {
    const list = mine(uid)
    if (list.length > 0 && list.every((r) => r.is_default === false)) {
      const top = list.sort((a, b) => b.uploaded_at.localeCompare(a.uploaded_at))[0]
      if (top != null) {
        top.is_default = true
      }
    }
    return ok([])
  }
  if (sql === SQL.RESUME_FILE_SET_DEFAULT) {
    const list = mine(uid)
    if (list.some((r) => r.id === Number(p[1])) === false) {
      return ok([], 0)
    }
    for (const r of list) {
      r.is_default = r.id === Number(p[1])
    }
    return ok([], list.length)
  }
  throw new Error('unexpected sql: ' + sql)
})
vi.mock('@/lib/db/server', () => ({ getDb: async () => ({ query }) }))

const PDF = new TextEncoder().encode('%PDF-1.7\n%stub resume\n')
const ZIP = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x06, 0x00])
const URL_FILE = 'https://offer2pr.com/api/resume/file'

function login(id: number) {
  h.user.current = { id, email: `u${id}@test.local`, role: 'user' }
}

function put(bytes: Uint8Array, name: string, ip = '1.1.1.1', id: number | null = null) {
  const form = new FormData()
  form.append('file', new File([bytes], name))
  const url = id == null ? URL_FILE : URL_FILE + '?id=' + id
  return resumeFilePutRoute(new Request(url, { method: 'PUT', body: form, headers: { 'x-forwarded-for': ip } }))
}

async function list() {
  return (await (await resumeFilesRoute(new Request('https://offer2pr.com/api/resume/files'))).json()).items as
    { id: number, isDefault: boolean, fileName: string, mime: string, sizeBytes: number, uploadedAt: string }[]
}

beforeEach(() => {
  h.user.current = null
  h.rows.length = 0
  h.patches.length = 0
  query.mockClear()
  QUOTA.buckets.clear()
})

describe('① 未登录', () => {
  it('五个接口都 401,一条语句都不发', async () => {
    expect((await resumeFileGetRoute(new Request(URL_FILE + '?id=1'))).status).toBe(401)
    expect((await put(PDF, 'a.pdf')).status).toBe(401)
    expect((await resumeFileDeleteRoute(new Request(URL_FILE + '?id=1', { method: 'DELETE' }))).status).toBe(401)
    expect((await resumeFilePatchRoute(new Request(URL_FILE + '?id=1', { method: 'PATCH' }))).status).toBe(401)
    expect((await resumeFilesRoute(new Request('https://offer2pr.com/api/resume/files'))).status).toBe(401)
    expect(query).not.toHaveBeenCalled()
  })
})

describe('② 类型按文件头判', () => {
  it('PDF 文件头收(扩展名大写、没有扩展名都收);zip 文件头只在 .docx 时收', () => {
    expect(fileMimeOf({ name: 'CV.PDF', head: '%PDF-' })).toBe('application/pdf')
    expect(fileMimeOf({ name: 'resume', head: '%PDF-' })).toBe('application/pdf')
    expect(fileMimeOf({ name: 'cv.docx', head: 'PK\u0003\u0004\u0014' })).toContain('wordprocessingml')
    expect(fileMimeOf({ name: 'cv.xlsx', head: 'PK\u0003\u0004\u0014' })).toBeNull()
    expect(fileMimeOf({ name: 'cv.pdf', head: 'hello' })).toBeNull()
  })

  it('改了后缀的文本、表格 → 400 type,不写库;空文件 400;超 5 MB 413', async () => {
    login(1)
    const fake = await put(new TextEncoder().encode('just text'), 'cv.pdf')
    expect(fake.status).toBe(400)
    expect(await fake.json()).toEqual({ error: 'type' })
    expect((await put(ZIP, 'sheet.xlsx')).status).toBe(400)
    expect((await put(new Uint8Array(0), 'cv.pdf')).status).toBe(400)
    expect((await put(new Uint8Array(RESUME_MAX_BYTES + 1), 'big.pdf')).status).toBe(413)
    expect(h.rows.length).toBe(0)
  })

  it('.docx 收下,MIME 记成 Word;文件名去首尾空白,空名按类型补', async () => {
    login(2)
    const r = await put(ZIP, '  我的简历.docx ')
    expect(r.status).toBe(200)
    const { meta } = await r.json()
    expect(meta.fileName).toBe('我的简历.docx')
    expect(meta.mime).toContain('wordprocessingml')
    expect(fileNameOf({ name: '  ', mime: 'application/pdf' })).toBe('resume.pdf')
  })
})

describe('③ 取原件', () => {
  it('逐字节取回;防嗅探、不许缓存;默认浏览器打开,带 dl 按下载;中文名百分号编码', async () => {
    login(3)
    const { meta } = await (await put(PDF, '张三简历.pdf')).json()
    const r = await resumeFileGetRoute(new Request(URL_FILE + '?id=' + meta.id))
    expect(r.status).toBe(200)
    expect(new Uint8Array(await r.arrayBuffer())).toEqual(PDF)
    expect(r.headers.get('Content-Type')).toBe('application/pdf')
    expect(r.headers.get('X-Content-Type-Options')).toBe('nosniff')
    expect(r.headers.get('Cache-Control')).toBe('private, no-store')
    expect(r.headers.get('Content-Disposition')).toBe("inline; filename*=UTF-8''" + encodeURIComponent('张三简历.pdf'))
    const dl = await resumeFileGetRoute(new Request(URL_FILE + '?id=' + meta.id + '&dl=1'))
    expect(dl.headers.get('Content-Disposition')?.startsWith('attachment;')).toBe(true)
    expect(dispositionOf({ fileName: 'a b.pdf', download: false })).toBe("inline; filename*=UTF-8''a%20b.pdf")
  })

  it('别人的那一份 404;不带 id、id 乱填 400', async () => {
    login(4)
    const { meta } = await (await put(PDF, 'a.pdf')).json()
    login(5)
    expect((await resumeFileGetRoute(new Request(URL_FILE + '?id=' + meta.id))).status).toBe(404)
    expect((await resumeFileGetRoute(new Request(URL_FILE))).status).toBe(400)
    expect((await resumeFileGetRoute(new Request(URL_FILE + '?id=abc'))).status).toBe(400)
    expect((await resumeFilePatchRoute(new Request(URL_FILE + '?id=' + meta.id, { method: 'PATCH' }))).status).toBe(404)
  })
})

describe('④ 限流两位', () => {
  it('同一人每天到顶 429(替换也算次数)', async () => {
    login(6)
    const { meta } = await (await put(PDF, 'a.pdf')).json()
    for (let i = 1; i < RF_USER_DAILY; i++) {
      expect((await put(PDF, 'a.pdf', '2.2.2.' + i, meta.id)).status).toBe(200)
    }
    expect((await put(PDF, 'a.pdf', '2.2.3.1', meta.id)).status).toBe(429)
  })

  it('同一 IP 轮换新号到顶 429,换个 IP 照常', async () => {
    for (let i = 0; i < RF_IP_DAILY; i++) {
      login(1000 + i)
      expect((await put(PDF, 'a.pdf', '3.3.3.3')).status).toBe(200)
    }
    login(5000)
    expect((await put(PDF, 'a.pdf', '3.3.3.3')).status).toBe(429)
    expect((await put(PDF, 'a.pdf', '4.4.4.4')).status).toBe(200)
  })
})

describe('⑤ 多份', () => {
  it('第一份自动默认;满 5 份再加 409;替换原地覆盖、默认不变', async () => {
    login(7)
    for (let i = 1; i <= RESUME_FILES_MAX; i++) {
      expect((await put(PDF, `cv${i}.pdf`)).status).toBe(200)
    }
    const full = await put(PDF, 'cv6.pdf')
    expect(full.status).toBe(409)
    expect(await full.json()).toEqual({ error: 'full' })
    let items = await list()
    expect(items.length).toBe(RESUME_FILES_MAX)
    expect(items.filter((x) => x.isDefault).map((x) => x.fileName)).toEqual(['cv1.pdf'])
    const first = items[0]?.id ?? 0
    expect((await put(ZIP, 'new.docx', '1.1.1.1', first)).status).toBe(200)
    items = await list()
    expect(items.length).toBe(RESUME_FILES_MAX)
    expect(items[0]?.id).toBe(first)
    expect(items[0]?.fileName).toBe('new.docx')
    expect(items[0]?.isDefault).toBe(true)
  })

  it('设默认只留一份默认;删掉默认那份,最新的补成默认', async () => {
    login(8)
    await put(PDF, 'a.pdf')
    await put(PDF, 'b.pdf')
    await put(PDF, 'c.pdf')
    const b = (await list()).find((x) => x.fileName === 'b.pdf')
    expect((await resumeFilePatchRoute(new Request(URL_FILE + '?id=' + b?.id, { method: 'PATCH' }))).status).toBe(200)
    let items = await list()
    expect(items.filter((x) => x.isDefault).map((x) => x.fileName)).toEqual(['b.pdf'])
    expect(items[0]?.fileName).toBe('b.pdf')
    await resumeFileDeleteRoute(new Request(URL_FILE + '?id=' + b?.id, { method: 'DELETE' }))
    items = await list()
    expect(items.filter((x) => x.isDefault).map((x) => x.fileName)).toEqual(['c.pdf'])
  })
})

describe('⑥ 删除连带清文字存档', () => {
  it('还剩的时候不清;删到一份不剩才清', async () => {
    login(9)
    await put(PDF, 'a.pdf')
    await put(PDF, 'b.pdf')
    const [x, y] = await list()
    await resumeFileDeleteRoute(new Request(URL_FILE + '?id=' + x?.id, { method: 'DELETE' }))
    expect(h.patches).toEqual([])
    await resumeFileDeleteRoute(new Request(URL_FILE + '?id=' + y?.id, { method: 'DELETE' }))
    expect(h.patches).toEqual([{ userId: 9, patch: { resumeText: null, resumeSavedAt: null } }])
    expect(await list()).toEqual([])
  })
})
