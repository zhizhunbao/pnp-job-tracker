// 判定域的桶 —— **客户端也安全的那半**:三层判定核 + 案例清单,全是纯函数,不碰库。
//
// 🔴 **三件套不是重复,是分层**,别手痒合并(合并 = 违反已定稿契约):
//    · pathVerdict     判定核。契约定稿,**不许改形状**;对 chat 只允许被 `import type`(单向边,见文件头)
//    · tripleVerdict   组装器。自称「零新判定逻辑」,只把职业关/雇主关/你这边三关拼成一张卡
//    · employerVerdict 雇主关。单独一关,sponsorEmployers 也吃它
//
// 🔴 **取数那半在 `./server`**(tripleWire / verdictCache / reportFacts / caseFacts 要连库)——
//    分界不是风格,是**运行环境**:能在浏览器跑的进这里,要连库的进 `./server`。
//    `Cases.tsx` 是 `'use client'` 且取的是**值**(CASES),混一个桶就会把连接池整条链
//    拉进浏览器包 —— tsc 全绿,build 才炸(lib/jobs 08-18 实撞)。
//
// 🔴 外部一律从这两个门取(eslint 边界闸盯着);模块内部文件之间走相对路径,**不从桶取**。
//    测试是例外,照 lib/chat 的规矩直接点文件(只被模块内或测试用的名字不进桶:
//    blockCost / tripleVerdict 全家 / designationMatch 全家)。

// ── 判定核:一条路径的结论、杠杆、职业口径 ────────────────────────────────
export { jobPathways, pathLevers, pathVerdict } from './pathVerdict'
export type {
  DesignatedEmployerRow, OccupationRow, PathwayVerdict,
  VerdictData, VerdictDrawRow, VerdictLever, VerdictProfile, VerdictReason,
} from './pathVerdict'

// ── 雇主关(在招担保雇主那条线也吃它)────────────────────────────────────
export { employerVerdict } from './employerVerdict'
export type { EmployerFacts, EmployerVerdict } from './employerVerdict'

// ── 案例库:完美问题 + 完美结果,判定的验收标尺 ──────────────────────────
export { CASES } from './caseLibrary'
