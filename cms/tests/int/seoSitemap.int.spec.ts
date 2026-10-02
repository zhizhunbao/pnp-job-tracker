// 站点地图与 JobPosting 的收录口径、新鲜信号(2026-09-26 /fe SEO 批;Frank 勾「清死帖和薄页」「给 Google 新鲜信号」,
// 拍「先只包含有邮件能投的」)。钉住三件性质:
//   ① 站点地图只有一张 jobs.xml(2026-10-02 Frank「合成一个不行吗」「叫 jobs.xml 不行么」),robots 只指它,
//      条目 = 收录口径全部职位页、清单原序、不重复(原取模分片 / 索引 / 新岗册 / 核心册的用例随之撤);
//   ② lastmod 没有真值就整个元素不出(不出空标签、不拿请求时刻顶);
//   ③ JobPosting 只在库判收录时出(布尔来自 SQL.SEO_JOB_OK,这里只验拿到布尔之后),并带本站岗号 identifier。
// 不连库:收录口径 SQL 本身的条数与耗时走生产只读实测(见 sql.ts 第 20 段注释)。
import { describe, expect, it } from 'vitest'

// 测试例外:纯函数直接点文件(桶只走门的规矩不管测试)
import { jobEntriesOf, robotsOf, urlsetXmlOf } from '@/lib/seo/functions'
import { SITE } from '@/lib/seo/constants'
import type { Sitemap, SitemapJobFact } from '@/lib/seo/types'
import { jobPostingJsonOf, toJobRow } from '@/lib/jobs/functions'
import type { JobDbRow } from '@/lib/jobs/types'

const T0 = Date.UTC(2026, 8, 20)
const HOUR = 3_600_000

function job(id: number, mod: number | null): SitemapJobFact {
  return { id, mod }
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

describe('jobs.xml:全站唯一一张', () => {
  it('robots 只声明 jobs.xml 一条', () => {
    expect(robotsOf().sitemap).toEqual([`${SITE}/api/sitemaps/jobs.xml`])
  })

  it('条目 = 清单全部岗、清单原序、不重复', () => {
    const rows = [job(3, T0), job(13, T0 + HOUR), job(4, null), job(68811356, T0)]
    const urls = urlsOf(jobEntriesOf(rows))
    expect(urls).toEqual([jobUrl(3), jobUrl(13), jobUrl(4), jobUrl(68811356)])
    expect(new Set(urls).size).toBe(urls.length)
    expect(jobEntriesOf([])).toEqual([])
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

  it('职位:mod 为 null 的岗不出 lastmod,有 mod 的出它自己的时刻', () => {
    const xml = urlsetXmlOf(jobEntriesOf([job(5, null), job(15, T0 + HOUR)]))
    expect(blockOf(xml, jobUrl(5))).not.toContain('<lastmod')
    expect(blockOf(xml, jobUrl(15))).toContain('<lastmod>2026-09-20T01:00:00.000Z</lastmod>')
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
