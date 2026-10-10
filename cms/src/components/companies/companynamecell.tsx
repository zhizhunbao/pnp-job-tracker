'use client'
/**
 * 基本信息卡「公司名称」那一格(2026-09-21 自 CompanyBasicCard 提出,那件超了行数上限):
 * 职位页 / 职位弹框里的公司信息卡递了点公司名的去处 —— 名字成公司页真链接(普通左键开公司弹框,Ctrl 点照常新开页),
 * 名字下面出库里存好的别名;公司弹框与公司页不递,照旧纯文字(别名在页眉副题)。没有公司页(slug 空)的也是纯文字。
 * 2026-10-09 N6 批(Frank「职位名、公司名、地点同形」「点击默认弹框」「弹框里再点叠一层,关只关顶层」):职位页 / 职位弹框那一支换
 * 全站名字组件 name 桶 CompanyName —— 英文公司名蓝链在上、界面语别名灰字在下(别名按界面语自取库里存好的中 / 韩名,
 * 原「别名」一格随之撤),点了经弹框总线叠开公司弹框;slug 空的 CompanyName 自己出黑字。
 * 递下来的点公司名回调从此只当开关读(给了 = 出这一支),函数本身不再调 —— 上游接线另批清。
 * 2026-10-09 N6b 批:那只回调换成显式开关 linked(true = 出 CompanyName 这一支,false = 纯文字),上游的点公司名接线清掉。
 *
 * @author Frank
 * @time 2026-09-21 18:30:00
 */
import { CompanyName } from '@/components/name'
import type { CompanyNameCellIn } from './types'

/**
 * 渲染公司名称那一格。
 *
 * @param props 公司档案与成不成链接(逐格注释见 CompanyNameCellIn)。
 * @returns 公司名(两行名字或纯文字)。
 */
export function CompanyNameCell({ company, linked }: CompanyNameCellIn) {
  return (
    <>
      {linked === false && company.name}
      {linked && (
        <CompanyName name={company.name} slug={company.slug} zh={company.aliasZh} ko={company.aliasKo} />
      )}
    </>
  )
}
