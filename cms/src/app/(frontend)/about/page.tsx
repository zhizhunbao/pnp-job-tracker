'use client'
// 关于页(E4-02)。复用法务外壳。
import { Legal } from '../legal/Legal'
import { legalDocs } from '@/lib/i18n'

export default function AboutPage() { return <Legal docs={legalDocs.about} /> }
