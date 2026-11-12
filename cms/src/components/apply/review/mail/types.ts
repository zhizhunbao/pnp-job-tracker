/**
 * review 子桶 mail 的形状(本桶自声明)。
 *
 * @author Frank
 * @time 2026-11-12 01:00:00
 */

/**
 * saveMailEdit 的入参。
 */
export type MailSaveIn = {
  /**
   * 职位 id。
   */
  jobId: number

  /**
   * 正文;null = 恢复默认。
   */
  body: string | null

  /**
   * 写本人改过的正文(恢复默认写空串)。
   */
  setMail: (v: string) => void

  /**
   * 写报错词条。
   */
  setErr: (v: string) => void

  /**
   * 关右侧栏。
   */
  close: () => void
}
