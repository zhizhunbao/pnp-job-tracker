// 专业表取数口 /api/majors 与访客四题第 3 题 /api/quiz?major=(2026-10-04 Frank「改」:第 2 题选专业,第 3 题按专业对应的大类列在招最多的职业)。
// 性质:① 搜索三语(英 / 中 / 韩名包含匹配、不分大小写)、开头命中排前面、同档按表序、最多 20 条、空词空结果;
//       ② 热门按名次排(表序打乱、名次有缺口照样排对),不在热门的不出;
//       ③ 表还没建(DDL 没跑,42P01)→ 三条分支都回空、不 500,且空表不进缓存(建表后下一个请求就看得到);
//       ④ 第 3 题:专业 → 大类取自表里的 broads(数据层推好的),SQL 用 broad = ANY 把整组大类一次传下去;查无此专业不打职业查询;
//          空结果不缓存、非空结果 10 分钟内不重查;?n= 缺席 / 非法给 24、上限 60。
// 探针:matchRankOf 去掉开头档 → ①「开头排前面」红;topMajorsOf 改成按表序 → ②红;getMajors 把空表也存进缓存 → ③第二条红;
//       getMajorNocsCached 去掉 broads 空判 → ④「不打职业查询」红;去掉 rows.length 判 → ④「空结果不缓存」红。
// 2026-10-04 收口:① 改四档 —— 三语名(转小写、删掉全部空白后)完全相等 > 热门(按名次)> 开头 > 包含,档内按表序;
//       检索词与名字都删掉全部空白再比(韩文分写随意);先排档再截前 20 条。
//       探针:nameRankOf 去掉完全相等档 → 「完全相等排最前」红;matchRankOf 见开头就返回 → 「后面语言完全相等」红;
//       热门行不进热门桶 → 「热门压开头」红;热门桶按表序不按名次 → 「热门按名次」红;searchKeyOf 不删空白 → 「不分空白」红;
//       先截 20 条再排档 → 「截断前先排档」红。
// 2026-10-04 八档改判(Frank 截图:搜「AI」出来供应链 / 烹饪与厨师 / 护理助理,人工智能没出来):英文按词比 ——
//       完全相等 > 缩写相等 > 热门整词命中 > 名字开头 > 某词开头 > 去词尾后开头 > 中间含(4 个字母起)> 缩写开头;
//       两个字母的检索词不认「某词开头」也不升热门;每档里不计学分课与住院医师培训沉底。
//       探针:去掉缩写档 → 「AI 找人工智能」红;中间含不设最短 → 「两个字母不碰词中间」红;热门中间含也升 → 「中间含的热门不升」红;
//       去掉去词尾档 → 「accountant 找 Accounting」红;不沉底 → 「不计学分沉底」红。
// 2026-10-05 专业题照掌上高考做(Frank「可以,做吧」):⑤ 搜索也比英文显示名 titleEnShort(八档照旧);
//       ⑥ 大类清单按 catOrder 逐格摆(表序打乱、序号有缺口、同键只取头一次);
//       ⑦ 一个大类的树:折叠专业类按 groupOrder、类里按 order;只装一个专业的类进 singles(按 groupOrder、order);
//          一个专业挂两个大类两边都出;出去的专业是对外行(带 titleEnShort,不带挂点);
//       ⑧ /api/majors?cats=1 / ?cat=:不认识的键空树 200、不合形的键空树 200 且不进库;places 是 NULL(灌库前)/
//          不成样子的行不进树;?cats / ?cat / ?top 共用整表那一格缓存,树随整表建一次(同一对象),只查一次库。
//       探针:matchRankOf 去掉 titleEnShort → ⑤「只有显示名命中」红;categoriesOf 改按表序 → ⑥红;
//       majorTreeOf 不分 single → ⑦「singles」红;getMajorTree 去掉 CAT_KEY_RE 判 → ⑧「不进库」红;
//       每请求现建树 → ⑧「同一对象」红;toPlace 不验排序数 → ⑧「不成样子的行」红。
// 2026-10-05 复审补(toPlace 好几条验格没有用例踩到;落空不留痕):⑧ 加五行各坏一格 —— 韩文大类名 null / single 写成串 /
//       排序数 1000 超上限 / 专业类键空串 / 韩文专业类名 null;⑨ places 不成样子的整格落空时留一行 [majors] 带 class 码,
//       每行一条;NULL(灌库前)与空数组不留痕。
//       探针:删大类名验型 → ⑧ 99.0007 进树红;删专业类名验型 → ⑧ 99.0011 红;删 single 验型 → ⑧ 99.0008 红;
//       isPlaceOrder 去上限 → ⑧ 99.0009 红;去 group 空串判 → ⑧ 99.0010 红;toPlaces 去留痕 → ⑨红;NULL 也留痕 → ⑨红。
// 2026-10-05 访客第 2 题改多选:⑩ /api/quiz?major= 收逗号连的至多 3 个码 —— majorCodesOf 逐个验 CIP class 码形、去重、夹到 3 个;
//       大类取几个码的并集(逐码问注入的 broadsOf,去重),一次传给职业查询;缓存键与码的先后无关;参数在但一个都不合形回空清单。
//       探针:majorCodesOf 去掉去重 → ⑩「去重」红;majorBroadsOf 只问第一个码 → ⑩「并集」红。
import fc from 'fast-check'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { majorOf, searchMajorsOf, topMajorsOf } from '@/lib/majors'
import { SEARCH_LIMIT } from '@/lib/majors/constants'
// 测试例外:域内函数直接点文件(桶只走门的规矩不管测试)
import { categoriesOf, majorTreeOf } from '@/lib/majors/functions'
import type { MajorRow } from '@/lib/majors'
import type { MajorFact, MajorPlace } from '@/lib/majors/types'
import type { QueryResult, SqlParam } from '@/lib/db'

