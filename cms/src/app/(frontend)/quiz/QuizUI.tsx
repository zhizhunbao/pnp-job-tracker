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
import { Button, UI } from '../ui'
import type { Lang } from '@/lib/i18n'
import type { L } from '@/lib/fields'

// 题面/选项的三语文本 —— 形状跟着**字段库**走(lib/fields 的 L),这里只负责按当前语言取。
// 2026-08-17:先前这里另抄了一份一模一样的 type L,两份定义各活各的,是真重复。
export type { L } from '@/lib/fields'
export const pickL = (x: L | string, lang: Lang): string => (typeof x === 'string' ? x : x[lang])

// 进度文字:三句住这里(先前是覆盖 SurveyJS 的 questionsProgressText;
// 「已答 0/2 题」那套考试口吻 2026-07-31 被 Frank 点名,改成建档口吻)
const PROGRESS: Record<Lang, string> = { zh: '已填 {0}/{1} 项', en: '{0}/{1} completed', ko: '{0}/{1} 완료' }

export const QUIZ_CSS = `
.qzTitle{font-size:19px;font-weight:700;line-height:1.55;color:${UI.text};margin:0 0 16px}
/* 题干下的一句小注(可多选/其中含义…)。先前三个页面各写各的负 margin,间距各差 1-2px */
.qzSub{font-size:12.5px;line-height:1.55;color:${UI.text3};margin:-11px 0 15px}
/* 选项两列铺开(≥900px):卡片宽度本来就有 1280,单列会让一行只放一个 15px 的选项、
   剩下的宽度全空着,题目还被拉长到要滚(2026-08-11 Frank「为什么没有按宽度展开」)。
   最多两列 —— 三列以上 A/B/C/D 的扫读顺序就乱了。 */
.qzList{display:grid;grid-template-columns:1fr;gap:10px;margin:0;padding:0;border:0}
@media(min-width:900px){.qzList{grid-template-columns:1fr 1fr}}
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
/* 多选题与单选题是同一张卡片,只把字母徽标换成对勾;分值自成一列右对齐(多值拆列,不塞进文字尾巴) */
.qzPts{margin-left:auto;padding-left:10px;flex-shrink:0;color:${UI.text3};font-size:13px;font-variant-numeric:tabular-nums}
.qzItem--on .qzPts{color:${UI.primaryDeep}}
/* 动作条:桌面粘在内容底,手机钉在视口底 —— **每一页同一个地方**
   (2026-08-03 Frank「下一题在最下面点不到」「下一题位置还不统一」:答题页内容短、
   撑不满一屏时 sticky 压根不触发,实测每页落点 574/619/756 各不相同) */
.quizBar{position:sticky;bottom:0;z-index:2;background:#fff;border-top:1px solid ${UI.hairline};
  margin-top:18px;padding:10px 0 8px;display:flex;align-items:center;justify-content:flex-end;gap:12px;
  min-height:56px;box-sizing:border-box}
/* 两颗按钮之间那句灰字**只填空隙**:永不折行(折一行按钮就跟着上下跳),窄到放不下就整句不出 ——
   375 上两颗定宽按钮之间只剩 75px,任何一句真话都装不下,截断的半句比不写更糟 */
.qzHint{flex:1;min-width:0;font-size:12.5px;color:${UI.text3};white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
/* 翻题不跳版:题区**最小**高 560,不是固定高 —— 固定高会把长的职业页塞进一个内层滚动框,
   于是「已选 7 个」这种动态区被推到框外看不见,还多出一根滚轮(2026-08-11 Frank 两张实拍)。
   改成 min-height 后:短题由 flex 留白撑到 560、动作条落在同一条基线;长题让页面自己长,
   动作条靠 sticky 粘在视口底 —— 照样一直点得到,而且没有内层滚轮。 */
.plQuizPad{display:flex;flex-direction:column;min-height:560px;box-sizing:border-box}
.plQuizPad .quizBar{margin-top:auto}
/* margin-top:auto 只对**弹性子项**生效:题目外面还套了层 div 的(分值卡),那层必须自己也是
   撑满的弹性列,否则动作条就贴在内容底下,每题落点各不相同(08-10 实拍:时薪题的按钮比别的题高 366px)。
   **只给内层用**:把它加到 .plQuizPad 自己身上,min-height:0 会盖掉那 560 的最小高(08-11 实撞)。 */
.qzFill{display:flex;flex-direction:column;flex:1;min-height:0}
@media(max-width:640px){
  .quizBar{position:fixed;left:0;right:0;bottom:0;margin:0;padding:10px 16px;border-top:1px solid ${UI.border};
    box-shadow:0 -2px 8px rgba(0,0,0,.04);z-index:30}
  /* 手机上这句灰字不出(位置只剩 75px),但**这一格要留着**——它是把上一题顶到左下角的那根撑杆 */
  .qzHint{visibility:hidden}
  .plQuizPad{height:auto;min-height:0;overflow:visible;scrollbar-gutter:auto;padding:0 0 78px}
}`

