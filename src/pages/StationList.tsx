import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { getStations, getYesterdayStats } from '../lib/localData'
import { Search, MapPin, ChevronLeft, ChevronRight } from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isToday, addMonths, subMonths } from 'date-fns'

const CITIES = ['全部', '昆山', '常州', '无锡']
const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']

// Load daily totals from seed (static import)
import seedData from '../lib/seed.json'
const dailyTotalsCache: Record<string, { kwh: number; fee: number }> = {}
for (const d of (seedData as any).daily_totals || []) {
  dailyTotalsCache[d.date] = { kwh: d.total_kwh, fee: d.total_service_fee }
}

export default function StationList() {
  const [stations, setStations] = useState<any[]>([])
  const [yesterdayStats, setYesterdayStats] = useState<any[]>([])
  const [city, setCity] = useState('全部')
  const [search, setSearch] = useState('')
  const [showMap, setShowMap] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const navigate = useNavigate()

  useEffect(() => {
    getStations(city).then(setStations)
    getYesterdayStats().then(setYesterdayStats)
  }, [city])

  const filtered = stations.filter((s: any) =>
    s.name.includes(search) || s.address.includes(search)
  )

  const totalGuns = stations.reduce((s: number, st: any) => s + st.total_piles, 0)
  const operating = stations.filter((s: any) => s.status === '运营中').length
  const yesterdayKwh = yesterdayStats.reduce((s: number, d: any) => s + (d.total_kwh || 0), 0)
  const yesterdayRevenue = yesterdayStats.reduce((s: number, d: any) => s + (d.actual_revenue || d.service_fee || 0), 0)

  // Calendar data for current month
  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentMonth)
    const end = currentMonth < new Date() ? endOfMonth(currentMonth) : new Date()
    const days = eachDayOfInterval({ start, end })
    const firstDayOfWeek = getDay(start) === 0 ? 6 : getDay(start) - 1
    const padding = Array(firstDayOfWeek).fill(null)
    return [...padding, ...days]
  }, [currentMonth])

  // Real intensity from daily totals
  const getDayData = (date: Date | null) => {
    if (!date) return { intensity: 0, kwh: 0, fee: 0 }
    const key = format(date, 'yyyy-MM-dd')
    const data = dailyTotalsCache[key]
    if (!data || data.kwh === 0) return { intensity: 0, kwh: 0, fee: 0 }
    // Scale to 1-4 based on kWh
    const maxKwh = Math.max(...Object.values(dailyTotalsCache).map(d => d.kwh), 1)
    const ratio = data.kwh / maxKwh
    let intensity = 0
    if (ratio > 0.75) intensity = 4
    else if (ratio > 0.5) intensity = 3
    else if (ratio > 0.25) intensity = 2
    else intensity = 1
    return { intensity, kwh: data.kwh, fee: data.fee }
  }

  const intensityColors = [
    'bg-[#f5f5f7]',
    'bg-[#e8e8ed]',
    'bg-[#c8c8ce]',
    'bg-[#86868b]',
    'bg-[#1a1a1a]',
  ]
  const textColors = ['text-[#c0c0c0]', 'text-[#86868b]', 'text-[#6b6b6b]', 'text-white', 'text-white']

  const selectedData = selectedDate ? dailyTotalsCache[selectedDate] : null

  return (
    <div className="px-5 py-6 space-y-8">
      {/* Hero */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight leading-tight">茂电·电泡泡</h1>
          <p className="text-[15px] text-[#aeaeb2] mt-0.5">场站数据平台</p>
        </div>
        <p className="text-[12px] text-[#aeaeb2] pb-1">{format(new Date(), 'M月d日 EEEE')}</p>
      </div>

      {/* Month Calendar */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setCurrentMonth(m => subMonths(m, 1))} className="text-[#aeaeb2] hover:text-[#1a1a1a] transition-colors">
              <ChevronLeft size={16} strokeWidth={1.5} />
            </button>
            <span className="text-[15px] font-medium">{format(currentMonth, 'yyyy年M月')}</span>
            <button onClick={() => setCurrentMonth(m => addMonths(m, 1))}
              className={`text-[#aeaeb2] hover:text-[#1a1a1a] transition-colors ${currentMonth >= new Date() ? 'invisible' : ''}`}>
              <ChevronRight size={16} strokeWidth={1.5} />
            </button>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-[#aeaeb2]">低</span>
            {[1, 2, 3, 4].map(i => (
              <div key={i} className={`w-3 h-3 rounded-sm ${intensityColors[i]}`} />
            ))}
            <span className="text-[10px] text-[#aeaeb2]">高</span>
          </div>
        </div>

        {/* Day header */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {WEEKDAYS.map(d => (
            <div key={d} className="text-center text-[10px] text-[#aeaeb2] py-0.5">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((date, i) => {
            if (!date) return <div key={`e-${i}`} className="aspect-square" />
            const { intensity, kwh, fee } = getDayData(date)
            const key = format(date, 'yyyy-MM-dd')
            const isSel = selectedDate === key
            const today = isToday(date)
            return (
              <button
                key={i}
                onClick={() => setSelectedDate(isSel ? null : key)}
                className={`aspect-square rounded-sm flex flex-col items-center justify-center transition-all relative
                  ${intensityColors[intensity]}
                  ${today && !isSel ? 'ring-1 ring-inset ring-[#1a1a1a]' : ''}
                  ${isSel ? 'ring-2 ring-[#1a1a1a] scale-110 z-10' : ''}
                `}
              >
                <span className={`text-[9px] font-medium leading-none ${textColors[intensity]}`}>
                  {format(date, 'd')}
                </span>
                {kwh > 0 && (
                  <div className={`w-1 h-1 rounded-full mt-0.5 ${intensity >= 3 ? 'bg-white/60' : 'bg-[#1a1a1a]/20'}`} />
                )}
              </button>
            )
          })}
        </div>

        {/* Selected date detail */}
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

      {/* Yesterday summary */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-[12px] text-[#aeaeb2] uppercase tracking-wider">昨日充电量</p>
          <p className="text-[32px] font-bold tracking-tight mt-1">{(yesterdayKwh).toLocaleString()}<span className="text-[16px] font-normal text-[#aeaeb2] ml-1">度</span></p>
        </div>
        <div>
          <p className="text-[12px] text-[#aeaeb2] uppercase tracking-wider">昨日收入</p>
          <p className="text-[32px] font-bold tracking-tight mt-1">¥{yesterdayRevenue.toLocaleString()}</p>
        </div>
      </div>

      {/* Quick stats row */}
      <div className="flex gap-4 py-3 border-y border-[#f1f1f0]">
        <Stat value={stations.length} label="总场站" />
        <Stat value={operating} label="运营中" line />
        <Stat value={totalGuns} label="充电枪" line />
        <Stat value={stations.filter((s: any) => s.canopy).length} label="有雨棚" line />
      </div>

      {/* City + Search */}
      <div className="flex gap-2 items-center">
        <div className="flex gap-1.5 flex-1">
          {CITIES.map(c => (
            <button key={c} onClick={() => setCity(c)}
              className={`px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-all ${
                city === c ? 'bg-[#1a1a1a] text-white' : 'text-[#86868b] hover:bg-[#f5f5f7]'
              }`}
            >{c}</button>
          ))}
        </div>
        <div className="relative w-28">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#aeaeb2]" />
          <input type="text" placeholder="搜索" value={search} onChange={e => setSearch(e.target.value)}
            className="w-full bg-[#f5f5f7] rounded-full pl-7 pr-3 py-1.5 text-[13px] placeholder-[#aeaeb2] focus:outline-none" />
        </div>
      </div>

      {/* Station list */}
      <div className="space-y-2">
        {filtered.map((s: any) => (
          <button key={s.id} onClick={() => navigate(`/station/${s.id}`)}
            className="w-full text-left bg-white rounded-2xl px-4 py-3.5 hover:bg-[#fbfbfa] transition-colors"
            style={{ boxShadow: '0 0 0 0.5px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)' }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="text-[14px] font-medium truncate pr-4">{s.name}</h3>
                <p className="text-[12px] text-[#aeaeb2] mt-0.5 truncate">{s.address}</p>
              </div>
              <div className="text-right shrink-0">
                <span className="text-lg font-semibold">{s.total_piles}</span>
                <span className="text-[11px] text-[#aeaeb2] ml-0.5">枪</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              <span className={`text-[10px] font-medium px-2.5 py-0.5 rounded-full ${
                s.status === '运营中' ? 'text-[#30b158] bg-[#e9f7ef]' : 'text-[#b7770e] bg-[#fef7e6]'
              }`}>{s.status}</span>
              {s.canopy && <Tag label="雨棚" />}
              {s.rest_room && <Tag label="休息室" />}
              {s.wifi && <Tag label="WiFi" />}
              {s.vending && <Tag label="贩卖机" />}
              {s.free_parking && <Tag label={`免停${s.free_parking}`} />}
            </div>
          </button>
        ))}
      </div>

      {/* Map toggle */}
      <button onClick={() => setShowMap(!showMap)}
        className="w-full flex items-center justify-center gap-2 py-3 text-[13px] text-[#aeaeb2] hover:text-[#6b6b6b] transition-colors"
      ><MapPin size={14} strokeWidth={1.5} />{showMap ? '收起地图' : '查看场站分布'}</button>
      {showMap && (
        <div className="w-full h-48 rounded-2xl bg-[#f5f5f7] flex items-center justify-center">
          <p className="text-[13px] text-[#aeaeb2]">地图视图 (需配置高德Key)</p>
        </div>
      )}
    </div>
  )
}

function Stat({ value, label, line }: { value: number; label: string; line?: boolean }) {
  return (
    <div className={`text-center flex-1 ${line ? 'border-l border-[#f1f1f0]' : ''}`}>
      <p className="text-lg font-semibold">{value}</p>
      <p className="text-[11px] text-[#aeaeb2] mt-0.5">{label}</p>
    </div>
  )
}

function Tag({ label }: { label: string }) {
  return <span className="text-[10px] px-2.5 py-0.5 rounded-full text-[#86868b] bg-[#f5f5f7]">{label}</span>
}