const h = vi.hoisted(() => {
  const state: { missing: boolean, majors: Record<string, unknown>[], nocs: Record<string, unknown>[] } = {
    missing: false, majors: [], nocs: [],
  }
  const query = vi.fn(async (sql: string, _params?: SqlParam[]): Promise<QueryResult> => {
    if (sql.includes('FROM cip_programs')) {
      if (state.missing) {
        throw Object.assign(new Error('relation "cip_programs" does not exist'), { code: '42P01' })
      }
      return { rows: state.majors, rowCount: state.majors.length }
    }
    return { rows: state.nocs, rowCount: state.nocs.length }
  })
  return { state, query }
})

vi.mock('payload', () => ({ getPayload: async () => ({}) }))
vi.mock('@/payload.config', () => ({ default: Promise.resolve({}) }))
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }), headers: async () => new Headers() }))
vi.mock('@/lib/db/server', () => ({ getDb: async () => ({ query: h.query }) }))

/**
 * 测试用专业行(只填被测格,其余照形补齐)。
 */
function major(
  code: string, en: string, zh: string | null, ko: string | null, popular: number | null, short = '',
): MajorRow {
  return {
    code, titleEn: en, titleZh: zh, titleKo: ko, titleEnShort: short, series: code.slice(0, 2), grouping: '05', broads: [],
    popular,
  }
}

/**
 * 测试用挂点(名字按键机械拼,只看排序与归拢)。
 */
function place(cat: string, catOrder: number, group: string, groupOrder: number, order: number, single = false): MajorPlace {
  return {
    cat, catOrder, catEn: cat + ' en', catZh: cat + ' 中', catKo: cat + ' 한', group, groupEn: group + ' en',
    groupZh: group + ' 类', groupKo: group + ' 류', groupOrder, order, single,
  }
}

/**
 * 测试用洗净行(对外行 + 挂点)。
 */
function fact(code: string, short: string, places: MajorPlace[]): MajorFact {
  return { row: major(code, short + ' (official)', null, null, null, short), places }
}

/**
 * 库里带挂点的一行(places 是 jsonb:pg 给解析好的数组,也可能是 JSON 串 / NULL / 不成样子)。
 */
function placedRow(code: string, en: string, short: string | null, places: object[] | string | null) {
  return {
    code, title_en: en, title_zh: null, title_ko: null, series: code.slice(0, 2), grouping: '05', broads: [], popular: null,
    title_en_short: short, places,
  }
}

/**
 * 库里的一行(cip_programs 列名;popular 是 numeric,pg 给字符串;broads 有时是 JSON 串)。
 */
function dbRow(code: string, en: string, broads: string[] | string, popular: string | null) {
  return { code, title_en: en, title_zh: null, title_ko: null, series: code.slice(0, 2), grouping: '05', broads, popular }
}

/**
 * 每个用例拿一份全新的模块(两个域的进程内缓存都是模块级的,不重载就会串用例)。
 */
async function fresh() {
  vi.resetModules()
  const majors = await import('@/lib/majors/server')
  const quiz = await import('@/lib/quiz/server')
  return { majors, quiz }
}

const ROWS: MajorRow[] = [
  major('30.1601', 'Accounting and computer science', '会计与计算机科学', '회계 및 컴퓨터 과학', null),
  major('11.0701', 'Computer science', '计算机科学', '컴퓨터 과학', 9),
  major('52.0301', 'Accounting', '会计', '회계학', 2),
  major('52.0302', 'Accounting technology/technician and bookkeeping', null, null, null),
]

describe('专业搜索(英 / 中 / 韩)', () => {
  it('英文不分大小写;完全相等排最前,其后名字开头命中的排前面,同档按表序', () => {
    expect(searchMajorsOf({ rows: ROWS, q: 'COMPUTER' }).map((r) => r.code)).toEqual(['11.0701', '30.1601'])
    expect(searchMajorsOf({ rows: ROWS, q: 'accounting' }).map((r) => r.code)).toEqual(['52.0301', '30.1601', '52.0302'])
  })

  it('中文:「计算机」开头的计算机科学排在「会计与计算机科学」前面;「会计」完全相等排最前', () => {
    expect(searchMajorsOf({ rows: ROWS, q: '计算机' }).map((r) => r.code)).toEqual(['11.0701', '30.1601'])
    expect(searchMajorsOf({ rows: ROWS, q: '会计' }).map((r) => r.code)).toEqual(['52.0301', '30.1601'])
  })

  it('韩文同理;没译成的行(中韩名 null)照样能按英文名搜到、不报错', () => {
    expect(searchMajorsOf({ rows: ROWS, q: '컴퓨터' }).map((r) => r.code)).toEqual(['11.0701', '30.1601'])
    expect(searchMajorsOf({ rows: ROWS, q: 'bookkeeping' }).map((r) => r.code)).toEqual(['52.0302'])
  })

  it('空词 / 全空白给空结果;最多 20 条', () => {
    expect(searchMajorsOf({ rows: ROWS, q: '   ' })).toEqual([])
    const many: MajorRow[] = []
    for (let i = 0; i < 30; i++) {
      many.push(major('52.' + String(1000 + i), 'Business ' + String(i), null, null, null))
    }
    expect(searchMajorsOf({ rows: many, q: 'business' })).toHaveLength(20)
  })

  it('按码取一条;查无此码 null', () => {
    expect(majorOf({ rows: ROWS, code: '52.0301' })?.titleZh).toBe('会计')
    expect(majorOf({ rows: ROWS, code: '99.9999' })).toBeNull()
  })
})

/**
 * 四档用例表(都对检索词 data):完全相等 / 热门(名次 1 开头、名次 3 包含,名次序与表序相反)/ 开头 / 包含 / 不相干。
 */
