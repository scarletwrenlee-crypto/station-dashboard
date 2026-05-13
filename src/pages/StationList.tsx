import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { getStations } from '../lib/localData'
import { Search, ChevronLeft, ChevronRight, Zap, TrendingUp, DollarSign, Activity, TrendingDown } from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isToday, addMonths, subMonths } from 'date-fns'

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']

import seedData from '../lib/seed.json'
const realSummary = (seedData as any).real_summary
const realTotals: Record<string, any> = (seedData as any).real_totals || {}

// Per-gun: daily total / guns, from daily stats
const dailyStats = (seedData as any).daily_stats || []

export default function StationList() {
  const [stations, setStations] = useState<any[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [showOps, setShowOps] = useState(false)
  const [opsSearch, setOpsSearch] = useState('')
  const navigate = useNavigate()

  useEffect(() => { getStations().then(setStations) }, [])

  // Daily per-gun: sum(all station kWh today) / total guns
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  const yesterdayStats = dailyStats.filter((d: any) => d.stat_date === yesterday)
  const yesterdayTotalKwh = yesterdayStats.reduce((s: number, d: any) => s + d.total_kwh, 0)
  const yesterdayTotalRev = yesterdayStats.reduce((s: number, d: any) => s + (d.actual_revenue || d.service_fee || 0), 0)
  const totalGuns = stations.reduce((s: number, st: any) => s + st.total_piles, 0)
  const yesterdayPerGun = totalGuns > 0 ? (yesterdayTotalKwh / totalGuns).toFixed(1) : '0'

  // Calendar
  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentMonth)
    const end = currentMonth < new Date() ? endOfMonth(currentMonth) : new Date()
    const days = eachDayOfInterval({ start, end })
    const firstDayOfWeek = getDay(start) === 0 ? 6 : getDay(start) - 1
    return [...Array(firstDayOfWeek).fill(null), ...days]
  }, [currentMonth])

  // Build daily totals map for calendar
  const dailyTotalsMap: Record<string, { kwh: number; fee: number }> = {}
  for (const d of dailyStats) {
    if (!dailyTotalsMap[d.stat_date]) dailyTotalsMap[d.stat_date] = { kwh: 0, fee: 0 }
    dailyTotalsMap[d.stat_date].kwh += d.total_kwh
    dailyTotalsMap[d.stat_date].fee += (d.actual_revenue || d.service_fee || 0)
  }

  const getDayData = (date: Date | null) => {
    if (!date) return { intensity: 0, kwh: 0, fee: 0 }
    const key = format(date, 'yyyy-MM-dd')
    const data = dailyTotalsMap[key]
    if (!data || data.kwh === 0) return { intensity: 0, kwh: 0, fee: 0 }
    const maxKwh = Math.max(...Object.values(dailyTotalsMap).map(d => d.kwh), 1)
    const ratio = data.kwh / maxKwh
    let intensity = ratio > 0.75 ? 4 : ratio > 0.5 ? 3 : ratio > 0.25 ? 2 : 1
    return { intensity, kwh: data.kwh, fee: data.fee }
  }

  const intensityColors = ['bg-[#f5f5f7]', 'bg-[#e8e8ed]', 'bg-[#c8c8ce]', 'bg-[#86868b]', 'bg-[#1a1a1a]']
  const textColors = ['text-[#c0c0c0]', 'text-[#86868b]', 'text-[#6b6b6b]', 'text-white', 'text-white']
  const selectedData = selectedDate ? dailyTotalsMap[selectedDate] : null

  // Top 5 by real API cumulative per-gun (totalPowerConsumption / total_piles)
  const topStations = stations
    .map(s => {
      const realData = realTotals[s.name]
      const totalKwh = realData?.total_kwh || 0
      const perGun = s.total_piles > 0 ? (totalKwh / s.total_piles) : 0
      return { ...s, realPerGun: perGun, realTotalKwh: totalKwh }
    })
    .filter((s: any) => s.realTotalKwh > 0)
    .sort((a: any, b: any) => b.realPerGun - a.realPerGun)
    .slice(0, 5)

  return (
    <div className="px-5 py-6 space-y-7">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight leading-tight">茂电·电泡泡</h1>
          <p className="text-[13px] text-[#aeaeb2] mt-0.5">让每一度电，都有来处，也有归途</p>
        </div>
        <p className="text-[12px] text-[#aeaeb2] pb-1">{format(new Date(), 'M月d日 EEEE')}</p>
      </div>

      {/* Real API Cumulative Totals */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <p className="text-[12px] text-[#aeaeb2] uppercase tracking-wider">累计总营收</p>
          <p className="text-[28px] font-bold tracking-tight mt-1">¥{(realSummary?.total_amount / 10000).toFixed(1)}<span className="text-[14px] font-normal text-[#aeaeb2] ml-1">万</span></p>
        </div>
        <div>
          <p className="text-[12px] text-[#aeaeb2] uppercase tracking-wider">累计服务费</p>
          <p className="text-[28px] font-bold tracking-tight mt-1">¥{(realSummary?.total_service_fee / 10000).toFixed(1)}<span className="text-[14px] font-normal text-[#aeaeb2] ml-1">万</span></p>
        </div>
        <div>
          <p className="text-[12px] text-[#aeaeb2] uppercase tracking-wider">累计充电量</p>
          <p className="text-[28px] font-bold tracking-tight mt-1">{(realSummary?.total_kwh / 10000).toFixed(1)}<span className="text-[14px] font-normal text-[#aeaeb2] ml-1">万度</span></p>
        </div>
      </div>

      {/* Yesterday daily KPIs */}
      <div className="flex gap-4 py-3 border-y border-[#f1f1f0]">
        <SnapStat value={yesterdayTotalKwh} label="昨日充电(度)" />
        <SnapStat value={`¥${yesterdayTotalRev.toLocaleString()}`} label="昨日收入" line />
        <SnapStat value={`${yesterdayPerGun}`} label="枪均(度)" line />
        <SnapStat value={`${realSummary?.total_sessions.toLocaleString()}`} label="累计次数" line />
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
              <p className="text-[10px] text-[#aeaeb2] uppercase tracking-wider">收入</p>
              <p className="text-lg font-semibold mt-0.5">¥{selectedData.fee.toLocaleString()}</p>
            </div>
          </div>
        )}
      </div>

      {/* Per-Gun Top 5 from real API */}
      {topStations.length > 0 && (
        <div>
          <h2 className="text-[13px] font-medium mb-3">累计单枪充电 Top 5</h2>
          <div className="space-y-1.5">
            {topStations.map((s: any, i: number) => (
              <button key={s.id} onClick={() => navigate(`/station/${s.id}`)}
                className="w-full flex items-center gap-3 bg-white rounded-xl px-4 py-3 hover:bg-[#fbfbfa] transition-colors"
                style={{ boxShadow: '0 0 0 0.5px rgba(0,0,0,0.04)' }}>
                <span className="text-[13px] font-medium text-[#aeaeb2] w-5">{i + 1}</span>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-[13px] font-medium truncate">{s.name}</p>
                  <p className="text-[11px] text-[#aeaeb2]">{s.city} · {s.total_piles}枪</p>
                </div>
                <div className="text-right">
                  <p className="text-[15px] font-semibold tabular-nums">{Math.round(s.realPerGun).toLocaleString()}<span className="text-[11px] font-normal text-[#aeaeb2]">度/枪</span></p>
                  <p className="text-[10px] text-[#c0c0c0]">{(s.realTotalKwh / 10000).toFixed(1)}万度</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Ops: collapsible station management */}
      <div className="border-t border-[#f1f1f0] pt-4">
        <button onClick={() => setShowOps(!showOps)}
          className="w-full flex items-center justify-between text-[13px] text-[#aeaeb2] hover:text-[#6b6b6b] transition-colors">
          <span>场站管理 · {stations.length} 站</span>
          <span className="text-[10px]">{showOps ? '收起' : '运营入口'}</span>
        </button>
        {showOps && (
          <div className="mt-3 space-y-2">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#aeaeb2]" />
              <input type="text" placeholder="搜索场站" value={opsSearch} onChange={e => setOpsSearch(e.target.value)}
                className="w-full bg-[#f5f5f7] rounded-full pl-8 pr-3 py-2 text-[13px] placeholder-[#aeaeb2] focus:outline-none" />
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {stations.filter((s: any) => s.name.includes(opsSearch) || (s.address || '').includes(opsSearch)).slice(0, 8).map((s: any) => (
                <button key={s.id} onClick={() => navigate(`/station/${s.id}`)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#f5f5f7] transition-colors text-left">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.status === '运营中' ? 'bg-[#30b158]' : 'bg-[#b7770e]'}`} />
                  <span className="text-[13px] truncate flex-1">{s.name}</span>
                  <span className="text-[11px] text-[#aeaeb2] shrink-0">{s.total_piles}枪</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function SnapStat({ value, label, line }: { value: any; label: string; line?: boolean }) {
  return (
    <div className={`text-center flex-1 ${line ? 'border-l border-[#f1f1f0]' : ''}`}>
      <p className="text-sm font-semibold">{typeof value === 'number' ? value.toLocaleString() : value}</p>
      <p className="text-[10px] text-[#aeaeb2] mt-0.5">{label}</p>
    </div>
  )
}
