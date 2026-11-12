// 「基础简历」卡的界面状态(2026-10-05 立为「我的简历」一节;dev 直连生产库不登录,登录后的界面用 jsdom 挂件验)。
// 2026-11-11 档案与简历并页(Frank「只留一份上传的吧。因为之后都可以按岗位改写」「左边我的档案,右面我的简历」):
// 整页 MeResume 与子桶 resume 撤掉,改验 me 桶子桶 base 的 useBase + BaseCard(档案页右栏那张卡);一人只留一份,
// 清单表、页签、「默认」、「设为默认」、「最多 20 份」、预览弹框、求职信页签都没了,PDF 直接画在卡里。
// 性质:① 清单没回来只出占位,不闪上传区、不出文件;② 一份都没有 → 上传区(标题、类型大小、选择文件、拖放提示);
//       ③ 有一份:文件名、灰字一行(上传日期, 大小)、下载 / 替换文件 / 删除三颗钮,卡里直接看 PDF;
//          没有表、页签、「默认」、「设为默认」、「最多 20 份」;下载链接带那一份的 id 且不走预取;
//       ④ Word 不画,只出「下载后查看」;
//       ⑤ 删除两步:(2026-10-12 Frank「所有删除按钮不要直接删,先弹框确认是否删除」)点「删除」只弹框、不发请求,
//          框里取消关框什么都不做,框里「删除」才发 DELETE;服务端删成功才重拉,失败原样留着并报错;
//       ⑥ 上传失败按错误码出文案(type、limit);超 5 MB 不发请求直接报;没有文件时 PUT 不带 id;
//          有文件时「替换文件」先弹确认框,确认后选的文件发 PUT 带那一份的 id;拖文件到已有文件的卡上同样先问。
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { BaseCard, useBase } from '@/components/me/base'
// jsdom 里 React 要这面旗才认 act()
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const PDF_A = { id: 11, fileName: 'Zhang_San_Resume.pdf', mime: 'application/pdf', sizeBytes: 151552, uploadedAt: '2026-10-03T15:00:00.000Z' }
// 2026-11-12 Frank「这个搞成一坨了」:文件、上传日期、大小各一行「标签-值」;这是「文件」那一行整行的字
const FILE_LINE = 'rf.kNameZhang_San_Resume.pdf'
const DOCX_B = { id: 12, fileName: 'cv.docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', sizeBytes: 2048, uploadedAt: '2026-10-02T15:00:00.000Z' }

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

const t = (k: string, v?: Record<string, string | number>) => (v == null ? k : k + JSON.stringify(v))

// 档案页右栏的最小宿主:整机钩子 + 卡(MeProfile 里也是这么接的)
function Host() {
  const b = useBase({ t })
  return createElement(BaseCard, { b, t })
}

async function mount() {
  const el = document.createElement('div')
  document.body.appendChild(el)
  const root = createRoot(el)
  await act(async () => {
    root.render(createElement(Host))
  })
  await flush()
  return el
}

function labels(el: HTMLElement) {
  return Array.from(el.querySelectorAll('button, a')).map((b) => b.getAttribute('aria-label') ?? b.textContent)
}

// 带某段字的那一层弹框(删除确认框带「rf.delAsk」,替换确认框带「rf.replaceAsk」);没有为 null
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

// 在隐藏的文件框里「选中」一个文件
async function pick(el: HTMLElement, f: File) {
  const input = el.querySelector('input[type="file"]') as HTMLInputElement
  Object.defineProperty(input, 'files', { configurable: true, value: { item: () => f, length: 1 } })
  await act(async () => {
    input.dispatchEvent(new Event('change', { bubbles: true }))
  })
  await flush()
}

