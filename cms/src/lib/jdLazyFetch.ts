// #123 JD 正文懒抓(2026-07-20 Frank 拍板,lazy-first 铁律):聚合帖(Jobs.gc.ca 等经 Job Bank 转贴)
// 的 JB 详情页不带正文(description=空 span,05b 抓不到)——用户点开 JD 且库里为空时现场抓:
//   ① GET applyUrl(JB 页)→ 先试 JB 自有正文(.job-posting-detail-requirements / [property=description],direct 帖有)
//   ② 空则抽 #externalJobLink 外链(JB 官方页自带,实测央行帖)→ GET 原站 → 通用正文抽取(剥 script/nav/标签)
//   ③ ≥300 字符才算抓到 → 写回 jobs.description 永久缓存(谁被点开谁被抓,零批量预抓)
// 失败=负缓存 10 分钟防连点重抓;单飞防并发重复抓。非 JB 的 applyUrl(ATS 帖)直接走 ② 的通用抽取。
// 下轮 seed 不会冲掉:seed 的 description 已改 COALESCE(mart 为空保留旧值)。

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
const MIN_LEN = 300          // 短于此=没抓到(导航残渣不入库,宁缺勿滥)
const MAX_LEN = 15000        // 正文封顶(前端 JdTextView max=4000,富余给顾问上下文)
const NEG_TTL = 10 * 60_000  // 失败负缓存

const inflight = new Map<string, Promise<string>>()
const failed = new Map<string, number>()

const badHost = (u: URL) => !/^https?:$/.test(u.protocol)
  || /^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.|\[)/.test(u.hostname)
  || /^172\.(1[6-9]|2\d|3[01])\./.test(u.hostname)

async function fetchHtml(url: string): Promise<string> {
  const u = new URL(url)
  if (badHost(u)) return ''
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 8000)
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html' }, redirect: 'follow', signal: ctrl.signal })
    if (!res.ok) return ''
    return (await res.text()).slice(0, 800_000)
  } catch { return '' } finally { clearTimeout(timer) }
}

// 头部残渣裁剪(#126,央行帖实证):不少原站把导航菜单/语言切换/订阅控件渲在 div 里(<nav> 剥不掉),
// 抽取后正文前顶着几十行 "Careers / English / Apply now »" 残渣——不光难看,还偷吃 advisor 2200 字符
// grounding 切片和 jdformat 6000 字符预算。只裁「头部区」= 首个 ≥100 字符段落行之前(封顶 40 行):
// 黑名单行直接丢;<30 字符且无数字的孤行(菜单链接文本)也丢,但紧跟「xxx:」标签行的保留(是字段值)。
// 正文区一行不动;裁没了一半以上视为误杀,整体回退不裁(宁脏勿缺)。
const HEAD_JUNK = /^(skip to|careers?$|language$|english$|fran[çc]ais$|my profile$|sign in|log ?in|register$|menu$|search$|home$|apply now|create alert|select how often|cookie|accept|privacy (policy|notice)$|back to)/i
function trimHeadJunk(lines: string[]): string[] {
  let bound = lines.findIndex((l) => l.length >= 100)
  bound = bound < 0 ? Math.min(lines.length, 40) : Math.min(bound, 40)
  const head: string[] = []
  for (let i = 0; i < bound; i++) {
    const l = lines[i]
    if (HEAD_JUNK.test(l)) continue
    const prevKept = head[head.length - 1] || ''
    if (l.length < 30 && !/\d/.test(l) && !/:$/.test(l) && !/:$/.test(prevKept)) continue
    head.push(l)
  }
  const out = [...head, ...lines.slice(bound)]
  return out.length * 2 < lines.length ? lines : out
}

// 通用正文抽取(readability 极简版,零依赖):剥非内容块 → 块级标签转行 → 剥标签 → 反转义 → 压行 → 裁头部残渣
function extractText(html: string): string {
  let t = html.replace(/(?:<(script|style|noscript|nav|header|footer|svg|form)[^>]*>[\s\S]*?<\/\1>)/gi, ' ')
  t = t.replace(/<br\s*\/?>|<\/p>|<\/div>|<\/li>|<\/h[1-6]>|<\/tr>/gi, '\n')
  t = t.replace(/<[^>]+>/g, ' ')
  t = t.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"')
  const lines = t.split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).filter((l) => l.length > 2)
  return trimHeadJunk(lines).join('\n').slice(0, MAX_LEN)
}

