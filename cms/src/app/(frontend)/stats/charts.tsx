'use client'
// 统计图表(E8-06,2026-07-10 用户拍板「开源漂亮图表,任意维度×指标;上常见下自定义」):
// EChart 薄壳(echarts 动态 import 懒加载——打开统计页/弹窗才拉,/jobs 首屏不背体积)+ 预设四图 + 自定义区。
// 数据=stats 表 119 行零计算透传;红线:计数类可跨省求和,中位数不做跨省合并(提示引导选省,不瞎算)。
import { useEffect, useMemo, useRef, useState } from 'react'
import { BROAD_SLUGS, PROVS, PROV_NAME, type StatRow } from './shared'
import type { TFn } from '../jobs/i18n'

type ChartInst = { setOption: (o: object, notMerge?: boolean) => void; resize: () => void; dispose: () => void; on: (ev: string, cb: (e: { dataIndex: number }) => void) => void }

function EChart({ option, height, onBarClick }: { option: object; height: number; onBarClick?: (dataIndex: number) => void }) {
  const ref = useRef<HTMLDivElement | null>(null)
  const inst = useRef<ChartInst | null>(null)
  const clickRef = useRef(onBarClick); clickRef.current = onBarClick  // ref 转发:init 只绑一次,回调随渲染更新
  useEffect(() => {
    let alive = true
    import('echarts').then((e) => {
      if (!alive || !ref.current) return
      if (!inst.current) {
        inst.current = e.init(ref.current) as unknown as ChartInst
        inst.current.on('click', (ev) => clickRef.current?.(ev.dataIndex))
      }
      inst.current.setOption(option, true)
    })
    const onResize = () => inst.current?.resize()
    window.addEventListener('resize', onResize)
    return () => { alive = false; window.removeEventListener('resize', onResize) }
  }, [option])
  useEffect(() => () => { inst.current?.dispose(); inst.current = null }, [])
  return <div ref={ref} style={{ width: '100%', height, cursor: onBarClick ? 'pointer' : undefined }} />
}

type Item = { name: string; full: string; value: number; key: string }  // key=原始维度值(省码/大类中文),下钻用
const fmtOf = (money: boolean) => (v: number) => (money ? `$${Math.round(v / 1000)}K` : String(v))

// 横向条形(10 类目手机窄屏也可读;降序=最大在最上)
function barOption(items: Item[], money: boolean): object {
  const fmt = fmtOf(money)
  return {
    animationDuration: 400,
    grid: { left: 8, right: 48, top: 6, bottom: 6, containLabel: true },
    xAxis: { type: 'value', splitLine: { lineStyle: { color: '#f3f4f6' } }, axisLabel: { color: '#9ca3af', fontSize: 11, formatter: (v: number) => fmt(v) } },
    yAxis: { type: 'category', data: items.map((i) => i.name), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: '#374151', fontSize: 12 } },
    tooltip: {
      trigger: 'axis', axisPointer: { type: 'shadow' }, borderColor: '#e5e7eb', textStyle: { fontSize: 12.5 },
      formatter: (ps: { dataIndex: number; value: number }[]) => { const p = ps[0]; const it = items[p.dataIndex]; return `${it.full}:<b> ${fmt(p.value)}</b>` },
    },
    series: [{
      type: 'bar', data: items.map((i) => i.value), barMaxWidth: 16,
      itemStyle: { color: '#2563eb', borderRadius: [0, 4, 4, 0] },
      label: { show: true, position: 'right', color: '#6b7280', fontSize: 11, formatter: (p: { value: number }) => fmt(p.value) },
    }],
  }
}

// 指标配置:sum=计数类(跨省求和成立);中位类只透传预聚合值,不合并
const METRICS = [
  { key: 'openJobs', label: 'stats.openJobs', money: false, sum: true },
  { key: 'new7d', label: 'stats.new7d', money: false, sum: true },
  { key: 'medianWageAnnual', label: 'stats.medWage', money: true, sum: false },
  { key: 'medianSalaryAnnual', label: 'stats.medSalary', money: true, sum: false },
  { key: 'namedJobs', label: 'stats.named', money: false, sum: true },
  { key: 'aipJobs', label: 'stats.aip', money: false, sum: true },
] as const
type MetricKey = (typeof METRICS)[number]['key']

const asc = (a: Item, b: Item) => a.value - b.value // 横向条形:数组升序 = 最大条在最上

