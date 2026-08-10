'use client'
// 答题壳 = 全站答题页共用的外观(题干 / 进度 / 选项 / 底部动作条)。
// Frank 2026-08-03「保证所有答题页面一致,包括选工作」—— 一致的做法不是两边照着抄一遍样式,
// 而是**同一个组件**:选工作页(OccPicker)与四选一那几页(QuizForm)渲染的是同一批 DOM 与同一段 CSS,
// 想不一致都不行。以前那套「样式写两处」正是「下一题位置不统一」「胶囊跑偏」的土壤。
//
// 这一层是 2026-08-03 撤掉 SurveyJS 之后自己出的(那个框架 1.43 MB JS + 306 KB CSS,
// 换来的只是 10 道单选题的翻页,而站内为了压它的默认样式写了 25 处 .sd-* 覆盖)。
// 选项用**原生 radio**:同名 radio 的方向键切换、Tab 焦点、读屏播报全是浏览器自带的,
// 自绘控件反而要一条条补回来(可访问性是 CLAUDE.md 里不上砧板的四样之一)。
import { UI } from '../ui/primitives'
import type { Lang } from '../jobs/i18n'

// 三语文本对象(字段库里题干/选项的原生形状:加一门语言=加一个键)
export type L = { default: string; 'zh-cn': string; ko: string }
export const pickL = (x: L | string, lang: Lang): string =>
  typeof x === 'string' ? x : (lang === 'zh' ? x['zh-cn'] : lang === 'ko' ? x.ko : x.default)

// 进度文字:三句住这里(先前是覆盖 SurveyJS 的 questionsProgressText;
// 「已答 0/2 题」那套考试口吻 2026-07-31 被 Frank 点名,改成建档口吻)
const PROGRESS: Record<Lang, string> = { zh: '已填 {0}/{1} 项', en: '{0}/{1} completed', ko: '{0}/{1} 완료' }

export const QUIZ_CSS = `
.qzTitle{font-size:19px;font-weight:700;line-height:1.55;color:${UI.text};margin:0 0 16px}
.qzList{display:flex;flex-direction:column;gap:10px;margin:0;padding:0;border:0}
/* 整块卡片就是一个点击目标(2026-07-31 Frank「点一下还不行,要点好几下」):
   内边距必须在 label 上 —— 留在外层时那一圈 11-14px 不属于 label,点上去 radio 收不到 */
.qzItem{display:flex;align-items:center;gap:12px;width:100%;box-sizing:border-box;padding:11px 14px;margin:0;
  background:#fff;border:1px solid ${UI.border};border-radius:10px;cursor:pointer}
.qzItem:hover{border-color:#93c5fd;background:#f8fbff}
.qzItem input{position:absolute;opacity:0;width:0;height:0}
.qzItem:has(input:focus-visible){outline:2px solid ${UI.primary};outline-offset:2px}
/* 字母徽标 A/B/C/D(原生 radio 的圆点点击目标感弱,Frank 拿三个答题项目对比过) */
.qzBadge{flex-shrink:0;width:26px;height:26px;border:1px solid ${UI.border};border-radius:7px;background:#fff;
  color:${UI.text2};font-size:12.5px;font-weight:700;display:flex;align-items:center;justify-content:center}
.qzItem--on{border-color:${UI.primary};background:#eff6ff}
.qzItem--on .qzBadge{background:${UI.primary};border-color:${UI.primary};color:#fff}
.qzItem--on .qzText{color:${UI.primaryDeep};font-weight:600}
.qzText{font-size:15px;line-height:1.5}
/* 动作条:桌面粘在内容底,手机钉在视口底 —— **每一页同一个地方**
   (2026-08-03 Frank「下一题在最下面点不到」「下一题位置还不统一」:答题页内容短、
   撑不满一屏时 sticky 压根不触发,实测每页落点 574/619/756 各不相同) */
.quizBar{position:sticky;bottom:0;z-index:2;background:#fff;border-top:1px solid ${UI.hairline};
  margin-top:18px;padding:10px 0 8px;display:flex;align-items:center;justify-content:flex-end;gap:12px;
  min-height:56px;box-sizing:border-box}
/* 翻题不跳版(08-10 Frank「两页高度字号不一致,用户会感觉有跳跃」):
   题区统一最小高,动作条 margin-top:auto 钉在题区底 —— 每一页「下一题」落点相同;
   选职业页的职业区自己内滚(.occChips),不再把卡撑成两屏 */
.plQuizPad{display:flex;flex-direction:column;min-height:440px}
.plQuizPad .quizBar{margin-top:auto}
.occChips{max-height:296px;overflow-y:auto}
@media(max-width:640px){
  .quizBar{position:fixed;left:0;right:0;bottom:0;margin:0;padding:10px 16px;border-top:1px solid ${UI.border};
    box-shadow:0 -2px 8px rgba(0,0,0,.04);z-index:30}
  .plQuizPad{padding-bottom:78px;min-height:0}
}`

export const QuizStyle = () => <style>{QUIZ_CSS}</style>

export const QuizTitle = ({ children }: { children: React.ReactNode }) => <div className="qzTitle">{children}</div>

// 进度(2026-08-03 #253):选工作是决定线第 1 步,也算一项 —— 从第一屏到最后一题同一套数
export function QuizProgress({ lang, done, total }: { lang: Lang; done: number; total: number }) {
  return (
    <div style={{ margin: '0 0 26px' }}>
      <div style={{ height: 5, borderRadius: 999, background: UI.hairline, overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: 999, background: UI.primary, transition: 'width .2s',
          width: `${Math.round((done / Math.max(total, 1)) * 100)}%` }} />
      </div>
      <div style={{ margin: '6px 0 0', fontSize: 11.5, color: UI.text3, textAlign: 'right' }}>
        {PROGRESS[lang].replace('{0}', String(done)).replace('{1}', String(total))}
      </div>
    </div>
  )
}

// 底部动作条:左边一句灰字说明(没选时说清为什么走不了),右边按钮。两页共用同一把
export function QuizBar({ hint, children }: { hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="quizBar">
      {hint ? <span style={{ fontSize: 12.5, color: UI.text3, marginRight: 'auto' }}>{hint}</span> : null}
      {children}
    </div>
  )
}

// 一道单选题的选项组。value 用受控 radio:选中不自动跳(2026-07-31 Frank),跳转永远由用户按
export function QuizChoices<T extends string | number>({ name, choices, value, onPick, lang }: {
  name: string
  choices: { value: T; text: L | string }[]
  value: T | undefined
  onPick: (v: T) => void
  lang: Lang
}) {
  return (
    <div className="qzList" role="radiogroup">
      {choices.map((c, i) => (
        <label key={String(c.value)} className={`qzItem${value === c.value ? ' qzItem--on' : ''}`}>
          <input type="radio" name={name} checked={value === c.value} onChange={() => onPick(c.value)} />
          <span className="qzBadge" aria-hidden>{String.fromCharCode(65 + i)}</span>
          <span className="qzText">{pickL(c.text, lang)}</span>
        </label>
      ))}
    </div>
  )
}
