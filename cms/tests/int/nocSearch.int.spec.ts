// 职业搜索也搜官方示例职称(2026-10-05 访客第 3 题打「cloud」出「没有找到匹配职业」:官方名里没有这个词,
// StatCan NOC 2021 的 All examples 里有 —— 21231 cloud engineer / cloud architect / cloud administrator、21232 cloud developer)。
// 链路:/api/quiz?q= → quizRoute 原样转 searchNocByTitle({ db, q }) → SQL.NOC_BY_TITLE_LIKE → toNocHit → { candidates }。
// 这里钉住两件事,不连库(跑得起 SQL 的验证在本批交付时拿真数据跑过:一次性本地 postgres 灌 426 行,
// 「cloud」出 21222 / 21231 / 21232 / 20012 四行;「cook」名字命中的 63200 排第一、其余 11 行只命中示例):
// ① SQL 的形状:WHERE 三格同一个 $1(title / title_zh / examples);ORDER BY 第一键是「名字命中 = 0、只命中示例 = 1」,
//    第二键短名优先;上限 12;SELECT 不带 examples(候选报文不背上万字的示例清单)。
// ② 函数是纯透传:不在 TS 里重排、不截断;出参每行只有 NocHit 六格,库里多给的格(examples)不漏出去。
// 变异探针(交付时手跑过一遍):把 WHERE 里 `OR d.examples ILIKE $1` 删掉,第一组当场红;恢复后 sha256 与改前一致。
import { describe, expect, it } from 'vitest'

// 测试例外:域内函数直接点文件(桶只走门的规矩不管测试)
import { SQL } from '@/lib/db'
import type { Db, SqlParam } from '@/lib/db'
import { searchNocByTitle } from '@/lib/jobs/functions'

/** 假库收到的一次调用 */
type Call = { sql: string; params: SqlParam[] | undefined }

/** 假库:记下每次调用,原样交回给定的行(排序是 SQL 的事,假库不排) */
function fakeDb(rows: Record<string, string | null>[], calls: Call[]): Db {
  return {
    query: async (sql: string, params?: SqlParam[]) => {
      calls.push({ sql: sql, params: params })
      return { rows: rows, rowCount: rows.length }
    },
  }
}

/** 一条库行(列名照 SQL 的别名;examples 是库里多给的格,用来证明它不漏进候选) */
function dbRow(noc: string, title: string, examples: string | null): Record<string, string | null> {
  return {
    noc: noc, title: title, title_zh: '', title_zh_short: '', title_ko_short: '', title_en_short: '', examples: examples,
  }
}

/** SQL 压成一行(换行与连续空白折成一个空格),好按子句切 */
function flat(sql: string): string {
  return sql.replace(/\s+/g, ' ').trim()
}

/** 取两个关键字之间的那段子句 */
function between(sql: string, from: string, to: string): string {
  const s = flat(sql)
  const a = s.indexOf(from)
  const b = s.indexOf(to, a + from.length)
  expect(a).toBeGreaterThanOrEqual(0)
  expect(b).toBeGreaterThan(a)
  return s.slice(a + from.length, b).trim()
}

