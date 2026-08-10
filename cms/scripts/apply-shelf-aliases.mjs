// 雇主中文灰注名回写(_enrich_shelf_aliases.py 三遍跑完后的 apply 步;放 cms/ 是为借它的 pg+dotenv)。
// 审样惯例:裸跑=只打印样本与计数,一行库都不写;带 --yes 才执行。
// 只补空:COALESCE(alias_zh,'')='' 才写——已有值(wikidata 公认译名/35 轮人审过的)绝不覆盖。
// 用法:cd cms && node scripts/apply-shelf-aliases.mjs [--yes]
import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// SHELF_ALIASES_IN = 输入覆盖:在 worktree 里跑、但要读主仓那份**正在被 ETL 写**的文件时用
// (worktree 里的是提交过的旧版)。不传 = 仓内默认路径,行为一字不变。
const IN = process.env.SHELF_ALIASES_IN || path.resolve(__dirname, '../../data/processed/shelf_aliases.json')
console.log('IN =', IN)

const alias = JSON.parse(fs.readFileSync(IN, 'utf-8'))
// 中英同字跳过(2026-08-09 Frank 审样撞见 `A&W -> A&W`):灰注是给看不懂英文名的人看的,
// 跟英文名一模一样的「译名」只占一行位置、零信息。比大小写与空白后再比,别放过 `IKEA -> Ikea` 这种。
const same = (a, b) => a.replace(/\s+/g, '').toLowerCase() === b.replace(/\s+/g, '').toLowerCase()
const all = Object.entries(alias).filter(([, v]) => v.zh && ['wikidata', 'ai', 'ai-brand'].includes(v.src))
const rows = all
  .filter(([name, v]) => !same(v.zh, name))
  .map(([name, v]) => ({ name, slug: v.slug, zh: v.zh, src: v.src }))
const bySrc = rows.reduce((a, r) => ((a[r.src] = (a[r.src] ?? 0) + 1), a), {})
const dropped = all.length - rows.length
console.log(`可回写 ${rows.length} 家`, JSON.stringify(bySrc), dropped ? `(中英同字跳过 ${dropped} 家)` : '')
console.log('随机样 30:')
for (const r of [...rows].sort(() => 0.5 - Math.random()).slice(0, 30)) console.log(`  [${r.src}] ${r.name}  ->  ${r.zh}`)

if (!process.argv.includes('--yes')) {
  console.log('\n(审样模式,没写库;确认样本后加 --yes 执行)')
  process.exit(0)
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URI, ssl: { rejectUnauthorized: false } })

// 存量里的空转灰注先清掉:**一个汉字都没有的「中文名」不是译名**(`A&W -> A&W` / `Quiznos -> Quiznos`,
// 2026-08-09 Frank 在 AIP 表上撞见)。清成空 = 下面的「只补空」还能给它一次真译名的机会,
// 留着则永远占位。判据用汉字而不是「与英文名相同」:`SHAN -> Shan` 这种改了大小写的同样是空转。
const clean = await pool.query(
  `UPDATE companies SET alias_zh = NULL WHERE COALESCE(alias_zh, '') <> '' AND alias_zh !~ '[一-鿿]'`)
if (clean.rowCount) console.log(`清掉不含汉字的存量灰注 ${clean.rowCount} 家`)

let written = 0
for (let i = 0; i < rows.length; i += 500) {
  const chunk = rows.slice(i, i + 500)
  const res = await pool.query(
    `UPDATE companies c SET alias_zh = v.zh
     FROM jsonb_to_recordset($1::jsonb) AS v(slug text, zh text)
     WHERE c.slug = v.slug AND COALESCE(c.alias_zh, '') = ''`,
    [JSON.stringify(chunk.map((r) => ({ slug: r.slug, zh: r.zh })))],
  )
  written += res.rowCount
  console.log(`  ${Math.min(i + 500, rows.length)}/${rows.length} · 已写 ${written}`)
}
console.log(`done · 实写 ${written} 行(候选 ${rows.length},差值=库里已有值或 slug 不在)`)
await pool.end()
