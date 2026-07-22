/**
 * 行对位翻译共享层(#181,Frank「有时候能翻译,有时候失败」):noc-translate / jd-translate 共用。
 * 首版各自整块编号翻+缺号整块拒收——朋友 qwen(ngrok)时通时断、长批(15+ 行)对位易漏号,
 * 一个号漏掉全部作废,表现为「时灵时不灵」。修:
 *   ① 分块 ≤8 行(小批对位可靠得多,也远离 6000 字符 prompt 上限);
 *   ② 失败块自动重试一次(吸收 ngrok 抖动);
 *   ③ 部分容错:缺号行=null(调用方保留英文),不再整块拒收——编号映射下缺号只是「没翻到」,
 *     不构成错行风险(对位红线不破)。
 */

const BASE = (process.env.TRANSLATE_API_BASE || '').replace(/\/$/, '')
const KEY = process.env.TRANSLATE_API_KEY || ''
export const translateReady = () => !!(BASE && KEY)

const stripMd = (s: string) => s.replace(/\*\*(.+?)\*\*/g, '$1').replace(/^#+\s*/gm, '').replace(/\*\*/g, '')

// 按编号解析(部分容错版):返回 编号→译文 映射,缺号/空段就是缺,不抛
function parseNumbered(out: string): Map<number, string> {
  const parts = out.split(/\n?\[(\d+)\]\s*/)
  const d = new Map<number, string>()
  for (let i = 1; i + 1 < parts.length + 1; i += 2) {
    const t = stripMd(parts[i + 1] ?? '').trim()
    if (t) d.set(Number(parts[i]), t)
  }
  return d
}

/**
 * 逐行翻译:返回与 lines 等长的数组,null=该行没翻到(调用方保留原文)。
 * 全 null = 服务整体不可用,调用方按错误处理。
 */
export async function translateLinesAligned(lines: string[], lang: string, signal: AbortSignal): Promise<(string | null)[]> {
  const out: (string | null)[] = new Array(lines.length).fill(null)
  const CHUNK = 8
  for (let i = 0; i < lines.length; i += CHUNK) {
    const chunk = lines.slice(i, i + CHUNK)
    const numbered = chunk.map((l, j) => `[${j + 1}] ${l}`).join('\n')
    let got: Map<number, string> | null = null
    for (let attempt = 0; attempt < 2 && !got; attempt++) {
      try {
        const resp = await fetch(`${BASE}/api/translate`, {
          method: 'POST', signal,
          headers: { 'Content-Type': 'application/json', 'X-API-Key': KEY },
          body: JSON.stringify({ text: numbered, source_lang: 'en', target_lang: lang }),
        })
        if (!resp.ok) throw new Error(`upstream ${resp.status}`)
        const m = parseNumbered(String((await resp.json()).translated_text || ''))
        if (m.size) got = m          // 一行都没解析到才算本次失败(触发重试)
      } catch {
        if (signal.aborted) throw new Error('timeout')
      }
    }
    if (got) for (let j = 0; j < chunk.length; j++) {
      const t = got.get(j + 1)
      if (t) out[i + j] = t
    }
  }
  return out
}
