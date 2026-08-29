'use client'
/**
 * legal 域的结构:法务四页(免责 / 隐私 / 条款 / 关于)共用的同一块正文白卡。
 * E4-02:内容各页自带三语字典(章节数组,住 lib/legal),lib/i18n 只管 UI 壳 ——
 * 法务长文不进全局字典;本件只是那份数据的渲染器。
 * 文案为模板级自拟,不构成法律意见(收入后请专业审阅,backlog)。
 * 语言/文案全站一处(LangProvider),初值由服务端 cookie 定,所以正文自己接 useLang。
 * 2026-08-27 换装批自 Legal.tsx 整体重写成小写件形制(8 处内联样式逐格迁类、
 * 散值进 constants、切片与取值进 functions、props 契约进 types);同批收壳件一刀:
 * 整页外框 / 顶栏 / 页脚的拼装归页面门(<Frame><Header/><Legal/><Footer/></Frame>,
 * 样张 companies),本件只出白卡本身。
 *
 * @author Frank
 * @time 2026-08-27 23:08:05
 */
import { useLang } from '@/components/i18n'
import { ICON_GAP } from './constants'
import { LegalSection } from './legalsection'
import type { LegalIn } from './types'
import css from './legal.module.css'

/**
 * 法务页正文白卡。
 *
 * @param props 三语正文字典与标题图标(逐格注释见 LegalIn)。
 * @returns 白卡(标题 + 更新日 + 各节)。
 */
export function Legal({ docs, icon }: LegalIn) {
  const [lang] = useLang()
  const doc = docs[lang]
  const sections = []
  for (const [k, s] of doc.sections.entries()) {
    sections.push(<LegalSection key={k} section={s} />)
  }
  return (
    <div className={css.card}>
      <h1 className={css.h1}>
        {icon}
        {icon != null && ICON_GAP}
        {doc.title}
      </h1>
      <div className={css.updated}>{doc.updated}</div>
      {sections}
    </div>
  )
}
