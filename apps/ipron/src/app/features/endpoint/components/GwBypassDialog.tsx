/**
 * G/W 우회설정 사이드바 (Drawer)
 * AS-IS: IPR20S1010_sip.jsp — 노드 단위 Gateway 국선 라우팅 노드 일괄 변경
 * 필터: endptType=1(SIP Gateway) + 선택 노드
 */
import { forwardRef, useCallback, useImperativeHandle, useMemo, useState } from 'react';
import { Button, Drawer, Select, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { X } from 'lucide-react';
import { toast } from '@/shared-util';
import type { Endpoint } from '../types';

interface NodeOption {
  label: string;
  value: number;
}

interface GwBypassDrawerProps {
  endpoints: Endpoint[];
  nodeOptions: NodeOption[];
  onApply: (endptIds: number[], routingNodeId: number) => Promise<void>;
}

export interface GwBypassDialogRef {
  open: (nodeId: number, nodeName: string) => void;
}

const GwBypassDrawer = forwardRef<GwBypassDialogRef, GwBypassDrawerProps>(({ endpoints, nodeOptions, onApply }, ref) => {
  const [visible, setVisible] = useState(false);
  const [currentNodeId, setCurrentNodeId] = useState<number | null>(null);
  const [currentNodeName, setCurrentNodeName] = useState('');
  const [locationFilter, setLocationFilter] = useState<number | undefined>(undefined);
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([]);
  const [routingNodeId, setRoutingNodeId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useImperativeHandle(ref, () => ({
    open: (nodeId: number, nodeName: string) => {
      setCurrentNodeId(nodeId);
      setCurrentNodeName(nodeName);
      setRoutingNodeId(null);
      setLocationFilter(nodeId);
      setVisible(true);
      const gwEndpoints = endpoints.filter((ep) => ep.nodeId === nodeId && ep.endptType === 1);
      setSelectedRowKeys(gwEndpoints.map((ep) => ep.endptId));
    },
  }));

  const gwEndpoints = useMemo(() => {
    if (!currentNodeId) return [];
    let filtered = endpoints.filter((ep) => ep.nodeId === currentNodeId && ep.endptType === 1);
    if (locationFilter) {
      filtered = filtered.filter((ep) => ep.locationNodeId === locationFilter);
    }
    return filtered;
  }, [endpoints, currentNodeId, locationFilter]);

  const columns: ColumnsType<Endpoint> = [
    { title: '국선명', dataIndex: 'endptName', ellipsis: true },
    { title: '장비위치', dataIndex: 'locationNodeName', width: 90, render: (v: string | null) => v ?? '-' },
    { title: '라우팅위치', dataIndex: 'routingNodeName', width: 90, render: (v: string | null) => v ?? '-' },
  ];

  const handleApply = useCallback(async () => {
    if (!routingNodeId) {
      toast.warning('변경할 라우팅 위치를 선택하세요');
      return;
    }
    if (selectedRowKeys.length === 0) {
      toast.warning('적용할 국선을 선택하세요');
      return;
    }
    setLoading(true);
    try {
      await onApply(selectedRowKeys, routingNodeId);
      toast.success('G/W 우회설정이 적용되었습니다');
      setVisible(false);
    } catch {
      toast.error('G/W 우회설정 적용에 실패했습니다');
    } finally {
      setLoading(false);
    }
  }, [routingNodeId, selectedRowKeys, onApply]);

  return (
    <Drawer
      title={`G/W 우회설정 — ${currentNodeName}`}
      closable={{ placement: 'end' }}
      open={visible}
      onClose={() => setVisible(false)}
      size={520}
      closeIcon={<X className="size-4" />}
      footer={
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 font-medium">변경할 라우팅위치</span>
            <Select options={nodeOptions} value={routingNodeId} onChange={setRoutingNodeId} placeholder="노드 선택" style={{ width: 160 }} allowClear />
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setVisible(false)}>닫기</Button>
            <Button type="primary" onClick={handleApply} loading={loading}>
              적용
            </Button>
          </div>
        </div>
      }
    >
      {/* 장비위치 필터 */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm text-gray-500">장비위치</span>
        <Select options={nodeOptions} value={locationFilter} onChange={(v) => setLocationFilter(v)} style={{ width: 160 }} size="small" />
        <span className="text-xs text-gray-400 ml-auto">{gwEndpoints.length}건</span>
      </div>

      {gwEndpoints.length === 0 ? (
        <div className="text-center text-gray-400 py-8">SIP Gateway 유형의 국선이 없습니다.</div>
      ) : (
        <Table<Endpoint>
          dataSource={gwEndpoints}
          columns={columns}
          rowKey="endptId"
          size="small"
          pagination={false}
          scroll={{ y: 340 }}
          rowSelection={{
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys as number[]),
          }}
        />
      )}
    </Drawer>
  );
});

GwBypassDrawer.displayName = 'GwBypassDrawer';
export default GwBypassDrawer;
