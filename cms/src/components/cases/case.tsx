'use client'
/**
 * 处境页正文(样板 C01)。骨架照职位详情页:Shell 轨 + 右上返回 + H1 + 白卡;
 * 壳件(Header/Footer)由页面门拼,本件只出正文。
 * 2026-09-03 Frank「详情页返回按钮都在右上,样式位置固定统一」:返回改递 Shell 的 back 槽
 * (button 桶 BackButton,goBackOr 落 /plan/pr),不再在 H1 行内自摆。
 * 版式顺序由 Frank 2026-08-11 定死:**他问的那个省 → 为什么 → 由易到难的替代 →
 * 走不通的 → 第一步**。上一版做成「四块无主的事实」,被点名「列一堆信息,
 * 用户看了有什么用」—— 摆事实不等于给答案。每条路径下面挂的是判定核给的理由
 * (met/gap/excluded),官方原句原样摆,页面不改写、不加戏。
 * 只收 caseId 不收文案:标题与原话在 i18n(case.<id>.*),按当前语言取 ——
 * 服务端定死一种,切语言就切不动了。
 * 2026-08-27 换装批自 Case.tsx(PascalCase 迁移存量)整体重写。
 *
 * @author Frank
 * @time 2026-08-27 01:30:00
 */
import { BackButton } from '@/components/button'
import { useLang } from '@/components/i18n'
import { Shell } from '@/components/shell'
import { SHELL_BOTTOM, SHELL_TOP, URL_BACK } from './constants'
import { caseLabelKeyOf } from './functions'
import { CaseAsked } from './caseasked'
import { CaseBlocked } from './caseblocked'
import { CaseFirstStep } from './casefirststep'
import { CaseMine } from './casemine'
import { CaseOthers } from './caseothers'
import { CaseQuote } from './casequote'
import type { CaseIn } from './types'
import css from './cases.module.css'

/**
 * 处境页正文。
 *
 * @param props 案例编号与判定核给的整份答案(逐格注释见 CaseIn)。
 * @returns 正文(Shell 轨 + 五块卡 + 免责小注)。
 */
export function Case({ caseId, answer }: CaseIn) {
  const [lang, , t] = useLang()
  return (
    <div className={css.grow}>
      <Shell top={SHELL_TOP} bottom={SHELL_BOTTOM} back={<BackButton fallback={URL_BACK} label={t('detail.back')} />}>
        <div className={css.headRow}>
          <h1 className={css.h1}>{t(caseLabelKeyOf({ id: caseId }))}</h1>
        </div>
        <CaseQuote lang={lang} caseId={caseId} t={t} />
        <CaseAsked answer={answer} t={t} />
        <CaseOthers answer={answer} t={t} />
        <CaseBlocked answer={answer} t={t} />
        <CaseFirstStep answer={answer} t={t} />
        <CaseMine caseId={caseId} t={t} />
        <div className={css.note}>{t('case.note')}</div>
      </Shell>
    </div>
  )
}
