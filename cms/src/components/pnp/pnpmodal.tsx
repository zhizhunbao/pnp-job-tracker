'use client'
/**
 * 省提名弹框(职位板点 PNP 格 / 手机卡的省提名胶囊):整台自己管自己 —— 外壳用 modal 桶的 Modal(窗口形,与字段弹框同一副样子、
 * 同一份记住的尺寸),页眉(省名小标 + 岗名 + 标题译名)、整表懒取、加载行与失败框、正文(PnpListSection)全在本域。
 * 2026-09-28 自立(Frank「pnp 弹框自己管自己」「现在主要是 pnp 这个弹框老是改不利索」「其他的弹框比较正常 因为 pnp 涉及 10 个 省」):
 * 原先它是 advisor 字段弹框的一组 —— 取数、页眉小标、分组路由在 advisor,卡片在本域,一件事分在两个域里改一处漏一处
 * (盘点实查:09-23「统一成标题译名」漏了这里的页眉灰字)。现在改省提名弹框只动本域。
 * 正文的口径照旧:红线在这儿落地 —— **粗筛信号,不是资格认定**(见 PnpListSection 头注)。
 *
 * @author Frank
 * @time 2026-09-28 05:30:00
 */
import { Loading } from '@/components/loading'
import { Modal, ModalHead } from '@/components/modal'
import { Notice } from '@/components/notice'
import {
  K_LOAD_FAILED, K_LOADING, LANG_EN, NOTICE_ERR, PNP_MODAL_H, PNP_MODAL_PREF, PNP_MODAL_W,
} from './constants'
import { pnpKickerOf, pnpTitleOf } from './functions'
import { usePnpModal } from './hooks'
import { PnpListSection } from './pnplistsection'
import type { PnpModalIn } from './types'

/**
 * 渲染省提名弹框。
 *
 * @param props 这一岗、界面语言、候补标题、从哪一格点进来的、职业名字典与关弹框。
 * @returns 浮层。
 */
export function PnpModal({ job, lang, title, field, nocDesc, onClose }: PnpModalIn) {
  const p = usePnpModal({ job, lang, field })
  const head = (
    <ModalHead kicker={pnpKickerOf({ t: p.t, province: job.province })} title={pnpTitleOf({ job, title })}
      sub={p.sub} ctl={null} />
  )
  return (
    <Modal onClose={onClose} win={{ head, memo: PNP_MODAL_PREF, w: PNP_MODAL_W, h: PNP_MODAL_H, jd: false }}>
      {p.data.ready === false && p.data.failed === false && <Loading text={p.t(K_LOADING)} />}
      {p.data.failed && <Notice kind={NOTICE_ERR}>{p.t(K_LOAD_FAILED)}</Notice>}
      {p.data.ready && (
        <PnpListSection job={job} lang={lang} occ={p.data.occ} draws={p.data.draws} ops={p.data.ops}
          reqs={p.data.reqs} nocDesc={nocDesc} showZh={lang !== LANG_EN} />
      )}
    </Modal>
  )
}
