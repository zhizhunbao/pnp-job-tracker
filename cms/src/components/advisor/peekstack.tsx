'use client'
/**
 * 弹框栈的渲染件(2026-09-21 Frank「点公司就弹公司的框?然后还能点回来,还能看该公司其他的职位?」):
 * 宿主(职位板 / 职位详情页 / 公司页 / 雇主板)起一台 modal 域的 useLayerStack,本件把各层从下到上画出来 ——
 * 职位层 = 职位描述弹框,公司层 = 公司弹框;后画的在上面。× 与 Esc 都只关最上面一层,底下那层原样还在。
 * 点了往上叠还是同框换,在这里定:职位描述弹框里点公司名 / 相关职位、公司弹框里点在招职位 = 往上叠;
 * 公司弹框里点相似雇主 = 同框换一家(2026-09-19 口径,只有最上面那层点得到,所以换最上面一层就是换它自己)。
 * 2026-10-09 N6b 批:上面「点了往上叠还是同框换」不再在这里定 —— N6 起弹框里的名字都由 name 桶经弹框总线叠一层
 * (相似雇主也叠,不再同框换);本件只画层,不再往弹框里注三只手柄(makePushJob / makePushCo / makeSwapCo 随之撤)。
 *
 * @author Frank
 * @time 2026-09-21 17:00:00
 */
import { ActModal } from './actmodal'
import { CompanyModal } from './companymodal'
import { LAYER_JOB } from './constants'
import { peekKeyOf } from './functions'
import type { PeekStackIn } from './types'

/**
 * 渲染弹框栈。
 *
 * @param props 弹框栈、界面语言、分层态与 NOC 描述表(逐格注释见 PeekStackIn)。
 * @returns 各层浮层;栈空时什么都不渲。
 */
export function PeekStack({ stack, lang, plan, nocDesc }: PeekStackIn) {
  return (
    <>
      {stack.layers.map(function renderLayer(layer, at) {
        if (layer.kind === LAYER_JOB) {
          return (
            <ActModal key={peekKeyOf({ layer, at })} job={layer.job} lang={lang} plan={plan} nocDesc={nocDesc}
              onClose={stack.pop} />
          )
        }
        return (
          <CompanyModal key={peekKeyOf({ layer, at })} slug={layer.co.slug} name={layer.co.name} lang={lang}
            onClose={stack.pop} />
        )
      })}
    </>
  )
}
