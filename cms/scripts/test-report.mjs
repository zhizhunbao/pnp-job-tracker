/**
 * vitest 报告的 md 版(2026-08-26 Frank「可以也是 .md 版本的吗」;与 lint-report 同形制:
 * 一条命令、一次全量、一份带本地时间戳的 markdown 落 reports/)。
 *
 * 为什么是壳不是重写:真相是 vitest 自己(vitest.config.mts 已配 json reporter,
 * 每次 run 都写 reports/vitest.json)。本脚本只是跑一轮 vitest,然后把那份 JSON
 * 渲染成人读的 md:总览 + 逐文件表 + 失败明细(有失败才有该节)。
 *
 * 用法:`npm run test:report`。终端照旧看 vitest 自己的输出,md 落 reports/test-<时间戳>.md。
 *
 * @author Frank
 * @time 2026-08-26 14:45:00
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'

/**
 * cms/ 的绝对路径(全脚本的路径基准)。
 */
const CMS = path.resolve(import.meta.dirname, '..')

/**
 * 报告目录(相对 cms/,已 gitignore;与 lint 报告同屋)。
 */
const OUT_DIR = 'reports'

/**
 * vitest json reporter 的固定落点(vitest.config.mts 里配的)。
 */
const JSON_PATH = path.join(CMS, OUT_DIR, 'vitest.json')

/**
 * 本地时间戳 `YYYY-MM-DD-HHmm`(同 lint-report:toISOString 是 UTC,文件名会穿越)。
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
 * 跑一轮全量 vitest(终端输出直通给人看;json 由 config 里的 reporter 落盘)。
 * vitest 有失败时退出码非零 —— 不当异常,报告照出,失败正是报告要说的事。
 *
 * @returns {number} vitest 的退出码。
 */
function runVitest() {
  const r = spawnSync('npx', ['vitest', 'run'], { cwd: CMS, stdio: 'inherit', shell: true })
  if (r.status == null) {
    return 1
  }
  return r.status
}

/**
 * 一个测试文件的仓内相对路径(json 里是绝对路径,md 里读着太长)。
 *
 * @param {string} p 绝对路径。
 * @returns {string} 相对 cms/ 的路径。
 */
function relOf(p) {
  return path.relative(CMS, p).replaceAll('\\', '/')
}

/**
 * 主流程:跑 vitest → 读 json → 渲染 md(总览 + 逐文件表 + 失败明细)。
 */
function main() {
  const code = runVitest()
  const data = JSON.parse(readFileSync(JSON_PATH, 'utf8'))
  const stamp = stampNow()
  const md = [`# vitest 报告 ${stamp}`, '']
  md.push(`| 用例 | 过 | 挂 | 跳过 | 文件 |`)
  md.push(`| ---: | ---: | ---: | ---: | ---: |`)
  md.push(`| ${data.numTotalTests} | ${data.numPassedTests} | ${data.numFailedTests} | ${data.numPendingTests + data.numTodoTests} | ${data.testResults.length} |`)
  md.push('')
  md.push('| 文件 | 状态 | 用例 | 耗时 |')
  md.push('| --- | --- | ---: | ---: |')
  const failures = []
  for (const f of data.testResults) {
    const secs = ((f.endTime - f.startTime) / 1000).toFixed(1)
    let ok = 0
    for (const a of f.assertionResults) {
      if (a.status === 'passed') {
        ok += 1
      }
      if (a.status === 'failed') {
        failures.push({ file: relOf(f.name), name: a.fullName, messages: a.failureMessages })
      }
    }
    md.push(`| ${relOf(f.name)} | ${f.status} | ${ok}/${f.assertionResults.length} | ${secs}s |`)
  }
  if (failures.length > 0) {
    md.push('', `## 失败明细(${failures.length})`, '')
    for (const x of failures) {
      md.push(`### ${x.file} · ${x.name}`, '', '```', ...x.messages, '```', '')
    }
  }
  const outDir = path.resolve(CMS, OUT_DIR)
  mkdirSync(outDir, { recursive: true })
  // 只留最新一份(2026-08-29 Frank「新报告生成要删除老报告」):同前缀的旧时间戳文件先清,
  // 报告是当下的体检单不是史料,攒一堆只会让人翻错旧单。
  for (const stale of readdirSync(outDir)) {
    if (stale.startsWith('test-') && stale.endsWith('.md')) {
      rmSync(path.join(outDir, stale))
    }
  }
  const outFile = path.join(outDir, `test-${stamp}.md`)
  writeFileSync(outFile, md.join('\n'), 'utf8')
  console.log(`\n报告:${path.relative(process.cwd(), outFile)}`)
  process.exitCode = code
}

main()
