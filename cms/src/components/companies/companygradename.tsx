'use client'
/**
 * 带档色的档名(四维评分里那个彩字):档位 → 色由 colors 域的 gradeColor 算,
 * 这里只负责把算出来的色挂上去。
 * 2026-08-28 拆域批自 jobs/Company.tsx 的 gname 闭包重写成件。
 *
 * style 白名单:档色是数据算出来的运行时值,不是静态样式。
 *
 * @author Frank
 * @time 2026-08-28 18:13:09
 */
import { gradeColor } from '@/components/colors'
import type { CompanyGradeNameIn } from './types'

/**
 * 一个带档色的档名。
 *
 * @param props 档位与档名(逐格注释见 CompanyGradeNameIn)。
 * @returns 彩字档名。
 */
export function CompanyGradeName({ grade, name }: CompanyGradeNameIn) {
  return (
    // eslint-disable-next-line react/forbid-dom-props -- 档色由 gradeColor 按档位算出,是运行时值
    <b style={{ color: gradeColor(grade) }}>{name}</b>
  )
}
