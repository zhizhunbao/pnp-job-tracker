/**
 * 分域 eslint 报告(2026-08-25 Frank:「写一个固定的脚本,每次跑都执行它,输出每个域的报告」)。
 *
 * 为什么是壳不是重写:提速的真正来源是 eslint 自己的 --cache(只重查改过的文件),
 * 语义的真相是 CLI(flat config + suppressions 基线)—— 所以本脚本只调
 * `eslint src/lib src/components --cache --format json` 拿结构化结果,自己只做
 * 「按域分组 + 落报告」两件事,规则口径和 `npm run lint` 一致。
 * ⚠️ 范围只有 lib 与 components(2026-08-26 Frank 收窄):app/collections/tests 不在
 * 本报告里 —— 那边冒新错这里不响,收口仍以全量 `npm run lint` 为准。
 *
 * 用法:`npm run lint:report`。每跑一次在 lint-reports/ 落一份带时间戳的 markdown,
 * 终端打分域汇总表;报告目录已进 .gitignore,不进库。
 *
 * @author Frank
 * @time 2026-08-25 22:40:00
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

/**
 * 一条 lint 消息落进报告的形状。
 */
const SEV_ERROR = 2

/**
 * 报告目录(相对 cms/,已 gitignore)。
 */
const OUT_DIR = 'lint-reports'

/**
 * 结果 JSON 的上限(全量报告可能上 MB)。
 */
const BUF_MAX = 64 * 1024 * 1024

/**
 * 跑一遍 eslint(带缓存,与 npm run lint 同口径),拿 JSON 结果。
 * eslint 有 error 时退出码是 1,stdout 照常是完整 JSON —— 不当失败处理。
 *
 * @returns {Array<{filePath: string, messages: Array<{ruleId: string|null, severity: number, line: number, message: string}>}>} 逐文件结果。
 */
function runEslint() {
  const cms = path.resolve(import.meta.dirname, '..')
  const r = spawnSync(process.execPath, [path.join(cms, 'node_modules', 'eslint', 'bin', 'eslint.js'), 'src/lib', 'src/components', '--cache', '--format', 'json'], {
    cwd: cms,
    encoding: 'utf8',
    maxBuffer: BUF_MAX,
    env: { ...process.env, NODE_OPTIONS: '--no-deprecation' },
  })
  if (r.stdout == null || r.stdout === '') {
    throw new Error('eslint 没有产出 JSON:' + String(r.stderr).slice(0, 500))
  }
  return JSON.parse(r.stdout)
}

/**
 * 文件路径 → 域名:src/lib/<域> 取域名,src/app 归 app,src 其余归 cms-other,
 * tests 归 tests,再往外归 root。
 *
 * @param {string} file 绝对路径。
 * @returns {string} 域名。
 */
