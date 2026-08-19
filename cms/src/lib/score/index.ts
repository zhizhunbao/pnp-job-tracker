// 估分域的桶 —— **客户端也安全的那半**:四套算分器,全是纯函数,不碰库。
//
// 为什么单独存在:四件套原先平铺在 lib/ 顶层(pnpSelfScore / crsEstimate / mbEoiEstimate / scoreLine),
// 一个调用点常要写两三行 import(`pathVerdict` 写了 4 行)。收成一个模块之后外部只认这一个入口。
//
// 🔴 **四件套不是重复,是四套不同的制度**,别手痒合并:
//    · pnpSelfScore  省提名自评(BC/SK/ON 各自的查表)
//    · crsEstimate   联邦 EE 的 CRS
//    · mbEoiEstimate 曼省 EOI(文件头有三条代数级的「为何不能复用」论证)
//    · scoreLine     估分 × 抽选线的三态判定(在/上/下)
//
// 🔴 **取数那半在 `./server`**(scoreTables / occCompetition 要连库)——
//    分界不是风格,是**运行环境**:能在浏览器跑的进这里,要连库的进 `./server`。
//    `PnpScoreCard.tsx` 是 `'use client'` 且取的是**值**(scoreProvince / DEFAULT_PROFILE),
//    混一个桶就会把连接池整条链拉进浏览器包 —— tsc 全绿,build 才炸(lib/jobs 08-18 实撞)。
//
// 🔴 外部一律从这两个门取(eslint 边界闸盯着);模块内部文件之间走相对路径,**不从桶取**。
//    测试是例外,照 lib/chat 的规矩直接点文件(只被测试用的名字不进桶:
//    bonusPoints / estimateFsw67 / marginOf / ScoreVsLine)。

// ── 省提名自评:查表算分 + 流对齐 ────────────────────────────────────────────
export { DEFAULT_PROFILE, EDU_KEYS, gridStreamOf, scoreProvince, streamMatches, systemShort } from './pnpSelfScore'
export type { DrawRow, EduKey, ScoreFactor, SelfProfile } from './pnpSelfScore'

// ── 联邦 EE:CRS 估分 ───────────────────────────────────────────────────────
export { estimateCrs } from './crsEstimate'
export type { CrsEstimateProfile, EeGridRow } from './crsEstimate'

// ── 曼省 EOI:自己一套制度 ─────────────────────────────────────────────────
export { estimateMbEoi } from './mbEoiEstimate'
export type { MbEduKey, MbProfile } from './mbEoiEstimate'

// ── 估分 × 抽选线:三态 ────────────────────────────────────────────────────
export { isAboveLine, isBelowLine, lineStateOf } from './scoreLine'
export type { LineState } from './scoreLine'
