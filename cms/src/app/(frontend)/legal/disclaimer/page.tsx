'use client'
// 免责声明全文(E4-02,替换 E4-01 占位)。文案模板级自拟,不构成法律意见。
import { Legal } from '../Legal'
import { legalDocs } from '@/lib/legal'
import { IconScale } from '@/components/icons'

export default function DisclaimerPage() { return <Legal docs={legalDocs.disclaimer} icon={<IconScale />} /> }
