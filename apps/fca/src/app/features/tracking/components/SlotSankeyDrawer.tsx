import { useEffect, useMemo, useRef, useState } from 'react';
import { Drawer, Modal } from 'antd';
import type { EChartsOption } from 'echarts';
import ReactECharts from 'echarts-for-react';
import { botDialogHistoryApi } from '../api/botDialogHistoryApi';
import type { BotDialogHistorySearchRequest, SlotSankeyItem } from '../types/botDialogHistory.types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

interface SlotSankeyDrawerProps {
  open: boolean;
  onClose: () => void;
  searchParams: BotDialogHistorySearchRequest;
  /** 노드 클릭 → 해당 Entity 콜 리스트 조회 */
  onEntityFilter?: (entityTag: string) => void;
}

function buildSankeyOption(items: SlotSankeyItem[]): EChartsOption {
  const nodeSet = new Set<string>();
  const links: { source: string; target: string; value: number }[] = [];

  for (const item of items) {
    const targetKey = `${item.entityTag}_${item.seq}`;
    nodeSet.add(targetKey);

    if (item.prevEntityTag) {
      const sourceKey = `${item.prevEntityTag}_${item.seq - 1}`;
      nodeSet.add(sourceKey);
      links.push({ source: sourceKey, target: targetKey, value: item.value });
    }
  }

  const nodes = Array.from(nodeSet).map((key) => {
    const lastUnderscore = key.lastIndexOf('_');
    const label = key.substring(0, lastUnderscore);
    const depth = parseInt(key.substring(lastUnderscore + 1), 10);
    return { name: key, depth, label: { formatter: () => label } };
  });

  return {
    tooltip: {
      trigger: 'item',
      triggerOn: 'mousemove',
      formatter: (params: any) => {
        if (params.dataType === 'node') {
          const label = params.name.substring(0, params.name.lastIndexOf('_'));
          return `${label}<br/>통과 건수: ${params.value}`;
        }
        if (params.dataType === 'edge') {
          const sourceLabel = params.data.source.substring(0, params.data.source.lastIndexOf('_'));
          const targetLabel = params.data.target.substring(0, params.data.target.lastIndexOf('_'));
          return `${sourceLabel} → ${targetLabel}<br/>건수: ${params.value}`;
        }
        return '';
      },
    },
    series: [
      {
        type: 'sankey',
        layoutIterations: 0,
        data: nodes,
        links,
        emphasis: { focus: 'adjacency' },
        lineStyle: { color: 'gradient', curveness: 0.5 },
        label: { fontSize: 12 },
        nodeWidth: 20,
        nodeGap: 12,
      },
    ],
  };
}

export default function SlotSankeyDrawer({ open, onClose, searchParams, onEntityFilter }: SlotSankeyDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SlotSankeyItem[]>([]);
  const chartRef = useRef<ReactECharts>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    botDialogHistoryApi
      .getSlotSankey(searchParams)
      .then(setData)
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [open, searchParams]);

  // 노드/링크(면) 클릭 이벤트 — Entity 기준 필터
  const handleChartReady = (instance: any) => {
    instance.on('click', (params: any) => {
      if (!onEntityFilter) return;

      let entityTag: string | null = null;
      if (params.dataType === 'node') {
        entityTag = params.name.substring(0, params.name.lastIndexOf('_'));
      } else if (params.dataType === 'edge') {
        entityTag = params.data.source.substring(0, params.data.source.lastIndexOf('_'));
      }
      if (!entityTag) return;

      Modal.confirm({
        title: '콜 목록 조회',
        content: `"${entityTag}" 개체를 거친 콜 목록을 조회하시겠습니까?`,
        okText: '조회',
        cancelText: '취소',
        centered: true,
        onOk: () => {
          onEntityFilter(entityTag!);
          onClose();
        },
      });
    });
  };

  const option = useMemo(() => (data.length > 0 ? buildSankeyOption(data) : null), [data]);

  const maxDepth = data.length > 0 ? Math.max(...data.map((d) => d.seq)) : 0;
  const chartWidth = Math.max(800, maxDepth * 150);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="슬롯차트"
      width={1200}
      destroyOnHidden
      styles={{ body: { padding: '24px', overflow: 'hidden', display: 'flex', flexDirection: 'column' } }}
    >
      {loading ? (
        <FallbackSpinner />
      ) : !option ? (
        <p className="text-center text-sm text-gray-400 py-10">표시할 슬롯 데이터가 없습니다.</p>
      ) : (
        <div className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden">
          <ReactECharts ref={chartRef} option={option} style={{ height: '100%', width: chartWidth, minHeight: 500 }} notMerge onChartReady={handleChartReady} />
        </div>
      )}
    </Drawer>
  );
}
