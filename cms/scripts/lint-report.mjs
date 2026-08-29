/**
 * 分域 eslint 报告(2026-08-25 Frank:「写一个固定的脚本,每次跑都执行它,输出每个域的报告」;
 * 2026-08-26 定型成单模式 —— Frank:「我的脚本不是可以一次跑完所有问题吗」)。
 *
 * 一条命令、一次 eslint、一份报告,三样全有:
 * · 分域汇总表:活警报(error/warn)、基线欠账、文件数;
 * · 全量明细:按 域 → 规则 → file:line 列出**所有**命中(基线压住的也在 —— 清欠账的工单);
 * · 传规则名当参数 = 只看那条规则的过滤视图(不用重跑第二次)。
 *
 * 为什么是壳不是重写:语义的真相是 CLI(flat config + suppressions 基线),本脚本只调
 * `eslint --format json` 拿结构化结果,自己只做「基线比对 + 按域分组 + 落报告」。
 * ⚠️ 跑的是**空基线**(暴露被压住的命中),所以不带 --cache —— 缓存按「配置+文件」记干净,
 * 换基线后缓存命中会漏报(实撞过一回,裸命令空军);活/欠账的拆分靠回读
 * eslint-suppressions.json 的计数,与 `npm run lint` 的口径一致。
 *
 * 用法:`npm run lint:report`(全量)/ `npm run lint:report -- <规则名>`(过滤视图)。
 * 范围只有 lib 与 components(2026-08-26 Frank 收窄):app/collections/tests 不在本报告里,
 * 那边冒新错这里不响,收口仍以全量 `npm run lint` 为准。
 * 报告落 reports/lint-<本地时间戳>.md(2026-08-26 Frank:lint-reports 并入统一的
 * reports/,与 vitest 的 JSON 同屋),目录已进 .gitignore,不进库。
 *
 * @author Frank
 * @time 2026-08-25 22:40:00
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

/**
 * eslint 消息里 error 档的 severity 值。
 */
const SEV_ERROR = 2

/**
 * 报告目录(相对 cms/,已 gitignore;lint 与 vitest 报告同屋)。
 */
const OUT_DIR = 'reports'

/**
 * 结果 JSON 的上限(全量报告可能上 MB)。
 */
const BUF_MAX = 64 * 1024 * 1024

/**
 * cms/ 的绝对路径(全脚本的路径基准)。
 */
const CMS = path.resolve(import.meta.dirname, '..')

/**
 * 本地时间戳 `YYYY-MM-DD-HHmm`(2026-08-26 由 UTC 改本地:toISOString 差 4 小时,
 * 文件名看着像穿越 —— Frank 实拍)。
 *
 * @returns {string} 本地时间戳。
 */
