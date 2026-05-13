import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { getStations, getYesterdayStats } from '../lib/localData'
import { Search, ChevronLeft, ChevronRight, Zap, TrendingUp, Activity, Sun, Layers } from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isToday, addMonths, subMonths } from 'date-fns'

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']

import seedData from '../lib/seed.json'
const dailyTotalsCache: Record<string, { kwh: number; fee: number }> = {}
for (const d of (seedData as any).daily_totals || []) {
  dailyTotalsCache[d.date] = { kwh: d.total_kwh, fee: d.total_service_fee }
}
const realSummary = (seedData as any).real_summary
const realTotals: Record<string, any> = (seedData as any).real_totals || {}

export default function StationList() {
  const [stations, setStations] = useState<any[]>([])
  const [yesterdayStats, setYesterdayStats] = useState<any[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    getStations().then(setStations)
    getYesterdayStats().then(setYesterdayStats)
  }, [])

  const totalGuns = stations.reduce((s: number, st: any) => s + st.total_piles, 0)
  const operating = stations.filter((s: any) => s.status === '运营中').length
  const constructing = stations.filter((s: any) => s.status !== '运营中' && s.status !== '试运营').length
  const yesterdayKwh = yesterdayStats.reduce((s: number, d: any) => s + (d.total_kwh || 0), 0)
  const yesterdayRevenue = yesterdayStats.reduce((s: number, d: any) => s + (d.actual_revenue || d.service_fee || 0), 0)
  const yesterdayAvgPerGun = totalGuns > 0 ? (yesterdayKwh / totalGuns).toFixed(1) : '0'
  const facilityCoverage = Math.round(stations.filter((s: any) => s.canopy && s.rest_room).length / Math.max(stations.length, 1) * 100)

  // Per-city stats
  const cityStats = ['昆山', '常州', '无锡'].map(city => {
    const cityStations = stations.filter((s: any) => s.city === city)
    return {
      city,
      stations: cityStations.length,
      guns: cityStations.reduce((s: number, st: any) => s + st.total_piles, 0),
      operating: cityStations.filter((s: any) => s.status === '运营中').length,
    }
  })

  // Calendar
  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentMonth)
    const end = currentMonth < new Date() ? endOfMonth(currentMonth) : new Date()
    const days = eachDayOfInterval({ start, end })
    const firstDayOfWeek = getDay(start) === 0 ? 6 : getDay(start) - 1
    return [...Array(firstDayOfWeek).fill(null), ...days]
  }, [currentMonth])

  const getDayData = (date: Date | null) => {
    if (!date) return { intensity: 0, kwh: 0, fee: 0 }
    const key = format(date, 'yyyy-MM-dd')
    const data = dailyTotalsCache[key]
    if (!data || data.kwh === 0) return { intensity: 0, kwh: 0, fee: 0 }
    const maxKwh = Math.max(...Object.values(dailyTotalsCache).map(d => d.kwh), 1)
    const ratio = data.kwh / maxKwh
    let intensity = ratio > 0.75 ? 4 : ratio > 0.5 ? 3 : ratio > 0.25 ? 2 : 1
    return { intensity, kwh: data.kwh, fee: data.fee }
  }

  const intensityColors = ['bg-[#f5f5f7]', 'bg-[#e8e8ed]', 'bg-[#c8c8ce]', 'bg-[#86868b]', 'bg-[#1a1a1a]']
  const textColors = ['text-[#c0c0c0]', 'text-[#86868b]', 'text-[#6b6b6b]', 'text-white', 'text-white']
  const selectedData = selectedDate ? dailyTotalsCache[selectedDate] : null

  // Top 5 by per-gun efficiency
  const topStations = stations
    .map(s => {
      const stat = yesterdayStats.find((d: any) => d.station_id === s.id)
      const avg = stat && s.total_piles > 0 ? (stat.total_kwh / s.total_piles).toFixed(1) : '0'
      return { ...s, yesterdayAvg: parseFloat(avg), yesterdayKwh: stat?.total_kwh || 0 }
    })
    .filter(s => s.yesterdayKwh > 0)
    .sort((a, b) => b.yesterdayAvg - a.yesterdayAvg)
    .slice(0, 5)

  return (
    <div className="px-5 py-6 space-y-7">
      {/* Hero */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight leading-tight">茂电·电泡泡</h1>
          <p className="text-[13px] text-[#aeaeb2] mt-0.5">让每一度电，都有来处，也有归途</p>
        </div>
        <p className="text-[12px] text-[#aeaeb2] pb-1">{format(new Date(), 'M月d日 EEEE')}</p>
      </div>

      {/* Real API Totals */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-[12px] text-[#aeaeb2] uppercase tracking-wider">累计充电量</p>
          <p className="text-[34px] font-bold tracking-tight mt-1">{(realSummary?.total_kwh / 10000).toFixed(1)}<span className="text-[16px] font-normal text-[#aeaeb2] ml-1">万度</span></p>
        </div>
        <div>
          <p className="text-[12px] text-[#aeaeb2] uppercase tracking-wider">累计服务费</p>
          <p className="text-[34px] font-bold tracking-tight mt-1">¥{(realSummary?.total_service_fee / 10000).toFixed(1)}<span className="text-[16px] font-normal text-[#aeaeb2] ml-1">万</span></p>
        </div>
        <div>
          <p className="text-[12px] text-[#aeaeb2] uppercase tracking-wider">累计充电次数</p>
          <p className="text-[34px] font-bold tracking-tight mt-1">{(realSummary?.total_sessions / 10000).toFixed(1)}<span className="text-[16px] font-normal text-[#aeaeb2] ml-1">万次</span></p>
        </div>
        <div>
          <p className="text-[12px] text-[#aeaeb2] uppercase tracking-wider">线上场站</p>
          <p className="text-[34px] font-bold tracking-tight mt-1">{realSummary?.station_count}<span className="text-[16px] font-normal text-[#aeaeb2] ml-1">站</span></p>
        </div>
      </div>

      {/* Network overview - from speech narrative */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl p-4 text-center" style={{ boxShadow: '0 0 0 0.5px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)' }}>
          <Layers size={20} strokeWidth={1.5} className="mx-auto mb-2 text-[#1a1a1a]" />
          <p className="text-lg font-semibold">{stations.length}<span className="text-[12px] font-normal text-[#aeaeb2]">站</span></p>
          <p className="text-[11px] text-[#aeaeb2] mt-0.5">一张网</p>
          <p className="text-[10px] text-[#c0c0c0] mt-0.5">{totalGuns}枪 · {cityStats.length}城</p>
        </div>
        <div className="bg-white rounded-2xl p-4 text-center" style={{ boxShadow: '0 0 0 0.5px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)' }}>
          <Sun size={20} strokeWidth={1.5} className="mx-auto mb-2 text-[#1a1a1a]" />
          <p className="text-lg font-semibold">{facilityCoverage}<span className="text-[12px] font-normal text-[#aeaeb2]">%</span></p>
          <p className="text-[11px] text-[#aeaeb2] mt-0.5">设施覆盖</p>
          <p className="text-[10px] text-[#c0c0c0] mt-0.5">雨棚+休息室配齐率</p>
        </div>
        <div className="bg-white rounded-2xl p-4 text-center" style={{ boxShadow: '0 0 0 0.5px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)' }}>
          <Activity size={20} strokeWidth={1.5} className="mx-auto mb-2 text-[#1a1a1a]" />
          <p className="text-lg font-semibold">¥{(realSummary?.total_amount / 10000).toFixed(1)}<span className="text-[12px] font-normal text-[#aeaeb2]">万</span></p>
          <p className="text-[11px] text-[#aeaeb2] mt-0.5">累计总营收</p>
          <p className="text-[10px] text-[#c0c0c0] mt-0.5">充电费+服务费</p>
        </div>
      </div>

      {/* Snapshot row */}
      <div className="flex gap-4 py-3 border-y border-[#f1f1f0]">
        <SnapStat value={totalGuns} label="总枪数" />
        <SnapStat value={stations.filter((s: any) => s.canopy).length} label="有雨棚" line />
        <SnapStat value={stations.filter((s: any) => s.rest_room).length} label="休息室" line />
        <SnapStat value={stations.filter((s: any) => s.wifi).length} label="WiFi" line />
      </div>

      {/* Calendar */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setCurrentMonth(m => subMonths(m, 1))} className="text-[#aeaeb2] hover:text-[#1a1a1a] transition-colors">
              <ChevronLeft size={16} strokeWidth={1.5} />
            </button>
            <span className="text-[15px] font-medium">{format(currentMonth, 'yyyy年M月')} 每日充电量</span>
            <button onClick={() => setCurrentMonth(m => addMonths(m, 1))}
              className={`text-[#aeaeb2] hover:text-[#1a1a1a] transition-colors ${currentMonth >= new Date() ? 'invisible' : ''}`}>
              <ChevronRight size={16} strokeWidth={1.5} />
            </button>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-[#aeaeb2]">低</span>
            {[1, 2, 3, 4].map(i => <div key={i} className={`w-3 h-3 rounded-sm ${intensityColors[i]}`} />)}
            <span className="text-[10px] text-[#aeaeb2]">高</span>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 mb-1">
          {WEEKDAYS.map(d => <div key={d} className="text-center text-[10px] text-[#aeaeb2] py-0.5">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((date, i) => {
            if (!date) return <div key={`e-${i}`} className="aspect-square" />
            const { intensity, kwh } = getDayData(date)
            const key = format(date, 'yyyy-MM-dd')
            const isSel = selectedDate === key
            const today = isToday(date)
            return (
              <button key={i} onClick={() => setSelectedDate(isSel ? null : key)}
                className={`aspect-square rounded-sm flex flex-col items-center justify-center transition-all relative
                  ${intensityColors[intensity]}
                  ${today && !isSel ? 'ring-1 ring-inset ring-[#1a1a1a]' : ''}
                  ${isSel ? 'ring-2 ring-[#1a1a1a] scale-110 z-10' : ''}`}>
                <span className={`text-[9px] font-medium leading-none ${textColors[intensity]}`}>{format(date, 'd')}</span>
                {kwh > 0 && <div className={`w-1 h-1 rounded-full mt-0.5 ${intensity >= 3 ? 'bg-white/60' : 'bg-[#1a1a1a]/20'}`} />}
              </button>
            )
          })}
        </div>
        {selectedData && (
          <div className="mt-3 flex gap-4 bg-white rounded-xl px-4 py-3" style={{ boxShadow: '0 0 0 0.5px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)' }}>
            <div className="flex-1">
              <p className="text-[10px] text-[#aeaeb2] uppercase tracking-wider">充电量</p>
              <p className="text-lg font-semibold mt-0.5">{selectedData.kwh.toLocaleString()}<span className="text-[12px] font-normal text-[#aeaeb2] ml-1">度</span></p>
            </div>
            <div className="w-px bg-[#f1f1f0]" />
            <div className="flex-1">
              <p className="text-[10px] text-[#aeaeb2] uppercase tracking-wider">服务费收入</p>
              <p className="text-lg font-semibold mt-0.5">¥{selectedData.fee.toLocaleString()}</p>
            </div>
          </div>
        )}
      </div>

      {/* Top 5 by per-gun */}
      {topStations.length > 0 && (
        <div>
          <h2 className="text-[13px] font-medium mb-3">昨日单枪充电 Top 5</h2>
          <div className="space-y-1.5">
            {topStations.map((s, i) => (
              <button key={s.id} onClick={() => navigate(`/station/${s.id}`)}
                className="w-full flex items-center gap-3 bg-white rounded-xl px-4 py-3 hover:bg-[#fbfbfa] transition-colors"
                style={{ boxShadow: '0 0 0 0.5px rgba(0,0,0,0.04)' }}>
                <span className="text-[13px] font-medium text-[#aeaeb2] w-5">{i + 1}</span>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-[13px] font-medium truncate">{s.name}</p>
                  <p className="text-[11px] text-[#aeaeb2]">{s.city} · {s.total_piles}枪</p>
                </div>
                <div className="text-right">
                  <p className="text-[15px] font-semibold tabular-nums">{s.yesterdayAvg}<span className="text-[11px] font-normal text-[#aeaeb2]">度/枪</span></p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* City breakdown */}
      <div className="grid grid-cols-3 gap-2">
        {cityStats.map(c => (
          <div key={c.city} className="bg-white rounded-xl px-4 py-3 text-center" style={{ boxShadow: '0 0 0 0.5px rgba(0,0,0,0.04)' }}>
            <p className="text-[15px] font-semibold">{c.stations}<span className="text-[11px] font-normal text-[#aeaeb2]">站</span></p>
            <p className="text-[12px] text-[#aeaeb2] mt-0.5">{c.city}</p>
            <p className="text-[10px] text-[#c0c0c0]">{c.guns}枪 · {c.operating}运营</p>
          </div>
        ))}
      </div>

      {/* Group overview - from speech narrative: 一张网 → 微网 → 虚拟电厂 */}
      <div className="bg-white rounded-2xl p-5" style={{ boxShadow: '0 0 0 0.5px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)' }}>
        <h2 className="text-[13px] font-medium mb-3">一张网 · 微网 · 虚拟电厂</h2>
        <div className="flex items-center gap-2">
          <div className="flex-1 text-center bg-[#f5f5f7] rounded-xl py-3">
            <p className="text-[12px] font-medium">{stations.length}站 · {totalGuns}枪</p>
            <p className="text-[10px] text-[#aeaeb2] mt-0.5">一张网</p>
          </div>
          <span className="text-[#c0c0c0]">→</span>
          <div className="flex-1 text-center bg-[#f5f5f7] rounded-xl py-3">
            <p className="text-[12px] font-medium">{stations.filter((s: any) => s.energy_storage || s.canopy).length}站</p>
            <p className="text-[10px] text-[#aeaeb2] mt-0.5">微网节点</p>
          </div>
          <span className="text-[#c0c0c0]">→</span>
          <div className="flex-1 text-center bg-[#f5f5f7] rounded-xl py-3">
            <p className="text-[12px] font-medium">{cityStats.length}城</p>
            <p className="text-[10px] text-[#aeaeb2] mt-0.5">虚拟电厂</p>
          </div>
        </div>
      </div>

      {/* Station management search */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[13px] font-medium">场站管理</h2>
          <span className="text-[11px] text-[#aeaeb2]">{stations.length} 站</span>
        </div>
        <div className="relative mb-2">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#aeaeb2]" />
          <input type="text" placeholder="搜索场站" value={search} onChange={e => setSearch(e.target.value)}
            className="w-full bg-[#f5f5f7] rounded-full pl-8 pr-3 py-2 text-[13px] placeholder-[#aeaeb2] focus:outline-none" />
        </div>
        <div className="max-h-48 overflow-y-auto space-y-1">
          {stations.filter((s: any) => s.name.includes(search) || s.address.includes(search)).slice(0, 8).map((s: any) => (
            <button key={s.id} onClick={() => navigate(`/station/${s.id}`)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#f5f5f7] transition-colors text-left">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.status === '运营中' ? 'bg-[#30b158]' : 'bg-[#b7770e]'}`} />
              <span className="text-[13px] truncate flex-1">{s.name}</span>
              <span className="text-[11px] text-[#aeaeb2] shrink-0">{s.total_piles}枪</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function SnapStat({ value, label, line }: { value: number; label: string; line?: boolean }) {
  return (
    <div className={`text-center flex-1 ${line ? 'border-l border-[#f1f1f0]' : ''}`}>
      <p className="text-sm font-semibold">{value}</p>
      <p className="text-[10px] text-[#aeaeb2] mt-0.5">{label}</p>
    </div>
  )
}
