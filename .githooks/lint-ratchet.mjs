// warn 棘轮(Frank 2026-08-21「先写闸门」):已重构十二域的 eslint warning 总数只许降不许升。
//
// · error 级早有闸(pre-push --quiet);这道管的是 warn —— 清账成果不许被新增 warn 悄悄回填;
// · 基线存 .githooks/lint-baseline.json(随仓库走);现值低于基线时自动改写基线文件,
//   提示 git add —— 棘轮只朝一个方向转;
// · 作用域与 eslint.config.mjs 的 REFACTORED 常量一致,改那边要同步这里。
import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const BASELINE_PATH = join(HERE, 'lint-baseline.json')
const CMS = join(HERE, '..', 'cms')
const SCOPE = [
  'src/lib/consult', 'src/lib/db', 'src/lib/employers', 'src/lib/jobs', 'src/lib/pathways', 'src/lib/ruling', 'src/lib/gauge', 'src/lib/points',
  'src/lib/agent', 'src/lib/llm', 'src/lib/error.ts', 'src/lib/log.ts',
]

const baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf8'))

let raw = ''
try {
  raw = execSync(`npx eslint ${SCOPE.join(' ')} -f json`, {
    cwd: CMS, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'],
  })
} catch (e) {
  // eslint 有 error 时以非零码退出,但 stdout 里仍是完整 JSON —— error 拦截归 --quiet 那道闸管
  if (e.stdout == null || e.stdout === '') {
    console.error('[ratchet] eslint 没跑起来:', e.message)
    process.exit(1)
  }
  raw = e.stdout
}

let warnings = 0
for (const file of JSON.parse(raw)) {
  warnings += file.warningCount
}

if (warnings > baseline.warnings) {
  console.error(`[ratchet] 十二域 warning ${warnings} 条,高于基线 ${baseline.warnings} —— 棘轮只许降不许升,把新增的清掉再推。`)
  process.exit(1)
}
if (warnings < baseline.warnings) {
  writeFileSync(BASELINE_PATH, JSON.stringify({ scope: baseline.scope, warnings }, null, 2) + '\n')
  console.log(`[ratchet] 十二域 warning ${warnings} 条,低于基线 ${baseline.warnings} —— 基线已收紧,记得 git add .githooks/lint-baseline.json。`)
  process.exit(0)
}
console.log(`[ratchet] 十二域 warning ${warnings} 条,与基线持平。`)
