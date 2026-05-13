import { supabase } from './supabase'
import type { Station, DailyStat, MonthlyFinance } from './supabase'

export type { Station, DailyStat, MonthlyFinance }

// ===== 场站 =====

export async function getStations(city?: string): Promise<Station[]> {
  let query = supabase.from('stations').select('*, platform_presence(platform)').order('name')
  if (city && city !== '全部') query = query.eq('city', city)
  const { data, error } = await query
  if (error) throw error
  return (data || []) as Station[]
}

export async function getStation(id: string): Promise<Station | null> {
  const { data } = await supabase.from('stations').select('*, platform_presence(platform)').eq('id', id).single()
  return data as Station | null
}

// ===== 日统计 =====

export async function getStationTrend(stationId: string, days = 30): Promise<DailyStat[]> {
  const { data } = await supabase.from('daily_stats').select('*').eq('station_id', stationId).order('stat_date', { ascending: false }).limit(days)
  return ((data || []) as DailyStat[]).reverse()
}

export async function getTodayStats(): Promise<any[]> {
  const today = new Date().toISOString().slice(0, 10)
  const { data } = await supabase.from('daily_stats').select('*, stations(name, city)').eq('stat_date', today)
  return (data || []) as any[]
}

// ===== 月度财报 =====

export async function getMonthlyFinances(month: string): Promise<(MonthlyFinance & { stations?: { name: string; city: string } })[]> {
  const { data } = await supabase.from('monthly_finances').select('*, stations(name, city)').eq('month', month).order('net_profit', { ascending: false })
  return (data || []) as any[]
}


export async function getYesterdayStats(): Promise<any[]> {
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  const { data } = await supabase.from('daily_stats').select('*, stations(name, city)').eq('stat_date', yesterday)
  return (data || []) as any[]
}

// ===== 聚合 =====

export async function getDashboard() {
  const { data } = await supabase.rpc('get_dashboard')
  return data
}
