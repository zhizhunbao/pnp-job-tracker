// 「我的简历」一节的界面状态(2026-10-05;10-06 一人多份 + 本页预览弹框;dev 直连生产库不登录,登录后的界面用 jsdom 挂件验)。
// 2026-11-07 随「我的」整页照 Fluent 2 / Azure 重做(docs/design/我的/我的框架-20261107.md 2.3 / 1.4)搬到 me 桶:挂整页 MeResume
// (页标题右边「生成简历」+「上传简历」+ 子桶 resume 正文)。简历从卡片改成一张清单表(名称 / 上传日期 / 大小),
// 点文件名开预览框,下载 / 设为默认 / 替换文件 / 删除都挪进预览框;顶行「简历 n / 20」改成页签角标;「添加简历」改成页标题右边
// 「上传简历」(rf.upTitle)。
// 性质:① 清单没回来只出占位,不闪上传区、不出表;② 一份都没有 → 上传区(标题、类型大小、选择文件、拖放提示);
//       ③ 有几份出几行:默认那份挂「默认」;行上不再有「设为默认」/ 下载(2026-11-07 挪进预览框);页签角标「n / 20」;
//          满了页标题右边的钮换成「最多 20 份」;
//       ④ 点文件名开本页弹框(标题是文件名),框里「默认」那份没有「设为默认」、别的有;下载链接带各自 id 且不走预取;
//          Word 也开框(2026-11-07 改:原来没有预览钮),框里只出「下载后查看」不画;关掉就没了;
//       ⑤ 删除两步:(2026-10-12 Frank「所有删除按钮不要直接删,先弹框确认是否删除」)点「删除」只弹框、不发请求,
//          框里取消关框什么都不做,框里「删除」才发 DELETE;服务端删成功才重拉,失败原样留着并报错;
//          「设为默认」发 PATCH 带那一份的 id,成功后重拉;
//       ⑥ 上传失败按错误码出文案(type、full);超 5 MB 不发请求直接报;「替换文件」发 PUT 带那一份的 id。
// 探针:ResumeList 去掉 checked 闸 → ①红;sendResumeAct 不看 r.ok 就重拉 → ⑤「删除失败」红;
//       makePickerOf 不记 replaceId → ⑥「替换带 id」红。
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { MeResume } from '@/components/me'
// jsdom 里 React 要这面旗才认 act()
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const PDF_A = { id: 11, isDefault: true, fileName: 'Zhang_San_Resume.pdf', mime: 'application/pdf', sizeBytes: 151552, uploadedAt: '2026-10-03T15:00:00.000Z' }
const DOCX_B = { id: 12, isDefault: false, fileName: 'cv.docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', sizeBytes: 2048, uploadedAt: '2026-10-02T15:00:00.000Z' }
const PDF_C = { id: 13, isDefault: false, fileName: 'it.pdf', mime: 'application/pdf', sizeBytes: 9000, uploadedAt: '2026-10-01T15:00:00.000Z' }

type Reply = { status: number, body: object }

// fetch 桩:按「方法 地址」分账,没配的一律挂起(验占位用;求职信清单不配 = 一直挂着);同一个键可给一串回包,依次取
function server(routes: Record<string, Reply | Reply[] | 'hang'>) {
  const calls: string[] = []
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    const key = (init?.method ?? 'GET') + ' ' + String(url)
    calls.push(key)
    let r = routes[key]
    if (Array.isArray(r)) {
      r = r.length > 1 ? r.shift() : r[0]
    }
    if (r == null || r === 'hang') {
      return new Promise(() => undefined)
    }
    const reply = r
    return { status: reply.status, ok: reply.status >= 200 && reply.status < 300, json: async () => reply.body }
  }))
  return calls
}

async function flush() {
  for (let i = 0; i < 3; i++) {
    await act(async () => {
      await Promise.resolve()
    })
  }
}

async function mount() {
  const el = document.createElement('div')
  document.body.appendChild(el)
  const root = createRoot(el)
  const t = (k: string, v?: Record<string, string | number>) => (v == null ? k : k + JSON.stringify(v))
  await act(async () => {
    root.render(createElement(MeResume, { t, narrow: false, open: false, onOpen: () => undefined }))
  })
  await flush()
  return el
}

function labels(el: HTMLElement) {
  return Array.from(el.querySelectorAll('button, a')).map((b) => b.getAttribute('aria-label') ?? b.textContent)
}

// 清单表里文件名那一行
function rowOf(el: HTMLElement, name: string) {
  return Array.from(el.querySelectorAll('tr')).find((tr) => tr.textContent?.includes(name)) as HTMLElement
}

// 带某段字的那一层弹框(预览框带 kicker「rm.arch.title」,删除确认框带「rf.delAsk」);没有为 null
function frameWith(el: HTMLElement, text: string) {
  const f = Array.from(el.querySelectorAll('[data-frame]')).find((x) => x.textContent?.includes(text))
  return (f ?? null) as HTMLElement | null
}

