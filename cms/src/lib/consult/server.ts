/**
 * 对话域的**服务端**门 —— 跑工具循环的那半。
 *
 * `functions.ts` 自己**不 import `payload`**:连接池由调用方注进来(`consult({ db, … })`),
 * 所以这个门与 `./index` 的区别只是「对外露哪几个名字」,不是「谁能连库」。
 * 分开是因为它落在 `../agent/server` 上 —— 那道门按约定属于服务端半边,
 * 让 `'use client'` 的文件够得着它,连接池迟早跟着进浏览器包(tsc 全绿、只有 `build` 才炸)。
 *
 * @author Frank
 * @time 2026-08-21 01:05:30
 */

export {
  consult,
} from './functions'

export type {
  ConsultIn, ConsultOut, Fact, Profile, RunOut, Turn,
} from './types'