function stampNow() {
  const d = new Date()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}-${hh}${mi}`
}

/**
 * 空基线跑一遍 eslint(暴露所有被 suppressions 压住的命中),拿 JSON 结果。
 * eslint 有 error 时退出码是 1,stdout 照常是完整 JSON —— 不当失败处理。
 *
 * @returns {Array<{filePath: string, messages: Array<{ruleId: string|null, severity: number, line: number, message: string}>}>} 逐文件结果。
 */
function runEslint() {
  const emptyPath = path.join(tmpdir(), 'pnp-lint-empty-suppressions.json')
  writeFileSync(emptyPath, '{}\n', 'utf8')
  const r = spawnSync(process.execPath, [
    path.join(CMS, 'node_modules', 'eslint', 'bin', 'eslint.js'),
    'src/lib', 'src/components', 'src/app/(frontend)', '--format', 'json', '--suppressions-location', emptyPath,
  ], {
    cwd: CMS,
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
 * 读 suppressions 基线:文件 → 规则 → 压住的条数。读不到(文件不存在)按空基线算。
 *
 * @returns {Map<string, Map<string, number>>} 基线计数表(文件键与 eslint 输出同为仓内相对路径)。
 */
function readBaseline() {
  let raw = null
  try {
    raw = JSON.parse(readFileSync(path.join(CMS, 'eslint-suppressions.json'), 'utf8'))
  } catch {
    return new Map()
  }
  const out = new Map()
  for (const [file, rules] of Object.entries(raw)) {
    const byRule = new Map()
    for (const [rule, v] of Object.entries(rules)) {
      byRule.set(rule, v.count)
    }
    out.set(file.replaceAll('\\', '/'), byRule)
  }
  return out
}

/**
 * 文件路径 → 域名:src/lib/<域> 与 src/components/<域> 各取子域名
 * (2026-08-26 Frank:components 也按子域列行,不再挤成一行),src 其余归 cms-other。
 * 2026-08-26 页面域立闸(route-file-names / page-compose-only)后,(frontend) 也进报告:
 * src/app/(frontend)/<路由>/ 记 frontend/<路由>,(frontend) 根下的散文件记 frontend
 * (2026-08-29 Frank「这个前缀应该是 frontend 吧」,行名对齐目录名)—— 账单看不见等于没立。
 *
 * @param {string} file 绝对或相对路径。
 * @returns {string} 域名。
 */
function domainOf(file) {
  const p = file.replaceAll('\\', '/')
  const lib = p.match(/src\/lib\/([^/]+)\//)
  if (lib != null) {
    return 'lib/' + lib[1]
  }
  const comp = p.match(/src\/components\/([^/]+)\//)
  if (comp != null) {
    return 'components/' + comp[1]
  }
  if (p.includes('src/components/')) {
    return 'components'
  }
  const page = p.match(/src\/app\/\(frontend\)\/([^/]+)\//)
  if (page != null) {
    return 'frontend/' + page[1]
  }
  if (p.includes('src/app/(frontend)/')) {
    return 'frontend'
  }
  // 兜不进任何域目录的散件按它真实所在的目录出行(2026-08-29 Frank
  // 「cms-other 就改成具体是哪个目录就显示哪个目录」—— lib 根的共享叶子记 lib,
  // components 根的记 components,别的照它的相对目录)。
  const m = p.match(/src\/(.+)\/[^/]+$/)
  if (m != null) {
    return m[1]
  }
  return 'src'
}

/**
 * 工单里的规则组按命中行数降序(sort 比较器,双参签名由 Array.prototype.sort 定)。
 *
 * @param {[string, {lines: string[]}]} a 一组 [规则, 组]。
 * @param {[string, {lines: string[]}]} b 另一组。
 * @returns {number} 排序差值。
 */
function byLinesDesc(a, b) {
  return b[1].lines.length - a[1].lines.length
}

/**
 * 主流程:一次空基线 eslint → 对着 suppressions 拆「活/欠账」→ 汇总表进终端、
 * 汇总 + 全量明细进一份带本地时间戳的 markdown。argv[2] 给了规则名就只看那条规则。
 */
function main() {
  const t0 = Date.now()
  let ruleFilter = null
  if (process.argv[2] != null && process.argv[2] !== '') {
    ruleFilter = process.argv[2]
  }
  const results = runEslint()
  const baseline = readBaseline()

  const byDomain = new Map()
  for (const f of results) {
    const rel = path.relative(CMS, f.filePath).replaceAll('\\', '/')
    const fileBase = baseline.get(rel)
    const byRuleFound = new Map()
    for (const m of f.messages) {
      let id = m.ruleId
      if (id == null) {
        id = 'parse'
      }
      if (ruleFilter != null && id !== ruleFilter) {
        continue
      }
      if (byRuleFound.has(id) === false) {
        byRuleFound.set(id, { sev: m.severity, lines: [] })
      }
      byRuleFound.get(id).lines.push(`- ${rel}:${m.line} ${m.message}`)
    }
    const d = domainOf(rel)
    if (byDomain.has(d) === false) {
      // 零账域也登记一行 0/0/0(2026-08-29 Frank「报告怎么没包 frontend」——
      // 页面域刚清零后从表里隐身,「没盖」和「零账」长得一样;现在扫过的域必出行)。
      byDomain.set(d, { liveErr: 0, liveWarn: 0, debt: 0, files: new Set(), byRule: new Map() })
    }
    if (byRuleFound.size === 0) {
      continue
    }
    const g = byDomain.get(d)
    g.files.add(rel)
    for (const [id, found] of byRuleFound) {
      let b = 0
      if (fileBase != null && fileBase.has(id)) {
        b = fileBase.get(id)
      }
      const suppressed = Math.min(found.lines.length, b)
      const live = found.lines.length - suppressed
      g.debt += suppressed
      if (found.sev === SEV_ERROR) {
        g.liveErr += live
      } else {
        g.liveWarn += live
      }
      if (g.byRule.has(id) === false) {
        g.byRule.set(id, { lines: [] })
      }
      const grp = g.byRule.get(id)
      for (const ln of found.lines) {
        grp.lines.push(ln)
      }
    }
  }

  const domains = [...byDomain.keys()].sort()
  const stamp = stampNow()
  let head = '全量'
  if (ruleFilter != null) {
    head = ruleFilter
  }
  let totalE = 0
  let totalW = 0
  let totalB = 0
  const md = [`# eslint 分域报告(${head}) ${stamp}`, '', '| 域 | error | warn | 基线欠账 | 文件数 |', '| --- | ---: | ---: | ---: | ---: |']
  console.log('域'.padEnd(20) + 'error'.padStart(7) + 'warn'.padStart(7) + '基线欠账'.padStart(8) + '  文件')
  for (const d of domains) {
    const g = byDomain.get(d)
    totalE += g.liveErr
    totalW += g.liveWarn
    totalB += g.debt
    md.push(`| ${d} | ${g.liveErr} | ${g.liveWarn} | ${g.debt} | ${g.files.size} |`)
    console.log(d.padEnd(20) + String(g.liveErr).padStart(7) + String(g.liveWarn).padStart(7) + String(g.debt).padStart(10) + String(g.files.size).padStart(6))
  }
  md.push(`| **合计** | **${totalE}** | **${totalW}** | **${totalB}** | |`, '')
  md.push('error/warn = 基线放行后的活警报;基线欠账 = suppressions 压住的存量(修一批跑 `npm run lint:prune` 收紧)。', '')
  md.push('明细含全部命中(活 + 欠账),按 域 → 规则 → 行:', '')
  for (const d of domains) {
    const g = byDomain.get(d)
    md.push(`## ${d}(${g.liveErr + g.liveWarn + g.debt})`, '')
    for (const [id, grp] of [...g.byRule.entries()].sort(byLinesDesc)) {
      md.push(`### ${id}(${grp.lines.length})`, '', ...grp.lines, '')
    }
  }
  const outDir = path.resolve(CMS, OUT_DIR)
  mkdirSync(outDir, { recursive: true })
  // 只留最新一份(2026-08-29 Frank「新报告生成要删除老报告」):同前缀的旧时间戳文件先清,
  // 报告是当下的体检单不是史料,攒一堆只会让人翻错旧单。
  for (const stale of readdirSync(outDir)) {
    if (stale.startsWith('lint-') && stale.endsWith('.md')) {
      rmSync(path.join(outDir, stale))
    }
  }
  const outFile = path.join(outDir, `lint-${stamp}.md`)
  writeFileSync(outFile, md.join('\n'), 'utf8')
  console.log(`\n合计 活 error ${totalE} / 活 warn ${totalW} / 基线欠账 ${totalB},耗时 ${((Date.now() - t0) / 1000).toFixed(1)}s`)
  console.log(`报告:${path.relative(process.cwd(), outFile)}`)
  process.exitCode = totalE > 0 ? 1 : 0
}

main()
