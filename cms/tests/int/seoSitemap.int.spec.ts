// 站点地图与 JobPosting 的收录口径、新鲜信号(2026-09-26 /fe SEO 批;Frank 勾「清死帖和薄页」「给 Google 新鲜信号」,
// 拍「先只包含有邮件能投的」)。钉住四件性质:
//   ① 片号只看自己的 id —— 关掉老岗,别的网址不挪片(原按位置切,关一个挪一串,各片天天整体换);
//   ② lastmod 没有真值就整个元素不出(不出空标签、不拿请求时刻顶),核心册全是这种;
//   ③ 索引片数固定、绝不 0 片,每片落款 = 片内最晚,核心册不给落款,新岗册的落款只看近 7 天那些;
//   ④ JobPosting 只在库判收录时出(布尔来自 SQL.SEO_JOB_OK,这里只验拿到布尔之后),并带本站岗号 identifier。
// 不连库:收录口径 SQL 本身的条数与耗时走生产只读实测(见 sql.ts 第 20 段注释)。
import { describe, expect, it } from 'vitest'

// 测试例外:纯函数直接点文件(桶只走门的规矩不管测试)
import {
  coreSitemapOf, coShardEntriesOf, indexXmlOf, jobsNewEntriesOf, jobShardEntriesOf, shardModsOf, shardOf, urlsetXmlOf,
} from '@/lib/seo/functions'
import { CO_SHARDS, JOB_SHARDS, SITE } from '@/lib/seo/constants'
import type { CoShardFact, JobShardFact, Sitemap } from '@/lib/seo/types'
import { jobPostingJsonOf, toJobRow } from '@/lib/jobs/functions'
import type { JobDbRow } from '@/lib/jobs/types'

const T0 = Date.UTC(2026, 8, 20)
const HOUR = 3_600_000
const SM = `${SITE}/api/sitemaps/`

function job(id: number, mod: number | null, fresh = false): JobShardFact {
  return { id, mod, fresh }
}

function co(id: number, slug: string, mod: number | null): CoShardFact {
  return { id, slug, mod }
}

function jobUrl(id: number): string {
  return `${SITE}/jobs/${id}`
}

function urlsOf(entries: Sitemap): string[] {
  return entries.map((e) => e.url)
}

/** urlset XML 里某个网址那一条 `<url>` 块。 */
function blockOf(xml: string, url: string): string {
  const hit = xml.split('<url>').find((b) => b.includes(`<loc>${url}</loc>`))
  if (hit == null) {
    throw new Error(`no <url> block for ${url}`)
  }
  return hit
}

/** 索引 XML → [分册网址, 落款或 null](按出现顺序)。 */
function indexPairs(xml: string): Array<[string, string | null]> {
  const out: Array<[string, string | null]> = []
  for (const m of xml.matchAll(/<sitemap><loc>([^<]+)<\/loc>(?:<lastmod>([^<]+)<\/lastmod>)?<\/sitemap>/g)) {
    out.push([m[1] ?? '', m[2] ?? null])
  }
  return out
}

/** 一批散开的岗号(不连续、跨多个片),mod 各不相同。 */
function spreadRows(n: number): JobShardFact[] {
  const out: JobShardFact[] = []
  for (let i = 0; i < n; i += 1) {
    out.push(job(1000 + i * 7 + (i % 3), T0 + i * HOUR))
  }
  return out
}

function shardMapOf(rows: JobShardFact[]): Map<string, number> {
  const m = new Map<string, number>()
  for (let s = 0; s < JOB_SHARDS; s += 1) {
    for (const url of urlsOf(jobShardEntriesOf({ rows, shard: s }))) {
      m.set(url, s)
    }
  }
  return m
}

