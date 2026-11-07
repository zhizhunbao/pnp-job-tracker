'use client'
/**
 * me 域的结构:「我的订阅」一整页 = 页标题(右边「升级 Pro」或「续买」)+ 子桶 sub 的正文
 * (2026-11-07 照效果图在新域重写,docs/design/我的/我的框架-20261107.md 2.5;「新岗推送」从「我的求职」挪来)。
 *
 * @author Frank
 * @time 2026-11-07 17:30:00
 */
import { SEC_SUB } from './constants'
import { MeHead } from './mehead'
import { SubActs, SubBody, useSub } from './sub'
import type { MeSubPageIn } from './types'

/**
 * 我的订阅一页。
 *
 * @param props 取词、窄屏否、导航抽屉开没开、拉开抽屉与到期日。
 * @returns 页标题 + 正文。
 */
export function MeSub({ t, narrow, open, onOpen, until }: MeSubPageIn) {
  const s = useSub({ t, until })
  return (
    <>
      <MeHead sec={SEC_SUB} t={t} narrow={narrow} open={open} onOpen={onOpen} acts={<SubActs s={s} t={t} />} />
      <SubBody s={s} t={t} />
    </>
  )
}
