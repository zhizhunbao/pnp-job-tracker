'use client'
/**
 * 分类弹框主体(#176 分类 =「这职业是干嘛的」;Frank 2026-07-21 三卡改版):
 * 三张带 title 的卡 —— ① 职业分类(点哪个字段该行高亮)② 官方主要职责 ③ 任职要求。
 * 顶部两钮:显示中文对照(职责/要求实时翻,`/api/noc/translate` 懒调朋友 qwen,进程缓存;
 * 数据层只存英文,英文界面不出这个钮)/ AI 速读(点了才生成,复用顾问免费额度
 * field=occRead,按 NOC 缓存 —— 不点不烧,#176 零成本默认不破)。
 * 2026-08-28 换装批自 Advisor.tsx 重写落位(两台机器迁 hooks 的 useNocTrans / useAiRead)。
 *
 * @author Frank
 * @time 2026-08-28 22:40:00
 */
import { makeT } from '@/lib/i18n'
import { ADV_IDLE, FIELD_OCC_READ, TEXT_NONE } from './constants'
import { AiReadCard } from './aireadcard'
import { CategoryActs } from './categoryacts'
import { CategoryIdCard } from './categoryidcard'
import { idRowsOf, listItemsOf, nocOf, zhItemsOf } from './functions'
import { useAiRead, useNocTrans } from './hooks'
import { NocList } from './noclist'
import type { CategoryPanelIn } from './types'

/**
 * 渲染分类弹框主体。
 *
 * @param props 这一岗、界面语言、分层态、描述表与点进来的那一格。
 * @returns 钮条 + AI 速读卡 + 三张卡。
 */
export function CategoryPanel({ job, lang, plan, nocDesc, srcField }: CategoryPanelIn) {
  const t = makeT(lang)
  const noc = nocOf({ nocDesc, noc: job.noc })
  const trans = useNocTrans({ noc: job.noc, lang })
  const ai = useAiRead({ field: FIELD_OCC_READ, id: job.noc, lang, trackName: TEXT_NONE })
  let duties = TEXT_NONE
  let reqs = TEXT_NONE
  let fetched = TEXT_NONE
  if (noc != null) {
    duties = noc.duties
    reqs = noc.requirements
    fetched = noc.fetched
  }
  let transDuties = TEXT_NONE
  let transReqs = TEXT_NONE
  if (trans.trans != null) {
    transDuties = trans.trans.duties
    transReqs = trans.trans.requirements
  }
  return (
    <>
      <CategoryActs t={t} lang={lang} trans={trans} ai={ai} />
      {ai.on && ai.status !== ADV_IDLE && <AiReadCard t={t} loggedIn={plan.loggedIn} ai={ai} />}
      <CategoryIdCard t={t} rows={idRowsOf({ t, job, noc })} srcField={srcField} />
      <NocList head={t('fact.nocDuties')} fetched={fetched}
        items={listItemsOf(duties)}
        zhItems={zhItemsOf({ show: trans.showTrans, text: transDuties })} />
      <NocList head={t('fact.nocReqs')} fetched={fetched}
        items={listItemsOf(reqs)}
        zhItems={zhItemsOf({ show: trans.showTrans, text: transReqs })} />
    </>
  )
}
