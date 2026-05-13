import seed from './seed.json'

const data = seed as any

// Simulate async API calls with local data

export async function getStations(city?: string) {
  let stations = data.stations
  if (city && city !== '全部') stations = stations.filter((s: any) => s.city === city)
  return stations
}

export async function getStation(id: string) {
  return data.stations.find((s: any) => s.id === id) || null
}

export async function getStationTrend(stationId: string, days = 30) {
  const stats = data.daily_stats
    .filter((d: any) => d.station_id === stationId)
    .sort((a: any, b: any) => b.stat_date.localeCompare(a.stat_date))
    .slice(0, days)
  return stats.reverse()
}

export async function getYesterdayStats() {
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  return data.daily_stats.filter((d: any) => d.stat_date === yesterday)
}

export async function getTodayStats() {
  const today = new Date().toISOString().slice(0, 10)
  return data.daily_stats.filter((d: any) => d.stat_date === today)
}

export async function getMonthlyFinances(month: string) {
  return data.monthly_finances.filter((f: any) => f.month === month)
}

export type { Station, DailyStat, MonthlyFinance } from './supabase'
