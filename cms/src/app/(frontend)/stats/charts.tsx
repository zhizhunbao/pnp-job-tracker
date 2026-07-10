'use client'
// 统计图表(E8-06,2026-07-10 用户拍板「开源漂亮图表,任意维度×指标;上常见下自定义」):
// EChart 薄壳(echarts 动态 import 懒加载——打开统计页/弹窗才拉,/jobs 首屏不背体积)+ 预设四图 + 自定义区。
// 数据=stats 表 119 行零计算透传;红线:计数类可跨省求和,中位数不做跨省合并(提示引导选省,不瞎算)。
import { useEffect, useMemo, useRef, useState } from 'react'
import { BROAD_SLUGS, PROVS, PROV_NAME, type StatRow } from './shared'
import type { TFn } from '../jobs/i18n'

type ChartInst = { setOption: (o: object, notMerge?: boolean) => void; resize: () => void; dispose: () => void }

function EChart({ option, height }: { option: object; height: number }) {
  const ref = useRef<HTMLDivElement | null>(null)
  const inst = useRef<ChartInst | null>(null)
  useEffect(() => {
    let alive = true
    import('echarts').then((e) => {
      if (!alive || !ref.current) return
      if (!inst.current) inst.current = e.init(ref.current) as unknown as ChartInst
      inst.current.setOption(option, true)
    })
    const onResize = () => inst.current?.resize()
    window.addEventListener('resize', onResize)
    return () => { alive = false; window.removeEventListener('resize', onResize) }
  }, [option])
  useEffect(() => () => { inst.current?.dispose(); inst.current = null }, [])
  return <div ref={ref} style={{ width: '100%', height }} />
}

type Item = { name: string; full: string; value: number }
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
    .map((p) => ({ name: p, full: PROV_NAME[p] || p, value: rows.find((r) => r.province === p && r.broad === cat)?.[metric] ?? null }))
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
      return { name: label(broad), full: label(broad), value }
    })
    .filter((i): i is Item => i.value != null)
    .sort(asc)
}

const selS: React.CSSProperties = { padding: '5px 8px', fontSize: 12.5, border: '1px solid #d1d5db', borderRadius: 6, background: '#fff', color: '#374151' }
const cardS: React.CSSProperties = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '12px 14px' }
const h2S: React.CSSProperties = { fontSize: 15.5, margin: '18px 0 8px' }

export function StatsCharts({ rows, t }: { rows: StatRow[]; t: TFn }) {
  const broadLabel = (b: string) => t('broad.' + b)
  const chartH = (n: number) => n * 26 + 40

  const presets = useMemo(() => [
    { title: `${t('stats.openJobs')} · ${t('chart.dimProv')}`, items: byProv(rows, 'openJobs', 'all'), money: false },
    { title: `${t('stats.medWage')} · ${t('chart.dimProv')}`, items: byProv(rows, 'medianWageAnnual', 'all'), money: true },
    { title: `${t('stats.named')} · ${t('chart.dimProv')}`, items: byProv(rows, 'namedJobs', 'all'), money: false },
    { title: `${t('stats.openJobs')} · ${t('chart.dimCat')}`, items: byCat(rows, 'openJobs', 'all', broadLabel), money: false },
  ], [rows, t]) // eslint-disable-line react-hooks/exhaustive-deps

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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
        {presets.map((p) => (
          <div key={p.title} style={cardS}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>{p.title}</div>
            <EChart option={barOption(p.items, p.money)} height={chartH(p.items.length)} />
          </div>
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
        </div>
        {medianBlocked
          ? <p style={{ margin: '10px 0', fontSize: 13, color: '#9ca3af' }}>{t('chart.medianNote')}</p>
          : custom.length
            ? <EChart option={barOption(custom, m.money)} height={chartH(custom.length)} />
            : <p style={{ margin: '10px 0', fontSize: 13, color: '#9ca3af' }}>—</p>}
      </div>
    </>
  )
}
