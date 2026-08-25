/**
 * seed 装载规格的自洽测试:列白名单必须与行映射器的输出键**逐字逐序**一致。
 *
 * 🔴 这一层是全站最危险的一条路(/seed 直灌生产库),而两边对不上**不会报错**:
 *    · 白名单有、映射器没有 → `insertBatch` 里 `r[c] ?? null` 把那一列**静默写成 NULL**;
 *    · 映射器有、白名单没有 → 那个字段**静默丢掉**,库里永远没有它。
 *    两种都不抛异常、不进日志,只会在页面上表现为「这个字段怎么空了」——
 *    而列名耦合 Payload snake_case,改一次 collection 就要同步改这里(文件头原话)。
 *    2026-08-25 立这组:此前没有任何东西查这件事。
 *
 * 做法:不 import 运行时(那会把 payload 连接池拖进测试),直接读 routes.ts 源码,
 * 按括号配平解析出每条 `['<mart 文件>', '<库表>', [列…], (r) => ({键…})]`,两边比对。
 * 解析失败(规格数为 0)本身就是红 —— 说明规格的写法变了,这组测试跟着失效了。
 *
 * @author Frank
 * @time 2026-08-25 04:00:00
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * 一条装载规格解析出来的样子。
 */
type Spec = {
  /**
   * 目标库表名。
   */
  table: string

  /**
   * 白名单里列出的列名,按书写顺序。
   */
  cols: string[]

  /**
   * 行映射器输出对象的键,按书写顺序。
   */
  keys: string[]
}

const SRC = readFileSync(join(process.cwd(), 'src/lib/mart/routes.ts'), 'utf8')

/**
 * 从 open 处起找配平的 close,回它的下标;找不到回 -1。
 *
 * @param x 源码、起点与括号对。
 * @returns 配平处下标。
 */
function balancedAt(x: { text: string; from: number; open: string; close: string }): number {
  let depth = 0
  let i = x.from
  while (i < x.text.length) {
    if (x.text[i] === x.open) {
      depth = depth + 1
    } else if (x.text[i] === x.close) {
      depth = depth - 1
      if (depth === 0) {
        return i
      }
    }
    i = i + 1
  }
  return -1
}

/**
 * 解析 routes.ts 里的全部装载规格。
 *
 * @returns 规格清单。
 */
function specsOf(): Spec[] {
  const out: Spec[] = []
  const head = /\[\s*'([a-z_0-9]+)'\s*,\s*'([a-z_0-9]+)'\s*,/g
  let m = head.exec(SRC)
  while (m !== null) {
    const table = m[2]
    const lb = SRC.indexOf('[', m.index + m[0].length)
    const between = SRC.slice(m.index + m[0].length, lb)
    if (lb >= 0 && between.includes(']') === false) {
      const rb = balancedAt({ text: SRC, from: lb, open: '[', close: ']' })
      const colText = SRC.slice(lb, rb + 1)
      const cols = [...colText.matchAll(/'([a-z_0-9]+)'/g)].map(function pick(g) { return g[1] })
      const arrow = SRC.indexOf('=>', rb)
      const ob = SRC.indexOf('{', arrow)
      if (arrow >= 0 && ob >= 0) {
        const cb = balancedAt({ text: SRC, from: ob, open: '{', close: '}' })
        const body = SRC.slice(ob, cb + 1)
        const keys = [...body.matchAll(/(?:^|[{,\s])([a-z_0-9]+)\s*:/g)].map(function pick(g) { return g[1] })
        out.push({ table, cols, keys })
      }
    }
    m = head.exec(SRC)
  }
  return out
}

describe('seed 装载规格', function suite() {
  const specs = specsOf()

  it('解析得到规格(为 0 说明规格写法变了,这组测试已失效)', function parsed() {
    expect(specs.length).toBeGreaterThan(20)
  })

  it('每条规格:列白名单 === 映射器输出键(同内容同顺序)', function aligned() {
    const bad: string[] = []
    for (const s of specs) {
      const seen = s.keys.filter(function inCols(k) { return s.cols.includes(k) })
      if (JSON.stringify(seen) !== JSON.stringify(s.cols)) {
        bad.push(s.table)
      }
      for (const k of s.keys) {
        if (s.cols.includes(k) === false) {
          bad.push(`${s.table}:映射器多出 ${k}`)
        }
      }
    }
    expect(bad).toEqual([])
  })
})
