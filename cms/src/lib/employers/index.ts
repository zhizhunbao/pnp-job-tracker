// 雇主域的桶 —— **客户端也安全的那半**:筛选枚举、对比栏的存取键、四张表的行形状。
//
// 这个域装的是「雇主」这一个实体的四条线:
//    · designatedEmployers  AIP 指定雇主名录(被指定 ≠ 在招,口径见文件头)
//    · sponsorEmployers     在招担保雇主(名录 × 职位库的交集)
//    · employerCompare      多雇主对照(+ employerCompareShared:客户端也要的键与上限)
//    · companyResearch      单公司背调
//    · directory            职业目录(雇主板的下钻维度)
//
// 🔴 **取数那半在 `./server`** —— 分界是**运行环境**:能在浏览器跑的进这里,要连库/要 pool 的进 `./server`。
//    `Employers.tsx` 是 `'use client'` 且取的是**值**(EMP_PROGRAMS),`Compare.tsx` 取 `CMP_KEY`;
//    混一个桶就会把连接池整条链拉进浏览器包 —— tsc 全绿,build 才炸(lib/jobs 08-18 实撞)。
//
// 🔴 外部一律从这两个门取(eslint 边界闸盯着);模块内部文件之间走相对路径,**不从桶取**。
//    测试是例外,照 lib/chat 的规矩直接点文件。

// ── AIP 名录:筛选枚举与行形状(取数在 ./server)────────────────────────────
export { EMP_PROGRAMS } from './designatedEmployers'
export type { EmployerFilters, EmployerPage, EmployerRow } from './designatedEmployers'

// ── 在招担保雇主:行形状 ──────────────────────────────────────────────────
export type { SponsorEmployerRow } from './sponsorEmployers'

// ── 多雇主对照:客户端也要的存取键与上限 ──────────────────────────────────
export { CMP_KEY, CMP_MAX } from './employerCompareShared'
export type { CompareRow } from './employerCompareShared'

// ── 职业目录:行形状 ──────────────────────────────────────────────────────
export type { OccRow } from './directory'
