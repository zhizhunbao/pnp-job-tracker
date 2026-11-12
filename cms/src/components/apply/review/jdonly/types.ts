/**
 * review 子桶 jdonly 的形状(本桶自声明)。
 *
 * @author Frank
 * @time 2026-11-12 03:00:00
 */

/**
 * 现状接口回包里本桶真读的一格。
 */
export type JdStateJson = {
  /**
   * 职位描述。
   */
  jd?: string
}

/**
 * loadJdOnly 的入参。
 */
export type JdLoadIn = {
  /**
   * 职位 id。
   */
  jobId: number

  /**
   * 写职位描述。
   */
  setJd: (v: string) => void
}

/**
 * 不做事的点击手柄。
 */
export type NoopFn = () => void