const TIERS: MajorRow[] = [
  major('10.0001', 'Data entry clerk', null, null, null),
  major('10.0002', 'Big data systems', null, null, null),
  major('10.0003', 'Data', null, null, null),
  major('10.0004', 'Applied data analytics', null, null, 3),
  major('10.0005', 'Data science', null, null, 1),
  major('10.0006', 'Nursing', null, null, null),
]

/**
 * 搜一次,只要码。
 */
function codesOf(rows: MajorRow[], q: string): string[] {
  return searchMajorsOf({ rows, q }).map((r) => r.code)
}

describe('专业搜索四档与去空白(2026-10-04 收口)', () => {
  it('完全相等 > 开头 > 包含(都不是热门时);不相干的不出', () => {
    const codes = codesOf(TIERS, 'data')
    expect(codes[0]).toBe('10.0003')
    expect(codes.indexOf('10.0001')).toBeLessThan(codes.indexOf('10.0002'))
    expect(codes).not.toContain('10.0006')
  })

  it('热门压开头:热门行只要整词命中(某个词开头),也排在非热门的开头命中前面;热门之间按名次不按表序', () => {
    const codes = codesOf(TIERS, 'data')
    for (const hot of ['10.0004', '10.0005']) {
      expect(codes.indexOf(hot)).toBeGreaterThan(codes.indexOf('10.0003'))
      expect(codes.indexOf(hot)).toBeLessThan(codes.indexOf('10.0001'))
    }
    expect(codes.indexOf('10.0005')).toBeLessThan(codes.indexOf('10.0004'))
  })

  it('后面语言完全相等也算完全相等(英文名只是开头命中,中文名正好等于检索词)', () => {
    const rows = [
      major('52.0201', 'MBA studies', null, null, null),
      major('52.0299', 'MBA and executive programs', 'MBA', null, null),
    ]
    expect(codesOf(rows, 'mba')[0]).toBe('52.0299')
  })

  it('不分空白:分写 / 连写 / 全角空格 / 首尾空白都搜到同一条;全空白给空结果', () => {
    const rows = [
      major('11.0701', 'Computer science', '计算机科学', '컴퓨터과학', 9),
      major('14.1901', 'Mechanical engineering', '机械工程', '기계 공학', null),
      major('52.0901', 'Hospitality administration/management, general', '酒店管理', '호텔경영학', 4),
      major('30.0801', 'Mathematics and computer science', '数学与计算机科学', '수학 및 컴퓨터 과학', null),
    ]
    for (const q of ['컴퓨터 과학', '컴퓨터과학', ' 컴퓨터  과학 ', '컴퓨터\u3000과학', 'computerscience']) {
      expect(codesOf(rows, q)[0]).toBe('11.0701')
    }
    for (const q of ['기계공학', '기계 공학']) {
      expect(codesOf(rows, q)[0]).toBe('14.1901')
    }
    expect(codesOf(rows, '호텔 경영')).toEqual(['52.0901'])
    expect(codesOf(rows, ' \t\n\u3000')).toEqual([])
  })

  it('截断前先排档:命中再多也不超过上限,完全相等与热门落在表尾也不会被挤出', () => {
    const many: MajorRow[] = []
    for (let i = 0; i < 30; i++) {
      many.push(major('52.' + String(1000 + i), 'Business ' + String(i), null, null, null))
    }
    many.push(major('52.9998', 'International business', null, null, 1))
    many.push(major('52.9999', 'Business', null, null, null))
    for (const q of ['business', 'BUSINESS ', 'bus', 'b', 'e']) {
      expect(codesOf(many, q).length).toBeLessThanOrEqual(SEARCH_LIMIT)
    }
    const codes = codesOf(many, 'business')
    expect(codes).toHaveLength(SEARCH_LIMIT)
    expect(codes.slice(0, 2)).toEqual(['52.9999', '52.9998'])
  })
})

/**
 * 八档用例表(Frank 截图那一屏的真名:AI 搜到的噪音行都是热门)。
 */
const EIGHT: MajorRow[] = [
  major('52.0203', 'Logistics, materials, and supply chain management', '供应链与物流管理', null, 3),
  major('12.0503', 'Culinary arts/chef training', '烹饪与厨师', null, 5),
  major('51.3902', 'Nursing assistant/aide and patient care assistant/aide', '护理助理', null, 15),
  major('11.0102', 'Artificial intelligence', '人工智能', null, null),
  major('47.0608', 'Aircraft powerplant technology/technician', null, null, null),
  major('36.0202', 'Aircraft pilot (private) (not for credit)', null, null, null),
  major('01.0505', 'Dairy husbandry and production', null, null, null),
  major('13.1210', 'Early childhood education and teaching', '幼儿教育', null, 7),
  major('14.4701', 'Electrical and computer engineering', null, null, null),
  major('52.0301', 'Accounting', '会计', null, 2),
  major('46.0302', 'Electrician', '电工', null, null),
  major('14.1001', 'Electrical and electronics engineering', null, null, null),
  major('52.0801', 'Finance, general', '金融', null, null),
  major('30.2101', 'Holocaust and related studies', null, null, null),
  major('52.1001', 'Human resources management/personnel administration, general', '人力资源管理', null, null),
]