// 维度=省:broad=cat('all'=全部职业)的 10 省行
function byProv(rows: StatRow[], metric: MetricKey, cat: string): Item[] {
  return PROVS
    .map((p) => ({ name: p, full: PROV_NAME[p] || p, key: p, value: rows.find((r) => r.province === p && r.broad === cat)?.[metric] ?? null }))
    .filter((i): i is Item => i.value != null)
    .sort(asc)
}

// 维度=大类:某省 filter;全部省=计数求和(中位类由调用侧挡在 medianBlocked)
function byCat(rows: StatRow[], metric: MetricKey, prov: string, label: (b: string) => string): Item[] {
  return BROAD_SLUGS
    .map(([, broad]) => {
      const rs = rows.filter((r) => r.broad === broad && (prov === 'all' || r.province === prov))
      const vals = rs.map((r) => r[metric]).filter((v): v is number => v != null)
      const value = !vals.length ? null : prov === 'all' ? vals.reduce((a, b) => a + b, 0) : vals[0]
      return { name: label(broad), full: label(broad), key: broad, value }
    })
    .filter((i): i is Item => i.value != null)
    .sort(asc)
}

const selS: React.CSSProperties = { padding: '5px 8px', fontSize: 12.5, border: '1px solid #d1d5db', borderRadius: 6, background: '#fff', color: '#374151' }
const cardS: React.CSSProperties = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '12px 14px' }
const h2S: React.CSSProperties = { fontSize: 15.5, margin: '18px 0 8px' }

const chartH = (n: number) => n * 26 + 40

// 预设图卡:两级下钻+面包屑(#57,2026-07-18 设计批定稿)——L0 全景;点条形 → L1(省图→该省按大类,
// 大类图→该类按省),面包屑「全部 › ON」点根段上卷;L1 再点条形=末级,直达职位板深链 ?prov=&broad=
// (不引图表库,自绘承载)。中位类下钻=单省按大类,不触碰跨省合并红线。
function DrillCard({ rows, t, title, kind, metric, money, broadLabel }: {
  rows: StatRow[]; t: TFn; title: string; kind: 'prov' | 'cat'; metric: MetricKey; money: boolean; broadLabel: (b: string) => string
}) {
  const [drill, setDrill] = useState<Item | null>(null)
  const items = useMemo(() => {
    if (!drill) return kind === 'prov' ? byProv(rows, metric, 'all') : byCat(rows, metric, 'all', broadLabel)
    return kind === 'prov' ? byCat(rows, metric, drill.key, broadLabel) : byProv(rows, metric, drill.key)
  }, [rows, metric, kind, drill]) // eslint-disable-line react-hooks/exhaustive-deps
  const toJobs = (it: Item) => {
    if (!drill) return
    const prov = kind === 'prov' ? drill.key : it.key
    const broad = kind === 'prov' ? it.key : drill.key
    window.location.href = `/?prov=${prov}&broad=${encodeURIComponent(broad)}`
  }
  return (
    <div style={cardS}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{title}</div>
        {drill ? (
          <span style={{ fontSize: 12, color: '#9ca3af', whiteSpace: 'nowrap' }}>
            <button onClick={() => setDrill(null)} style={{ border: 'none', background: 'none', padding: 0, fontSize: 12, color: '#2563eb', cursor: 'pointer' }}>{t('chart.all')}</button>
            {' › '}<span style={{ color: '#374151', fontWeight: 600 }}>{drill.full}</span>
          </span>
        ) : (
          <span style={{ fontSize: 11, color: '#d1d5db', whiteSpace: 'nowrap' }}>{t('chart.drillHint')}</span>
        )}
        {drill && <span style={{ fontSize: 11, color: '#d1d5db', whiteSpace: 'nowrap' }}>{t('chart.jobsHint')}</span>}
      </div>
      {items.length
        ? <EChart option={barOption(items, money)} height={chartH(items.length)}
            onBarClick={drill ? (i) => items[i] && toJobs(items[i]) : (i) => items[i] && setDrill(items[i])} />
        : <p style={{ margin: '10px 0', fontSize: 13, color: '#9ca3af' }}>—</p>}
    </div>
  )
}