describe('① NOC_BY_TITLE_LIKE 的形状', () => {
  const sql = SQL.NOC_BY_TITLE_LIKE

  it('WHERE:官方名、中文名、示例职称三格各 ILIKE 同一个 $1,用 OR 串', () => {
    const where = between(sql, 'WHERE', 'ORDER BY')
    expect(where.split(' OR ')).toEqual(['d.title ILIKE $1', 'd.title_zh ILIKE $1', 'd.examples ILIKE $1'])
    expect(flat(sql)).not.toMatch(/\$[2-9]/)
  })

  it('ORDER BY:第一键 = 名字命中排前、只命中示例职称排后(示例职称不进第一键),第二键短名优先', () => {
    const order = between(sql, 'ORDER BY', 'LIMIT')
    const rank = order.match(/^CASE WHEN (.+?) THEN 0 ELSE 1 END, (.+)$/)
    expect(rank).not.toBeNull()
    if (rank == null || rank[1] == null || rank[2] == null) {
      throw new Error('ORDER BY 第一键不是 CASE 档位:' + order)
    }
    expect(rank[1].split(' OR ')).toEqual(['d.title ILIKE $1', 'd.title_zh ILIKE $1'])
    expect(rank[1]).not.toContain('examples')
    expect(rank[2].startsWith("length(COALESCE(d.title,''))")).toBe(true)
  })

  it('上限 12(原 8);SELECT 只出六格候选列,不带 examples', () => {
    expect(flat(sql).endsWith('LIMIT 12')).toBe(true)
    const select = between(sql, 'SELECT', 'FROM')
    expect(select).not.toContain('examples')
    const names = select.split(', ').map((col) => col.split(' ').pop())
    expect(names).toEqual(['d.noc', 'title', 'title_zh', 'title_zh_short', 'title_ko_short', 'title_en_short'])
  })
})

describe('② searchNocByTitle 原样透传', () => {
  it('检索词去空格后包成 %词%,只查一次,走 NOC_BY_TITLE_LIKE', async () => {
    const calls: Call[] = []
    await searchNocByTitle({ db: fakeDb([], calls), q: '  cloud ' })
    expect(calls).toEqual([{ sql: SQL.NOC_BY_TITLE_LIKE, params: ['%cloud%'] }])
  })

  it('不足 2 个字符(去空格后)不查库,回空清单', async () => {
    for (const q of ['', ' ', 'c', '  c  ']) {
      const calls: Call[] = []
      expect(await searchNocByTitle({ db: fakeDb([dbRow('21231', 'x', 'cloud engineer')], calls), q: q })).toEqual([])
      expect(calls).toEqual([])
    }
  })

  it('金标「cloud」:库按 SQL 排好的四行(交付时真数据跑出来的:四个都只命中示例职称,按官方名长短)原样出,每行只有六格', async () => {
    const rows = [
      dbRow('21222', 'Information systems specialists', 'cloud service management specialist'),
      dbRow('21231', 'Software engineers and designers', 'cloud administrator\ncloud architect\ncloud engineer'),
      dbRow('21232', 'Software developers and programmers', 'cloud developer'),
      dbRow('20012', 'Computer and information systems managers', 'cloud engineering manager'),
    ]
    const got = await searchNocByTitle({ db: fakeDb(rows, []), q: 'cloud' })
    expect(got.map((h) => h.noc)).toEqual(['21222', '21231', '21232', '20012'])
    expect(got[1]).toEqual({
      noc: '21231', title: 'Software engineers and designers', titleZh: '', titleZhShort: '', titleKoShort: '', titleEnShort: '',
    })
    for (const hit of got) {
      expect(Object.keys(hit).sort()).toEqual(['noc', 'title', 'titleEnShort', 'titleKoShort', 'titleZh', 'titleZhShort'])
    }
  })

  it('性质:0~12 行(倒序码)进,出参条数与顺序与库一致(TS 不截断不重排),空值折空串', async () => {
    for (let n = 0; n <= 12; n++) {
      const rows: Record<string, string | null>[] = []
      for (let k = 0; k < n; k++) {
        rows.push(dbRow(String(30099 - k), 'T' + String(k), null))
      }
      rows.push({ noc: '99999', title: null, title_zh: null, title_zh_short: null, title_ko_short: null, title_en_short: null })
      const got = await searchNocByTitle({ db: fakeDb(rows, []), q: 'cl' })
      expect(got.map((h) => h.noc)).toEqual(rows.map((r) => r.noc))
      expect(got[got.length - 1]).toEqual({
        noc: '99999', title: '', titleZh: '', titleZhShort: '', titleKoShort: '', titleEnShort: '',
      })
    }
  })
})
