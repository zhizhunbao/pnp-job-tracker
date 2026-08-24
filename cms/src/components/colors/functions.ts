/**
 * colors 域的纯函数(零 JSX 零 hook)。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */
import { GRADE_AMBER_MIN, GRADE_DEEP_GREEN_MIN, GRADE_GREEN_MIN, GRADE_NEUTRAL_MIN } from './constants'

/**
 * 通道档(1-5)→ 档色:5 深绿、4 绿、3 默认灰黑、2 琥珀、1/缺 灰。
 * (scoreColor 0-100 版随加权分退役;签名沿旧 API 收 undefined —— 存量调用方
 * 有直接传可选字段的,收窄留给消费页形制化批。)
 *
 * @param g 档位;null/undefined = 缺档。
 * @returns 十六进制色。
 */
export function gradeColor(g: number | null | undefined): string {
  if (g == null) {
    return '#9ca3af'
  }
  if (g >= GRADE_DEEP_GREEN_MIN) {
    return '#166534'
  }
  if (g >= GRADE_GREEN_MIN) {
    return '#15803d'
  }
  if (g >= GRADE_NEUTRAL_MIN) {
    return '#374151'
  }
  if (g >= GRADE_AMBER_MIN) {
    return '#b45309'
  }
  return '#9ca3af'
}
