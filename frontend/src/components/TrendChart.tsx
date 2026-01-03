import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { TrendsData } from '../types';

interface TrendChartProps {
  trends: TrendsData;
}

export default function TrendChart({ trends }: TrendChartProps) {
  // Transform data for chart
  const chartData = useMemo(() => {
    // Get all unique periods
    const allPeriods = new Set<string>();
    trends.themes.forEach(theme => {
      theme.data_points.forEach(dp => allPeriods.add(dp.period));
    });
    
    const sortedPeriods = Array.from(allPeriods).sort();
    
    // Build data points
    return sortedPeriods.map(period => {
      const dataPoint: any = { period };
      trends.themes.forEach(theme => {
        const dp = theme.data_points.find(d => d.period === period);
        dataPoint[theme.theme_name] = dp ? dp.normalized_score : null;
      });
      return dataPoint;
    });
  }, [trends]);
  
  // Limit to top 10 themes for readability
  const topThemes = trends.themes.slice(0, 10);
  const colors = [
    '#4299e1', '#48bb78', '#ed8936', '#9f7aea', '#f56565', 
    '#38b2ac', '#ed64a6', '#667eea', '#f6ad55', '#4fd1c7'
  ];
  
  if (topThemes.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#718096' }}>
        No trend data available
      </div>
    );
  }
  
  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="period" 
          tick={{ fontSize: 12 }}
          angle={-45}
          textAnchor="end"
          height={80}
        />
        <YAxis 
          domain={[0, 1]} 
          label={{ value: 'Normalized Score', angle: -90, position: 'insideLeft' }}
          tick={{ fontSize: 12 }}
        />
        <Tooltip 
          formatter={(value: number) => value !== null ? value.toFixed(3) : 'N/A'}
          labelStyle={{ marginBottom: '0.5rem' }}
        />
        <Legend />
        {topThemes.map((theme, idx) => (
          <Line
            key={theme.theme_id}
            type="monotone"
            dataKey={theme.theme_name}
            stroke={colors[idx % colors.length]}
            strokeWidth={2}
            dot={{ r: 4 }}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