describe('专业搜索八档(2026-10-04 Frank 截图:搜 AI)', () => {
  it('AI 找人工智能排第一;两个字母不碰词中间(chain / training / dairy),也不碰「aide」这种词首', () => {
    const codes = codesOf(EIGHT, 'AI')
    expect(codes[0]).toBe('11.0102')
    for (const noise of ['52.0203', '12.0503', '51.3902', '01.0505']) {
      expect(codes).not.toContain(noise)
    }
    expect(codes).toContain('47.0608')
  })

  it('缩写:ECE 两条都是缩写相等,热门(幼教)在前;HR 不先出 Holocaust and related studies', () => {
    expect(codesOf(EIGHT, 'ECE').slice(0, 2)).toEqual(['13.1210', '14.4701'])
    const hr = codesOf(EIGHT, 'hr')
    expect(hr[0]).toBe('52.1001')
    expect(hr).not.toContain('30.2101')
  })

  it('去词尾:accountant 找到 Accounting,electrician 完全相等排在 Electrical… 前面', () => {
    expect(codesOf(EIGHT, 'accountant')).toEqual(['52.0301'])
    const el = codesOf(EIGHT, 'electrician')
    expect(el[0]).toBe('46.0302')
    expect(el).toContain('14.1001')
  })

  it('中间含的热门不升:4 个字母起才认中间含,且排在非热门的开头命中后面', () => {
    const rows = [
      major('10.1000', 'Metadata studies', null, null, 1),
      major('10.1001', 'Data entry', null, null, null),
    ]
    expect(codesOf(rows, 'data')).toEqual(['10.1001', '10.1000'])
    expect(codesOf(rows, 'ata')).toEqual([])
  })

  it('不计学分沉底:同一档里不计学分课排在普通专业后面,但照样出', () => {
    const codes = codesOf(EIGHT, 'aircraft')
    expect(codes).toEqual(['47.0608', '36.0202'])
  })

  it('中文照旧删空白比;中文检索词不拿英文名比(「AI」写在中文名里也能按英文那一路搜到)', () => {
    expect(codesOf(EIGHT, '人工智能')).toEqual(['11.0102'])
    expect(codesOf(EIGHT, '会计')[0]).toBe('52.0301')
    const rows = [major('11.0199', 'Machine learning', 'AI 与机器学习', null, null)]
    expect(codesOf(rows, 'ai')).toEqual(['11.0199'])
  })

  it('只有标点的检索词给空结果;连写「computerscience」照样认 Computer science', () => {
    expect(codesOf(EIGHT, '/ - ,')).toEqual([])
    expect(codesOf([major('11.0701', 'Computer science', null, null, 9)], 'computerscience')).toEqual(['11.0701'])
  })
})

describe('专业搜索比英文显示名(2026-10-05)', () => {
  it('只有显示名命中也搜得到;显示名完全相等排在官方长名开头命中的前面', () => {
    expect(codesOf([major('99.0001', 'Zzz official title', null, null, null, 'Friendly name')], 'friendly'))
      .toEqual(['99.0001'])
    const rows = [
      major('52.0299', 'Business administration of things', null, null, null),
      major('52.0201', 'Business administration and management, general', null, null, null, 'Business administration'),
    ]
    expect(codesOf(rows, 'business administration')).toEqual(['52.0201', '52.0299'])
  })

  it('显示名空串不命中任何档;中文检索词不拿显示名比', () => {
    expect(codesOf([major('99.0002', 'Zzz', null, null, null, '')], 'a b')).toEqual([])
    expect(codesOf([major('99.0003', 'Zzz', null, null, null, '会计')], '会计')).toEqual([])
  })
})

/**
 * 树的用例表(表序故意打乱;fin 里两个折叠类、两个单列类;52.0203 挂 biz 与 logi 两处;32.0101 不进选择器)。
 */
const PLACED: MajorFact[] = [
  fact('52.0302', 'Bookkeeping', [place('fin', 2, '52.03', 1, 2)]),
  fact('52.1304', 'Actuarial science', [place('fin', 2, 'fin.act', 4, 1, true)]),
  fact('52.0899', 'Other finance', [place('fin', 2, '52.08', 2, 3)]),
  fact('52.0301', 'Accounting', [place('fin', 2, '52.03', 1, 1)]),
  fact('52.0203', 'Supply chain management', [place('biz', 1, '52.02', 1, 1), place('logi', 9, 'logi.mgmt', 1, 1)]),
  fact('27.0305', 'Financial mathematics', [place('fin', 2, '27.03', 3, 1, true)]),
  fact('52.0801', 'Finance', [place('fin', 2, '52.08', 2, 1)]),
  fact('32.0101', 'Basic skills', []),
  fact('52.0803', 'Banking', [place('fin', 2, '52.08', 2, 2)]),
]

describe('选择器的大类清单与树(2026-10-05 专业题照掌上高考做)', () => {
  it('大类按 catOrder 逐格摆(表序打乱、序号有缺口照样排对),同键只出一次,名字取头一次见到的', () => {
    const cats = categoriesOf(PLACED)
    expect(cats.map((c) => c.key)).toEqual(['biz', 'fin', 'logi'])
    expect(cats[1]).toEqual({ key: 'fin', titleEn: 'fin en', titleZh: 'fin 中', titleKo: 'fin 한' })
    expect(categoriesOf([])).toEqual([])
  })

  it('折叠类按 groupOrder、类里按 order;只装一个专业的类进 singles(按 groupOrder),不在 groups 里', () => {
    const tree = majorTreeOf({ facts: PLACED, cat: 'fin' })
    expect(tree.groups.map((g) => g.key)).toEqual(['52.03', '52.08'])
    expect(tree.groups[0]).toMatchObject({ key: '52.03', titleEn: '52.03 en', titleZh: '52.03 类', titleKo: '52.03 류' })
    expect(tree.groups.map((g) => g.majors.map((r) => r.code))).toEqual([
      ['52.0301', '52.0302'], ['52.0801', '52.0803', '52.0899'],
    ])
    expect(tree.singles.map((r) => r.code)).toEqual(['27.0305', '52.1304'])
  })

  it('出去的专业是对外行:带 titleEnShort,不带挂点与排序数', () => {
    const tree = majorTreeOf({ facts: PLACED, cat: 'fin' })
    expect(tree.groups[0]?.majors[0]?.titleEnShort).toBe('Accounting')
    const text = JSON.stringify(tree)
    for (const leak of ['places', 'catOrder', 'groupOrder', '"single"']) {
      expect(text).not.toContain(leak)
    }
  })

  it('一个专业挂两个大类两边都出;不认识的键是空树;不进选择器的专业哪都不出', () => {
    expect(majorTreeOf({ facts: PLACED, cat: 'biz' }).groups.map((g) => g.majors.map((r) => r.code))).toEqual([['52.0203']])
    expect(majorTreeOf({ facts: PLACED, cat: 'logi' }).groups.map((g) => g.key)).toEqual(['logi.mgmt'])
    expect(majorTreeOf({ facts: PLACED, cat: 'zzz' })).toEqual({ groups: [], singles: [] })
    const all = JSON.stringify(['biz', 'fin', 'logi'].map((cat) => majorTreeOf({ facts: PLACED, cat })))
    expect(all).not.toContain('32.0101')
  })
})

