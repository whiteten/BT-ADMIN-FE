import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Funnel,
  FunnelChart,
  LabelList,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Treemap,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import { useValueChangeKey } from '../hooks/useValueChangeAnimation';
import type { ChartConfig, ChartType, DroppedWidget } from '../types/taskboard.types';
import { getValueAnimationClass, getValueAnimationStyle } from '../utils/widgetVisualStyle';

export const CHART_COLORS_LIST = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

/** 트리맵 타일 1개 렌더 — recharts Treemap의 content로 주입되며 x/y/width/height/index/name을 받는다.
 * 항목마다 팔레트 색을 순환시키고, 칸이 충분히 크면 이름 라벨을 얹는다. */
function TreemapCell({ x = 0, y = 0, width = 0, height = 0, index = 0, name = '' }: { x?: number; y?: number; width?: number; height?: number; index?: number; name?: string }) {
  const fill = CHART_COLORS_LIST[index % CHART_COLORS_LIST.length];
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={fill} stroke="#fff" strokeWidth={2} />
      {width > 34 && height > 16 && (
        <text x={x + 4} y={y + 13} fontSize={8} fill="#fff" fontWeight={600}>
          {name}
        </text>
      )}
    </g>
  );
}

export const CHART_TYPE_OPTIONS: { label: string; value: ChartType }[] = [
  { label: '막대', value: 'bar' },
  { label: '가로 막대', value: 'barHorizontal' },
  { label: '둥근 막대', value: 'barRounded' },
  { label: '선', value: 'line' },
  { label: '계단 선', value: 'lineStep' },
  { label: '점선', value: 'lineDashed' },
  { label: '영역', value: 'area' },
  { label: '그라데이션 영역', value: 'areaGradient' },
  { label: '파이', value: 'pie' },
  { label: '도넛', value: 'donut' },
  { label: '반원 파이', value: 'semiPie' },
  { label: '방사형 막대', value: 'radialBar' },
  { label: '레이더', value: 'radar' },
  { label: '산점도', value: 'scatter' },
  { label: '버블', value: 'bubble' },
  { label: '복합(막대+선)', value: 'composed' },
  { label: '트리맵', value: 'treemap' },
  { label: '깔때기', value: 'funnel' },
];

/**
 * 표시 방식이 '차트'로 전환된 테이블형 위젯의 차트 렌더 — TaskCreate(편집 미리보기)와 RedisTableWidget(table-redis
 * 전용, 실데이터)이 공유한다. 기본은 `widget.item.chartConfig.sampleData`(편집 시점 정적 데이터)를 쓰지만,
 * table-redis는 실데이터를 `dataOverride`로 직접 넘겨 받는다(table-redis는 sampleRows가 항상 비어 있어
 * sampleData만으로는 빈 차트만 나옴).
 */
