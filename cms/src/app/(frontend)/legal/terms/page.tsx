'use client'
// 服务条款(E4-02):含时长包付费与退款口径(D5/用户拍板:7 天内未滥用可退)、数据来源、雇主异议下架机制。
// 文案模板级自拟,不构成法律意见。
import { Legal } from '../Legal'
import { legalDocs } from '@/lib/legal'
import { IconClipboard } from '../../Icons'

export default function TermsPage() { return <Legal docs={legalDocs.terms} icon={<IconClipboard />} /> }
