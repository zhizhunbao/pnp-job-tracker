'use client'
/**
 * 隐私政策(E4-02)。文案模板级自拟,不构成法律意见。
 * 复用法务外壳(Legal),正文取三语字典里的 privacy 那份,标题挂锁图标。
 *
 * 节槽注记(原散在 Legal 里的决策记录,随壳件拼装一并收到页面门):
 * · 顶栏/页脚:全站共享(2026-07-16 用户拍板统一 header/footer)。
 * · 整页外框:shell 域的 Frame(灰底 + 撑满视口高的纵向列,页脚被推到视口底)。
 *
 * @author Frank
 * @time 2026-08-27 23:08:05
 */
import { Footer } from '@/components/footer'
import { Header } from '@/components/header'
import { IconLock } from '@/components/icons'
import { Legal } from '@/components/legal'
import { Frame } from '@/components/shell'
import { legalDocs } from '@/lib/legal'

/**
 * 隐私政策页的门:壳件与正文的拼装,没有别的。
 *
 * @returns 整页。
 */
export default function PrivacyPage() {
  return (
    <Frame>
      <Header />
      <Legal docs={legalDocs.privacy} icon={<IconLock />} />
      <Footer />
    </Frame>
  )
}