export function ChartWidget({ widget, dataOverride }: { widget: DroppedWidget; dataOverride?: Array<{ name: string; value: number }> }) {
  const cfg: ChartConfig | undefined = widget.item.chartConfig;
  const data = dataOverride ?? cfg?.sampleData ?? [];
  // 값 변경 애니메이션 훅 — 조건부(early return) 앞에서 호출해야 훅 순서가 안정적이다.
  const animation = widget.style.valueChangeAnimation;
  const animKey = useValueChangeKey(data.map((d) => `${d.name}:${d.value}`).join('|'));
  if (!cfg) return null;
  const showTitle = widget.showTitle !== false;
  const displayTitle = widget.customTitle ?? widget.item.label;
  const color = widget.style.color;

  // 색상 모드: rainbow(기본 팔레트) | custom(직접 선택). custom인데 색상이 비어있으면 기본 팔레트로 폴백.
  const customColors = cfg.colors ?? [];
  const getColor = (idx: number, fallback: string) => (cfg.colorMode === 'custom' && customColors.length > 0 ? customColors[idx % customColors.length] : fallback);

  const axisTick = { fontSize: 8, fill: color, opacity: 0.7 };
  const grid = <CartesianGrid strokeDasharray="3 3" stroke={`${color}25`} />;
  const primary = getColor(0, CHART_COLORS_LIST[0]);
  // gradient defs 등 위젯마다 고유해야 하는 id(같은 화면 여러 차트 충돌 방지)
  const gradId = `chart-grad-${widget.id}`;

  const renderPie = (innerRadius: number | string, startAngle = 90, endAngle = -270) => (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={innerRadius} outerRadius="70%" startAngle={startAngle} endAngle={endAngle} dataKey="value" nameKey="name">
          {data.map((d, idx) => (
            <Cell key={`cell-${d.name}-${idx}`} fill={getColor(idx, CHART_COLORS_LIST[idx % CHART_COLORS_LIST.length])} />
          ))}
        </Pie>
        <Legend iconSize={7} wrapperStyle={{ fontSize: 8, color }} />
      </PieChart>
    </ResponsiveContainer>
  );

  const renderChart = () => {
    switch (cfg.chartType) {
      case 'bar':
      case 'barRounded':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 2, right: 4, left: -20, bottom: 0 }}>
              {grid}
              <XAxis dataKey="name" tick={axisTick} />
              <YAxis tick={axisTick} />
              <Bar dataKey="value" fill={primary} radius={cfg.chartType === 'barRounded' ? [8, 8, 8, 8] : [2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );
      case 'barHorizontal':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 2, right: 8, left: 0, bottom: 0 }}>
              {grid}
              <XAxis type="number" tick={axisTick} />
              <YAxis type="category" dataKey="name" tick={axisTick} width={48} />
              <Bar dataKey="value" fill={primary} radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );
      case 'line':
      case 'lineStep':
      case 'lineDashed': {
        const lineColor = getColor(0, CHART_COLORS_LIST[1]);
        const lineType = cfg.chartType === 'lineStep' ? 'step' : 'monotone';
        const dash = cfg.chartType === 'lineDashed' ? '5 4' : undefined;
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 2, right: 4, left: -20, bottom: 0 }}>
              {grid}
              <XAxis dataKey="name" tick={axisTick} />
              <YAxis tick={axisTick} />
              <Line type={lineType} dataKey="value" stroke={lineColor} strokeWidth={2} strokeDasharray={dash} dot={{ r: 2, fill: lineColor }} />
            </LineChart>
          </ResponsiveContainer>
        );
      }
      case 'area':
      case 'areaGradient': {
        const areaColor = getColor(0, CHART_COLORS_LIST[5]);
        const useGradient = cfg.chartType === 'areaGradient';
        return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 2, right: 4, left: -20, bottom: 0 }}>
              {useGradient && (
                <defs>
                  <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={areaColor} stopOpacity={0.8} />
                    <stop offset="95%" stopColor={areaColor} stopOpacity={0.05} />
                  </linearGradient>
                </defs>
              )}
              {grid}
              <XAxis dataKey="name" tick={axisTick} />
              <YAxis tick={axisTick} />
              <Area type="monotone" dataKey="value" stroke={areaColor} strokeWidth={2} fill={useGradient ? `url(#${gradId})` : areaColor} fillOpacity={useGradient ? 1 : 0.25} />
            </AreaChart>
          </ResponsiveContainer>
        );
      }
      case 'pie':
        return renderPie(0);
      case 'donut':
        return renderPie('38%');
      case 'semiPie':
        return renderPie('30%', 180, 0);
      case 'radialBar':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart data={data} cx="50%" cy="50%" innerRadius="20%" outerRadius="90%" startAngle={90} endAngle={-270}>
              <RadialBar background dataKey="value">
                {data.map((d, idx) => (
                  <Cell key={`rb-${d.name}-${idx}`} fill={getColor(idx, CHART_COLORS_LIST[idx % CHART_COLORS_LIST.length])} />
                ))}
              </RadialBar>
              <Legend iconSize={7} wrapperStyle={{ fontSize: 8, color }} />
            </RadialBarChart>
          </ResponsiveContainer>
        );
      case 'radar':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
              <PolarGrid stroke={`${color}30`} />
              <PolarAngleAxis dataKey="name" tick={axisTick} />
              <PolarRadiusAxis tick={axisTick} />
              <Radar dataKey="value" stroke={primary} fill={primary} fillOpacity={0.4} />
            </RadarChart>
          </ResponsiveContainer>
        );
      case 'scatter':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 4, right: 6, left: -20, bottom: 0 }}>
              {grid}
              <XAxis dataKey="name" tick={axisTick} />
              <YAxis dataKey="value" tick={axisTick} />
              <ZAxis range={[40, 40]} />
              <Scatter data={data} fill={primary} />
            </ScatterChart>
          </ResponsiveContainer>
        );
      case 'bubble':
        // 산점도 변형 — 점 크기를 value에 비례시켜 "버블 차트"로. 값이 클수록 원이 커진다.
        return (
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 6, right: 8, left: -20, bottom: 0 }}>
              {grid}
              <XAxis dataKey="name" tick={axisTick} />
              <YAxis dataKey="value" tick={axisTick} />
              <ZAxis dataKey="value" range={[60, 500]} />
              <Scatter data={data} fill={primary} fillOpacity={0.55} />
            </ScatterChart>
          </ResponsiveContainer>
        );
      case 'composed':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 2, right: 4, left: -20, bottom: 0 }}>
              {grid}
              <XAxis dataKey="name" tick={axisTick} />
              <YAxis tick={axisTick} />
              <Bar dataKey="value" fill={`${primary}88`} radius={[2, 2, 0, 0]} />
              <Line type="monotone" dataKey="value" stroke={getColor(0, CHART_COLORS_LIST[3])} strokeWidth={2} dot={{ r: 2 }} />
            </ComposedChart>
          </ResponsiveContainer>
        );
      case 'treemap':
        // 크기 비례 사각 타일 — value가 큰 항목일수록 넓은 칸. 막대/파이와 전혀 다른 밀도형 시각화.
        return (
          <ResponsiveContainer width="100%" height="100%">
            <Treemap data={data} dataKey="value" nameKey="name" stroke="#fff" content={<TreemapCell />} isAnimationActive={false} />
          </ResponsiveContainer>
        );
      case 'funnel': {
        // 단계별 감소를 보여주는 깔때기 — value 내림차순으로 넓은 것부터 좁아진다.
        const funnelData = [...data].sort((a, b) => b.value - a.value);
        return (
          <ResponsiveContainer width="100%" height="100%">
            <FunnelChart margin={{ top: 2, right: 40, left: 4, bottom: 2 }}>
              <Funnel data={funnelData} dataKey="value" nameKey="name" isAnimationActive={false}>
                {funnelData.map((d, idx) => (
                  <Cell key={`fn-${d.name}-${idx}`} fill={getColor(idx, CHART_COLORS_LIST[idx % CHART_COLORS_LIST.length])} />
                ))}
                <LabelList position="right" fill={color} stroke="none" dataKey="name" fontSize={8} />
              </Funnel>
            </FunnelChart>
          </ResponsiveContainer>
        );
      }
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
      <div className="flex-1 min-h-0">
        <div key={animKey} className={getValueAnimationClass(animation)} style={{ width: '100%', height: '100%', ...getValueAnimationStyle(widget.style) }}>
          {renderChart()}
        </div>
      </div>
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
