import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getStation, getStationTrend, type Station, type DailyStat } from '../lib/localData'
import { ArrowLeft, MapPin, Clock } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

export default function StationDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [station, setStation] = useState<Station | null>(null)
  const [trend, setTrend] = useState<DailyStat[]>([])

  useEffect(() => {
    if (!id) return
    getStation(id).then(setStation)
    getStationTrend(id).then(setTrend)
  }, [id])

  if (!station) return <div className="px-5 py-12 text-center text-[#b0b0b0] text-[13px]">加载中…</div>

  const facilities = [
    { key: 'canopy', label: '雨棚' }, { key: 'rest_room', label: '休息室' },
    { key: 'bathroom', label: '卫生间' }, { key: 'wifi', label: 'WiFi' },
    { key: 'vending', label: '售卖机' }, { key: 'power_bank', label: '充电宝' },
    { key: 'coffee', label: '咖啡' }, { key: 'hot_water', label: '热水' },
    { key: 'car_wash', label: '洗车' },
  ].filter(f => (station as any)[f.key])

  return (
    <div className="px-5 py-5 space-y-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-[#9b9b9b] hover:text-[#1a1a1a] transition-colors">
        <ArrowLeft size={16} strokeWidth={1.5} /><span className="text-[13px]">返回</span>
      </button>

      <div>
        <h1 className="text-lg font-semibold tracking-tight leading-snug">{station.name}</h1>
        <div className="flex items-center gap-3 mt-1.5 text-[12px] text-[#9b9b9b]">
          <span className="flex items-center gap-1"><MapPin size={11} />{station.city}</span>
          <span className={station.status === '运营中' ? 'text-[#0e9f6e]' : 'text-[#b7770e]'}>{station.status}</span>
          {station.open_date && <span className="flex items-center gap-1"><Clock size={11} />{station.open_date}</span>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="总枪数" value={station.total_piles.toString()} />
        <StatCard label="枪均充电量" value={trend.length > 0 ? (trend.reduce((s, d) => s + d.total_kwh, 0) / trend.length / (station.total_piles || 1)).toFixed(1) : '—'} unit="度/天" />
        <StatCard label="快充" value={station.fast_piles.toString()} sub={station.max_power} />
        <StatCard label="超充" value={station.super_piles.toString()} sub="液冷" />
      </div>

      {facilities.length > 0 && (
        <Section title="设施">
          <div className="flex flex-wrap gap-2">
            {facilities.map(f => (
              <span key={f.key} className="text-[12px] px-3 py-1.5 rounded-md border border-[#e8e8e8] text-[#6b6b6b] bg-white">{f.label}</span>
            ))}
          </div>
        </Section>
      )}

      <Section title="运营信息">
        <div className="space-y-2 text-[13px]">
          <InfoRow label="地址" value={station.address} />
          <InfoRow label="场地管理" value={station.site_owner} />
          <InfoRow label="拓展经理" value={station.manager} />
          {station.pricing && <InfoRow label="收费" value={`${station.pricing}${station.free_parking ? ` · 免费停车${station.free_parking}` : ''}`} />}
          {station.equipment && <InfoRow label="设备" value={station.equipment} />}
        </div>
      </Section>

      {station.platform_presence && station.platform_presence.length > 0 && (
        <Section title="平台覆盖">
          <div className="flex gap-2">
            {station.platform_presence.map(p => (
              <span key={p.platform} className="text-[12px] px-3 py-1.5 rounded-md border border-[#e8e8e8] text-[#6b6b6b] bg-white">{p.platform}</span>
            ))}
          </div>
        </Section>
      )}

      {trend.length > 0 && (
        <Section title={`近 ${trend.length} 天充电趋势`}>
          <div className="bg-white border border-[#e8e8e8] rounded-md p-4">
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={trend}>
                <XAxis dataKey="stat_date" tick={{ fontSize: 10, fill: '#b0b0b0' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#b0b0b0' }} axisLine={false} tickLine={false} width={40} />
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: '6px', fontSize: '12px', boxShadow: 'none' }} labelStyle={{ color: '#9b9b9b' }} />
                <Line type="monotone" dataKey="total_kwh" stroke="#1a1a1a" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Section>
      )}
    </div>
  )
}

function StatCard({ label, value, sub, unit }: { label: string; value: string; sub?: string; unit?: string }) {
  return (
    <div className="bg-white border border-[#e8e8e8] rounded-md p-3.5 text-center">
      <p className="text-xl font-medium">{value}{unit && <span className="text-[11px] font-normal text-[#9b9b9b] ml-0.5">{unit}</span>}</p>
      <p className="text-[11px] text-[#9b9b9b] mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-[#c0c0c0]">{sub}</p>}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <span className="text-[#b0b0b0] shrink-0 w-16">{label}</span>
      <span className="text-[#4b4b4b] truncate">{value}</span>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-[11px] font-medium text-[#b0b0b0] uppercase tracking-wider mb-2.5">{title}</h2>
      {children}
    </div>
  )
}
