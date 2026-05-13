import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ===== Types =====

export interface Station {
  id: string
  name: string
  city: string
  address: string
  lat?: number
  lng?: number
  status: string
  parking_spots: number
  total_piles: number
  fast_piles: number
  super_piles: number
  open_date: string
  canopy: boolean; rest_room: boolean; bathroom: boolean
  wifi: boolean; vending: boolean
  power_bank: boolean; coffee: boolean
  hot_water: boolean; car_wash: boolean
  energy_storage: boolean; ground_lock: boolean
  free_parking: string; pricing: string; hours: string
  max_power: string; manager: string; site_owner: string
  equipment: string
  platform_presence?: { platform: string }[]
}

export interface DailyStat {
  id: string; station_id: string; stat_date: string
  total_kwh: number; total_revenue: number
  avg_per_gun_kwh: number; service_fee: number
  electricity_cost: number; actual_revenue: number
}

export interface WeeklyStat {
  id: string; station_id: string; week_start: string
  daily_kwh_per_gun: number[]   // 7-day array
  weekly_service_fee: number
  weekly_electricity_cost: number
}

export interface MonthlyFinance {
  id: string; station_id: string; month: string
  total_kwh: number
  service_revenue: number       // 服务费收入
  electricity_revenue: number   // 电费收入
  electricity_cost: number      // 电费支出
  profit_share: number          // 分成支出
  rent: number                  // 租金
  other_cost: number            // 其他支出
  net_profit: number            // 净利润
  huaxia_repayment: number      // 华夏还款
}
