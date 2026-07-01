import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import type { ChartConfig, DroppedWidget } from '../types/taskboard.types';

export const CHART_COLORS_LIST = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

export const CHART_TYPE_OPTIONS: { label: string; value: ChartConfig['chartType'] }[] = [
  { label: '막대', value: 'bar' },
  { label: '선', value: 'line' },
  { label: '파이', value: 'pie' },
  { label: '도넛', value: 'donut' },
];

/**
 * 표시 방식이 '차트'로 전환된 테이블형 위젯의 차트 렌더 — TaskCreate(편집 미리보기)와 RedisTableWidget(table-redis
 * 전용, 실데이터)이 공유한다. 기본은 `widget.item.chartConfig.sampleData`(편집 시점 정적 데이터)를 쓰지만,
 * table-redis는 실데이터를 `dataOverride`로 직접 넘겨 받는다(table-redis는 sampleRows가 항상 비어 있어
 * sampleData만으로는 빈 차트만 나옴).
 */
export function ChartWidget({ widget, dataOverride }: { widget: DroppedWidget; dataOverride?: Array<{ name: string; value: number }> }) {
  const cfg: ChartConfig | undefined = widget.item.chartConfig;
  if (!cfg) return null;
  const showTitle = widget.showTitle !== false;
  const displayTitle = widget.customTitle ?? widget.item.label;
  const data = dataOverride ?? cfg.sampleData ?? [];
  const color = widget.style.color;

  // 색상 모드: rainbow(기본 팔레트) | custom(직접 선택). custom인데 색상이 비어있으면 기본 팔레트로 폴백.
  const customColors = cfg.colors ?? [];
  const getColor = (idx: number, fallback: string) => (cfg.colorMode === 'custom' && customColors.length > 0 ? customColors[idx % customColors.length] : fallback);

  const renderChart = () => {
    switch (cfg.chartType) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 2, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={`${color}25`} />
              <XAxis dataKey="name" tick={{ fontSize: 8, fill: color, opacity: 0.7 }} />
              <YAxis tick={{ fontSize: 8, fill: color, opacity: 0.7 }} />
              <Bar dataKey="value" fill={getColor(0, CHART_COLORS_LIST[0])} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );
      case 'line':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 2, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={`${color}25`} />
              <XAxis dataKey="name" tick={{ fontSize: 8, fill: color, opacity: 0.7 }} />
              <YAxis tick={{ fontSize: 8, fill: color, opacity: 0.7 }} />
              <Line type="monotone" dataKey="value" stroke={getColor(0, CHART_COLORS_LIST[1])} strokeWidth={2} dot={{ r: 2, fill: getColor(0, CHART_COLORS_LIST[1]) }} />
            </LineChart>
          </ResponsiveContainer>
        );
      case 'pie':
      case 'donut':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={cfg.chartType === 'donut' ? '38%' : 0} outerRadius="65%" dataKey="value" nameKey="name">
                {data.map((_, idx) => (
                  <Cell key={`cell-${idx}`} fill={getColor(idx, CHART_COLORS_LIST[idx % CHART_COLORS_LIST.length])} />
                ))}
              </Pie>
              <Legend iconSize={7} wrapperStyle={{ fontSize: 8, color }} />
            </PieChart>
          </ResponsiveContainer>
        );
      default:
        return null;
    }
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      {showTitle && (
        <div
          className="truncate font-semibold px-1 flex-shrink-0"
          style={{
            fontSize: '0.65em',
            textAlign: widget.style.titleAlign ?? 'left',
            color,
            fontFamily: widget.style.fontFamily,
          }}
        >
          {displayTitle}
        </div>
      )}
      <div className="flex-1 min-h-0">{renderChart()}</div>
    </div>
  );
}

/** 테이블형 위젯의 행 데이터(정적 sampleRows 또는 실데이터 rows 공통)에서 차트용 {name,value} 배열을 도출.
 * 첫 컬럼을 이름으로, 두 번째부터 처음으로 숫자값을 갖는 컬럼을 값으로 사용(없으면 두 번째 컬럼 그대로). */
export function buildChartDataFromRows(rows: Record<string, string | number>[], columns: { key: string }[]): Array<{ name: string; value: number }> {
  if (columns.length < 2) return [];
  const nameKey = columns[0].key;
  const valueKey = columns.slice(1).find((col) => typeof rows[0]?.[col.key] === 'number')?.key ?? columns[1].key;
  return rows.map((row) => ({
    name: String(row[nameKey] ?? ''),
    value: Number(row[valueKey]) || 0,
  }));
}
