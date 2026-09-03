/**
 * pte lib 域的形状:音频库行、词典库行、练过档、三个芯的进出口。
 * 唯一的 import 是 lib/db 的连接面(基础设施叶子,`no-import-in-leaf` 钦定的特批)。
 *
 * @author Frank
 * @time 2026-09-03 16:00:00
 */
import type { Db } from '../db'

/**
 * pte_audio 的库行(`PTE_AUDIO_ONE`)。
 */
export type PteAudioDbRow = {
  /**
   * MIME。
   */
  mime: string | null

  /**
   * base64 正文。
   */
  b64: string | null
}

/**
 * 一段音频(洗净)。
 */
export type PteAudio = {
  /**
   * MIME。
   */
  mime: string

  /**
   * 字节。
   */
  bytes: Uint8Array
}

/**
 * 音频或没有。
 */
export type MaybePteAudio = PteAudio | null

/**
 * 取音频(`loadPteAudio`)的入参。
 */
export type PteAudioIn = {
  /**
   * 数据库连接。
   */
  db: Db

  /**
   * 题键。
   */
  qid: string
}

/**
 * 取音频的返回。
 */
export type PteAudioOut = Promise<MaybePteAudio>

/**
 * pte_dict 的库行(`PTE_DICT_ONE`)。
 */
export type PteDictDbRow = {
  /**
   * 词。
   */
  word: string | null

  /**
   * 音标。
   */
  phonetic: string | null

  /**
   * 中文释义(多义换行分隔)。
   */
  translation: string | null

  /**
   * 原形。
   */
  lemma: string | null
}

/**
 * 一条词典结果(洗净;空串 = 词典没给)。
 */
export type PteDictEntry = {
  /**
   * 词。
   */
  word: string

  /**
   * 音标。
   */
  phonetic: string

  /**
   * 中文释义(多义换行分隔)。
   */
  translation: string

  /**
   * 原形;空串 = 本身就是原形。
   */
  lemma: string
}

/**
 * 词典结果或没有。
 */
export type MaybePteDictEntry = PteDictEntry | null

/**
 * 查词(`loadPteDict`)的入参。
 */
export type PteDictIn = {
  /**
   * 数据库连接。
   */
  db: Db

  /**
   * 小写词。
   */
  word: string
}

/**
 * 查词的返回。
 */
export type PteDictOut = Promise<MaybePteDictEntry>

/**
 * 练过的题键清单。
 */
export type DoneKeys = string[]

/**
 * 用户 id(payload 给的是 number 或 string,原样带进 SQL 参数)。
 */
export type UserId = string | number

/**
 * users.pte_done 的库行(`USER_PTE_DONE`)。
 */
export type PteDoneDbRow = {
  /**
   * 档;NULL = 还没存过。
   */
  pteDone: PteDoneDoc | string | null
}

/**
 * 练过档。
 */
export type PteDoneDoc = {
  /**
   * 练过的题键。
   */
  done: DoneKeys

  /**
   * 最后写入时刻(ISO)。
   */
  updatedAt: string
}

/**
 * 取练过档(`loadPteDone`)的入参。
 */
export type PteDoneIn = {
  /**
   * 数据库连接。
   */
  db: Db

  /**
   * 用户 id。
   */
  userId: UserId
}

/**
 * 取练过档的返回。
 */
export type PteDoneOut = Promise<DoneKeys>

/**
 * 写练过档(`savePteDone`)的入参。
 */
export type PteDoneSaveIn = {
  /**
   * 数据库连接。
   */
  db: Db

  /**
   * 用户 id。
   */
  userId: UserId

  /**
   * 题键(已并集、已去重)。
   */
  done: DoneKeys
}

/**
 * 写练过档的返回(没有值)。
 */
export type SaveDoneOut = Promise<void>

/**
 * PUT /api/pte/done 的请求体形状(网络来的,逐格判后才用)。
 */
export type PteDoneBody = {
  /**
   * 客户端手里的题键。
   */
  done: DoneKeys
}

/**
 * 并集(`unionOf`)的入参。
 */
export type UnionIn = {
  /**
   * 库里的。
   */
  a: DoneKeys

  /**
   * 客户端的。
   */
  b: DoneKeys
}

/**
 * 题键串(`qidOfUrl` 的返回;空串 = 路径没有段)。
 */
export type Qid = string
