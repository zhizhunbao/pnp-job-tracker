'use client'
/**
 * 第 2 步:求职信 —— 进来就按这一岗的 JD 与选用的简历写好一封(写的时候摆进度),直接在多行框里改;
 * 写不进 PDF 的字在框下列出来;「按职位重写」再写一封。
 * 2026-10-07 二改(Frank「得根据 jd 写啊」):原「按我的模板填好职位名、公司名与署名」撤,信由模型按 JD 写。
 * 同日批 C:免费档 AI 写信一辈子试用 3 个职位 —— 标题行出「AI 试用还剩 N 次」;用完了信框上出黄条(这封是通用模板)
 * 与升级钮,「按职位重写」改成开升级框,付完回到本岗。
 * 2026-10-10 投递框三步(Frank「求职信也这么写」「用户只要一点击,就弹收费。用户自己弄 不收费」):与「简历」页同形 ——
 * 卡头右侧「按职位改写」「上传求职信」;左列单选(这一岗的草稿、改写的、上传的、写过的信、不附求职信),右列选中那封的正文,
 * 右上「修改」换成多行框就地改。进来不再自动写信,试用余量、黄条与升级钮撤;「按职位改写」免费号弹升级框,Pro 开对照框。
 *
 * @author Frank
 * @time 2026-10-07 03:00:00
 */
import { Button } from '@/components/button'
import { ApplyCard } from './applycard'
import { ApplyFileInput } from './applyfileinput'
import { ApplyPick } from './applypick'
import { ApplyRewrite } from './applyrewrite'
import {
  BTN_SECONDARY, CHAR_SEP, DATE_LEN, RADIO_LETTER, RESUME_ACCEPT, REWRITE_KEY, TEXT_NONE,
} from './constants'
import { OPT_NONE } from './letter'
import type { ApplyStepIn } from './types'
import css from './apply.module.css'

/**
 * 第 2 步。
 *
 * @param props 整机面板。
 * @returns 求职信分区卡与对照框。
 */
export function ApplyLetter({ p }: ApplyStepIn) {
  const rows = []
  for (const o of p.opts) {
    rows.push(
      <ApplyPick key={o.key}
        group={RADIO_LETTER}
        label={o.name}
        sub={p.t(o.subKey, { d: o.subAt.slice(0, DATE_LEN) })}
        tag={TEXT_NONE}
        checked={o.key === p.pick}
        onPick={p.letterPickOf(o)} />,
    )
  }
  const acts = (
    <>
      <Button kind={BTN_SECONDARY} sm onClick={p.onLetterRewrite}>{p.t(REWRITE_KEY)}</Button>
      <Button kind={BTN_SECONDARY} sm onClick={p.onLetterAdd} busy={p.letterBusy}>{p.t('ap.upLetter')}</Button>
      <ApplyFileInput onMount={p.onLetterInputMount} onPick={p.onLetterFile} accept={RESUME_ACCEPT} />
    </>
  )
  return (
    <ApplyCard p={p} acts={acts}>
      <div className={css.split}>
        <div className={css.picks}>
          {rows}
          <ApplyPick group={RADIO_LETTER}
            label={p.t('ap.noLetter')}
            sub={p.t('ap.noLetterSub')}
            tag={TEXT_NONE}
            checked={p.pick === OPT_NONE}
            onPick={p.letterPickOf(p.noneOpt)} />
        </div>
        {p.pick !== OPT_NONE && p.editing === false && (
          <div className={css.paper}>
            <span className={css.paperEdit}>
              <Button kind={BTN_SECONDARY} sm onClick={p.onEdit}>{p.t('ap.modify')}</Button>
            </span>
            <div className={css.paperText}>{p.letter}</div>
          </div>
        )}
        {p.pick !== OPT_NONE && p.editing && (
          <textarea className={css.letter} value={p.letter} onChange={p.onLetter} onBlur={p.onLetterBlur}
            aria-label={p.t('ap.letter')} spellCheck />
        )}
      </div>
      {p.badChars.length > 0 && <div className={css.bad}>{p.t('ap.badChars')} {p.badChars.join(CHAR_SEP)}</div>}
      {p.rw != null && <ApplyRewrite p={p} />}
    </ApplyCard>
  )
}