// JB 详情页自有正文(direct 帖):可见结构区起点切片抽取(JD 块主导,尾部 applynow 前截断)
function jbOwnText(html: string): string {
  const i = html.indexOf('job-posting-detail-requirements')
  if (i < 0) return ''
  const end = html.indexOf('id="applynow"', i)
  return extractText(html.slice(i, end > i ? end : i + 60_000))
}

// #140:href 取出来是 HTML 实体编码的(JB 页写作 `?lang=en&amp;ide_poste=540354`)——不解码就等于把
// 第二个参数起全丢了(实际请求成 `&amp;ide_poste=…`),带 query 的外链一律抓错页。
const jbExternalLink = (html: string): string =>
  (/id="externalJobLink"[^>]*href="([^"]+)"/.exec(html)?.[1] || '')
    .replace(/&amp;/g, '&').replace(/&#38;/g, '&').replace(/&quot;/g, '"')

// 原站 <title>(截「 - 站名」尾巴):JB 会把聚合帖标题标准化成职业名(实测 McCain「Engineering Manager…」
// 被 JB 改名「software developer」)——原帖岗名标注在正文首行,标题≠正文的差异自解释(显性化不掩盖)
const originTitle = (html: string): string => {
  const t = (/<title>([^<]{3,200})<\/title>/i.exec(html)?.[1] || '').replace(/&amp;/g, '&').replace(/&#39;/g, "'")
  // 各站 <title> 分段顺序不一(Jobillico 站名前置竖线分段/SuccessFactors 岗名前置连字符分段)——
  // 取最长的非通用段近似岗名,再剥「Job Details/Careers」类通用尾词;挑错也只是标注行,正文不受影响
  const segs = t.split(/\s*\|\s*|\s+[-–]\s+/).map((s) => s.trim())
    .filter((s) => s.length >= 4 && !/^(job postings?|jobs?|careers?|job details?|job opportunities|home)$/i.test(s) && !/\.(com|ca|net|org)$/i.test(s))
  const best = segs.sort((a, b) => b.length - a.length)[0] || ''
  return best.replace(/\s*(job details?|job postings?)\s*$/i, '').trim()
}

// #130(Frank 指认):正文首行常是原站 <title> 原文残留(「Senior Cloud Developer Job Details | Bank of Canada」)——
// 岗名已单独抽进标注行,这行纯重复,与 <title> 全等才剥(宁缺勿滥,不误伤正文)
function stripTitleLine(text: string, html: string): string {
  const raw = (/<title>([^<]{3,200})<\/title>/i.exec(html)?.[1] || '')
    .replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim()
  if (!raw) return text
  const nl = text.indexOf('\n')
  const firstLine = (nl < 0 ? text : text.slice(0, nl)).trim()
  return firstLine === raw ? text.slice(nl + 1) : text
}

async function doFetch(applyUrl: string): Promise<string> {
  const isJb = /jobbank\.gc\.ca/i.test(applyUrl)
  const first = await fetchHtml(applyUrl)
  if (!first) return ''
  if (!isJb) {
    const t = stripTitleLine(extractText(first), first)
    return t.length >= MIN_LEN ? t : ''
  }
  const own = jbOwnText(first)
  if (own.length >= MIN_LEN) return own
  const ext = jbExternalLink(first)
  if (!ext) return ''
  const originHtml = await fetchHtml(ext)
  const t = stripTitleLine(extractText(originHtml), originHtml)
  if (t.length < MIN_LEN) return ''
  const ot = originTitle(originHtml)
  return ot ? `Original posting title: ${ot}\n\n${t}`.slice(0, MAX_LEN) : t
}

/** 懒抓入口:抓到即写库(永久缓存);抓不到返 ''(前端空态照旧引导官方原帖)。 */
export async function lazyFetchJd(applyUrl: string, pool: any): Promise<string> {
  const neg = failed.get(applyUrl)
  if (neg && Date.now() - neg < NEG_TTL) return ''
  let p = inflight.get(applyUrl)
  if (!p) {
    p = (async () => {
      const text = await doFetch(applyUrl)
      if (text) {
        await pool.query('UPDATE jobs SET description = $1 WHERE apply_url = $2 AND description IS NULL', [text, applyUrl]).catch(() => {})
      } else {
        failed.set(applyUrl, Date.now())
        if (failed.size > 500) failed.clear()
      }
      return text
    })().finally(() => inflight.delete(applyUrl))
    inflight.set(applyUrl, p)
  }
  return p
}
