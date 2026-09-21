'use client'
/**
 * 弹框栈的渲染件(2026-09-21 Frank「点公司就弹公司的框?然后还能点回来,还能看该公司其他的职位?」):
 * 宿主(职位板 / 职位详情页 / 公司页 / 雇主板)起一台 modal 域的 useLayerStack,本件把各层从下到上画出来 ——
 * 职位层 = 职位描述弹框,公司层 = 公司弹框;后画的在上面。× 与 Esc 都只关最上面一层,底下那层原样还在。
 * 点了往上叠还是同框换,在这里定:职位描述弹框里点公司名 / 相关职位、公司弹框里点在招职位 = 往上叠;
 * 公司弹框里点相似雇主 = 同框换一家(2026-09-19 口径,只有最上面那层点得到,所以换最上面一层就是换它自己)。
 *
 * @author Frank
 * @time 2026-09-21 17:00:00
 */
import { ActModal } from './actmodal'
import { CompanyModal } from './companymodal'
import { LAYER_JOB } from './constants'
import { makePushCo, makePushJob, makeSwapCo, peekKeyOf } from './functions'
import type { PeekStackIn } from './types'

/**
 * 渲染弹框栈。
 *
 * @param props 弹框栈、界面语言、分层态与 NOC 描述表(逐格注释见 PeekStackIn)。
 * @returns 各层浮层;栈空时什么都不渲。
 */
export function PeekStack({ stack, lang, plan, nocDesc }: PeekStackIn) {
  const onOpenJob = makePushJob(stack)
  const onPushCo = makePushCo(stack)
  const onSwapCo = makeSwapCo(stack)
  return (
    <>
      {stack.layers.map(function renderLayer(layer, at) {
        if (layer.kind === LAYER_JOB) {
          return (
            <ActModal key={peekKeyOf({ layer, at })} job={layer.job} lang={lang} plan={plan} nocDesc={nocDesc}
              onOpenJob={onOpenJob}
              onOpenCompany={onPushCo}
              onClose={stack.pop} />
          )
        }
        return (
          <CompanyModal key={peekKeyOf({ layer, at })} slug={layer.co.slug} name={layer.co.name} lang={lang}
            onOpenJob={onOpenJob}
            onOpenCompany={onSwapCo}
            onClose={stack.pop} />
        )
      })}
    </>
  )
}
