// 职业显示名的**唯一判定**(2026-08-02):各语言先用库里的短名,没有再回退完整译名 / 官方名。
//
// 为什么单独一个文件:选职业控件与报告页都要用它,而这两个组件互相引用(报告页里挂着选职业控件)——
// 判定放在任何一边都会成环。它是纯函数、无 React,住 lib 才对。
//
// 短名从哪来:ETL `clean/04g_short_noc_titles.py`(本地模型压缩 + 撞车检测 + 人工裁决表)
// → `noc_descriptions.title_{zh,ko,en}_short`。**官方英文 title 一个字都不动**,短名是另外的列。
// 前端不做截断 —— 截字符串是清洗,清洗归数据层(CLAUDE.md)。
type OccNameRow = {
  title?: string          // NOC 官方英文名(引用依据)
  titleZh?: string
  titleKo?: string
  titleZhShort?: string
  titleKoShort?: string
  titleEnShort?: string
}

export function pickName(f: OccNameRow | null | undefined, lang: string): string {
  if (!f) return ''
  if (lang === 'zh') return f.titleZhShort || f.titleZh || f.title || ''
  if (lang === 'ko') return f.titleKoShort || f.titleKo || f.title || ''
  return f.titleEnShort || f.title || ''
}