// 把一个文件拖放到带某段字的那一块上(jsdom 没有 DataTransfer,手挂一个只带 files 的)
async function drop(el: HTMLElement, onText: string, f: File) {
  const target = Array.from(el.querySelectorAll('div')).find((d) => d.textContent === onText) as HTMLElement
  expect(target, onText).toBeTruthy()
  const ev = new Event('drop', { bubbles: true, cancelable: true })
  Object.defineProperty(ev, 'dataTransfer', { value: { files: { item: () => f, length: 1 } } })
  await act(async () => {
    target.dispatchEvent(ev)
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

describe('「基础简历」卡', () => {
  it('① 清单没回来只出占位(不闪上传区、不出文件)', async () => {
    server({ 'GET /api/resume/files': 'hang' })
    const el = await mount()
    for (const k of ['rf.upSub', 'rf.upBtn', 'rf.upDrag', 'rf.upTitle', 'rf.download', 'rf.replace', 'rf.delete']) {
      expect(el.textContent).not.toContain(k)
    }
    // 卡里只剩卡头(标题 +「生成简历」)与一块没有字的占位
    expect(el.textContent).toBe('rm.arch.title')
    expect(el.querySelector('section')?.children.length).toBe(2)
    expect(el.querySelector('section')?.children[1]?.textContent).toBe('')
  })

  it('② 一份都没有 → 上传区', async () => {
    server({ 'GET /api/resume/files': { status: 200, body: { items: [] } } })
    const el = await mount()
    for (const k of ['rf.upTitle', 'rf.upSub', 'rf.upBtn', 'rf.upDrag']) {
      expect(el.textContent).toContain(k)
    }
    expect(labels(el)).toContain('rf.upBtn')
    expect(labels(el)).not.toContain('rf.upTitle')   // 卡头不再重复摆上传钮(上传区里已有)
    for (const k of ['rf.download', 'rf.replace', 'rf.delete']) {
      expect(labels(el)).not.toContain(k)
    }
    expect(el.querySelector('input[type="file"]')?.getAttribute('accept')).toContain('application/pdf')
  })

  it('③ 有一份(2026-11-11 只留一份):文件名、灰字一行、三颗钮,卡里直接看;没有表 / 页签 / 默认 / 设为默认 / 最多 20 份', async () => {
    server({ 'GET /api/resume/files': { status: 200, body: { items: [PDF_A] } } })
    const el = await mount()
    // 2026-11-12 Frank「这个地方也重复」:文件名和「上传日期, 大小」并成一行灰字(不可点),全卡只出现一次
    const name = Array.from(el.querySelectorAll('div')).find((d) => d.textContent === FILE_LINE)
    expect(name).toBeTruthy()
    expect(name?.querySelector('a, button')).toBeNull()
    expect(el.textContent?.split('Zhang_San_Resume.pdf').length).toBe(2)
    expect(el.textContent).toContain('rf.kDate2026-10-03')
    expect(el.textContent).toContain('rf.kSize148 KB')
    for (const k of ['rf.download', 'rf.replace', 'rf.delete']) {
      expect(labels(el)).toContain(k)
    }
    const dl = Array.from(el.querySelectorAll('a')).find((x) => x.textContent === 'rf.download')
    expect(dl?.getAttribute('href')).toBe('/api/resume/file?id=11&dl=1')
    expect(dl?.getAttribute('target')).toBe('_self')
    // jsdom 里 pdf.js 画不出来:卡里要么还在加载,要么出「下载后查看」,不许空着
    expect(el.textContent?.includes('rf.loading') || el.textContent?.includes('rf.pvFail')).toBe(true)
    expect(el.querySelector('table')).toBeNull()
    expect(el.querySelector('tr')).toBeNull()
    expect(el.querySelector('[role="tab"], [role="tablist"]')).toBeNull()
    expect(frameWith(el, '')).toBeNull()
    for (const k of ['rf.default', 'rf.setDefault', 'rf.full', '/ 20', 'rl.title', 'rf.upSub', 'rf.upBtn', 'rf.upDrag']) {
      expect(el.textContent).not.toContain(k)
    }
    expect(labels(el)).not.toContain('rf.upTitle')
  })

  it('④ Word 不画:只出「下载后查看」', async () => {
    server({ 'GET /api/resume/files': { status: 200, body: { items: [DOCX_B] } } })
    const el = await mount()
    expect(el.textContent).toContain('cv.docx')
    expect(el.textContent).toContain('rf.kDate2026-10-02rf.kSize2 KB')
    expect(el.textContent).toContain('rf.pvFail')
    expect(el.textContent).not.toContain('rf.loading')
    const dl = Array.from(el.querySelectorAll('a')).find((x) => x.textContent === 'rf.download')
    expect(dl?.getAttribute('href')).toBe('/api/resume/file?id=12&dl=1')
  })

  it('⑤ 删除先弹确认框;失败留着报错,成功重拉', async () => {
    const calls = server({
      'GET /api/resume/files': [
        { status: 200, body: { items: [PDF_A] } },
        { status: 200, body: { items: [] } },
      ],
      'DELETE /api/resume/file?id=11': [{ status: 500, body: {} }, { status: 200, body: { ok: true } }],
    })
    const el = await mount()
    const box = () => frameWith(el, 'rf.delAsk')
    await click(el, 'rf.delete')
    expect(box()?.textContent).toContain('Zhang_San_Resume.pdf')
    expect(calls).not.toContain('DELETE /api/resume/file?id=11')
    await click(box() as HTMLElement, 'rf.cancel')
    expect(box()).toBeNull()
    expect(calls).not.toContain('DELETE /api/resume/file?id=11')
    await click(el, 'rf.delete')
    await click(box() as HTMLElement, 'rf.delete')
    expect(calls).toContain('DELETE /api/resume/file?id=11')
    expect(box()).toBeNull()
    expect(el.textContent).toContain('Zhang_San_Resume.pdf')
    expect(el.textContent).toContain('rf.err.net')
    expect(calls.filter((c) => c === 'GET /api/resume/files').length).toBe(1)
    await click(el, 'rf.delete')
    await click(box() as HTMLElement, 'rf.delete')
    expect(calls.filter((c) => c === 'GET /api/resume/files').length).toBe(2)
    expect(el.textContent).not.toContain('Zhang_San_Resume.pdf')
    expect(el.textContent).not.toContain('rf.err.net')
    expect(el.textContent).toContain('rf.upSub')
  })

  it('⑥ 上传失败按错误码出文案;超 5 MB 不发请求;没有文件时 PUT 不带 id;替换先问、带那一份的 id', async () => {
    const calls = server({
      'GET /api/resume/files': [
        { status: 200, body: { items: [] } },
        { status: 200, body: { items: [PDF_A] } },
      ],
      'PUT /api/resume/file': [
        { status: 400, body: { error: 'type' } },
        { status: 409, body: { error: 'limit' } },
        { status: 200, body: { meta: PDF_A } },
      ],
      'PUT /api/resume/file?id=11': { status: 200, body: { meta: PDF_A } },
    })
    const el = await mount()
    const puts = () => calls.filter((c) => c.startsWith('PUT'))
    const box = () => frameWith(el, 'rf.replaceAsk')
    await click(el, 'rf.upBtn')
    expect(box()).toBeNull()
    await pick(el, new File(['x'], 'a.pdf'))
    expect(el.textContent).toContain('rf.err.type')
    await pick(el, new File(['x'], 'b.pdf'))
    expect(el.textContent).toContain('rf.err.limit')
    expect(el.textContent).not.toContain('rf.err.type')
    expect(puts()).toEqual(['PUT /api/resume/file', 'PUT /api/resume/file'])
    await pick(el, new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'big.pdf'))
    expect(puts().length).toBe(2)
    expect(el.textContent).toContain('rf.err.size')
    // 传成功:没有文件时不带 id,重拉后卡上出那一份
    await pick(el, new File(['%PDF-'], 'Zhang_San_Resume.pdf'))
    expect(puts()).toEqual(['PUT /api/resume/file', 'PUT /api/resume/file', 'PUT /api/resume/file'])
    expect(el.textContent).not.toContain('rf.err.size')
    expect(el.textContent).toContain('rf.kDate2026-10-03rf.kSize148 KB')
    // 「替换文件」先问:框里写着文件名,取消什么都不做;确认后选的文件带 id 发出去
    await click(el, 'rf.replace')
    expect(box()?.textContent).toContain('Zhang_San_Resume.pdf')
    await click(box() as HTMLElement, 'rf.cancel')
    expect(box()).toBeNull()
    await click(el, 'rf.replace')
    await click(box() as HTMLElement, 'rf.replace')
    expect(box()).toBeNull()
    expect(puts().length).toBe(3)
    await pick(el, new File(['%PDF-'], 'new.pdf'))
    expect(puts()[3]).toBe('PUT /api/resume/file?id=11')
    // 拖文件到已有文件的卡上同样先问,确认才传
    await drop(el, FILE_LINE, new File(['%PDF-'], 'dropped.pdf'))
    expect(box()?.textContent).toContain('Zhang_San_Resume.pdf')
    expect(puts().length).toBe(4)
    await click(box() as HTMLElement, 'rf.replace')
    expect(puts().length).toBe(5)
    expect(puts()[4]).toBe('PUT /api/resume/file?id=11')
  })
})
