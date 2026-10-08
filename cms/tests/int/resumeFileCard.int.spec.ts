// 「我的简历」一节的界面状态(2026-10-05;10-06 一人多份 + 本页预览弹框;dev 直连生产库不登录,登录后的界面用 jsdom 挂件验)。
// 性质:① 清单没回来只出占位,不闪上传区;② 一份都没有 → 上传区(标题、类型大小、选择文件、拖放提示);
//       ③ 有几份出几张卡:默认那份挂「默认」、没有「设为默认」;别的有「设为默认」;下载链接带各自 id 且不走预取;
//          Word 没有预览钮(2026-10-08 照 AIApply 卡形,缩略图与 DOCX 占位撤);顶行「简历 n / 20」+「添加简历」,满了钮换成「最多 20 份」;
//       ④ 点缩略图(读屏名「预览」;10-06 预览钮撤,图即钮)开本页弹框(标题是文件名),关掉就没了;
//       ⑤ 删除两步:点「删除」只亮那一份的确认,取消回原样;确认后服务端删成功才重拉,失败原样留着并报错;
//          「设为默认」发 PATCH 带那一份的 id,成功后重拉;
//       ⑥ 上传失败按错误码出文案(type、full);超 5 MB 不发请求直接报;「替换文件」发 PUT 带那一份的 id。
// 探针:ResumeFile 去掉 checked 闸 → ①红;sendResumeAct 不看 r.ok 就重拉 → ⑤「删除失败」红;
//       makePickerOf 不记 replaceId → ⑥「替换带 id」红。
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ResumeFile } from '@/components/account'

const PDF_A = { id: 11, isDefault: true, fileName: 'Zhang_San_Resume.pdf', mime: 'application/pdf', sizeBytes: 151552, uploadedAt: '2026-10-03T15:00:00.000Z' }
const DOCX_B = { id: 12, isDefault: false, fileName: 'cv.docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', sizeBytes: 2048, uploadedAt: '2026-10-02T15:00:00.000Z' }
const PDF_C = { id: 13, isDefault: false, fileName: 'it.pdf', mime: 'application/pdf', sizeBytes: 9000, uploadedAt: '2026-10-01T15:00:00.000Z' }

type Reply = { status: number, body: object }

// fetch 桩:按「方法 地址」分账,没配的一律挂起(验占位用);同一个键可给一串回包,依次取
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
  await act(async () => {
    root.render(createElement(ResumeFile, { t: (k: string, v?: Record<string, string | number>) => (v == null ? k : k + JSON.stringify(v)) }))
  })
  await flush()
  return el
}

function labels(el: HTMLElement) {
  return Array.from(el.querySelectorAll('button, a')).map((b) => b.getAttribute('aria-label') ?? b.textContent)
}