describe('片号:只看自己的 id', () => {
  it('金标:id 对固定片数取模(职位 10 片、公司 8 片)', () => {
    expect(JOB_SHARDS).toBe(10)
    expect(CO_SHARDS).toBe(8)
    expect(shardOf({ id: 68811356, shards: JOB_SHARDS })).toBe(6)
    expect(shardOf({ id: 10, shards: JOB_SHARDS })).toBe(0)
    expect(shardOf({ id: 7, shards: CO_SHARDS })).toBe(7)
    expect(shardOf({ id: 16, shards: CO_SHARDS })).toBe(0)
  })

  it('全量划分:每个岗恰好落在一片,各片并起来就是全量', () => {
    const rows = spreadRows(300)
    const seen: string[] = []
    for (let s = 0; s < JOB_SHARDS; s += 1) {
      seen.push(...urlsOf(jobShardEntriesOf({ rows, shard: s })))
    }
    expect(seen.length).toBe(rows.length)
    expect(new Set(seen).size).toBe(rows.length)
    expect(new Set(seen)).toEqual(new Set(rows.map((r) => jobUrl(r.id))))
  })

  it('关掉老岗不挪片:删掉任意一批行,剩下每个网址所在的片一格不变', () => {
    const rows = spreadRows(300)
    const before = shardMapOf(rows)
    const kept = rows.filter((r, i) => i >= 50 && i % 3 !== 0)
    const after = shardMapOf(kept)
    expect(after.size).toBe(kept.length)
    for (const [url, s] of after) {
      expect(before.get(url)).toBe(s)
    }
  })

  it('越界片号给空册,片内保持清单原序(id 升序)', () => {
    const rows = [job(3, T0), job(13, T0), job(23, T0), job(4, T0)]
    expect(urlsOf(jobShardEntriesOf({ rows, shard: 3 }))).toEqual([jobUrl(3), jobUrl(13), jobUrl(23)])
    expect(jobShardEntriesOf({ rows, shard: JOB_SHARDS })).toEqual([])
  })

  it('公司按公司 id 对 8 取模,网址用 slug', () => {
    const rows = [co(8, 'acme', T0), co(9, 'bolt', T0), co(16, 'crane', null)]
    expect(urlsOf(coShardEntriesOf({ rows, shard: 0 }))).toEqual([`${SITE}/companies/acme`, `${SITE}/companies/crane`])
    expect(urlsOf(coShardEntriesOf({ rows, shard: 1 }))).toEqual([`${SITE}/companies/bolt`])
  })
})

describe('lastmod:没有真值整个元素不出', () => {
  it('条目没 lastModified → 这条没有 lastmod 元素;有 → ISO 真值', () => {
    const xml = urlsetXmlOf([
      { url: 'https://x.test/a', changeFrequency: 'weekly', priority: 0.5 },
      { url: 'https://x.test/b', lastModified: new Date(T0), changeFrequency: 'weekly', priority: 0.5 },
    ])
    expect(blockOf(xml, 'https://x.test/a')).not.toContain('<lastmod')
    expect(blockOf(xml, 'https://x.test/b')).toContain('<lastmod>2026-09-20T00:00:00.000Z</lastmod>')
    expect(xml).not.toContain('<lastmod></lastmod>')
  })

  it('职位片:mod 为 null 的岗不出 lastmod,有 mod 的出它自己的时刻', () => {
    const xml = urlsetXmlOf(jobShardEntriesOf({ rows: [job(5, null), job(15, T0 + HOUR)], shard: 5 }))
    expect(blockOf(xml, jobUrl(5))).not.toContain('<lastmod')
    expect(blockOf(xml, jobUrl(15))).toContain('<lastmod>2026-09-20T01:00:00.000Z</lastmod>')
  })

  it('核心册一条 lastmod 都没有(原先填请求时刻 = 假信号),且没有重复网址', () => {
    const core = coreSitemapOf()
    const xml = urlsetXmlOf(core)
    expect(xml).not.toContain('<lastmod')
    expect(core.every((e) => e.lastModified == null)).toBe(true)
    const locs = urlsOf(core)
    expect(new Set(locs).size).toBe(locs.length)
    expect(locs.filter((u) => u === `${SITE}/pte/ra`).length).toBe(1)
  })
})

describe('近 7 天新岗册', () => {
  it('只收 fresh 的岗,按 lastmod 倒序', () => {
    const rows = [job(1, T0, true), job(2, T0 + 5 * HOUR, false), job(3, T0 + 3 * HOUR, true), job(4, T0 + HOUR, true)]
    expect(urlsOf(jobsNewEntriesOf(rows))).toEqual([jobUrl(3), jobUrl(4), jobUrl(1)])
  })

  it('没有 lastmod 的 fresh 行排最后,且不出 lastmod 元素', () => {
    const rows = [job(1, null, true), job(2, T0, true)]
    const entries = jobsNewEntriesOf(rows)
    expect(urlsOf(entries)).toEqual([jobUrl(2), jobUrl(1)])
    expect(blockOf(urlsetXmlOf(entries), jobUrl(1))).not.toContain('<lastmod')
  })

  it('不动传进来的清单(那是缓存槽,排序只许在副本上做)', () => {
    const rows = [job(1, T0, true), job(2, T0 + HOUR, true), job(3, T0 + 2 * HOUR, true)]
    const ids = rows.map((r) => r.id)
    jobsNewEntriesOf(rows)
    expect(rows.map((r) => r.id)).toEqual(ids)
  })
})