describe('/api/majors?cats=1 / ?cat=(2026-10-05)', () => {
  beforeEach(() => {
    h.query.mockClear()
    h.state.missing = false
    h.state.majors = [
      placedRow('11.0701', 'Computer science', null, null),
      placedRow('27.0305', 'Financial mathematics', 'Financial mathematics', [place('fin', 2, '27.03', 2, 1, true)]),
      placedRow('32.0101', 'Basic skills, general (not for credit)', '', []),
      placedRow('52.0203', 'Logistics, materials, and supply chain management', 'Supply chain management',
        JSON.stringify([place('biz', 1, '52.02', 1, 1), place('logi', 3, 'logi.mgmt', 1, 1, true)])),
      placedRow('52.0301', 'Accounting', 'Accounting', [place('fin', 2, '52.03', 1, 1)]),
      placedRow('52.0302', 'Accounting technology/technician and bookkeeping', 'Bookkeeping', [place('fin', 2, '52.03', 1, 2)]),
      placedRow('99.0001', 'Missing fields', '', [{ cat: 'fin', catOrder: 2 }]),
      placedRow('99.0002', 'Broken json', '', 'not json'),
      placedRow('99.0003', 'Bad cat key', '', [place('FIN', 2, '52.03', 1, 3)]),
      placedRow('99.0004', 'Order out of range', '', [place('fin', 2, '52.03', 1, 0)]),
      placedRow('99.0005', 'Half good', '', [place('fin', 2, '52.03', 1, 4), place('sci', 4, '40.05', 1, 1.5)]),
      placedRow('99.0006', 'Not an array', '', JSON.stringify({ cat: 'fin' })),
      placedRow('99.0007', 'Korean category name null', '', [{
        cat: 'fin', catOrder: 2, catEn: 'fin en', catZh: 'fin 中', catKo: null, group: '52.03', groupEn: '52.03 en',
        groupZh: '52.03 类', groupKo: '52.03 류', groupOrder: 1, order: 5, single: false,
      }]),
      placedRow('99.0008', 'Single as string', '', [{
        cat: 'fin', catOrder: 2, catEn: 'fin en', catZh: 'fin 中', catKo: 'fin 한', group: '52.03', groupEn: '52.03 en',
        groupZh: '52.03 类', groupKo: '52.03 류', groupOrder: 1, order: 6, single: 'false',
      }]),
      placedRow('99.0009', 'Order over the cap', '', [{
        cat: 'fin', catOrder: 2, catEn: 'fin en', catZh: 'fin 中', catKo: 'fin 한', group: '52.03', groupEn: '52.03 en',
        groupZh: '52.03 类', groupKo: '52.03 류', groupOrder: 1, order: 1000, single: false,
      }]),
      placedRow('99.0010', 'Empty group key', '', [{
        cat: 'fin', catOrder: 2, catEn: 'fin en', catZh: 'fin 中', catKo: 'fin 한', group: '', groupEn: '52.03 en',
        groupZh: '52.03 类', groupKo: '52.03 류', groupOrder: 1, order: 7, single: false,
      }]),
      placedRow('99.0011', 'Korean group name null', '', [{
        cat: 'fin', catOrder: 2, catEn: 'fin en', catZh: 'fin 中', catKo: 'fin 한', group: '52.03', groupEn: '52.03 en',
        groupZh: '52.03 类', groupKo: null, groupOrder: 1, order: 8, single: false,
      }]),
    ]
  })

  it('?cats=1:catOrder 序;不成样子的挂点不造出大类', async () => {
    const { majors } = await fresh()
    const res = await majors.majorsRoute(new Request('https://offer2pr.com/api/majors?cats=1'))
    expect(res.status).toBe(200)
    const body = await res.json() as { cats: { key: string }[] }
    expect(body.cats.map((c) => c.key)).toEqual(['biz', 'fin', 'logi'])
    expect(body.cats[0]).toEqual({ key: 'biz', titleEn: 'biz en', titleZh: 'biz 中', titleKo: 'biz 한' })
  })

  it('?cat=fin:折叠类 + 单列;不成样子 / 半截好的行整行不进树;不带挂点', async () => {
    const { majors } = await fresh()
    const res = await majors.majorsRoute(new Request('https://offer2pr.com/api/majors?cat=fin'))
    const text = await res.text()
    const body = JSON.parse(text) as { groups: { key: string, majors: MajorRow[] }[], singles: MajorRow[] }
    expect(body.groups.map((g) => g.key)).toEqual(['52.03'])
    expect(body.groups[0]?.majors.map((r) => [r.code, r.titleEnShort])).toEqual([
      ['52.0301', 'Accounting'], ['52.0302', 'Bookkeeping'],
    ])
    expect(body.singles.map((r) => r.code)).toEqual(['27.0305'])
    expect(text).not.toContain('places')
    expect(text).not.toContain('99.00')
  })

  it('不成样子的 places 整格落空时留痕:一行一条、带 class 码;NULL(灌库前)与空数组不留痕', async () => {
    const logs = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    const { majors } = await fresh()
    await majors.majorsRoute(new Request('https://offer2pr.com/api/majors?cats=1'))
    const lines = logs.mock.calls.map((c) => String(c[0])).filter((l) => l.startsWith('[majors] '))
    logs.mockRestore()
    const bad = ['99.0001', '99.0002', '99.0003', '99.0004', '99.0005', '99.0006', '99.0007', '99.0008', '99.0009',
      '99.0010', '99.0011']
    expect(lines).toHaveLength(bad.length)
    for (const code of bad) {
      expect(lines.filter((l) => l.endsWith(code))).toHaveLength(1)
    }
    for (const code of ['11.0701', '27.0305', '32.0101', '52.0203', '52.0301', '52.0302']) {
      expect(lines.join('\n')).not.toContain(code)
    }
  })

  it('?cat=logi:JSON 串的 places 照样解析;只装一个专业的类进 singles', async () => {
    const { majors } = await fresh()
    const res = await majors.majorsRoute(new Request('https://offer2pr.com/api/majors?cat=logi'))
    expect(await res.json()).toMatchObject({ groups: [], singles: [{ code: '52.0203', titleEnShort: 'Supply chain management' }] })
  })

  it('不认识的键:空树 200', async () => {
    const { majors } = await fresh()
    const res = await majors.majorsRoute(new Request('https://offer2pr.com/api/majors?cat=zzz'))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ groups: [], singles: [] })
  })

  it('不合形的键:空树 200,不进库(不截断成真键)', async () => {
    const { majors } = await fresh()
    for (const key of ['FIN', 'f', 'fin1', 'fin%20x', 'healthxyz', 'fin.x', '%E4%BC%9A']) {
      const res = await majors.majorsRoute(new Request('https://offer2pr.com/api/majors?cat=' + key))
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ groups: [], singles: [] })
    }
    expect(h.query).not.toHaveBeenCalled()
  })

  it('?cat= / ?cats= 空值算没带:五个都没有 400、不进库', async () => {
    const { majors } = await fresh()
    const res = await majors.majorsRoute(new Request('https://offer2pr.com/api/majors?cat=&cats=%20'))
    expect(res.status).toBe(400)
    expect(h.query).not.toHaveBeenCalled()
  })

  it('优先级 code → q → cat → cats → top', async () => {
    const { majors } = await fresh()
    const get = async (qs: string) => await (await majors.majorsRoute(new Request('https://offer2pr.com/api/majors?' + qs))).json()
    expect(await get('code=52.0301&cat=fin')).toHaveProperty('major')
    expect(await get('q=accounting&cat=fin')).toHaveProperty('majors')
    expect(await get('cat=fin&cats=1&top=1')).toHaveProperty('groups')
    expect(await get('cats=1&top=1')).toHaveProperty('cats')
    expect(await get('top=1')).toHaveProperty('majors')
  })

  it('places 全是 NULL(灌库前)/ 表没建:大类空、树空,200 不崩', async () => {
    h.state.majors = [placedRow('52.0301', 'Accounting', null, null)]
    const { majors } = await fresh()
    expect(await (await majors.majorsRoute(new Request('https://offer2pr.com/api/majors?cats=1'))).json()).toEqual({ cats: [] })
    expect(await (await majors.majorsRoute(new Request('https://offer2pr.com/api/majors?cat=fin'))).json())
      .toEqual({ groups: [], singles: [] })
    h.state.missing = true
    const { majors: m2 } = await fresh()
    const res = await m2.majorsRoute(new Request('https://offer2pr.com/api/majors?cats=1'))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ cats: [] })
  })

  it('?cats / ?cat / ?top 共用整表那一格:只查一次库,树随整表建一次(两次取到同一个对象)', async () => {
    const { majors } = await fresh()
    const fns = await import('@/lib/majors/functions')
    const db = { query: h.query }
    await majors.majorsRoute(new Request('https://offer2pr.com/api/majors?cats=1'))
    await majors.majorsRoute(new Request('https://offer2pr.com/api/majors?cat=fin'))
    await majors.majorsRoute(new Request('https://offer2pr.com/api/majors?top=1'))
    const a = await fns.getMajorTree({ db, cat: 'fin' })
    const b = await fns.getMajorTree({ db, cat: 'fin' })
    expect(a).toBe(b)
    expect(await fns.getMajorCats(db)).toBe(await fns.getMajorCats(db))
    expect(h.query).toHaveBeenCalledTimes(1)
  })
})

