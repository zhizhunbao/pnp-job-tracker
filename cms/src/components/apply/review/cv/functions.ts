/**
 * review 子桶 cv 的行为:修改简历右侧栏的草稿运算。
 * 2026-11-10 按「大于 1000 就拆子桶」(样张 apply/letter):review 的 functions.ts 过线,切出修改简历右侧栏用的纯函数。
 * 依赖只许 review → 本子桶(经 index.ts);本子桶不取 review 的任何东西,常量自抄、形状自声明。
 *
 * @author Frank
 * @time 2026-11-10 23:00:00
 */
import { CV_ORG_SEP, CV_YEAR_SEP, TEXT_NONE } from './constants'
import type { CvEdit, CvEditWork, WithDescIn } from './types'

/**
 * 换掉一段工作的要点,其余照旧。
 *
 * @param x 草稿、第几段与新要点。
 * @returns 新草稿。
 */
export function withDescOf(x: WithDescIn): CvEdit {
  const work: CvEditWork[] = []
  for (const [i, w] of x.cv.work.entries()) {
    if (i === x.i) {
      work.push({ title: w.title, org: w.org, fromY: w.fromY, toY: w.toY, desc: x.desc })
    } else {
      work.push(w)
    }
  }
  return { summary: x.cv.summary, skills: x.cv.skills, work }
}

/**
 * 一段工作的抬头:职位、公司与起止年(只显示)。
 *
 * @param w 一段工作。
 * @returns 一行字。
 */
export function cvHeadOf(w: CvEditWork): string {
  const names: string[] = []
  for (const s of [w.title, w.org]) {
    if (s !== TEXT_NONE) {
      names.push(s)
    }
  }
  const years: string[] = []
  for (const s of [w.fromY, w.toY]) {
    if (s !== TEXT_NONE) {
      years.push(s)
    }
  }
  names.push(years.join(CV_YEAR_SEP))
  return names.join(CV_ORG_SEP)
}
