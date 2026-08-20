// 重复代码检查(2026-08-19 立)。
//
// 为什么是脚本不是 eslint 规则:eslint 一次只看一个文件,而重复恰恰是**跨文件**的事 ——
// 同一段逻辑抄在两个域里,单看哪一个文件都挑不出毛病。
//
// 判据同宪法「什么值得收拢成单一来源」:**判据是有没有重复,不是整不整齐。**
// 所以这里报的是「逐字重复」,不是「长得像」—— 后者会把一堆本来就该各写各的东西凑成一堆。
//
// 用法:node scripts/dupcheck.mjs [目录…]     默认扫 src/lib
//       node scripts/dupcheck.mjs --min 6     改最小重复行数(默认 8)
import fs from 'node:fs'
import path from 'node:path'

const args = process.argv.slice(2)
const minIdx = args.indexOf('--min')
const MIN_LINES = minIdx >= 0 ? Number(args[minIdx + 1]) : 8
const roots = args.filter((a, i) => !a.startsWith('--') && i !== minIdx + 1)
const TARGETS = roots.length ? roots : ['src/lib']

// 注释与字符串不算重复:两处各写各的中文注释不是复制,而两段一样的字符串表往往是配置不是逻辑。
function normalize(line) {
  return line
    .replace(/\/\/.*$/, '')
    .replace(/(['"`])(?:\\.|(?!\1).)*\1/g, '""')
    .replace(/\s+/g, ' ')
    .trim()
}

// 一行里除掉字符串、数字与标点之后还剩什么 —— 那才是"代码"。
function meat(n) {
  return n.replace(/""/g, '').replace(/[^A-Za-z_$]/g, '')
}

// 这个窗口里有没有**代码结构**(调用、赋值、控制流、await)。
//
// 🔴 这是把「值得收拢的逻辑重复」和「本来就该长一样的数据表」分开的那条线。
// i18n 的三语词典、各省的常量表,每一行都是 `键: 值,` —— 它们逐字重复是**设计如此**,
// 报出来只会让人开始无视这个检查。第一版用「标识符够不够多」判,挡不住(键名个个不同),
// 换成「有没有代码结构」才准(2026-08-19 两版实撞)。
function hasCode(key) {
  let n = 0
  if (/\w\s*\(/.test(key)) n += 1
  if (/[^:=!<>]=[^=]/.test(key)) n += 1
  if (/(if|for|while|return|await|throw|=>)|=>/.test(key)) n += 1
  return n >= 2
}

// 🔵 默认跳过的目录:**那里的重复是设计如此,不是味道**。
//   · `i18n/` —— 三语词典,结构平行正是它存在的方式(宪法:三语对齐靠类型强制);
//   · `db/sql.ts` —— 同一张表的几条查询本来就长得像,SQL 的收拢判据在别处。
//   要看它们就加 `--all`。
const SKIP = [path.join('lib', 'i18n'), path.join('db', 'sql.ts')]
const ALL = args.includes('--all')

function skipped(full) {
  if (ALL) return false
  return SKIP.some((frag) => full.includes(frag))
}

function walk(dir, out) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name)
    if (skipped(full)) continue
    const st = fs.statSync(full)
    if (st.isDirectory()) walk(full, out)
    else if (name.endsWith('.ts') || name.endsWith('.tsx')) out.push(full)
  }
  return out
}

const files = []
for (const t of TARGETS) if (fs.existsSync(t)) walk(t, files)

// 每个文件切成「归一化后的非空代码行」,记住原始行号
const docs = []
for (const file of files) {
  const raw = fs.readFileSync(file, 'utf8').split(/\r?\n/)
  let inBlock = false
  const lines = []
  raw.forEach((text, i) => {
    let t = text
    if (inBlock) {
      const end = t.indexOf('*/')
      if (end === -1) return
      t = t.slice(end + 2)
      inBlock = false
    }
    const start = t.indexOf('/*')
    if (start !== -1) {
      const end = t.indexOf('*/', start + 2)
      if (end === -1) { inBlock = true; t = t.slice(0, start) } else t = t.slice(0, start) + t.slice(end + 2)
    }
    const n = normalize(t)
    // 🔴 只留**有真代码**的行。判据:抹掉字符串与标点之后还剩得下东西。
    //    不这么判会栽在数据表上 —— i18n 的三语词典每一行抹完都是 `"": ""`,
    //    整份词典会被报成几百组"重复"。一个乱叫的检查比没有更糟(2026-08-19 第一版实撞)。
    if (meat(n).length >= 8) lines.push({ n, at: i + 1 })
  })
  docs.push({ file, lines })
}

// 滑窗哈希:连续 MIN_LINES 行归一化后完全一致 = 一处重复
const seen = new Map()
for (const d of docs) {
  for (let i = 0; i + MIN_LINES <= d.lines.length; i += 1) {
    const key = d.lines.slice(i, i + MIN_LINES).map((x) => x.n).join('\n')
    // 没有代码结构 = 数据表,不是值得收拢的逻辑重复(见 hasCode 上面那段)
    if (!hasCode(key)) continue
    const where = { file: d.file, at: d.lines[i].at }
    const got = seen.get(key)
    if (got) got.push(where)
    else seen.set(key, [where])
  }
}

const clones = []
for (const [key, spots] of seen) {
  if (spots.length < 2) continue
  // 同一文件内相邻窗口会重复命中,只留每组第一处
  const uniq = []
  for (const s of spots) {
    if (!uniq.some((u) => u.file === s.file && Math.abs(u.at - s.at) < MIN_LINES)) uniq.push(s)
  }
  if (uniq.length >= 2) clones.push({ key, spots: uniq })
}

// 长的先报:重复越长越值得收拢
clones.sort((a, b) => b.key.length - a.key.length)

if (!clones.length) {
  console.log(`未发现 ${MIN_LINES} 行以上的逐字重复(扫了 ${files.length} 个文件)`)
  process.exit(0)
}

console.log(`发现 ${clones.length} 组 ${MIN_LINES} 行以上的逐字重复(扫了 ${files.length} 个文件):\n`)
for (const c of clones.slice(0, 30)) {
  console.log(c.spots.map((s) => `${s.file}:${s.at}`).join('  ↔  '))
  console.log(c.key.split('\n').slice(0, 4).map((l) => `    ${l.slice(0, 96)}`).join('\n'))
  console.log(`    …共 ${c.key.split('\n').length} 行\n`)
}
process.exit(1)