describe('热门清单', () => {
  it('按名次排(表序打乱、名次有缺口照样排对),不在热门的不出', () => {
    expect(topMajorsOf(ROWS).map((r) => r.code)).toEqual(['52.0301', '11.0701'])
    expect(topMajorsOf([])).toEqual([])
  })
})

describe('/api/majors(取数 + 缓存 + 表不存在)', () => {
  beforeEach(() => {
    h.query.mockClear()
    h.state.missing = false
    h.state.majors = [
      dbRow('52.0301', 'Accounting', ['商务', '财会金融'], '2'),
      dbRow('11.0701', 'Computer science', '["IT"]', '1'),
      dbRow('30.1601', 'Accounting and computer science', ['财会金融', 'IT'], null),
    ]
  })

  it('表还没建(42P01):三条分支都回空、不 500', async () => {
    h.state.missing = true
    const { majors } = await fresh()
    const top = await majors.majorsRoute(new Request('https://offer2pr.com/api/majors?top=1'))
    expect(top.status).toBe(200)
    expect(await top.json()).toEqual({ majors: [] })
    const q = await majors.majorsRoute(new Request('https://offer2pr.com/api/majors?q=account'))
    expect(await q.json()).toEqual({ majors: [] })
    const one = await majors.majorsRoute(new Request('https://offer2pr.com/api/majors?code=52.0301'))
    expect(await one.json()).toEqual({ major: null })
  })

  it('空表不进缓存:建表灌数后下一个请求就看得到', async () => {
    h.state.missing = true
    const { majors } = await fresh()
    expect(await majors.getMajors({ query: h.query })).toEqual([])
    h.state.missing = false
    expect((await majors.getMajors({ query: h.query })).map((r) => r.code)).toEqual(['52.0301', '11.0701', '30.1601'])
  })

  it('行构造:numeric 名次收成数字、JSON 串的 broads 解析成数组、缺译名保 null;非空表 TTL 内只查一次', async () => {
    const { majors } = await fresh()
    const rows = await majors.getMajors({ query: h.query })
    expect(rows[0]).toEqual({
      code: '52.0301', titleEn: 'Accounting', titleZh: null, titleKo: null, titleEnShort: '', series: '52', grouping: '05',
      broads: ['商务', '财会金融'], popular: 2,
    })
    expect(rows[1]?.broads).toEqual(['IT'])
    await majors.getMajors({ query: h.query })
    expect(h.query).toHaveBeenCalledTimes(1)
  })

  it('三个参数都没带 400、不进库', async () => {
    const { majors } = await fresh()
    const res = await majors.majorsRoute(new Request('https://offer2pr.com/api/majors'))
    expect(res.status).toBe(400)
    expect(h.query).not.toHaveBeenCalled()
  })

  it('top 按名次、code 回一条', async () => {
    const { majors } = await fresh()
    const top = await majors.majorsRoute(new Request('https://offer2pr.com/api/majors?top=1'))
    const body = await top.json() as { majors: MajorRow[] }
    expect(body.majors.map((r) => r.code)).toEqual(['11.0701', '52.0301'])
    const one = await majors.majorsRoute(new Request('https://offer2pr.com/api/majors?code=30.1601'))
    expect((await one.json() as { major: MajorRow }).major.broads).toEqual(['财会金融', 'IT'])
  })
})

