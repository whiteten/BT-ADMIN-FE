import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { STAT_COLORS } from '../constants';
import { getStatLabel, type ChartDataPoint } from '../utils';

interface StatLineChartProps {
  data: ChartDataPoint[];
  statTypes: string[];
  xAxisKey?: string;
  height?: number;
}

/**
 * 통계 라인 차트
 * - 시간대별 통계 유형별 추이를 라인 차트로 표시
 */
export default function StatLineChart({
  data,
  statTypes,
  xAxisKey = 'hour',
  height = 300,
}: StatLineChartProps) {
  if (!data.length || !statTypes.length) return null;

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xAxisKey} tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend />
          {statTypes.map((st) => (
            <Line
              key={st}
              type="monotone"
              dataKey={st}
              name={getStatLabel(st)}
              stroke={STAT_COLORS[st] ?? '#888'}
              strokeWidth={2}
              dot={{ r: 2 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
