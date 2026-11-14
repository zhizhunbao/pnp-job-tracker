/**
 * 档案自动填写(2026-11-13 Frank「别等一周啊 都做完」:档案自动生成,不用用户填)—— gate 桶子桶 fill。
 * A 传简历后后台读简历,把档案里空着的格子填上并存;B 投出后补想做的工作与现居省。合并规则只有一处(合并核 prefillMergedOf),
 * 表单里点「从简历填写」那条路与无界面那条路都走它。金标 + 性质,不拍快照。
 *
 * 探针(手改源码、跑本文件、看哪条红,改回):
 *   autoCellsOf 不过 nameBadOf → ②「提取到的姓名不合规」红;autoFilledOf 不拿「不带提取结果算的那一遍」作底 → ②「只是整理」红;
 *   applyPrefill 另写一套填法(比如姓名不判空)→ ③ 红;applyPatchOf 不看 abroad → ④ 红;
 *   runResumeAuto 不留那一份提取结果 → ⑤「面板不再调第二遍」红。
 *
 * @author Frank
 * @time 2026-11-13 21:30:00
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { eduFormRowsOf, eduListOf, eduMajorsOf } from '@/components/gate/edu/functions'
import {
  applyPatchOf, autoFilledOf, makeResumeFill, prefillMergedOf, runApplyAuto, runResumeAuto,
} from '@/components/gate/fill/functions'
import type { FillSeed, PrefillFact } from '@/components/gate/fill/types'
import { CACHE } from '@/components/gate/fill/variables'
import { fillFnsOf, fromKeptOf } from '@/components/gate/functions'
import { workFormRowsOf, workListOf, workNocsOf } from '@/components/gate/work/functions'
import { eduKeysOf, resetAnswersMemory } from '@/lib/quiz'

const TRACK = vi.hoisted(() => ({ track: vi.fn() }))
vi.mock('@/lib/track', () => TRACK)

const FNS = fillFnsOf()

const EMPTY: FillSeed = {
  majors: [], nocs: [], prov: '', abroad: false, name: '', edu: [], eduList: [], workNocs: [], fromResume: [],
  cv: { work: [], phone: '', link: '', skills: '', tpl: 'classic' },
}

const JOB = { nocs: ['63200'], title: 'Line Cook', org: 'Bassi', city: 'Ottawa', from: '2021-03', to: '2023-06', desc: 'Prepared 200 dishes' }
const CERT = { credential: 'Graduate Certificate', school: 'Algonquin College', from: '2025', to: '2026', prov: 'ON', kind: 'public', len: 'y1' }
const FULL: PrefillFact = { works: ['63200'], majors: ['11.0701'], name: 'San Zhang', education: [CERT], jobs: [JOB] }
const NONE: PrefillFact = { works: [], majors: [], name: '', education: [], jobs: [] }

// 已有一段带明细的工作经历的档案
const MINE = { nocs: ['65201'], title: 'Server', org: 'Mine', city: '', from: '', to: '', desc: '' }
const WITH_WORK: FillSeed = { ...EMPTY, workNocs: ['65201'], cv: { ...EMPTY.cv, work: [MINE] } }

describe('① 档案全空:工作、教育经历、专业、姓名都填上', () => {
  const out = autoFilledOf({ seed: EMPTY, d: FULL, fns: FNS })

  it('金标:各格', () => {
    expect(out.filled).toBe(true)
    expect(out.cells.cv.work).toEqual([JOB])
    expect(out.cells.workNocs).toEqual(['63200'])
    expect(out.cells.eduList).toEqual([
      { key: 'ON.public.y1', cred: 'Graduate Certificate', school: 'Algonquin College', from: '2025', to: '2026', major: '11.0701' },
    ])
    expect(out.cells.fitEdu).toEqual(['ON.public.y1'])
    expect(out.cells.majors).toEqual(['11.0701'])
    expect(out.cells.name).toBe('San Zhang')
    expect(out.name).toBe('San Zhang')
    expect([...out.cells.fromResume].sort()).toEqual(['majors:11.0701', 'name:San Zhang', 'workNocs:63200'])
  })

  it('补丁带上变了的六格,值就是各格;电话、链接、技能、模板原样', () => {
    expect(Object.keys(out.patch).sort()).toEqual(['cv', 'eduList', 'fitEdu', 'fromResume', 'majors', 'workNocs'])
    expect(out.patch.cv).toEqual({ work: [JOB], phone: '', link: '', skills: '', tpl: 'classic' })
    expect(out.patch.eduList).toEqual(out.cells.eduList)
    expect(out.patch.workNocs).toEqual(['63200'])
  })
})

describe('② 填过的不动,补丁只放真变了的格', () => {
  it('已有带明细的工作经历:工作那两格不进补丁,别的照填', () => {
    const out = autoFilledOf({ seed: WITH_WORK, d: FULL, fns: FNS })
    expect(out.cells.cv.work).toEqual([MINE])
    expect(out.cells.workNocs).toEqual(['65201'])
    expect(Object.keys(out.patch).sort()).toEqual(['eduList', 'fitEdu', 'fromResume', 'majors'])
    expect(out.cells.fromResume).not.toContain('workNocs:63200')
  })

  it('已有姓名:不动姓名、不打姓名标记', () => {
    const out = autoFilledOf({ seed: { ...EMPTY, name: 'Old Name' }, d: FULL, fns: FNS })
    expect(out.name).toBe('')
    expect(out.cells.name).toBe('Old Name')
    expect(out.cells.fromResume).not.toContain('name:San Zhang')
  })

  it('提取到的姓名不合规(非西文):不存、不打标记;别的照填', () => {
    const out = autoFilledOf({ seed: EMPTY, d: { ...FULL, name: '张三' }, fns: FNS })
    expect(out.name).toBe('')
    expect(out.cells.name).toBe('')
    expect(out.cells.fromResume.some((m) => m.startsWith('name:'))).toBe(false)
    expect(out.patch.cv).toEqual({ work: [JOB], phone: '', link: '', skills: '', tpl: 'classic' })
  })

  it('已有的教育经历(同名称同学校、各格齐全)与专业:不进补丁', () => {
    const seed: FillSeed = {
      ...WITH_WORK,
      name: 'Old Name',
      majors: ['52.0201'],
      edu: ['ON.public.y1'],
      eduList: [{ key: 'ON.public.y1', cred: 'Graduate Certificate', school: 'Algonquin College', from: '2025', to: '2026', major: '52.0201' }],
    }
    const out = autoFilledOf({ seed, d: FULL, fns: FNS })
    expect(out.filled).toBe(false)
    expect(out.patch).toEqual({})
    expect(out.name).toBe('')
  })

  it('什么都没提取到:没有可填的', () => {
    for (const seed of [EMPTY, WITH_WORK]) {
      const out = autoFilledOf({ seed, d: NONE, fns: FNS })
      expect(out.filled).toBe(false)
      expect(out.patch).toEqual({})
    }
  })

  it('只是整理(老档案只有职业码、标记里有过期的):不算变了,不去覆盖服务端的格', () => {
    const seed: FillSeed = { ...EMPTY, workNocs: ['65201'], fromResume: ['workNocs:99999'], name: 'Old Name' }
    const out = autoFilledOf({ seed, d: { ...NONE, works: ['63200'], name: 'San Zhang' }, fns: FNS })
    expect(out.patch).toEqual({})
    expect(out.filled).toBe(false)
  })

  it('性质:再喂一遍同一份提取结果,什么都不再变(幂等)', () => {
    for (const seed of [EMPTY, WITH_WORK, { ...EMPTY, name: 'Old Name' }]) {
      const once = autoFilledOf({ seed, d: FULL, fns: FNS })
      const after: FillSeed = {
        ...seed,
        majors: once.cells.majors,
        edu: once.cells.fitEdu,
        eduList: once.cells.eduList,
        workNocs: once.cells.workNocs,
        fromResume: once.cells.fromResume,
        cv: once.cells.cv,
        name: once.cells.name,
      }
      const twice = autoFilledOf({ seed: after, d: FULL, fns: FNS })
      expect(twice.patch).toEqual({})
      expect(twice.name).toBe('')
    }
  })
})

type Got = { ok: boolean, status: number, body: object }

// 假服务端:提取接口回 prefill;档案接口回 profile;答案档 GET 回 answers、PUT 记下;其余 200 空对象
function server(x: { prefill: Got, profile: object | null, answers: object | null }) {
  const sent: { url: string, method: string, body: string }[] = []
  function reply(status: number, body: object) {
    return { status, ok: status >= 200 && status < 300, json: async () => body }
  }
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    const method = init != null && init.method != null ? init.method : 'GET'
    if (method !== 'GET') {
      sent.push({ url: String(url), method, body: String(init?.body) })
    }
    if (String(url) === '/api/resume/prefill') {
      return reply(x.prefill.status, x.prefill.body)
    }
    if (String(url) === '/api/quiz/profile') {
      return x.profile == null ? reply(401, {}) : reply(200, { profile: x.profile })
    }
    if (String(url) === '/api/quiz/answers' && method === 'GET') {
      return reply(200, { answers: x.answers })
    }
    return reply(200, { ok: true })
  }))
  return sent
}

// 起始答案 → 档案接口回的那一份(带码的名字、城市是对象)
function profileOf(s: FillSeed) {
  const codes = (list: string[]) => list.map((code) => ({ code }))
  return {
    goal: 0, majors: codes(s.majors), nocs: codes(s.nocs), prov: s.prov, abroad: s.abroad, city: { en: '' }, name: s.name,
    who: '', edu: s.edu, eduList: s.eduList, works: codes(s.workNocs), matchBy: '', matchMode: '', fromResume: s.fromResume,
    cv: s.cv,
  }
}

function lastBasic(sent: { url: string, method: string, body: string }[]) {
  const puts = sent.filter((s) => s.method === 'PUT' && s.url === '/api/quiz/answers')
  return puts.length === 0 ? null : JSON.parse(puts[puts.length - 1]?.body as string).basic
}

beforeEach(() => {
  localStorage.clear()
  document.cookie = 'o2p_li=; path=/; max-age=0'
  resetAnswersMemory()
  CACHE.got = null
  CACHE.at = 0
  TRACK.track.mockReset()
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  document.cookie = 'o2p_li=; path=/; max-age=0'
})

// 表单那条路:照 useGateForm 从档案起头摆几格,点「从简历填写」,填完照它存档的拼法拼出各格
async function formCellsOf(seed: FillSeed) {
  const st = {
    work: workFormRowsOf({ list: seed.cv.work, nocs: seed.workNocs }),
    edu: eduFormRowsOf({ list: seed.eduList, strs: seed.edu, majors: seed.majors }),
    name: seed.name,
    marks: seed.fromResume,
  }
  const busy: boolean[] = []
  const g = {
    fromResume: st.marks,
    setFromResume: (v: string[]) => { st.marks = v },
    edit: {
      name: st.name,
      onName: (v: string) => { st.name = v },
      edu: st.edu,
      setEdu: (v: typeof st.edu) => { st.edu = v },
      w: { work: st.work, setWork: (v: typeof st.work) => { st.work = v } },
    },
  }
  makeResumeFill({ g, setBusy: (v) => { busy.push(v) }, setMsg: () => undefined, fns: FNS })()
  await vi.waitFor(() => expect(busy).toEqual([true, false]))
  const majors = eduMajorsOf(st.edu)
  const workNocs = workNocsOf(st.work)
  const eduList = eduListOf(st.edu)
  const name = st.name.trim()
  return {
    majors,
    fitEdu: eduKeysOf(eduList),
    eduList,
    workNocs,
    fromResume: fromKeptOf({ marks: st.marks, majors, workNocs, name }),
    cv: { work: workListOf(st.work), phone: seed.cv.phone, link: seed.cv.link, skills: seed.cv.skills, tpl: seed.cv.tpl },
    name,
  }
}

describe('③ 表单那条路与无界面那条路:同一输入得出同样的各格', () => {
  const SEEDS: FillSeed[] = [
    EMPTY,
    WITH_WORK,
    { ...EMPTY, name: 'Old Name' },
    { ...EMPTY, workNocs: ['65201'] },
    { ...EMPTY, majors: ['52.0201'], edu: ['BC.private.y2'] },
    { ...EMPTY, eduList: [{ key: '', cred: 'Graduate Certificate', school: 'Algonquin College', from: '', to: '', major: '' }] },
    { ...WITH_WORK, fromResume: ['workNocs:65201', 'name:Gone'] },
  ]
  const FACTS: PrefillFact[] = [
    FULL,
    NONE,
    { ...FULL, jobs: [] },
    { ...FULL, education: [], majors: ['11.0701', '52.0201'] },
    { ...NONE, name: 'San Zhang' },
  ]

  it('每一份档案 × 每一份提取结果', async () => {
    for (const seed of SEEDS) {
      for (const d of FACTS) {
        server({ prefill: { ok: true, status: 200, body: d }, profile: null, answers: null })
        const form = await formCellsOf(seed)
        expect(form).toEqual(autoFilledOf({ seed, d, fns: FNS }).cells)
      }
    }
  })

  it('合并核:不改传进来的几段与标记(两条路都拿它的返回值,不靠它改入参)', () => {
    const work = workFormRowsOf({ list: [], nocs: [] })
    const edu = eduFormRowsOf({ list: [], strs: [], majors: [] })
    const marks: string[] = []
    const before = JSON.stringify({ work, edu, marks })
    const m = prefillMergedOf({ work, edu, name: '', marks, d: FULL, fns: FNS })
    expect(JSON.stringify({ work, edu, marks })).toBe(before)
    expect(m.n).toBe(4)
    expect(m.workFilled).toBe(true)
    expect(m.nameFilled).toBe(true)
  })
})

describe('④ 投出后补两格', () => {
  const PROVS = ['ON', 'QC', 'BC', 'AB', 'SK', 'MB', 'NS', 'NB', 'NL', 'PE', 'abroad']

  it('金标:想做的工作空着才填;现居省空着且不是境外才填', () => {
    const table = [
      { seed: EMPTY, noc: '63200', prov: 'MB', want: { nocs: ['63200'], resProv: 'MB' } },
      { seed: { ...EMPTY, nocs: ['21231'] }, noc: '63200', prov: 'MB', want: { resProv: 'MB' } },
      { seed: { ...EMPTY, prov: 'ON' }, noc: '63200', prov: 'MB', want: { nocs: ['63200'] } },
      { seed: { ...EMPTY, abroad: true }, noc: '63200', prov: 'MB', want: { nocs: ['63200'] } },
      { seed: { ...EMPTY, nocs: ['21231'], prov: 'ON' }, noc: '63200', prov: 'MB', want: {} },
      { seed: { ...EMPTY, nocs: ['21231'], abroad: true }, noc: '63200', prov: 'MB', want: {} },
      // 职位没有职业码(未分类)、省不在十省里(地区)、省是空的:那一格不填
      { seed: EMPTY, noc: '', prov: 'MB', want: { resProv: 'MB' } },
      { seed: EMPTY, noc: '未分类', prov: 'MB', want: { resProv: 'MB' } },
      { seed: EMPTY, noc: '63200', prov: 'YT', want: { nocs: ['63200'] } },
      { seed: EMPTY, noc: '63200', prov: '', want: { nocs: ['63200'] } },
      { seed: EMPTY, noc: '', prov: '', want: {} },
    ]
    for (const c of table) {
      expect(applyPatchOf({ noc: c.noc, prov: c.prov, provs: PROVS, seed: c.seed })).toEqual(c.want)
    }
  })

  it('存:只盖补的格,服务端别的格原样带回;记一笔 apply-ok', async () => {
    const sent = server({
      prefill: { ok: false, status: 500, body: {} },
      profile: profileOf(EMPTY),
      answers: { basic: { majors: ['52.0201'], goalBand: 2 } },
    })
    await runApplyAuto({ noc: '63200', prov: 'MB', provs: PROVS, fns: FNS })
    const basic = lastBasic(sent)
    expect(basic.nocs).toEqual(['63200'])
    expect(basic.resProv).toBe('MB')
    expect(basic.majors).toEqual(['52.0201'])
    expect(basic.goalBand).toBe(2)
    expect(TRACK.track.mock.calls).toEqual([['profile-auto', { kind: 'apply-ok' }]])
  })

  it('服务端那份都填过:不存、不记;本地是空卷也不去覆盖', async () => {
    const sent = server({
      prefill: { ok: false, status: 500, body: {} },
      profile: profileOf({ ...EMPTY, nocs: ['21231'], prov: 'ON' }),
      answers: { basic: { nocs: ['21231'], resProv: 'ON' } },
    })
    await runApplyAuto({ noc: '63200', prov: 'MB', provs: PROVS, fns: FNS })
    expect(lastBasic(sent)).toBeNull()
    expect(TRACK.track).not.toHaveBeenCalled()
  })

  it('档案没取到(会话没了):不存、不记', async () => {
    const sent = server({ prefill: { ok: false, status: 500, body: {} }, profile: null, answers: null })
    await runApplyAuto({ noc: '63200', prov: 'MB', provs: PROVS, fns: FNS })
    expect(lastBasic(sent)).toBeNull()
    expect(TRACK.track).not.toHaveBeenCalled()
  })
})

describe('⑤ 传简历后后台自己读简历填并存', () => {
  it('填上了:只盖变了的格、姓名走署名接口、记 resume-ok', async () => {
    const sent = server({
      prefill: { ok: true, status: 200, body: FULL },
      profile: profileOf({ ...EMPTY, nocs: ['21231'] }),
      answers: { basic: { nocs: ['21231'], goalBand: 2 } },
    })
    await runResumeAuto(FNS)
    const basic = lastBasic(sent)
    expect(basic.cv.work).toEqual([JOB])
    expect(basic.workNocs).toEqual(['63200'])
    expect(basic.majors).toEqual(['11.0701'])
    expect(basic.fitEdu).toEqual(['ON.public.y1'])
    expect(basic.nocs).toEqual(['21231'])
    expect(basic.goalBand).toBe(2)
    const names = sent.filter((s) => s.url === '/api/apply/name')
    expect(names.map((s) => JSON.parse(s.body))).toEqual([{ senderName: 'San Zhang' }])
    expect(TRACK.track.mock.calls).toEqual([['profile-auto', { kind: 'resume-ok' }]])
  })

  it('没有空格可填:不存、记 resume-none', async () => {
    const seed: FillSeed = { ...WITH_WORK, name: 'Old Name' }
    const sent = server({ prefill: { ok: true, status: 200, body: { ...NONE, jobs: [JOB], name: 'San Zhang' } }, profile: profileOf(seed), answers: null })
    await runResumeAuto(FNS)
    expect(sent.filter((s) => s.method !== 'POST')).toEqual([])
    expect(TRACK.track.mock.calls).toEqual([['profile-auto', { kind: 'resume-none' }]])
  })

  it('接口回了错(超过每日次数 429)、档案没取到:不存、记 resume-fail', async () => {
    const limited = server({ prefill: { ok: false, status: 429, body: { error: 'limit' } }, profile: profileOf(EMPTY), answers: null })
    await runResumeAuto(FNS)
    expect(limited.filter((s) => s.method !== 'POST')).toEqual([])
    const noProfile = server({ prefill: { ok: true, status: 200, body: FULL }, profile: null, answers: null })
    await runResumeAuto(FNS)
    expect(noProfile.filter((s) => s.method !== 'POST')).toEqual([])
    expect(TRACK.track.mock.calls).toEqual([
      ['profile-auto', { kind: 'resume-fail' }],
      ['profile-auto', { kind: 'resume-fail' }],
    ])
  })

  it('紧跟着打开的修改面板拿同一份提取结果,不再调第二遍接口;再点一次才现调', async () => {
    const sent = server({ prefill: { ok: true, status: 200, body: FULL }, profile: profileOf(WITH_WORK), answers: { basic: {} } })
    const prefills = () => sent.filter((s) => s.url === '/api/resume/prefill').length
    const auto = runResumeAuto(FNS)
    await formCellsOf(WITH_WORK)
    await auto
    expect(prefills()).toBe(1)
    await formCellsOf(WITH_WORK)
    expect(prefills()).toBe(2)
  })
})
