'use client'
/**
 * 把 AI 文本里的【小标题】加粗,保留换行;markdown 加粗残渣 ** 先剥(第 16 轮 #43:
 * 正文是 pre-wrap 纯文本渲染,模型写的 **加粗** 不会变粗只碍眼;流式期间跨帧的孤 * 下一帧
 * 凑齐即消,无需处理边界)。
 *
 * ⚠️ 它是**函数不是组件**(小写名,不进 JSX 树):调用点在本域的 AI 速读段与
 * components/advisor 的三处流式区,签名由那三处定死 —— 本批只许动 advisor 的 import 行,
 * 所以形状照旧;随 advisor 换装批一起收成组件。
 * 2026-08-28 换装批自 Jd.tsx 提出成文件(内联上距改类:首个小标题不留上距)。
 *
 * @author Frank
 * @time 2026-08-28 19:15:06
 */
import { cssOf } from '@/components/css'
import { AI_BOLD_RE, AI_HEAD_RE, AI_HEAD_SPLIT_RE, TEXT_NONE } from './constants'
import { aiHeadClsOf, aiParaOf } from './functions'
import css from './jobs.module.css'

/**
 * 渲染一段 AI 文本。
 *
 * @param text 模型吐出来的文本。
 * @returns 加粗小标题 + 保留换行的正文段。
 */
export function renderAI(text: string): React.ReactNode {
  const out = []
  const segs = text.replace(AI_BOLD_RE, TEXT_NONE).split(AI_HEAD_SPLIT_RE)
  for (let i = 0; i < segs.length; i = i + 1) {
    const seg = String(segs[i])
    if (AI_HEAD_RE.test(seg)) {
      out.push(<strong key={i} className={aiHeadClsOf(i)}>{seg}</strong>)
      continue
    }
    const body = aiParaOf(seg)
    if (body !== TEXT_NONE) {
      out.push(<span key={i} className={cssOf(css.aiPara)}>{body}</span>)
    }
  }
  return out
}
