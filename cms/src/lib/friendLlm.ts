// 朋友的模型服务(ngrok FastAPI → qwen3.6)通用调用:JD 整理(J2)与公司调查(K)共用。
// env 复用 news 懒翻译同款 TRANSLATE_API_BASE / TRANSLATE_API_KEY;未配置 → null(调用方降级)。
// /api/chat:{prompt, system?, web_search?, search_query?} → {answer, sources?: [{url,...}], web_search_used, cached}
// 红线:这里只管传输;内容校验(不得新增数字/URL 等)在各调用方做。
//
// ⚠️ **上游没有长度参数**(2026-08-04 实测,别再试):该端点的 FastAPI 请求体是无类型 `object`
// (openapi.json 里 title="Req"),多余字段既不报 422 也不生效。同一 prompt(带 nonce 绕开服务端缓存)
// 分别发 `max_tokens` / `num_predict` / `options.num_predict` / `max_new_tokens` = 24,
// 五次回包全是 371 字符的完整输出,一字不差 —— 上游**忽略**这些字段。
// 所以调用方要短答复只有两条路:**prompt 里下硬约束 + 回来自己按句截断**(见 chatOrchestrate.clampAnswer)。
//
// 🔴🔴 **上游按 prompt 的前 ~2000 字符 + system 的前 ~512 字符做缓存键**(2026-08-04 实测,回包有
// `cached` 字段;两个预算独立,均已二分):同一段 filler + 不同尾巴,filler ≥ ~2000 字符时**第二次直接
// cached=true 返回第一次的答案**。**事故**:简历对照(prompt = 标签 + JD 2800 + 简历)在 JD ≥ ~1976 字符时
// 简历整段落在缓存键之外 → 实测同一份 2400 字符 JD + 焊工/烘焙两份完全不同的简历,第二次 cached=true
// 拿到第一份的分析(Pro 的 rewrite 还会把别人简历的内容吐出来 = 数据泄露)。库里 28.2% 岗位描述 ≥1878 字符。
// ✅ **修法(2026-08-04,治本、一处治全部)**:发出去的 prompt 一律以 `prompt + system` 的**内容指纹**
// (contentTag,fnv1a×2 → 14 个纯字母)开头 —— 指纹落在 @0 永远在 2000 窗口内,**任何调用点的任何输入
// 变化都必然改键**,不需要逐个调用点重排 prompt 顺序。用内容哈希不用随机 nonce:同样的输入仍然命中上游
// 缓存(jdformat / 公司调查这类本来就该复用的不受影响)。
// ⚠️ 仍需知道的:长 prompt 里写在 2000 之后的**指令**依旧影响不了「同一输入」的复用(那是上游的事),
// 但不同输入不会再串答。同一个坑在 /api/translate 也存在,见 lineTranslate / news-translate 的 [ref:] 首行。

const BASE = (process.env.TRANSLATE_API_BASE || '').replace(/\/$/, '')
const KEY = process.env.TRANSLATE_API_KEY || ''

export const friendLlmReady = () => Boolean(BASE && KEY)

// 内容指纹:fnv1a 两个种子 → 各 7 个字母(26^7 > 2^32),拼成 14 字母 ≈ 64 bit 空间。
// 自己实现不引依赖;**只用 a-z 不带数字** —— jdformat 的防幻觉校验会拒收原文没有的多位数字,
// 万一模型把指纹回显出来,纯字母不会误伤那条校验。
function fnv1a(s: string, seed: number): number {
  let h = seed
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i)
    h = Math.imul(h ^ (c & 0xff), 0x01000193)
    h = Math.imul(h ^ (c >>> 8), 0x01000193)
  }
  return h >>> 0
}
function alpha7(n: number): string {
  let s = ''
  for (let i = 0, x = n; i < 7; i++, x = Math.floor(x / 26)) s += String.fromCharCode(97 + (x % 26))
  return s
}
export const contentTag = (s: string): string => alpha7(fnv1a(s, 0x811c9dc5)) + alpha7(fnv1a(s, 0x9e3779b9))

// 内容指纹钉在 prompt @0:上游缓存键只看前 2000 字符,靠它保证「输入变了键一定变」(见文件头 🔴🔴)。
// 标记形状与 /api/translate 那侧统一([ref:…]),纯字母不含数字(不误伤 jdformat 的数字防幻觉校验)。
// 直连 /api/chat 的调用方(news-summarize)也用这个,别各写各的。
export const refPrompt = (prompt: string, system?: string): string =>
  `[ref:${contentTag(prompt + '|' + (system ?? ''))}]\n${prompt}`

export async function friendChat(opts: {
  prompt: string
  system?: string
  webSearch?: boolean
  searchQuery?: string
  timeoutMs?: number
}): Promise<{ answer: string; sources: string[]; cached: boolean } | null> {
  if (!friendLlmReady()) return null
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 60_000)
  try {
    const res = await fetch(`${BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': KEY },
      body: JSON.stringify({
        prompt: refPrompt(opts.prompt, opts.system),
        ...(opts.system ? { system: opts.system } : {}),
        ...(opts.webSearch ? { web_search: true } : {}),
        ...(opts.searchQuery ? { search_query: opts.searchQuery } : {}),
      }),
      signal: ctrl.signal,
    })
    if (!res.ok) return null
    const d = await res.json().catch(() => null)
    const answer = String(d?.answer ?? '').trim()
    if (!answer) return null
    const sources = Array.isArray(d?.sources)
      ? d.sources.map((s: any) => String(s?.url || s || '')).filter(Boolean).slice(0, 6)
      : []
    // cached 透出给调用方打日志:串答类事故只能靠这个字段发现,别再丢了
    return { answer, sources, cached: d?.cached === true }
  } catch {
    return null   // 超时/掉线一律 null,调用方静默降级(设计红线:不报错不重试轰炸)
  } finally {
    clearTimeout(timer)
  }
}
