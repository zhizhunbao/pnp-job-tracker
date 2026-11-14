'use client'
/**
 * gate 域的结构:一页表单的末段「生成简历」(2026-11-12 Frank「最后用 sonnet 生成简历,可以选择模板。这部分功能是收费的」):
 * 两张模板卡单选(传统单栏 / 现代色条,卡上是缩略样子),下面主钮「生成简历」与钮旁灰字「用 1 个额度,剩 N 个」;
 * 档案还不够生成时钮不可点、灰字改说缺什么;结果提示一行(读屏会念)。点钮先存档案再生成,生成完开预览框。
 * 2026-11-13 Frank「生成简历 应该和 修改档案 应该是分开的吧」:这一段搬进生成简历弹框(GateCvBox)的「模板」卡,
 * 外面不再包带标签的一格(卡头就是标签);主钮旁多一颗「保存」(只存填的内容、不生成,免得关框丢字)。
 *
 * @author Frank
 * @time 2026-11-12 18:00:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { Notice } from '@/components/notice'
import { makeOptPick } from '@/components/profile'
import {
  EDU_BTN_KIND, FILL_ROLE, FORM_PRIMARY_KIND, FORM_SECONDARY_KIND, K_CV_BTN, K_CV_COST, K_CV_NEED, K_TPL_CLASSIC,
  K_CV_TITLE, K_TPL_MODERN, TEXT_NONE, TPL_GROUP_ROLE,
} from './constants'
import { LEFT_NONE, TPL_CLASSIC, TPL_MODERN } from './cv'
import { tplClsOf } from './functions'
import type { GateCvGenIn } from './types'
import css from './gate.module.css'

/**
 * 「生成简历」一段。
 *
 * @param props 表单整机、生成整机与取词。
 * @returns 模板卡、主钮、灰字与提示。
 */
export function GateCvGen({ g, c, t }: GateCvGenIn) {
  const modern = g.edit.cvc.tpl === TPL_MODERN
  return (
    <>
      <div className={cssOf(css.tpls)} role={TPL_GROUP_ROLE} aria-label={t(K_CV_TITLE)}>
        <Button kind={EDU_BTN_KIND} className={tplClsOf({ on: modern === false })} active={modern === false}
          onClick={makeOptPick({ value: TPL_CLASSIC, onPick: g.edit.cvc.onTpl })}>
          <span className={cssOf(css.tplPaper)}>
            <span className={cssOf(css.tplName)} />
            <span className={cssOf(css.tplRule)} />
            <span className={cssOf(css.tplLine)} />
            <span className={cssOf(css.tplLine)} />
            <span className={cssOf(css.tplRule)} />
            <span className={cssOf(css.tplLine)} />
          </span>
          <span>{t(K_TPL_CLASSIC)}</span>
        </Button>
        <Button kind={EDU_BTN_KIND} className={tplClsOf({ on: modern })} active={modern}
          onClick={makeOptPick({ value: TPL_MODERN, onPick: g.edit.cvc.onTpl })}>
          <span className={cssOf(css.tplPaper)}>
            <span className={cssOf(css.tplBand)} />
            <span className={cssOf(css.tplNameOn)} />
            <span className={cssOf(css.tplRuleOn)} />
            <span className={cssOf(css.tplLine)} />
            <span className={cssOf(css.tplLine)} />
            <span className={cssOf(css.tplRuleOn)} />
            <span className={cssOf(css.tplLine)} />
          </span>
          <span>{t(K_TPL_MODERN)}</span>
        </Button>
      </div>
      <div className={cssOf(css.cvAct)}>
        <Button kind={FORM_PRIMARY_KIND} onClick={c.onGen} busy={c.busy} disabled={c.ready === false}>
          {t(K_CV_BTN)}
        </Button>
        <Button kind={FORM_SECONDARY_KIND} onClick={g.edit.onSave} busy={g.edit.saving} disabled={g.edit.nameBad}>
          {t('gate.save')}
        </Button>
        {c.ready === false && <span className={cssOf(css.fillHint)}>{t(K_CV_NEED)}</span>}
        {c.ready && c.left !== LEFT_NONE && <span className={cssOf(css.fillHint)}>{t(K_CV_COST, { n: c.left })}</span>}
      </div>
      <div role={FILL_ROLE}>
        {c.msg.key !== TEXT_NONE && <Notice kind={c.msg.kind}>{t(c.msg.key)}</Notice>}
      </div>
    </>
  )
}