export const QuizStyle = () => <style>{QUIZ_CSS}</style>

export const QuizTitle = ({ children }: { children: React.ReactNode }) => <div className="qzTitle">{children}</div>
export const QuizSub = ({ children }: { children: React.ReactNode }) => <div className="qzSub">{children}</div>

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

const PREV_BTN: React.CSSProperties = {
  border: `1px solid ${UI.border}`, background: '#fff', color: UI.text2, borderRadius: 8,
  padding: '11px 26px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
}
// 定宽:文案从「下一题」变成「完成」时按钮不许跟着缩(缩一次 = 落点挪一次)
const NEXT_BTN: React.CSSProperties = { padding: '11px 26px', fontSize: 14, minWidth: 118, textAlign: 'center' }

// 每一题的动作条:上一题恒在左下、下一题恒在右下,中间那句灰字只填空隙 —— **不许把按钮挤走**
// (先前灰字自带 marginRight:auto,和上一题的 auto 平分空隙,有提示的那一题按钮就往中间挪了 250px)。
// 四种题(选职业/单选/多选/数字)都调这一把:「下一题位置还不统一」的病根是各页各写一遍按钮。
export function QuizNav({ prevLabel, nextLabel, onPrev, onNext, nextDisabled, hint, doneLabel, onDone }: {
  prevLabel: string
  nextLabel: string
  onPrev?: () => void            // 不传 = 这是整卷第一题,没有上一题
  onNext: () => void
  nextDisabled?: boolean
  hint?: React.ReactNode
  /** 旁路收卷钮,摆在「下一题」旁边(2026-08-13 Frank:「有的时候只是改一个答案」——
   *  改完不该被逼着把答过的题再翻一遍)。调用方只在**全卷已答满**时传:没答满就收卷,结果出不来。 */
  doneLabel?: string
  onDone?: () => void
}) {
  return (
    <div className="quizBar">
      {onPrev && <button type="button" onClick={onPrev} style={PREV_BTN}>{prevLabel}</button>}
      <span className="qzHint">{hint}</span>
      {/* 2026-08-16 Frank「这个调换一下位置」:「下一题」在内、「完成」收尾在最右 ——
          答题主动线一路向右点到底,收卷是终点动作,摆在动作条末端 */}
      <Button kind="primary" disabled={nextDisabled} onClick={onNext}
        style={{ ...NEXT_BTN, ...(nextDisabled ? { background: UI.hairline, color: UI.text3, cursor: 'default' } : null) }}>
        {nextLabel}
      </Button>
      {doneLabel && onDone ? <button type="button" onClick={onDone} style={PREV_BTN}>{doneLabel}</button> : null}
    </div>
  )
}

// 一道多选题的选项组 —— 与单选题**同一张卡片**,只把 radio 换成 checkbox、字母徽标换成对勾。
// 官方加分项(「符合以下哪些」)先前是一条一屏的是/否题:BC 一个省就 7 屏,答完一遍要点二十几下。
// 这些条目彼此独立、又同属一张官方表,合成一屏多选既少点二十几下,也更像官方表本来的样子。
export function QuizChecks({ items }: {
  items: { key: string; text: string; pts?: number | null; on: boolean; toggle: (v: boolean) => void }[]
}) {
  return (
    <div className="qzList">
      {items.map((it) => (
        <label key={it.key} className={`qzItem${it.on ? ' qzItem--on' : ''}`}>
          <input type="checkbox" checked={it.on} onChange={(e) => it.toggle(e.target.checked)} />
          <span className="qzBadge" aria-hidden>{it.on ? '✓' : ''}</span>
          <span className="qzText">{it.text}</span>
          {/* 加分项有负分(MB 风险评估 -100):符号跟着分值走,不拼「+-100」 */}
          {it.pts != null ? <span className="qzPts">{it.pts >= 0 ? `+${it.pts}` : it.pts}</span> : null}
        </label>
      ))}
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
