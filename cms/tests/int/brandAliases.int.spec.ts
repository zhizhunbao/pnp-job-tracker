// 连锁品牌译名核定表(lib/employers BRAND_ALIASES / brandCellOf;2026-09-23 Frank「subway 翻译也是错的」)。
// 来由:懒翻把 Subway 按字面译成「地铁」写进公司表;加盟店的法人名模型也常译成「……地铁」或只译法人那半截。
// 性质:① 生产库里真实的加盟店法人名都认得出品牌;② 撞姓氏、撞普通词、只是字母连着的名字一律不认;
// ③ 核定表每一行中文格有汉字、韩文格有韩文音节(不许空、不许抄拉丁字母)。
import { describe, expect, it } from 'vitest'

// 测试例外:纯函数直接点文件(桶只走门的规矩不管测试)
import { BRAND_ALIASES } from '@/lib/employers/constants'
import { brandCellOf } from '@/lib/employers/functions'

const HITS: Array<[string, string, string]> = [
  ['Subway', '赛百味', '서브웨이'],
  ['Subway Sandwiches and Salads', '赛百味', '서브웨이'],
  ['Tastiest II Subway Limited', '赛百味', '서브웨이'],
  ['PRATIK & BROTHERS LTD O/A SUBWAY', '赛百味', '서브웨이'],
  ['AMBEY04 FOOD CORPORATION (SUBWAY MELVILLE)', '赛百味', '서브웨이'],
  ["McDonald's Restaurants of Canada Limited", '麦当劳', '맥도날드'],
  ['MCDONALDS', '麦当劳', '맥도날드'],
  ['Tim Horton’s', '蒂姆霍顿', '팀홀튼'],
  ['TIM HORTONS #1234', '蒂姆霍顿', '팀홀튼'],
  ["Domino's Pizza", '达美乐', '도미노피자'],
  ['BMO Financial Group', '满地可银行', '몬트리올은행'],
  ['Loblaw Companies Limited', '罗布劳', '로블로'],
  ['Sobeys Capital Incorporated', '索贝斯', '소비스'],
  ['Canadian Tire Store 041', '加拿大轮胎', '캐나디안 타이어'],
  ['2442226 Ontario Inc. o/a Petro Canada', '加拿大石油', '페트로캐나다'],
]

const MISSES = [
  'McDonald Construction Ltd',
  'Bob McDonald Farms',
  'Dominion Lending Centres',
  'Domino Foods Inc',
  "Wendy's Home Cleaning",
  'Garage Desjardins inc',
  'Shell Busey Homes',
  'Metro Vancouver',
  'Subwaysurfers Inc',
  'Timber Horton Farms',
  'Esson Logistics',
  'RBCM Consulting',
]

describe('连锁品牌译名核定表', () => {
  it('加盟店法人名认得出品牌,中韩两格给核定的', () => {
    for (const [name, zh, ko] of HITS) {
      expect(brandCellOf({ name: name, lang: 'zh' }), name).toBe(zh)
      expect(brandCellOf({ name: name, lang: 'ko' }), name).toBe(ko)
    }
  })

  it('撞姓氏、撞普通词、字母连着的名字不认', () => {
    for (const name of MISSES) {
      expect(brandCellOf({ name: name, lang: 'zh' }), name).toBe('')
      expect(brandCellOf({ name: name, lang: 'ko' }), name).toBe('')
    }
  })

  it('每一行中文格有汉字、韩文格有韩文音节', () => {
    for (const [key, brand] of Object.entries(BRAND_ALIASES)) {
      expect(brand.zh, key).toMatch(/[一-鿿]/)
      expect(brand.ko, key).toMatch(/[가-힣]/)
    }
  })
})