describe('/api/quiz?major=(第 3 题)', () => {
  beforeEach(() => {
    h.query.mockClear()
    h.state.missing = false
    h.state.majors = [dbRow('52.0301', 'Accounting', ['商务', '财会金融'], '2')]
    h.state.nocs = [{
      noc: '11100', title: 'Financial auditors and accountants', title_zh: '会计师', title_zh_short: '会计师',
      title_ko_short: '회계사', title_en_short: 'Accountants', broad: '财会金融', open: 120, eligible: 80, median_salary: '72000',
    }]
  })

  it('大类取自专业表的 broads,整组用 broad = ANY 一次传给职业查询;?n 透传', async () => {
    const { quiz } = await fresh()
    const res = await quiz.quizRoute(new Request('https://offer2pr.com/api/quiz?major=52.0301&n=10'))
    const body = await res.json() as { top: { noc: string, medianSalary: number | null }[] }
    expect(body.top.map((r) => r.noc)).toEqual(['11100'])
    expect(body.top[0]?.medianSalary).toBe(72000)
    const nocCall = h.query.mock.calls.find((c) => c[0].includes('FROM noc_openings'))
    expect(nocCall?.[0]).toContain('broad = ANY($1::text[])')
    expect(nocCall?.[1]).toEqual([['商务', '财会金融'], 10])
  })

  it('查无此专业 / 专业表没建:回空清单,不打职业查询', async () => {
    const { quiz } = await fresh()
    const res = await quiz.quizRoute(new Request('https://offer2pr.com/api/quiz?major=99.9999'))
    expect(await res.json()).toEqual({ top: [] })
    h.state.missing = true
    const { quiz: q2 } = await fresh()
    expect(await (await q2.quizRoute(new Request('https://offer2pr.com/api/quiz?major=52.0301'))).json()).toEqual({ top: [] })
    expect(h.query.mock.calls.some((c) => c[0].includes('FROM noc_openings'))).toBe(false)
  })

  it('注入件:非空结果 10 分钟内不重查;空结果不缓存;条数不同各算一格', async () => {
    const { quiz } = await fresh()
    const db = { query: h.query }
    const broadsOf = vi.fn(async () => ['IT'])
    const rows = [{ noc: '21232', title: 'Software developers', titleZh: '', titleZhShort: '', titleKoShort: '',
      titleEnShort: '', broad: 'IT', open: 9, eligible: 9, medianSalary: null }]
    const load = vi.fn(async () => rows)
    await quiz.getMajorNocsCached({ db, codes: ['11.0701'], n: 24, broadsOf, load })
    await quiz.getMajorNocsCached({ db, codes: ['11.0701'], n: 24, broadsOf, load })
    expect(load).toHaveBeenCalledTimes(1)
    expect(load).toHaveBeenCalledWith({ db, broads: ['IT'], limit: 24 })
    await quiz.getMajorNocsCached({ db, codes: ['11.0701'], n: 12, broadsOf, load })
    expect(load).toHaveBeenCalledTimes(2)
    const none = vi.fn(async () => [])
    await quiz.getMajorNocsCached({ db, codes: ['11.0702'], n: 24, broadsOf, load: none })
    await quiz.getMajorNocsCached({ db, codes: ['11.0702'], n: 24, broadsOf, load: none })
    expect(none).toHaveBeenCalledTimes(2)
    const noBroads = vi.fn(async () => [])
    const never = vi.fn(async () => rows)
    expect(await quiz.getMajorNocsCached({ db, codes: ['00.0000'], n: 24, broadsOf: noBroads, load: never })).toEqual([])
    expect(never).not.toHaveBeenCalled()
  })

  it('⑩ ?major= 码清单金标:逗号切开逐个去空白验码形,不合形的丢掉、去重、至多 3 个、保序;缺席 / 空串给空列', async () => {
    const { majorCodesOf } = await import('@/lib/quiz/functions')
    expect(majorCodesOf(null)).toEqual([])
    expect(majorCodesOf('')).toEqual([])
    expect(majorCodesOf('52.0301')).toEqual(['52.0301'])
    expect(majorCodesOf(' 52.0301 , 11.0701')).toEqual(['52.0301', '11.0701'])
    expect(majorCodesOf('52.0301,52.0301,11.0701')).toEqual(['52.0301', '11.0701'])
    expect(majorCodesOf('52.03,abc,5.0301,52.03011,52-0301,,11.0701')).toEqual(['11.0701'])
    expect(majorCodesOf('52.0301,11.0701,14.0901,26.0101')).toEqual(['52.0301', '11.0701', '14.0901'])
  })

  it('⑩ ?major= 码清单(任意拼法):结果 = 合形的码去重后前 3 个,保序;每个都合形', async () => {
    const { majorCodesOf } = await import('@/lib/quiz/functions')
    const piece = fc.oneof(fc.constantFrom('52.0301', '11.0701', '14.0901', '26.0101', '51.3801'),
      fc.constantFrom('', ' ', 'x', '52.03', '00.000', '11.07011'))
    fc.assert(fc.property(fc.array(piece, { maxLength: 8 }), (pieces) => {
      const out = majorCodesOf(pieces.join(','))
      const want: string[] = []
      for (const raw of pieces) {
        const c = raw.trim()
        if (/^\d{2}\.\d{4}$/.test(c) && want.includes(c) === false && want.length < 3) {
          want.push(c)
        }
      }
      expect(out).toEqual(want)
    }))
  })

  it('⑩ 几个专业:大类取并集(去重,逐码问 broadsOf),一次传给职业查询;码的先后不同算同一格缓存;都没大类不查', async () => {
    const { quiz } = await fresh()
    const db = { query: h.query }
    const table: Record<string, string[]> = { '11.0701': ['IT'], '52.0301': ['商务', '财会金融'], '52.0201': ['商务', '高管'] }
    const broadsOf = vi.fn(async (x: { code: string }) => table[x.code] ?? [])
    const rows = [{ noc: '21232', title: 'Software developers', titleZh: '', titleZhShort: '', titleKoShort: '',
      titleEnShort: '', broad: 'IT', open: 9, eligible: 9, medianSalary: null }]
    const load = vi.fn(async () => rows)
    expect(await quiz.getMajorNocsCached({ db, codes: ['52.0301', '11.0701', '52.0201'], n: 24, broadsOf, load })).toEqual(rows)
    expect(broadsOf).toHaveBeenCalledTimes(3)
    expect(load).toHaveBeenCalledTimes(1)
    const sent = load.mock.calls[0] as unknown as [{ broads: string[], limit: number }]
    expect(new Set(sent[0].broads)).toEqual(new Set(['IT', '商务', '财会金融', '高管']))
    expect(sent[0].broads.length).toBe(4)
    expect(sent[0].limit).toBe(24)
    await quiz.getMajorNocsCached({ db, codes: ['11.0701', '52.0201', '52.0301'], n: 24, broadsOf, load })
    expect(load).toHaveBeenCalledTimes(1)
    const never = vi.fn(async () => rows)
    expect(await quiz.getMajorNocsCached({ db, codes: ['99.9999', '98.0000'], n: 24, broadsOf, load: never })).toEqual([])
    expect(await quiz.getMajorNocsCached({ db, codes: [], n: 24, broadsOf, load: never })).toEqual([])
    expect(never).not.toHaveBeenCalled()
  })

  it('⑩ 路由:?major=<码,码>(编码过的逗号也认)取并集;参数在但一个都不合形回空清单、不打职业查询', async () => {
    h.state.majors = [
      dbRow('52.0301', 'Accounting', ['商务', '财会金融'], '2'),
      dbRow('11.0701', 'Computer science', ['IT'], '1'),
    ]
    const { quiz } = await fresh()
    const res = await quiz.quizRoute(new Request('https://offer2pr.com/api/quiz?major=52.0301%2C11.0701,52.0301&n=10'))
    expect((await res.json() as { top: { noc: string }[] }).top.map((r) => r.noc)).toEqual(['11100'])
    const nocCall = h.query.mock.calls.find((c) => c[0].includes('FROM noc_openings'))
    expect(new Set(nocCall?.[1]?.[0] as string[])).toEqual(new Set(['商务', '财会金融', 'IT']))
    h.query.mockClear()
    const { quiz: q2 } = await fresh()
    expect(await (await q2.quizRoute(new Request('https://offer2pr.com/api/quiz?major=garbage,52.03'))).json()).toEqual({ top: [] })
    expect(h.query.mock.calls.some((c) => c[0].includes('FROM noc_openings'))).toBe(false)
  })

  it('?n= 缺席 / 空 / 非数 / 非正给 24,小数取整,上限 60', async () => {
    const { quiz } = await fresh()
    for (const raw of [null, '', '  ', 'abc', '0', '-3']) {
      expect(quiz.majorNOf(raw)).toBe(24)
    }
    expect(quiz.majorNOf('10')).toBe(10)
    expect(quiz.majorNOf('12.7')).toBe(12)
    expect(quiz.majorNOf('999')).toBe(60)
  })
})
