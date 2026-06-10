/**
 * 국선배정 Dialog
 * 해당 노드의 국선 목록을 체크박스 ag-Grid로 표시하고
 * 우선순위를 설정하여 일괄 배정
 *
 * 최대 32개 배정 제한
 */
import { forwardRef, useCallback, useImperativeHandle, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Drawer, InputNumber } from 'antd';
import { X } from 'lucide-react';
import { toast } from '@/shared-util';
import { ENDPOINT_TYPE_LABELS } from '../../endpoint/types';
import { routeApi } from '../api/routeApi';
import { routeQueryKeys } from '../hooks/useRouteQueries';
import type { EndpointForAssign, RoutePoint, RoutePointItem } from '../types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

export interface RoutePointDialogRef {
  open: () => void;
}

interface RoutePointDialogProps {
  routeId: number;
  nodeId: number;
  existingPoints: RoutePoint[];
  onSuccess: () => void;
}

const RoutePointDialog = forwardRef<RoutePointDialogRef, RoutePointDialogProps>(({ routeId, nodeId, existingPoints, onSuccess }, ref) => {
  const queryClient = useQueryClient();
  const { gridOptions } = useAggridOptions();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [endpoints, setEndpoints] = useState<EndpointForAssign[]>([]);

  const existingPointMap = useMemo(() => {
    const map = new Map<number, RoutePoint>();
    existingPoints.forEach((p) => map.set(p.endptId, p));
    return map;
  }, [existingPoints]);

  const loadEndpoints = useCallback(async () => {
    try {
      // 배정 가능 국선 목록 (로컬 + DR + 리모트, backupGb 포함)
      const assignable = await routeApi.getAssignableEndpoints(routeId);

      const rows: EndpointForAssign[] = assignable.map((ep: any) => {
        const existing = existingPointMap.get(ep.endptId);
        return {
          endptId: ep.endptId,
          endptName: ep.endptName,
          endptType: ep.endptType,
          nodeId: ep.nodeId,
          nodeName: ep.nodeName,
          assigned: !!existing,
          epPriority: existing?.epPriority ?? ep.epPriority ?? 0,
          backupGb: ep.backupGb ?? '-',
        };
      });

      setEndpoints(rows);
    } catch {
      toast.error('국선 목록 조회에 실패했습니다.');
    }
  }, [nodeId, existingPointMap]);

  useImperativeHandle(ref, () => ({
    open: () => {
      setOpen(true);
      loadEndpoints();
    },
  }));

  const handleToggleAssign = useCallback((endptId: number) => {
    setEndpoints((prev) => {
      const assignedCount = prev.filter((e) => e.assigned).length;
      return prev.map((e) => {
        if (e.endptId !== endptId) return e;
        if (!e.assigned && assignedCount >= 32) {
          toast.warning('국선배정은 최대 32개까지 가능합니다.');
          return e;
        }
        return { ...e, assigned: !e.assigned };
      });
    });
  }, []);

  const handlePriorityChange = useCallback((endptId: number, priority: number) => {
    setEndpoints((prev) => prev.map((e) => (e.endptId === endptId ? { ...e, epPriority: priority } : e)));
  }, []);

  const handleOk = async () => {
    const assigned = endpoints.filter((e) => e.assigned);
    if (assigned.length === 0) {
      toast.warning('배정할 국선을 선택해주세요.');
      return;
    }
    if (assigned.length > 32) {
      toast.error('국선배정은 최대 32개까지 가능합니다.');
      return;
    }

    const points: RoutePointItem[] = assigned.map((e) => ({
      endptId: e.endptId,
      epPriority: e.epPriority,
    }));

    setLoading(true);
    try {
      await routeApi.updateRoutePoints({ id: routeId, data: { points } });
      toast.success('국선 배정이 완료되었습니다.');
      queryClient.invalidateQueries({
        queryKey: routeQueryKeys.getRoutePoints({ id: routeId }).queryKey,
      });
      onSuccess();
      setOpen(false);
    } catch {
      toast.error('국선 배정에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const columnDefs: ColDef<EndpointForAssign>[] = useMemo(
    () => [
      {
        headerName: '',
        field: 'assigned',
        maxWidth: 40,
        sortable: false,
        filter: false,
        suppressHeaderMenuButton: true,
        cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
        cellRenderer: (params: ICellRendererParams<EndpointForAssign>) => {
          if (!params.data) return null;
          return <input type="checkbox" checked={params.data.assigned} onChange={() => handleToggleAssign(params.data!.endptId)} className="w-4 h-4 cursor-pointer" />;
        },
      },
      {
        headerName: '노드',
        field: 'nodeName',
        flex: 1,
        minWidth: 70,
        cellRenderer: (params: ICellRendererParams<EndpointForAssign>) => {
          if (!params.data) return null;
          return params.data.nodeName ?? '-';
        },
      },
      {
        headerName: '구분',
        field: 'endptType',
        flex: 1,
        minWidth: 70,
        cellRenderer: (params: ICellRendererParams<EndpointForAssign>) => {
          if (!params.data) return null;
          return ENDPOINT_TYPE_LABELS[params.data.endptType] ?? `유형${params.data.endptType}`;
        },
      },
      {
        headerName: '국선명',
        field: 'endptName',
        flex: 2,
        minWidth: 100,
      },
      {
        headerName: '백업 구분',
        field: 'backupGb',
        flex: 1,
        minWidth: 90,
        cellRenderer: (params: ICellRendererParams<EndpointForAssign>) => {
          if (!params.data) return null;
          const gb = (params.data as any).backupGb ?? '';
          if (gb.includes('로컬')) return <span style={{ color: '#52c41a', fontWeight: 'bold', fontSize: 11 }}>로컬노드</span>;
          if (gb.includes('DR')) return <span style={{ color: '#1677ff', fontWeight: 'bold', fontSize: 11 }}>DR노드</span>;
          if (gb.includes('리모트')) return <span style={{ color: '#fa8c16', fontWeight: 'bold', fontSize: 11 }}>리모트 노드</span>;
          return gb || '-';
        },
      },
      {
        headerName: '우선순위',
        field: 'epPriority',
        width: 100,
        suppressKeyboardEvent: () => true,
        cellStyle: { overflow: 'visible' } as any,
        cellRenderer: (params: ICellRendererParams<EndpointForAssign>) => {
          if (!params.data) return null;
          return (
            <div onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
              <InputNumber
                min={0}
                max={8}
                size="small"
                value={params.data.epPriority}
                onChange={(val) => handlePriorityChange(params.data!.endptId, val ?? 0)}
                style={{ width: 70 }}
                disabled={false}
              />
            </div>
          );
        },
      },
    ],
    [handleToggleAssign, handlePriorityChange],
  );

  const assignedCount = endpoints.filter((e) => e.assigned).length;

  return (
    <Drawer
      title={`국선 배정 (${assignedCount}/32)`}
      closable={{ placement: 'end' }}
      open={open}
      onClose={() => setOpen(false)}
      width={780}
      closeIcon={<X className="size-4" />}
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={() => setOpen(false)}>취소</Button>
          <Button type="primary" onClick={handleOk} loading={loading}>
            확인
          </Button>
        </div>
      }
      destroyOnClose
    >
      <div className="h-full">
        <AgGridReact<EndpointForAssign>
          rowData={endpoints}
          columnDefs={columnDefs}
          gridOptions={{ ...gridOptions, statusBar: undefined, pagination: false, sideBar: false }}
          getRowId={(params) => String(params.data.endptId)}
          sideBar={false}
          pagination={false}
        />
      </div>
    </Drawer>
  );
});

RoutePointDialog.displayName = 'RoutePointDialog';
export default RoutePointDialog;
