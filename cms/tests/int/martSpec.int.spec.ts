/**
 * seed 装载规格的自洽测试:列白名单必须与行映射器的输出键**逐字逐序**一致。
 *
 * 🔴 这一层是全站最危险的一条路(/seed 直灌生产库),而两边对不上**不会报错**:
 *    · 白名单有、映射器没有 → insertBatch 把那一列**静默写成 NULL**;
 *    · 映射器有、白名单没有 → 那个字段**静默丢掉**,库里永远没有它。
 *    两种都不抛异常、不进日志,只会在页面上表现为「这个字段怎么空了」——
 *    而列名耦合 Payload snake_case,改一次 collection 就要同步改白名单(文件头原话)。
 *    2026-08-25 立这组:此前没有任何东西查这件事。
 *
 * 做法(2026-08-26 随 mart 形制批由「读源码括号配平解析」改**运行时对拍**:规格换形后
 * 旧解析器失效;新形下映射器是具名 to*、规格是 dimSpecs() 的数据,直接调用比对 ——
 * Object.keys 保插入序,增列/删列/换序任何一种漂移都当场红):
 * 只 import lib/mart/functions(它不 import db/server,不会把 payload 连接池拖进测试);
 * 每条规格拿空行喂映射器,断言输出键 === 列白名单。
 *
 * @author Frank
 * @time 2026-08-25 04:00:00
 */
import { describe, expect, it } from 'vitest'

import {
  COLS_COMPANIES, COLS_JOBS, COLS_NEWS, COLS_STATS_DAILY,
} from '@/lib/mart/constants'
import { dimSpecs, toCompany, toJob, toNews, toStatsDaily } from '@/lib/mart/functions'

/**
 * 探针时间戳(值不参与键比对,给什么都行)。
 */
const NOW = '2026-01-01T00:00:00.000Z'

describe('seed 装载规格', function suite() {
  const specs = dimSpecs()

  it('解析得到规格(为 0 说明规格写法变了,这组测试已失效)', function parsed() {
    expect(specs.length).toBeGreaterThan(20)
  })

  it('每条维度规格:列白名单 === 映射器输出键(同内容同顺序)', function aligned() {
    const bad: string[] = []
    for (const s of specs) {
      const keys = Object.keys(s.toRow({}))
      if (JSON.stringify(keys) !== JSON.stringify([...s.cols])) {
        bad.push(`${s.table}:cols=[${s.cols.join(',')}] keys=[${keys.join(',')}]`)
      }
    }
    expect(bad).toEqual([])
  })

  it('companies:列白名单 === toCompany 输出键', function companiesAligned() {
    expect(Object.keys(toCompany({ r: {}, now: NOW }))).toEqual([...COLS_COMPANIES])
  })

  it('jobs:列白名单 === toJob 输出键', function jobsAligned() {
    expect(Object.keys(toJob({ r: {}, now: NOW, idBySlug: {} }))).toEqual([...COLS_JOBS])
  })

  it('news:列白名单 === toNews 输出键', function newsAligned() {
    expect(Object.keys(toNews({ r: {}, now: NOW }))).toEqual([...COLS_NEWS])
  })

  it('stats_daily:列白名单 === toStatsDaily 输出键', function dailyAligned() {
    expect(Object.keys(toStatsDaily({ r: {}, now: NOW }))).toEqual([...COLS_STATS_DAILY])
  })
})
