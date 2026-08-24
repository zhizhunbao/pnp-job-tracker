'use client'
// 隐私政策(E4-02)。文案模板级自拟,不构成法律意见。
import { Legal } from '../Legal'
import { legalDocs } from '@/lib/legal'
import { IconLock } from '@/components/icons'

export default function PrivacyPage() { return <Legal docs={legalDocs.privacy} icon={<IconLock />} /> }
