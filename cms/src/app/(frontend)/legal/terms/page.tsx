'use client'
/**
 * 服务条款(E4-02):含时长包付费与退款口径(D5/用户拍板:7 天内未滥用可退)、
 * 数据来源、雇主异议下架机制。文案模板级自拟,不构成法律意见。
 * 复用法务外壳(Legal),正文取三语字典里的 terms 那份,标题挂文件夹板图标。
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
import { IconClipboard } from '@/components/icons'
import { Legal } from '@/components/legal'
import { Frame } from '@/components/shell'
import { legalDocs } from '@/lib/legal'

/**
 * 服务条款页的门:壳件与正文的拼装,没有别的。
 *
 * @returns 整页。
 */
export default function TermsPage() {
  return (
    <Frame>
      <Header />
      <Legal docs={legalDocs.terms} icon={<IconClipboard />} />
      <Footer />
    </Frame>
  )
}
