/**
 * 사이드바 DN 목록 탭.
 *
 * 기존 /api/ipron/dns (DnController) 재사용 — 노드+타입 필터(nodeId, dnTypes).
 *  - DN_MASTER 소스 타입(내선 11 / SIP트렁크 채널 13)만 조회 가능 + GlobalDN 플래그(globalDnYn=1) 필터.
 *  - GDN 3종(ACD 16/CTI큐 17/SIP트렁크 18)은 GDN_MASTER 소스라 /dns 로 안 나옴 → 타입 선택지에 없음
 *    (건수는 노드 카드/개요 탭 참조).
 *
 * 타입 선택 = 패널 내부 antd Segmented(내선/SIP트렁크 채널/GlobalDN). 카드 단일 클릭 진입이라
 *  자원행 클릭으로 타입을 받지 않고 여기서 직접 고른다.
 * 그리드 = useAggridOptions 훅(표준): quartz theme / 단일선택 무체크박스 / 페이징 금지 /
 *  컬럼 필터 전면 활성(코드값 없음·라벨만) / raw 코드 비노출(null→'-') / 더블클릭 무반응(조회전용).
 */
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ColDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Empty, Input, Segmented } from 'antd';
import { Search } from 'lucide-react';
import { dnApi } from '../../../dn/api/dnApi';
import type { DnResponse } from '../../../dn/types';
import { DRILLDOWN_DN_TYPES, type DnTypeKey, TYPE_LABELS } from '../../types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

interface DnListPanelProps {
  nodeId: number;
}

/** DN_MASTER 소스로 조회 가능한 타입(드릴다운 지원) — Segmented 선택지 */
const LIST_TYPES: DnTypeKey[] = ['edn', 'tdn', 'gflag'];

/**
 * DN 타입 코드 → 라벨 (DOMAIN-SEMANTICS 정본).
 * BE 의 dnTypeName 이 null 로 내려오는 경우가 많아(정식 EDN 화면도 항상 '내선'으로 마스킹) 코드 기반 파생으로 보강.
 */
const DN_TYPE_LABEL: Record<string, string> = {
  '11': '내선',
  '12': '상담사 ADN',
  '13': 'SIP트렁크 채널',
  '14': '그룹DN 예약',
  '15': 'SCA',
  '16': 'PARK',
  '17': 'AA',
};

/** DN 상태 코드 → 라벨 (DOMAIN: 0/null=미할당, 1=할당(정상), 9=로그아웃). */
const DN_STATUS_LABEL: Record<string, string> = {
  '0': '미할당',
  '1': '할당',
  '8': '로그인',
  '9': '로그아웃',
};

export default function DnListPanel({ nodeId }: DnListPanelProps) {
  const { gridOptions } = useAggridOptions();
  const [searchText, setSearchText] = useState('');
  const [typeKey, setTypeKey] = useState<DnTypeKey>('edn');

  const dnTypes = DRILLDOWN_DN_TYPES[typeKey];
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
      // 타입/상태: BE name 이 null 인 경우가 잦아 코드(dnType/dnStatus) 기반 라벨로 보강(null 만 '-')
      {
        headerName: '타입',
        field: 'dnTypeName',
        flex: 1,
        minWidth: 110,
        valueGetter: (p) => p.data?.dnTypeName ?? DN_TYPE_LABEL[String(p.data?.dnType)] ?? '-',
      },
      {
        headerName: '상태',
        field: 'dnStatusName',
        flex: 0.9,
        minWidth: 90,
        valueGetter: (p) => p.data?.dnStatusName ?? DN_STATUS_LABEL[String(p.data?.dnStatus)] ?? '-',
      },
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

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3">
        <Segmented<DnTypeKey> size="small" value={typeKey} onChange={(v) => setTypeKey(v)} options={LIST_TYPES.map((k) => ({ label: TYPE_LABELS[k], value: k }))} />
      </div>
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
        {filteredRows.length === 0 && !isLoading ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="검색된 데이터가 없습니다." />
        ) : (
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
        )}
      </div>
    </div>
  );
}
