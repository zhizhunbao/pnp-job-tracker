/**
 * colors 域的纯函数(零 JSX 零 hook)。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */
import {
  GRADE_AMBER_MIN,
  GRADE_C_2,
  GRADE_C_3,
  GRADE_C_4,
  GRADE_C_5,
  GRADE_C_NONE,
  GRADE_DEEP_GREEN_MIN,
  GRADE_GREEN_MIN,
  GRADE_NEUTRAL_MIN,
} from './constants'

/**
 * 通道档(1-5)→ 档色:5 深绿、4 绿、3 默认灰黑、2 琥珀、1/缺 灰。
 * (scoreColor 0-100 版随加权分退役;签名沿旧 API 收 undefined —— 存量调用方
 * 有直接传可选字段的,收窄留给消费页形制化批。)
 *
 * @param g 档位;null/undefined = 缺档。
 * @returns 十六进制色(值与名字都在 constants,这里只做阈值判定)。
 */
export function gradeColor(g: number | null | undefined): string {
  if (g == null) {
    return GRADE_C_NONE
  }
  if (g >= GRADE_DEEP_GREEN_MIN) {
    return GRADE_C_5
  }
  if (g >= GRADE_GREEN_MIN) {
    return GRADE_C_4
  }
  if (g >= GRADE_NEUTRAL_MIN) {
    return GRADE_C_3
  }
  if (g >= GRADE_AMBER_MIN) {
    return GRADE_C_2
  }
  return GRADE_C_NONE
}