async function click(root: HTMLElement, label: string) {
  const b = Array.from(root.querySelectorAll('button')).find((x) => (x.getAttribute('aria-label') ?? x.textContent) === label)
  expect(b, label).toBeTruthy()
  await act(async () => {
    b?.click()
  })
  await flush()
}

// jsdom 没有 matchMedia(弹框按它判窄屏);给一个「不是窄屏」的桩
window.matchMedia = ((q: string) => ({
  matches: false, media: q, onchange: null, addEventListener: () => undefined, removeEventListener: () => undefined,
  addListener: () => undefined, removeListener: () => undefined, dispatchEvent: () => false,
})) as unknown as typeof window.matchMedia

afterEach(() => {
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

describe('「我的简历」一节', () => {
  it('① 清单没回来只出占位(不闪上传区、不出表)', async () => {
    server({ 'GET /api/resume/files': 'hang' })
    const el = await mount()
    for (const k of ['rf.upSub', 'rf.upBtn', 'rf.upDrag', 'rf.col.name']) {
      expect(el.textContent).not.toContain(k)
    }
    expect(el.querySelector('tr')).toBeNull()
    expect(el.textContent).not.toContain('/ 20')
  })

  it('② 一份都没有 → 上传区', async () => {
    server({ 'GET /api/resume/files': { status: 200, body: { items: [] } } })
    const el = await mount()
    for (const k of ['rf.upTitle', 'rf.upSub', 'rf.upBtn', 'rf.upDrag']) {
      expect(el.textContent).toContain(k)
    }
    expect(el.querySelector('tr')).toBeNull()
    expect(el.textContent).toContain('0 / 20')
    expect(el.querySelector('input[type="file"]')?.getAttribute('accept')).toContain('application/pdf')
  })

  it('③ 多份(2026-11-07 改清单表):一份一行,默认挂标签;行上没有设为默认 / 下载;页签角标带份数', async () => {
    server({ 'GET /api/resume/files': { status: 200, body: { items: [PDF_A, DOCX_B, PDF_C] } } })
    const el = await mount()
    expect(Array.from(el.querySelectorAll('tbody tr')).length).toBe(3)
    const a = rowOf(el, 'Zhang_San_Resume.pdf')
    expect(a.textContent).toContain('rf.default')
    expect(a.textContent).toContain('148 KB')
    expect(a.textContent).toContain('2026-10-03')
    const b = rowOf(el, 'cv.docx')
    expect(b.textContent).not.toContain('rf.default')
    expect(b.textContent).toContain('2 KB')
    for (const row of [a, b]) {
      expect(labels(row)).not.toContain('rf.setDefault')
      expect(labels(row)).not.toContain('rf.download')
    }
    expect(el.textContent).not.toContain('rf.upSub')
    expect(labels(el)).toContain('rf.upTitle')
    expect(el.textContent).toContain('3 / 20')
  })

  it('③ 满 20 份(2026-10-07 由 5 份提到 20 份):上传钮换成「最多 20 份」', async () => {
    const full = Array.from({ length: 20 }, (_, k) => ({ ...PDF_C, id: k + 1, fileName: `cv${k + 1}.pdf`, isDefault: k === 0 }))
    server({ 'GET /api/resume/files': { status: 200, body: { items: full } } })
    const el = await mount()
    expect(labels(el)).not.toContain('rf.upTitle')
    expect(labels(el)).not.toContain('cv.gen')
    expect(el.textContent).toContain('rf.full')
    expect(el.textContent).toContain('20 / 20')
  })

  it('④ 点文件名开本页弹框(2026-11-07 下载 / 设为默认挪进框里;Word 也开框),关掉就没了', async () => {
    server({ 'GET /api/resume/files': { status: 200, body: { items: [PDF_A, DOCX_B] } } })
    const el = await mount()
    await click(rowOf(el, 'Zhang_San_Resume.pdf'), 'Zhang_San_Resume.pdf')
    const pv = frameWith(el, 'rm.arch.title') as HTMLElement
    expect(pv).not.toBeNull()
    expect(el.textContent?.split('Zhang_San_Resume.pdf').length).toBe(3)
    expect(pv.textContent).toContain('Zhang_San_Resume.pdf')
    expect(pv.textContent).toContain('rf.default')
    expect(labels(pv)).not.toContain('rf.setDefault')
    expect(labels(pv)).toContain('rf.replace')
    expect(labels(pv)).toContain('rf.delete')
    const dl = Array.from(pv.querySelectorAll('a')).find((x) => x.textContent === 'rf.download')
    expect(dl?.getAttribute('href')).toBe('/api/resume/file?id=11&dl=1')
    expect(dl?.getAttribute('target')).toBe('_self')
    // jsdom 里 pdf.js 画不出来:弹框要么还在加载,要么出「下载后查看」,不许空着
    expect(pv.textContent?.includes('rf.loading') || pv.textContent?.includes('rf.pvFail')).toBe(true)
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    await flush()
    expect(frameWith(el, 'rm.arch.title')).toBeNull()
    expect(el.textContent?.split('Zhang_San_Resume.pdf').length).toBe(2)

    await click(rowOf(el, 'cv.docx'), 'cv.docx')
    const pvB = frameWith(el, 'rm.arch.title') as HTMLElement
    expect(pvB.textContent).toContain('cv.docx')
    expect(pvB.textContent).not.toContain('rf.default')
    expect(labels(pvB)).toContain('rf.setDefault')
    expect(pvB.textContent).toContain('rf.pvFail')
    expect(pvB.textContent).not.toContain('rf.loading')
    const dlB = Array.from(pvB.querySelectorAll('a')).find((x) => x.textContent === 'rf.download')
    expect(dlB?.getAttribute('href')).toBe('/api/resume/file?id=12&dl=1')
  })

  it('⑤ 删除先弹确认框;失败留着报错,成功重拉(框跟着关);设为默认带 id', async () => {
    const calls = server({
      'GET /api/resume/files': [
        { status: 200, body: { items: [PDF_A, DOCX_B] } },
        { status: 200, body: { items: [DOCX_B] } },
      ],
      'DELETE /api/resume/file?id=11': [{ status: 500, body: {} }, { status: 200, body: { ok: true } }],
      'PATCH /api/resume/file?id=12': { status: 200, body: { ok: true } },
    })
    const el = await mount()
    const pv = () => frameWith(el, 'rm.arch.title') as HTMLElement
    const box = () => frameWith(el, 'rf.delAsk')
    await click(rowOf(el, 'Zhang_San_Resume.pdf'), 'Zhang_San_Resume.pdf')
    await click(pv(), 'rf.delete')
    expect(box()?.textContent).toContain('Zhang_San_Resume.pdf')
    expect(calls).not.toContain('DELETE /api/resume/file?id=11')
    await click(box() as HTMLElement, 'rf.cancel')
    expect(box()).toBeNull()
    expect(calls).not.toContain('DELETE /api/resume/file?id=11')
    await click(pv(), 'rf.delete')
    await click(box() as HTMLElement, 'rf.delete')
    expect(calls).toContain('DELETE /api/resume/file?id=11')
    expect(box()).toBeNull()
    expect(rowOf(el, 'Zhang_San_Resume.pdf')).toBeTruthy()
    expect(el.textContent).toContain('rf.err.net')
    expect(calls.filter((c) => c === 'GET /api/resume/files').length).toBe(1)
    await click(pv(), 'rf.delete')
    await click(box() as HTMLElement, 'rf.delete')
    expect(el.textContent).not.toContain('Zhang_San_Resume.pdf')
    expect(el.textContent).not.toContain('rf.err.net')
    expect(pv()).toBeNull()
    await click(rowOf(el, 'cv.docx'), 'cv.docx')
    await click(pv(), 'rf.setDefault')
    expect(calls).toContain('PATCH /api/resume/file?id=12')
  })

  it('⑥ 上传失败按错误码出文案;超 5 MB 不发请求;替换带那一份的 id', async () => {
    const calls = server({
      'GET /api/resume/files': { status: 200, body: { items: [PDF_A] } },
      'PUT /api/resume/file': [{ status: 400, body: { error: 'type' } }, { status: 409, body: { error: 'full' } }],
      'PUT /api/resume/file?id=11': { status: 200, body: { meta: PDF_A } },
    })
    const el = await mount()
    const input = el.querySelector('input[type="file"]') as HTMLInputElement
    const pick = async (f: File) => {
      Object.defineProperty(input, 'files', { configurable: true, value: { item: () => f, length: 1 } })
      await act(async () => {
        input.dispatchEvent(new Event('change', { bubbles: true }))
      })
      await flush()
    }
    await click(el, 'rf.upTitle')
    await pick(new File(['x'], 'a.pdf'))
    expect(el.textContent).toContain('rf.err.type')
    await pick(new File(['x'], 'b.pdf'))
    expect(el.textContent).toContain('rf.err.full')
    expect(calls).not.toContain('PUT /api/resume/file?id=11')
    const before = calls.filter((c) => c.startsWith('PUT')).length
    await pick(new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'big.pdf'))
    expect(calls.filter((c) => c.startsWith('PUT')).length).toBe(before)
    expect(el.textContent).toContain('rf.err.size')
    await click(rowOf(el, 'Zhang_San_Resume.pdf'), 'Zhang_San_Resume.pdf')
    await click(frameWith(el, 'rm.arch.title') as HTMLElement, 'rf.replace')
    await pick(new File(['%PDF-'], 'new.pdf'))
    expect(calls).toContain('PUT /api/resume/file?id=11')
  })
})
