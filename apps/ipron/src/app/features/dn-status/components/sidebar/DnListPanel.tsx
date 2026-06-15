/**
 * 사이드바 DN 목록 탭 (목업 renderSidebarDnList).
 *
 * 기존 /api/ipron/dns (DnController) 재사용 — 노드+타입 필터(nodeId, dnTypes).
 *  - DN_MASTER 소스 타입(내선 11 / SIP트렁크 채널 13)만 조회 가능.
 *  - GDN 3종(ACD 16/CTI큐 17/SIP트렁크 18)·GlobalDN 플래그는 GDN_MASTER/플래그 소스라 /dns 로 안 나옴
 *    → 드릴다운 미지원 안내(건수는 노드 카드/개요 탭 참조).
 *
 * 그리드 = useAggridOptions 훅(11규칙): quartz theme / 단일선택 무체크박스 / 페이징 금지 /
 *  raw 코드 비노출(typeName/statusName 라벨, null→'-') / 더블클릭 무반응(조회전용).
 */
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ColDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Empty, Input } from 'antd';
import { Search } from 'lucide-react';
import { dnApi } from '../../../dn/api/dnApi';
import type { DnResponse } from '../../../dn/types';
import { DRILLDOWN_DN_TYPES, type DnTypeKey, TYPE_LABELS } from '../../types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

interface DnListPanelProps {
  nodeId: number;
  typeKey: DnTypeKey;
}

export default function DnListPanel({ nodeId, typeKey }: DnListPanelProps) {
  const { gridOptions } = useAggridOptions();
  const [searchText, setSearchText] = useState('');

  const dnTypes = DRILLDOWN_DN_TYPES[typeKey];
  const supportsDrilldown = dnTypes != null;
  // gflag(GlobalDN 플래그) 는 노드 전체 GlobalDN — 타입 무관 globalDnYn=1. /dns 는 globalDn 필터 미지원이라
  // 노드 전건 조회 후 클라 필터(데이터량 = 노드 1개라 안전).
  const isGflag = typeKey === 'gflag';

  const params = useMemo(() => {
    if (isGflag) return { nodeId };
    if (dnTypes) return { nodeId, dnTypes };
    return null;
  }, [isGflag, nodeId, dnTypes]);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['dnStatusDnList', params],
    queryFn: () => dnApi.getList(params as Record<string, unknown>),
    enabled: !!params,
  });

  const filteredRows = useMemo(() => {
    let list = rows;
    if (isGflag) list = list.filter((r) => r.globalDnYn === 1);
    const kw = searchText.trim().toLowerCase();
    if (kw) list = list.filter((r) => [r.dnNo, r.tenantName, r.dnTypeName, r.dnStatusName].some((v) => v?.toString().toLowerCase().includes(kw)));
    return list;
  }, [rows, isGflag, searchText]);

  const columnDefs = useMemo<ColDef<DnResponse>[]>(
    () => [
      { headerName: 'DN 번호', field: 'dnNo', flex: 1, minWidth: 120, tooltipField: 'dnNo' },
      { headerName: '타입', field: 'dnTypeName', flex: 1, minWidth: 110, valueGetter: (p) => p.data?.dnTypeName ?? '-' },
      { headerName: '상태', field: 'dnStatusName', flex: 0.9, minWidth: 90, valueGetter: (p) => p.data?.dnStatusName ?? '-' },
      { headerName: '테넌트', field: 'tenantName', flex: 1.2, minWidth: 120, tooltipField: 'tenantName', valueGetter: (p) => p.data?.tenantName ?? '-' },
      {
        headerName: 'GlobalDN',
        field: 'globalDnYn',
        flex: 0.8,
        minWidth: 90,
        valueGetter: (p) => (p.data?.globalDnYn === 1 ? '설정' : '-'),
      },
    ],
    [],
  );

  if (!supportsDrilldown && !isGflag) {
    // GDN 3종 — DN_MASTER 소스 아님
    return (
      <div className="flex flex-col">
        <div className="mb-3 text-[13px] font-semibold text-gray-800">{TYPE_LABELS[typeKey]} 목록</div>
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={`${TYPE_LABELS[typeKey]}은 그룹DN(GDN) 자원으로, 건수는 노드 카드 및 개요 탭에서 확인할 수 있습니다.`} />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-[13px] font-semibold text-gray-800">{TYPE_LABELS[typeKey]} 목록</span>
        <span className="text-[12px] text-gray-500">({filteredRows.length}건)</span>
      </div>
      <Input
        className="mb-3"
        prefix={<Search className="size-3.5 text-gray-400" />}
        placeholder="DN 검색"
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        allowClear
      />
      <div className="min-h-[320px] flex-1">
        <AgGridReact<DnResponse>
          rowData={filteredRows}
          columnDefs={columnDefs}
          loading={isLoading}
          gridOptions={{
            ...gridOptions,
            statusBar: undefined,
            pagination: false,
            sideBar: false,
            rowNumbers: false,
          }}
        />
      </div>
    </div>
  );
}
