'use client'
/**
 * 职位描述弹框:C1 走查拍板(2026-07-07)后它只剩 JD 快看;E8-11 B2 起正文抽为 JobBody
 * (与 `/jobs/[id]` 页面同源),本件只剩浮层壳。
 * #112(2026-07-20 Frank):标题栏「AI 顾问」钮摘除 —— 点钮会关本框跳顾问弹框,
 * 描述/整理版一去不回。
 * 2026-08-28 换装批自 Advisor.tsx 重写落位(浮层机器与埋点迁 hooks,页眉成件)。
 * 2026-09-14 Frank「这个翻译呢」「这个翻译也不对啊」×2:标题下那行一律是**标题译名**(懒翻,进程内缓存),不再放 NOC 小类名 ——
 * 「Data Engineer → 数据科学家」是分类名,用户读成翻译就是错;分类名在「职业分类」弹框里另有位置。
 * 2026-09-16 Frank「右边的按钮部分和左边的中文翻译放到一行」「可以」:页眉与正文要读同一份 JD 身体状态机,
 * 浮层与正文下沉到内层 ActJd(以重译代数作 key 重挂);本件只留弹框面板、浮层机器与标题译名。
 * 2026-09-21 照公司弹框的形,正文下面接公司信息卡与相关职位卡(Frank「参考一下公司弹框」):
 * 宿主(弹框栈 PeekStack)多注两个回调 —— 点公司名、点相关职位都往栈上叠一层。
 * 2026-09-23 标题译名 hook 搬去 jobtitle 桶(职位详情页也要用);这一岗库里已存标题译名就直接出、不打接口(Frank「统一成标题译名」「应该优先使用详情下的翻译 更准吧」)。
 * 2026-09-28 并壳(Frank「别并存啊」):外层起的机器从 useFloatPanel 换成 modal 桶的 useFrame(同一个理由:内层整块重挂时位置尺寸不丢)。
 * 2026-10-03 付费闭环批 A1:未登录点开第 3 个不同的职位时,这一层先出访客向导(profile 桶 GateWizard)——
 * 关掉向导 = 关掉这一层;注册完收起向导、亮出这一岗。Google 整页登录回跳到这一岗的职位整页。
 * 2026-10-04 改判:不再数第 3 个,未登录开职位弹框一律先出向导。
 * 同日访客四题改版:GateWizard 自 profile 桶迁入 gate 桶,改从 gate 桶取(契约不变)。
 * 2026-10-09 N6b 批:正文下面两张卡里的名字 N6 起由 name 桶自开弹框,宿主注的点公司名 / 点相关职位两个回调撤。
 *
 * @author Frank
 * @time 2026-08-28 22:40:00
 */
import { GATE_INTENT_JOB, JD_PANEL_H, JD_PANEL_W, JD_PREF, URL_JOB_HEAD } from './constants'
import { ActJd } from './actjd'
import { storedTitleOf, useTitleTrans } from '@/components/jobtitle'
import { useFrame } from '@/components/modal'
import { GateWizard } from '@/components/gate'
import { makeT } from '@/lib/i18n'
import { useActModal } from './hooks'
import type { ActModalIn } from './types'

/**
 * 渲染职位描述弹框。
 *
 * @param props 这一岗、界面语言、分层态、描述表与关闭回调。
 * @returns 浮层;该先弹访客向导时是向导。
 */
export function ActModal({ job, lang, plan, onClose }: ActModalIn) {
  const a = useActModal({ job, plan })
  const frame = useFrame({ win: { memo: JD_PREF, w: JD_PANEL_W, h: JD_PANEL_H }, draggable: true, edgeResize: false })
  const sub = useTitleTrans({
    title: job.title, id: job.id, lang, cached: storedTitleOf({ row: job, lang }), gen: a.gen,
  })
  if (a.gate) {
    return (
      <GateWizard t={makeT(lang)} intent={GATE_INTENT_JOB} returnTo={URL_JOB_HEAD + String(job.id)}
        onClose={onClose}
        onDone={a.onGateDone} />
    )
  }
  return (
    <ActJd key={a.gen} job={job} lang={lang} plan={plan} onClose={onClose} frame={frame} sub={sub} a={a} />
  )
}
