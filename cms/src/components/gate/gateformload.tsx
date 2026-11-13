'use client'
/**
 * gate 域的结构:自己取档案的修改面板(2026-11-12 Frank「生成简历…和我修改简历那一部分合并一下,不要弹框,而是右侧弹 sidebar」):
 * 投递第 1 步的「生成简历」不在档案页上,手里没有档案 —— 这个外壳先把本人的档案取回来,取到了就是同一张修改面板(GateForm,
 * 生成简历在它的末段);取到之前什么都不出,取不到出一张只有一句话的面板。
 *
 * @author Frank
 * @time 2026-11-12 20:00:00
 */
import { Drawer } from '@/components/drawer'
import { Notice } from '@/components/notice'
import { FILL_KIND_ERR, FORM_TITLE_KEY, K_LOAD_FAIL } from './constants'
import { GateForm } from './gateform'
import { useSeedLoad } from './hooks'
import type { GateFormLoadIn } from './types'

/**
 * 自己取档案的修改面板。
 *
 * @param props 取词、关面板与存好了。
 * @returns 修改面板;没取到 null,取不到一句话。
 */
export function GateFormLoad({ t, onClose, onSaved }: GateFormLoadIn) {
  const s = useSeedLoad()
  if (s.failed) {
    return (
      <Drawer title={t(FORM_TITLE_KEY)} onClose={onClose} foot={null}>
        <Notice kind={FILL_KIND_ERR}>{t(K_LOAD_FAIL)}</Notice>
      </Drawer>
    )
  }
  if (s.seed == null) {
    return null
  }
  return <GateForm t={t} seed={s.seed} onClose={onClose} onSaved={onSaved} />
}
