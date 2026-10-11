// 地点一行与工时 / 雇佣期两行名(2026-10-11 批 4 全站卡片字段;lib/location placeLineOf + name 桶 placeSubOf / hoursNameOf / termNameOf)。
// 钉住:① 有街号写完整地址、没有写「市, 省码」、缺一样只写另一样;② 灰字「市译名,省译名」只在中 / 韩界面出,英文界面一行;
// ③ 工时、雇佣期归一值穷举映射(英文黑字 + 界面语灰字),认不得的两格都空。
import { describe, expect, it } from 'vitest'

// 测试例外:域内函数直接点文件
import { hoursNameOf, placeHrefOf, placeSubOf, termNameOf } from '@/components/name/functions'
import { makeT } from '@/lib/i18n'
import { placeLineOf } from '@/lib/location'

describe('placeLineOf:照 Indeed 一行', () => {
  it('有街号:完整地址原样', () => {
    expect(placeLineOf({ address: '1 Bowes Rd, Concord, ON L4K 1H4', city: 'Concord', province: 'ON' }))
      .toBe('1 Bowes Rd, Concord, ON L4K 1H4')
  })

  it('没街号:「市, 省码」', () => {
    expect(placeLineOf({ address: '', city: 'Concord', province: 'ON' })).toBe('Concord, ON')
  })

  it('缺一样只写另一样;三格都空给空串', () => {
    expect(placeLineOf({ address: '', city: '', province: 'ON' })).toBe('ON')
    expect(placeLineOf({ address: '', city: 'Concord', province: '' })).toBe('Concord')
    expect(placeLineOf({ address: '', city: '', province: '' })).toBe('')
  })

  it('整行一个地图链;没有地点不给链', () => {
    expect(placeHrefOf('Concord, ON')).toContain(encodeURIComponent('Concord, ON'))
    expect(placeHrefOf('')).toBe('')
  })
})

describe('placeSubOf:灰字「市译名,省译名」', () => {
  it('中文界面:市译名,省译名', () => {
    expect(placeSubOf({ cityZh: '康科德', cityKo: '', province: 'ON', lang: 'zh', t: makeT('zh') }))
      .toBe('康科德,' + makeT('zh')('prov.ON'))
  })

  it('英文界面:不出灰字(只一行)', () => {
    expect(placeSubOf({ cityZh: '康科德', cityKo: '콩코드', province: 'ON', lang: 'en', t: makeT('en') })).toBe('')
  })

  it('市没译名:只写省译名', () => {
    expect(placeSubOf({ cityZh: '', cityKo: '', province: 'ON', lang: 'zh', t: makeT('zh') })).toBe(makeT('zh')('prov.ON'))
  })

  it('韩文界面取韩文市名', () => {
    expect(placeSubOf({ cityZh: '康科德', cityKo: '콩코드', province: 'ON', lang: 'ko', t: makeT('ko') }))
      .toContain('콩코드')
  })
})

describe('工时 / 雇佣期:穷举映射', () => {
  const HOURS: Array<[string, string, string]> = [['full', 'Full-time', '全职'], ['part', 'Part-time', '兼职']]
  const TERMS: Array<[string, string, string]> = [
    ['permanent', 'Permanent', '长期'], ['term', 'Fixed-term', '定期合同'],
    ['seasonal', 'Seasonal', '季节性'], ['casual', 'Casual', '临时'],
  ]

  it('工时两档:英文 + 中文灰字;英文界面无灰字', () => {
    for (const [v, en, zh] of HOURS) {
      expect(hoursNameOf({ v, lang: 'zh', t: makeT('zh') })).toEqual({ en, sub: zh })
      expect(hoursNameOf({ v, lang: 'en', t: makeT('en') })).toEqual({ en, sub: '' })
    }
  })

  it('雇佣期四档:英文 + 中文灰字;韩文界面灰字非空', () => {
    for (const [v, en, zh] of TERMS) {
      expect(termNameOf({ v, lang: 'zh', t: makeT('zh') })).toEqual({ en, sub: zh })
      expect(termNameOf({ v, lang: 'ko', t: makeT('ko') }).sub).not.toBe('')
    }
  })

  it('没标或认不得:两格都空(不拿雇佣期值查工时表)', () => {
    for (const v of ['', 'other', 'permanent']) {
      expect(hoursNameOf({ v, lang: 'zh', t: makeT('zh') })).toEqual({ en: '', sub: '' })
    }
    for (const v of ['', 'full', 'contract']) {
      expect(termNameOf({ v, lang: 'zh', t: makeT('zh') })).toEqual({ en: '', sub: '' })
    }
  })
})