describe('索引:片数固定,落款取片内最晚', () => {
  const allFiles = [
    'core.xml', 'jobs-new.xml',
    ...Array.from({ length: 10 }, (_, i) => `jobs-${i}.xml`),
    ...Array.from({ length: 8 }, (_, i) => `companies-${i}.xml`),
  ]

  it('清单是空表(库抖且没旧表)也照列满 20 张,一个落款都不给 —— 绝不 0 片', () => {
    const pairs = indexPairs(indexXmlOf({ jobs: [], companies: [] }))
    expect(pairs.map(([loc]) => loc)).toEqual(allFiles.map((f) => SM + f))
    expect(pairs.every(([, mod]) => mod == null)).toBe(true)
  })

  it('每片落款 = 片内最晚;空片与核心册不给;新岗册只看 fresh 的', () => {
    const jobs = [
      job(10, T0, true),
      job(20, T0 + 2 * HOUR, false),
      job(31, T0 + HOUR, true),
      job(41, T0 + 9 * HOUR, false),
      job(51, null, true),
    ]
    const companies = [co(8, 'acme', T0 + 4 * HOUR), co(16, 'bolt', T0 + 6 * HOUR), co(3, 'crane', null)]
    const mods = new Map(indexPairs(indexXmlOf({ jobs, companies })))
    expect(mods.get(SM + 'core.xml')).toBeNull()
    expect(mods.get(SM + 'jobs-new.xml')).toBe('2026-09-20T01:00:00.000Z')
    expect(mods.get(SM + 'jobs-0.xml')).toBe('2026-09-20T02:00:00.000Z')
    expect(mods.get(SM + 'jobs-1.xml')).toBe('2026-09-20T09:00:00.000Z')
    expect(mods.get(SM + 'jobs-2.xml')).toBeNull()
    expect(mods.get(SM + 'companies-0.xml')).toBe('2026-09-20T06:00:00.000Z')
    expect(mods.get(SM + 'companies-3.xml')).toBeNull()
    expect(mods.size).toBe(20)
  })

  it('shardModsOf 逐片一格、片号升序,空片 null', () => {
    const got = shardModsOf({ rows: [job(2, T0), job(12, T0 + HOUR), job(5, null)], shards: 4 })
    expect(got).toEqual([
      { n: 0, mod: T0 + HOUR },
      { n: 1, mod: null },
      { n: 2, mod: T0 },
      { n: 3, mod: null },
    ])
  })
})

describe('JobPosting:只在库判收录时出,并带本站岗号', () => {
  function jobRowOf(extra: Partial<JobDbRow>) {
    return toJobRow({
      row: {
        id: 4242, title: 'Line Cook', company_name: 'Acme Foods', city: 'Ottawa', province: 'ON', status: 'open',
        date_posted: '2026-09-20T00:00:00.000Z', ...extra,
      } as JobDbRow,
      matchLevel: null,
      pro: false,
    })
  }

  it('seoOk = false(没邮箱 / 薄页 / 重复帖…)整条不出', () => {
    expect(jobPostingJsonOf({ job: jobRowOf({}), jdText: 'x'.repeat(400), seoOk: false })).toBe('')
  })

  it('seoOk = true 才出,identifier = 站名 + 本站岗号', () => {
    const json = jobPostingJsonOf({ job: jobRowOf({}), jdText: 'x'.repeat(400), seoOk: true })
    const ld = JSON.parse(json)
    expect(ld['@type']).toBe('JobPosting')
    expect(ld.identifier).toEqual({ '@type': 'PropertyValue', name: 'offer2pr', value: '4242' })
    expect(ld.url.endsWith('/jobs/4242')).toBe(true)
  })

  it('过期判断照留:库说收录,但已下架或截止日已过的仍不出', () => {
    expect(jobPostingJsonOf({ job: jobRowOf({ status: 'closed' }), jdText: '', seoOk: true })).toBe('')
    expect(jobPostingJsonOf({ job: jobRowOf({ valid_through: '2020-01-01T00:00:00.000Z' }), jdText: '', seoOk: true })).toBe('')
  })

  it('正文里的 < 全部转义:闭合脚本标签拼不出来,JSON 解析回来仍是原文', () => {
    const evil = 'Pay < $50k. </script><script>alert(1)</script> ' + 'x'.repeat(400)
    const json = jobPostingJsonOf({ job: jobRowOf({}), jdText: evil, seoOk: true })
    expect(json.includes('<')).toBe(false)
    expect(json.toLowerCase().includes('</script')).toBe(false)
    expect(JSON.parse(json).description.startsWith('Pay < $50k. </script><script>alert(1)</script>')).toBe(true)
  })
})
