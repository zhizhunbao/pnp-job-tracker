'use client'
/**
 * me 域的结构:「档案与简历」一整页 = 页标题 + 两栏(左子桶 profile 的档案卡,右子桶 base 的基础简历卡)。
 * (2026-11-07 照效果图在新域重写,docs/design/我的/我的框架-20261107.md 2.4;当时是页标题右边「修改」+ 档案正文。)
 * 2026-11-11 Frank「只留一份上传的吧。因为之后都可以按岗位改写」「左边我的档案,右面我的简历。然后我的通道拿出来」(投递走顺第 4 批):
 * 「我的简历」并进这一页成右栏;「修改」从页标题挪进档案卡的卡头(一页两张卡,页标题上的「修改」指向不明);
 * 「我的通道」拿出去单独成页(mestreams.tsx)。
 *
 * @author Frank
 * @time 2026-11-07 17:30:00
 */
import { cssOf } from '@/components/css'
import { BaseCard, useBase } from './base'
import { SEC_PROFILE } from './constants'
import { MeHead } from './mehead'
import { ProfileBody, useProfile } from './profile'
import type { MeProfilePageIn } from './types'
import css from './me.module.css'

/**
 * 档案与简历一页。
 *
 * @param props 取词、窄屏否、导航抽屉开没开、拉开抽屉与一进页就开修改面板否。
 * @returns 页标题 + 两栏。
 */
export function MeProfile({ t, narrow, open, onOpen, autoEdit, onChanged }: MeProfilePageIn) {
  const p = useProfile({ t, autoEdit, onChanged })
  const b = useBase({ t })
  return (
    <>
      <MeHead sec={SEC_PROFILE} t={t} narrow={narrow} open={open} onOpen={onOpen} />
      <div className={cssOf(css.cols)}>
        <ProfileBody p={p} t={t} />
        <BaseCard b={b} t={t} />
      </div>
    </>
  )
}