function cardOf(el: HTMLElement, name: string) {
  const all = Array.from(el.querySelectorAll('div')).filter((d) => String(d.className).includes('rfCard') && d.textContent?.includes(name))
  return all[0] as HTMLElement
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
  it('① 清单没回来只出占位', async () => {
    server({ 'GET /api/resume/files': 'hang' })
    const el = await mount()
    expect(el.textContent).not.toContain('rf.upTitle')
    expect(el.textContent).not.toContain('rf.add')
  })

  it('② 一份都没有 → 上传区', async () => {
    server({ 'GET /api/resume/files': { status: 200, body: { items: [] } } })
    const el = await mount()
    for (const k of ['rf.upTitle', 'rf.upSub', 'rf.upBtn', 'rf.upDrag']) {
      expect(el.textContent).toContain(k)
    }
    expect(el.querySelector('input[type="file"]')?.getAttribute('accept')).toContain('application/pdf')
  })

  it('③ 多份:默认挂标签;下载带各自 id;Word 无预览;添加一行带份数', async () => {
    server({ 'GET /api/resume/files': { status: 200, body: { items: [PDF_A, DOCX_B, PDF_C] } } })
    const el = await mount()
    const a = cardOf(el, 'Zhang_San_Resume.pdf')
    expect(a.textContent).toContain('rf.default')
    expect(labels(a)).not.toContain('rf.setDefault')
    expect(labels(a)).toContain('rf.preview')
    expect(a.textContent).toContain('148 KB')
    const dl = Array.from(a.querySelectorAll('a')).find((x) => x.textContent === 'rf.download')
    expect(dl?.getAttribute('href')).toBe('/api/resume/file?id=11&dl=1')
    expect(dl?.getAttribute('target')).toBe('_self')
    const b = cardOf(el, 'cv.docx')
    expect(b.textContent).toContain('cv.docx')
    expect(labels(b)).toContain('rf.setDefault')
    expect(labels(b)).not.toContain('rf.preview')
    expect(el.textContent).toContain('rf.add')
    expect(el.textContent).toContain('3 / 20')
  })

  it('③ 满 20 份(2026-10-07 由 5 份提到 20 份):添加钮换成「最多 20 份」', async () => {
    const five = Array.from({ length: 20 }, (_, k) => ({ ...PDF_C, id: k + 1, fileName: `cv${k + 1}.pdf`, isDefault: k === 0 }))
    server({ 'GET /api/resume/files': { status: 200, body: { items: five } } })
    const el = await mount()
    expect(labels(el)).not.toContain('rf.add')
    expect(el.textContent).toContain('rf.full')
    expect(el.textContent).toContain('20 / 20')
  })

  it('④ 预览开本页弹框,关掉就没了', async () => {
    server({ 'GET /api/resume/files': { status: 200, body: { items: [PDF_A] } } })
    const el = await mount()
    await click(el, 'rf.preview')
    const opened = document.body.textContent ?? ''
    expect(opened.split('Zhang_San_Resume.pdf').length - 1).toBe(2)
    // jsdom 里 pdf.js 画不出来:弹框要么还在加载,要么出「下载后查看」,不许空着
    expect(opened.includes('rf.loading') || opened.includes('rf.pvFail')).toBe(true)
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    await flush()
    expect((document.body.textContent ?? '').split('Zhang_San_Resume.pdf').length - 1).toBe(1)
  })

  it('⑤ 删除两步只亮那一份;失败留着报错,成功重拉;设为默认带 id', async () => {
    const calls = server({
      'GET /api/resume/files': [
        { status: 200, body: { items: [PDF_A, DOCX_B] } },
        { status: 200, body: { items: [DOCX_B] } },
      ],
      'DELETE /api/resume/file?id=11': [{ status: 500, body: {} }, { status: 200, body: { ok: true } }],
      'PATCH /api/resume/file?id=12': { status: 200, body: { ok: true } },
    })
    const el = await mount()
    const a = cardOf(el, 'Zhang_San_Resume.pdf')
    await click(a, 'rf.delete')
    expect(labels(cardOf(el, 'Zhang_San_Resume.pdf'))).toContain('rf.sure')
    expect(labels(cardOf(el, 'cv.docx'))).not.toContain('rf.sure')
    await click(el, 'rf.cancel')
    expect(labels(el)).not.toContain('rf.sure')
    await click(cardOf(el, 'Zhang_San_Resume.pdf'), 'rf.delete')
    await click(el, 'rf.sure')
    expect(calls).toContain('DELETE /api/resume/file?id=11')
    expect(el.textContent).toContain('Zhang_San_Resume.pdf')
    expect(el.textContent).toContain('rf.err.net')
    await click(cardOf(el, 'Zhang_San_Resume.pdf'), 'rf.delete')
    expect(el.textContent).not.toContain('rf.err.net')
    await click(el, 'rf.sure')
    expect(el.textContent).not.toContain('Zhang_San_Resume.pdf')
    await click(cardOf(el, 'cv.docx'), 'rf.setDefault')
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
    await click(el, 'rf.add')
    await pick(new File(['x'], 'a.pdf'))
    expect(el.textContent).toContain('rf.err.type')
    await pick(new File(['x'], 'b.pdf'))
    expect(el.textContent).toContain('rf.err.full')
    const before = calls.filter((c) => c.startsWith('PUT')).length
    await pick(new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'big.pdf'))
    expect(calls.filter((c) => c.startsWith('PUT')).length).toBe(before)
    expect(el.textContent).toContain('rf.err.size')
    await click(cardOf(el, 'Zhang_San_Resume.pdf'), 'rf.replace')
    await pick(new File(['%PDF-'], 'new.pdf'))
    expect(calls).toContain('PUT /api/resume/file?id=11')
  })
})
