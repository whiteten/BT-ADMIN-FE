import { Table } from 'antd';
import type { EChartsOption } from 'echarts';
import ReactECharts from 'echarts-for-react';
import { CHART_COLORS } from '../constants/chatConstants';
import { CHAT_VIEW_TYPE, type ChatResponseBlock } from '../types';

interface ChatResponseContentProps {
  block: ChatResponseBlock;
}

const AXIS_LABEL = { color: '#94a3b8', fontSize: 11 } as const;
const AXIS_NAME_STYLE = { color: '#94a3b8', fontSize: 11 } as const;

const TOOLTIP_BASE = {
  backgroundColor: 'rgba(255,255,255,0.96)',
  borderColor: '#e2e8f0',
  textStyle: { color: '#334155', fontSize: 12 },
  extraCssText: 'box-shadow:0 8px 24px -12px rgba(15,23,42,0.3);border-radius:8px;',
} as const;

/** v2 포맷은 미사용 축 제목을 "" 로 보냄 — ECharts name 에는 undefined 로 변환 (?? 는 "" 를 통과시켜 부적합) */
const toAxisName = (title?: string) => (title === '' ? undefined : title);

/** pie/bar/line 블록 → ECharts option. data 없으면 null (answer 문장만 노출) */
function buildChartOption(block: ChatResponseBlock): EChartsOption | null {
  // LLM 이 value 를 문자열로 출력한 경우 방어 (콤마 포함 등 비정상 값은 NaN → 0 처리)
  const data = (block.data ?? []).map((datum) => ({ name: String(datum.name), value: Number(datum.value) || 0 })).filter((datum) => datum.name);
  if (!data.length) return null;

  switch (block.viewType) {
    case CHAT_VIEW_TYPE.PIE:
      return {
        color: [...CHART_COLORS],
        tooltip: { trigger: 'item', ...TOOLTIP_BASE },
        legend: {
          bottom: 0,
          left: 'center',
          icon: 'circle',
          itemWidth: 8,
          itemHeight: 8,
          itemGap: 14,
          textStyle: { color: '#64748b', fontSize: 12 },
        },
        series: [
          {
            type: 'pie',
            radius: ['42%', '66%'],
            center: ['50%', '44%'],
            avoidLabelOverlap: true,
            itemStyle: { borderColor: '#fff', borderWidth: 3, borderRadius: 6 },
            label: { formatter: '{b} {d}%', fontSize: 11, color: '#64748b' },
            labelLine: { length: 12, length2: 8, smooth: true, lineStyle: { color: '#CBD5E1' } },
            emphasis: {
              scale: true,
              scaleSize: 5,
              itemStyle: { shadowBlur: 12, shadowColor: 'rgba(15,23,42,0.18)' },
            },
            animationDuration: 600,
            animationEasing: 'cubicOut',
            data,
          },
        ],
      };
    case CHAT_VIEW_TYPE.BAR:
    case CHAT_VIEW_TYPE.LINE: {
      const isBar = block.viewType === CHAT_VIEW_TYPE.BAR;
      return {
        color: [CHART_COLORS[0]],
        tooltip: { trigger: 'axis', axisPointer: { type: isBar ? 'shadow' : 'line' }, ...TOOLTIP_BASE },
        grid: { left: 8, right: 16, top: block.yTitle ? 36 : 16, bottom: block.xTitle ? 26 : 4, containLabel: true },
        xAxis: {
          type: 'category',
          data: data.map((datum) => datum.name),
          name: toAxisName(block.xTitle),
          nameLocation: 'middle',
          nameGap: 32,
          nameTextStyle: AXIS_NAME_STYLE,
          boundaryGap: isBar,
          axisLine: { lineStyle: { color: '#e2e8f0' } },
          axisTick: { show: false },
          axisLabel: AXIS_LABEL,
        },
        yAxis: {
          type: 'value',
          name: toAxisName(block.yTitle),
          nameGap: 14,
          nameTextStyle: AXIS_NAME_STYLE,
          splitLine: { lineStyle: { color: '#f1f5f9' } },
          axisLabel: AXIS_LABEL,
        },
        series: [
          isBar
            ? {
                type: 'bar',
                data: data.map((datum) => datum.value),
                barMaxWidth: 26,
                itemStyle: {
                  borderRadius: [6, 6, 0, 0],
                  color: {
                    type: 'linear',
                    x: 0,
                    y: 0,
                    x2: 0,
                    y2: 1,
                    colorStops: [
                      { offset: 0, color: '#3B82F6' },
                      { offset: 1, color: '#93C5FD' },
                    ],
                  },
                },
                showBackground: true,
                backgroundStyle: { color: '#F1F5F9', borderRadius: [6, 6, 0, 0] },
                label: { show: true, position: 'top', color: '#64748b', fontSize: 10 },
                animationDuration: 500,
                animationEasing: 'cubicOut',
                animationDelay: (index: number) => index * 60,
                emphasis: {
                  itemStyle: {
                    color: {
                      type: 'linear',
                      x: 0,
                      y: 0,
                      x2: 0,
                      y2: 1,
                      colorStops: [
                        { offset: 0, color: '#2563EB' },
                        { offset: 1, color: '#60A5FA' },
                      ],
                    },
                  },
                },
              }
            : {
                type: 'line',
                data: data.map((datum) => datum.value),
                smooth: true,
                symbol: 'circle',
                symbolSize: 7,
                itemStyle: { color: '#3B82F6', borderColor: '#fff', borderWidth: 2 },
                lineStyle: { width: 2.5, shadowColor: 'rgba(59,130,246,0.25)', shadowBlur: 8, shadowOffsetY: 6 },
                areaStyle: {
                  color: {
                    type: 'linear',
                    x: 0,
                    y: 0,
                    x2: 0,
                    y2: 1,
                    colorStops: [
                      { offset: 0, color: 'rgba(59,130,246,0.16)' },
                      { offset: 1, color: 'rgba(59,130,246,0)' },
                    ],
                  },
                },
              },
        ],
      };
    }
    default:
      return null;
  }
}

/** 응답 블록 1개의 말풍선 내용 — answer 문장 + viewType 에 따른 차트/표 (말풍선 분할은 ChatMessageList 담당) */
export default function ChatResponseContent({ block }: ChatResponseContentProps) {
  const renderGraph = () => {
    if (block.viewType === CHAT_VIEW_TYPE.TABLE) {
      // tableData 는 2차원 배열, 첫 행이 컬럼 헤더
      const [header, ...rows] = block.tableData ?? [];
      if (!header?.length) return null;
      return (
        <Table
          size="small"
          pagination={false}
          columns={header.map((title, colIndex) => ({ title: String(title), dataIndex: colIndex, key: colIndex }))}
          dataSource={rows.map((row, rowIndex) => ({ ...row, key: rowIndex }))}
        />
      );
    }
    const option = buildChartOption(block);
    if (!option) return null;
    return <ReactECharts option={option} style={{ height: 240 }} notMerge lazyUpdate />;
  };

  const graph = renderGraph();

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[13px] text-slate-700 leading-relaxed break-all whitespace-pre-wrap">{block.answer}</p>
      {graph && (
        <div className="w-[440px] max-w-full">
          {block.viewTitle && <p className="mb-1.5 border-l-2 border-[var(--color-bt-primary)] pl-2 text-xs font-semibold text-[#495057]">{block.viewTitle}</p>}
          {graph}
        </div>
      )}
    </div>
  );
}
