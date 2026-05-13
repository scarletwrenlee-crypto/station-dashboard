import { useEffect, useState } from 'react'
import { getMonthlyFinances, getTodayStats, type MonthlyFinance } from '../lib/localData'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

export default function Dashboard() {
  const [month, setMonth] = useState('2026-05')
  const [finances, setFinances] = useState<any[]>([])
  const [todayStats, setTodayStats] = useState<any[]>([])

  useEffect(() => {
    getMonthlyFinances(month).then(setFinances)
    getTodayStats().then(setTodayStats)
  }, [month])

  const totalRevenue = finances.reduce((s: number, f: any) => s + (f.service_revenue || 0) + (f.electricity_revenue || 0), 0)
  const totalCost = finances.reduce((s: number, f: any) => s + (f.electricity_cost || 0) + (f.profit_share || 0) + (f.rent || 0) + (f.other_cost || 0), 0)
  const totalProfit = finances.reduce((s: number, f: any) => s + (f.net_profit || 0), 0)
  const totalRepayment = finances.reduce((s: number, f: any) => s + (f.huaxia_repayment || 0), 0)
  const totalKwh = finances.reduce((s: number, f: any) => s + (f.total_kwh || 0), 0)
  const todayKwh = todayStats.reduce((s: number, d: any) => s + (d.total_kwh || 0), 0)
  const todayRevenue = todayStats.reduce((s: number, d: any) => s + (d.actual_revenue || d.service_fee || 0), 0)
  const margin = totalRevenue > 0 ? (totalProfit / totalRevenue * 100).toFixed(1) : '0'

  const chartData = finances
    .filter((f: any) => f.net_profit !== null)
    .map((f: any) => ({
      name: f.stations?.name?.replace('茂电·电泡泡', '').replace('（华为超充技术支持）', '').slice(0, 6) || '',
      revenue: (f.service_revenue || 0) + (f.electricity_revenue || 0),
      cost: (f.electricity_cost || 0) + (f.profit_share || 0) + (f.rent || 0) + (f.other_cost || 0),
    }))
    .sort((a: any, b: any) => b.revenue - a.revenue)
    .slice(0, 10)

  return (
    <div className="px-5 py-5 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">看板</h1>
          <p className="text-[13px] text-[#9b9b9b] mt-0.5">营收与运营概览</p>
        </div>
        <select value={month} onChange={e => setMonth(e.target.value)}
          className="bg-white border border-[#e8e8e8] rounded-md px-3 py-1.5 text-[13px] focus:outline-none"
        >
          <option value="2026-05">5月</option>
          <option value="2026-04">4月</option>
          <option value="2026-03">3月</option>
        </select>
      </div>

      <div className="bg-white border border-[#e8e8e8] rounded-md p-4">
        <p className="text-[11px] font-medium text-[#b0b0b0] uppercase tracking-wider mb-3">今日概览</p>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div><p className="text-lg font-medium">{(todayKwh).toLocaleString()}°</p><p className="text-[11px] text-[#9b9b9b] mt-0.5">充电量</p></div>
          <div><p className="text-lg font-medium">¥{todayRevenue.toLocaleString()}</p><p className="text-[11px] text-[#9b9b9b] mt-0.5">收入</p></div>
          <div><p className="text-lg font-medium">{todayStats.length} 站</p><p className="text-[11px] text-[#9b9b9b] mt-0.5">活跃</p></div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <KPICard label="月度总收入" value={`¥${(totalRevenue / 10000).toFixed(1)}万`} sub={`${(totalKwh).toLocaleString()}度`} />
        <KPICard label="月度总成本" value={`¥${(totalCost / 10000).toFixed(1)}万`} sub="电费+分成+租金" />
        <KPICard label="净利润" value={`¥${(totalProfit / 10000).toFixed(1)}万`} sub={`利润率 ${margin}%`} accent={totalProfit >= 0} />
        <KPICard label="华夏还款" value={`¥${(totalRepayment / 10000).toFixed(1)}万`} sub="月还款额" />
      </div>

      {chartData.length > 0 && (
        <div>
          <h2 className="text-[11px] font-medium text-[#b0b0b0] uppercase tracking-wider mb-3">场站收支 Top 10</h2>
          <div className="bg-white border border-[#e8e8e8] rounded-md p-4">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} margin={{ bottom: 40 }}>
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#b0b0b0' }} angle={-30} textAnchor="end" axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#b0b0b0' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: '6px', fontSize: '12px', boxShadow: 'none' }} />
                <Bar dataKey="revenue" name="收入" fill="#1a1a1a" radius={[2, 2, 0, 0]} barSize={12} />
                <Bar dataKey="cost" name="成本" fill="#e8e8e8" radius={[2, 2, 0, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {finances.length > 0 && (
        <div>
          <h2 className="text-[11px] font-medium text-[#b0b0b0] uppercase tracking-wider mb-3">财报明细</h2>
          <div className="bg-white border border-[#e8e8e8] rounded-md overflow-hidden">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-[#e8e8e8] text-[#b0b0b0]">
                  <th className="text-left py-2.5 px-3 font-normal">场站</th>
                  <th className="text-right py-2.5 px-2 font-normal">充电量</th>
                  <th className="text-right py-2.5 px-2 font-normal">收入</th>
                  <th className="text-right py-2.5 px-2 font-normal">利润</th>
                </tr>
              </thead>
              <tbody>
                {finances.map((f: any) => {
                  const revenue = (f.service_revenue || 0) + (f.electricity_revenue || 0)
                  return (
                    <tr key={f.id} className="border-b border-[#f1f1f0] hover:bg-[#fbfbfa]">
                      <td className="py-2.5 px-3 truncate max-w-[120px]">{f.stations?.name?.replace('茂电·电泡泡', '').replace('（华为超充技术支持）', '') || ''}</td>
                      <td className="text-right py-2.5 px-2 text-[#9b9b9b]">{(f.total_kwh || 0).toLocaleString()}</td>
                      <td className="text-right py-2.5 px-2">¥{revenue.toLocaleString()}</td>
                      <td className={`text-right py-2.5 px-2 ${(f.net_profit || 0) >= 0 ? 'text-[#0e9f6e]' : 'text-[#cc3333]'}`}>¥{(f.net_profit || 0).toLocaleString()}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function KPICard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className="bg-white border border-[#e8e8e8] rounded-md p-4">
      <p className={`text-lg font-medium ${accent === undefined ? '' : accent ? 'text-[#0e9f6e]' : 'text-[#cc3333]'}`}>{value}</p>
      <p className="text-[12px] text-[#9b9b9b] mt-1">{label}</p>
      {sub && <p className="text-[10px] text-[#c0c0c0] mt-0.5">{sub}</p>}
    </div>
  )
}