function domainOf(file) {
  const p = file.replaceAll('\\', '/')
  const lib = p.match(/\/src\/lib\/([^/]+)\//)
  if (lib != null) {
    return 'lib/' + lib[1]
  }
  if (p.includes('/src/app/')) {
    return 'app'
  }
  if (p.includes('/src/components/')) {
    return 'components'
  }
  if (p.includes('/src/')) {
    return 'cms-other'
  }
  if (p.includes('/tests/')) {
    return 'tests'
  }
  return 'root'
}

/**
 * 读 suppressions 基线,按域汇总「隐形的存量欠账」—— 基线压住的违规在 eslint 输出里
 * 一条都不显(存量不挡路、新增直接红),不补这一列,mart 那种欠 178 处的域会看着全绿。
 * 只统计报告范围内的域(lib/components);app 的欠账走全量 `npm run lint`。
 *
 * @returns {Map<string, {total: number, byRule: Map<string, number>}>} 域 → 欠账。
 */
function baselineByDomain() {
  const cms = path.resolve(import.meta.dirname, '..')
  let raw = null
  try {
    raw = JSON.parse(readFileSync(path.join(cms, 'eslint-suppressions.json'), 'utf8'))
  } catch {
    return new Map()
  }
  const out = new Map()
  for (const [file, rules] of Object.entries(raw)) {
    const d = domainOf('/' + file)
    if (d.startsWith('lib/') === false && d !== 'components') {
      continue
    }
    if (out.has(d) === false) {
      out.set(d, { total: 0, byRule: new Map() })
    }
    const g = out.get(d)
    for (const [rule, v] of Object.entries(rules)) {
      g.total += v.count
      let prev = 0
      if (g.byRule.has(rule)) {
        prev = g.byRule.get(rule)
      }
      g.byRule.set(rule, prev + v.count)
    }
  }
  return out
}

/**
 * 规则欠账条目按数量降序(sort 比较器,双参签名由 Array.prototype.sort 定)。
 *
 * @param {[string, number]} a 一条 [规则, 数量]。
 * @param {[string, number]} b 另一条。
 * @returns {number} 排序差值。
 */
function byCountDesc(a, b) {
  return b[1] - a[1]
}

/**
 * 主流程:跑 → 分组 → 汇总表进终端、明细进带时间戳的 markdown。
 */
function main() {
  const t0 = Date.now()
  const results = runEslint()
  const byDomain = new Map()
  for (const f of results) {
    if (f.messages.length === 0) {
      continue
    }
    const d = domainOf(f.filePath)
    if (byDomain.has(d) === false) {
      byDomain.set(d, { errors: 0, warnings: 0, files: new Set(), lines: [] })
    }
    const g = byDomain.get(d)
    g.files.add(f.filePath)
    for (const m of f.messages) {
      if (m.severity === SEV_ERROR) {
        g.errors++
      } else {
        g.warnings++
      }
      const sev = m.severity === SEV_ERROR ? 'error' : 'warn '
      const rel = path.relative(path.resolve(import.meta.dirname, '..'), f.filePath).replaceAll('\\', '/')
      g.lines.push(`- ${sev} ${rel}:${m.line} [${m.ruleId == null ? 'parse' : m.ruleId}] ${m.message}`)
    }
  }
  const baseline = baselineByDomain()
  const domains = [...new Set([...byDomain.keys(), ...baseline.keys()])].sort()
  const stamp = new Date().toISOString().slice(0, 16).replaceAll(':', '').replace('T', '-')
  const outDir = path.resolve(import.meta.dirname, '..', OUT_DIR)
  mkdirSync(outDir, { recursive: true })
  const outFile = path.join(outDir, `lint-${stamp}.md`)

  let totalE = 0
  let totalW = 0
  let totalB = 0
  const md = [`# eslint 分域报告 ${stamp}`, '', '| 域 | error | warn | 基线欠账 | 文件数 |', '| --- | ---: | ---: | ---: | ---: |']
  console.log('域'.padEnd(20) + 'error'.padStart(7) + 'warn'.padStart(7) + '基线欠账'.padStart(8) + '  文件')
  for (const d of domains) {
    let g = byDomain.get(d)
    if (g == null) {
      g = { errors: 0, warnings: 0, files: new Set(), lines: [] }
    }
    let b = 0
    if (baseline.has(d)) {
      b = baseline.get(d).total
    }
    totalE += g.errors
    totalW += g.warnings
    totalB += b
    md.push(`| ${d} | ${g.errors} | ${g.warnings} | ${b} | ${g.files.size} |`)
    console.log(d.padEnd(20) + String(g.errors).padStart(7) + String(g.warnings).padStart(7) + String(b).padStart(10) + String(g.files.size).padStart(6))
  }
  md.push(`| **合计** | **${totalE}** | **${totalW}** | **${totalB}** | |`, '')
  md.push('基线欠账 = eslint-suppressions.json 压住的存量违规(输出里不显、新增直接红);修一批跑 `npm run lint:prune` 收紧。', '')
  for (const d of domains) {
    const live = byDomain.get(d)
    const debt = baseline.get(d)
    if ((live == null || live.lines.length === 0) && debt == null) {
      continue
    }
    md.push(`## ${d}`, '')
    if (live != null && live.lines.length > 0) {
      md.push(...live.lines, '')
    }
    if (debt != null) {
      const rules = [...debt.byRule.entries()].sort(byCountDesc)
      const parts = []
      for (const [rule, n] of rules) {
        parts.push(`${rule} ×${n}`)
      }
      md.push(`基线欠账 ${debt.total}:${parts.join('、')}`, '')
    }
  }
  writeFileSync(outFile, md.join('\n'), 'utf8')
  console.log(`\n合计 error ${totalE} / warn ${totalW},耗时 ${((Date.now() - t0) / 1000).toFixed(1)}s`)
  console.log(`报告:${path.relative(process.cwd(), outFile)}`)
  process.exitCode = totalE > 0 ? 1 : 0
}

main()