export function StatsCharts({ rows, t }: { rows: StatRow[]; t: TFn }) {
  const broadLabel = (b: string) => t('broad.' + b)

  const presets = useMemo(() => [
    { title: `${t('stats.openJobs')} · ${t('chart.dimProv')}`, kind: 'prov' as const, metric: 'openJobs' as const, money: false },
    { title: `${t('stats.medWage')} · ${t('chart.dimProv')}`, kind: 'prov' as const, metric: 'medianWageAnnual' as const, money: true },
    { title: `${t('stats.named')} · ${t('chart.dimProv')}`, kind: 'prov' as const, metric: 'namedJobs' as const, money: false },
    { title: `${t('stats.openJobs')} · ${t('chart.dimCat')}`, kind: 'cat' as const, metric: 'openJobs' as const, money: false },
  ], [t])

  const [dim, setDim] = useState<'prov' | 'cat'>('prov')
  const [metric, setMetric] = useState<MetricKey>('openJobs')
  const [fixCat, setFixCat] = useState('all')   // 维度=省 时锁某大类
  const [fixProv, setFixProv] = useState('all') // 维度=大类 时锁某省
  const m = METRICS.find((x) => x.key === metric)!
  const medianBlocked = dim === 'cat' && fixProv === 'all' && !m.sum // 红线:中位数不跨省合并
  const custom = useMemo(
    () => (dim === 'prov' ? byProv(rows, metric, fixCat) : byCat(rows, metric, fixProv, broadLabel)),
    [rows, dim, metric, fixCat, fixProv, t], // eslint-disable-line react-hooks/exhaustive-deps
  )

  return (
    <>
      <h2 style={h2S}>{t('chart.common')}</h2>
      {/* #60:min 420px 的 auto-fit 让 4 卡在 1100px 容器内恒为 2×2 等宽(300px auto-fill 会落成 3+1,
          第二行两格空白=用户指的「中间和右边大量空白」);窄屏自然单列,min(100%,·) 防超窄溢出 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))', gap: 12 }}>
        {presets.map((p) => (
          <DrillCard key={p.title} rows={rows} t={t} title={p.title} kind={p.kind} metric={p.metric} money={p.money} broadLabel={broadLabel} />
        ))}
      </div>

      <h2 style={h2S}>{t('chart.custom')}</h2>
      <div style={cardS}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', fontSize: 12.5, color: '#6b7280', marginBottom: 8 }}>
          <label>{t('chart.dim')}{' '}
            <select style={selS} value={dim} onChange={(e) => setDim(e.target.value as 'prov' | 'cat')}>
              <option value="prov">{t('chart.dimProv')}</option>
              <option value="cat">{t('chart.dimCat')}</option>
            </select>
          </label>
          <label>{t('chart.metric')}{' '}
            <select style={selS} value={metric} onChange={(e) => setMetric(e.target.value as MetricKey)}>
              {METRICS.map((x) => <option key={x.key} value={x.key}>{t(x.label)}</option>)}
            </select>
          </label>
          {dim === 'prov' ? (
            <label>{t('filter.cat')}{' '}
              <select style={selS} value={fixCat} onChange={(e) => setFixCat(e.target.value)}>
                <option value="all">{t('chart.all')}</option>
                {BROAD_SLUGS.map(([slug, broad]) => <option key={slug} value={broad}>{broadLabel(broad)}</option>)}
              </select>
            </label>
          ) : (
            <label>{t('col.province')}{' '}
              <select style={selS} value={fixProv} onChange={(e) => setFixProv(e.target.value)}>
                <option value="all">{t('chart.all')}</option>
                {PROVS.map((p) => <option key={p} value={p}>{PROV_NAME[p] || p}</option>)}
              </select>
            </label>
          )}
          <span style={{ fontSize: 11, color: '#d1d5db', whiteSpace: 'nowrap' }}>{t('chart.drillHint')}</span>
        </div>
        {medianBlocked
          ? <p style={{ margin: '10px 0', fontSize: 13, color: '#9ca3af' }}>{t('chart.medianNote')}</p>
          : custom.length
            ? <EChart option={barOption(custom, m.money)} height={chartH(custom.length)}
                onBarClick={(i) => {  // 自定义图下钻=切维度联动:点省→该省按大类;点大类→该大类按省(选择器即上卷)
                  const it = custom[i]; if (!it) return
                  if (dim === 'prov') { setDim('cat'); setFixProv(it.key) }
                  else { setDim('prov'); setFixCat(it.key) }
                }} />
            : <p style={{ margin: '10px 0', fontSize: 13, color: '#9ca3af' }}>—</p>}
      </div>
    </>
  )
}
