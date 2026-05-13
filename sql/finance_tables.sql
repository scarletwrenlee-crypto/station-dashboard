-- ===== 财务报表表 + 周统计表 =====
-- 在 Supabase SQL Editor 中执行

-- 1. 月度财报（每站每月一条）
CREATE TABLE monthly_finances (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id          UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  month               TEXT NOT NULL,              -- 格式: 2026-05
  total_kwh           NUMERIC(12,2) DEFAULT 0,    -- 总充电量(度)
  service_revenue     NUMERIC(12,2) DEFAULT 0,    -- 服务费收入
  electricity_revenue NUMERIC(12,2) DEFAULT 0,    -- 电费收入
  electricity_cost    NUMERIC(12,2) DEFAULT 0,    -- 电费支出
  profit_share        NUMERIC(12,2) DEFAULT 0,    -- 分成支出
  rent                NUMERIC(12,2) DEFAULT 0,    -- 租金
  other_cost          NUMERIC(12,2) DEFAULT 0,    -- 其他支出
  net_profit          NUMERIC(12,2) DEFAULT 0,    -- 净利润
  huaxia_repayment    NUMERIC(12,2) DEFAULT 0,    -- 华夏还款
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(station_id, month)
);

CREATE INDEX idx_finances_month ON monthly_finances(month);
CREATE INDEX idx_finances_station ON monthly_finances(station_id);

-- 2. 周统计（每站每周一条）
CREATE TABLE weekly_stats (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id            UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  week_start            DATE NOT NULL,
  daily_kwh_per_gun     NUMERIC(8,2)[] DEFAULT '{}',  -- 7天数组
  weekly_service_fee    NUMERIC(10,2) DEFAULT 0,
  weekly_electricity_cost NUMERIC(10,2) DEFAULT 0,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(station_id, week_start)
);

CREATE INDEX idx_weekly_week ON weekly_stats(week_start);

-- 3. 日统计扩展（基于已有数据补充财务字段）
ALTER TABLE daily_stats
  ADD COLUMN IF NOT EXISTS service_fee NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS electricity_cost NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS actual_revenue NUMERIC(10,2) DEFAULT 0;

-- ===== Edge Functions =====

-- 老板看板聚合（在 Supabase SQL Editor 中创建为函数）
CREATE OR REPLACE FUNCTION get_boss_dashboard(target_month TEXT)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_kwh', COALESCE(SUM(total_kwh), 0),
    'total_revenue', COALESCE(SUM(service_revenue + electricity_revenue), 0),
    'total_cost', COALESCE(SUM(electricity_cost + profit_share + rent + other_cost), 0),
    'net_profit', COALESCE(SUM(net_profit), 0),
    'huaxia_repayment', COALESCE(SUM(huaxia_repayment), 0),
    'station_count', COUNT(*),
    'profitable_count', COUNT(*) FILTER (WHERE net_profit > 0),
    'avg_margin', CASE WHEN SUM(service_revenue + electricity_revenue) > 0
      THEN ROUND(SUM(net_profit) / SUM(service_revenue + electricity_revenue) * 100, 1)
      ELSE 0 END
  ) INTO result
  FROM monthly_finances
  WHERE month = target_month;

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 全局仪表盘聚合
CREATE OR REPLACE FUNCTION get_dashboard()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_stations', (SELECT COUNT(*) FROM stations),
    'operating_stations', (SELECT COUNT(*) FROM stations WHERE status = '运营中'),
    'trial_stations', (SELECT COUNT(*) FROM stations WHERE status = '试运营'),
    'total_guns', (SELECT COALESCE(SUM(total_piles), 0) FROM stations),
    'today_kwh', (SELECT COALESCE(SUM(total_kwh), 0) FROM daily_stats WHERE stat_date = CURRENT_DATE::TEXT),
    'today_revenue', (SELECT COALESCE(SUM(actual_revenue), 0) FROM daily_stats WHERE stat_date = CURRENT_DATE::TEXT),
    'this_month_kwh', (SELECT COALESCE(SUM(total_kwh), 0) FROM monthly_finances WHERE month = TO_CHAR(CURRENT_DATE, 'YYYY-MM'))
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 场站排名
CREATE OR REPLACE FUNCTION get_ranking(limit_count INT DEFAULT 10)
RETURNS TABLE(
  station_name TEXT,
  total_kwh NUMERIC,
  total_revenue NUMERIC,
  net_profit NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT s.name,
    COALESCE(SUM(mf.total_kwh), 0) as kwh,
    COALESCE(SUM(mf.service_revenue + mf.electricity_revenue), 0) as rev,
    COALESCE(SUM(mf.net_profit), 0) as profit
  FROM stations s
  LEFT JOIN monthly_finances mf ON s.id = mf.station_id
    AND mf.month = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
  GROUP BY s.id, s.name
  ORDER BY kwh DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;
