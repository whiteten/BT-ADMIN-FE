/**
 * 스킬 배정 현황 모달 — 읽기 전용(READ ONLY).
 *
 * 선택된 상담사 N명 × 스킬셋 M건의 현재 배정 상태를 조합하여 표시.
 * 컬럼: 상담사(로그인ID·이름) / 상담그룹 / 스킬셋명 / 우선순위 / 스킬레벨 / 상태(배정됨·미배정).
 * 미배정 조합도 표시(흐리게). 편집/저장 없음 — 닫기만.
 *
 * 내부에서 useQueries 로 선택된 스킬셋별 배정 상담사 목록을 병렬 로딩.
 */
import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import type { ColDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Modal, Spin, Tag } from 'antd';
import type { AgentResponse } from '../../../features/agent-master/types';
import type { SkillsetResponse } from '../../../features/skillset-master/types';
import { skillAssignApi } from '../api/skillAssignApi';
import { skillAssignQueryKeys } from '../hooks/useSkillAssignQueries';
import type { SkillAgentResponse } from '../types/skillAssign';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

interface SkillAssignStatusModalProps {
  open: boolean;
  onClose: () => void;
  /** 선택된 상담사 목록 */
  selectedAgents: AgentResponse[];
  /** 선택된 스킬셋 목록 */
  selectedSkillsets: SkillsetResponse[];
}

interface StatusRow {
  rowKey: string;
  agentId: number;
  agentLoginId: string | null;
  agentName: string | null;
  groupName: string | null;
  treeName: string | null;
  skillsetId: number;
  skillsetName: string;
  priority: number | null;
  skillLevel: number | null;
  assigned: boolean;
}

export default function SkillAssignStatusModal({ open, onClose, selectedAgents, selectedSkillsets }: SkillAssignStatusModalProps) {
  // 선택된 스킬셋별로 병렬 조회 (useQueries — 동적 개수 허용)
  const skillsetQueries = useQueries({
    queries: selectedSkillsets.map((ss) => ({
      queryKey: skillAssignQueryKeys.agentsBySkillset(ss.skillsetId).queryKey,
      queryFn: () => skillAssignApi.getAgentsBySkillset(ss.skillsetId),
      enabled: open && !!ss.skillsetId,
      staleTime: 30_000,
    })),
  });

  const isLoading = skillsetQueries.some((q) => q.isLoading);

  // skillsetId → 배정 상담사 맵 빌드
  const assignedMap = useMemo(() => {
    const m = new Map<number, SkillAgentResponse[]>();
    for (let i = 0; i < selectedSkillsets.length; i++) {
      const ss = selectedSkillsets[i];
      const data = skillsetQueries[i]?.data ?? [];
      m.set(ss.skillsetId, data);
    }
    return m;
  }, [selectedSkillsets, skillsetQueries]);

  // N × M 전체 조합 생성
  const rows = useMemo<StatusRow[]>(() => {
    if (isLoading) return [];
    const result: StatusRow[] = [];
    for (const agent of selectedAgents) {
      for (const skillset of selectedSkillsets) {
        const mappings = assignedMap.get(skillset.skillsetId) ?? [];
        const mapping = mappings.find((m) => m.agentId === agent.agentId);
        result.push({
          rowKey: `${agent.agentId}_${skillset.skillsetId}`,
          agentId: agent.agentId,
          agentLoginId: agent.agentLoginId ?? null,
          agentName: agent.agentName ?? null,
          // 배정된 경우 BE listAgentsBySkillset 의 groupName(TB_IC_GROUPMASTER 조인) 우선,
          // 미배정 조합은 AgentResponse.groupName 으로 fallback
          groupName: mapping?.groupName ?? agent.groupName ?? null,
          // treeName = 스킬셋의 업무그룹. mapping 에서 우선, 없으면 selectedSkillsets 의 treeName 으로 fallback
          // (스킬셋이 업무그룹 미배정이면 null — BE LEFT JOIN 결과)
          treeName: mapping?.treeName ?? skillset.treeName ?? null,
          skillsetId: skillset.skillsetId,
          skillsetName: skillset.skillsetName ?? '-',
          priority: mapping?.priority ?? null,
          skillLevel: mapping?.skillLevel ?? null,
          assigned: !!mapping,
        });
      }
    }
    // 배정됨 먼저, 그 다음 상담사명, 스킬셋명 오름차순
    result.sort((a, b) => {
      if (a.assigned !== b.assigned) return a.assigned ? -1 : 1;
      const nameComp = (a.agentName ?? '').localeCompare(b.agentName ?? '');
      if (nameComp !== 0) return nameComp;
      return a.skillsetName.localeCompare(b.skillsetName);
    });
    return result;
  }, [isLoading, selectedAgents, selectedSkillsets, assignedMap]);

  const colDefs = useMemo<ColDef<StatusRow>[]>(
    () => [
      {
        headerName: '상담사',
        minWidth: 140,
        flex: 1,
        valueGetter: (p) => `${p.data?.agentName ?? ''} ${p.data?.agentLoginId ?? ''}`,
        cellRenderer: (params: { data?: StatusRow }) => {
          const d = params.data;
          if (!d) return null;
          return (
            <span className={d.assigned ? '' : 'text-gray-400'}>
              <span className="font-medium">{d.agentName ?? '-'}</span>
              <span className="ml-1 text-[11px] text-gray-400">({d.agentLoginId ?? '-'})</span>
            </span>
          );
        },
      },
      {
        field: 'groupName',
        headerName: '상담그룹',
        minWidth: 110,
        flex: 1,
        tooltipField: 'groupName',
        cellRenderer: (params: { data?: StatusRow }) => {
          const d = params.data;
          if (!d) return null;
          return <span className={d.assigned ? 'text-gray-700' : 'text-gray-400'}>{d.groupName ?? '미배정'}</span>;
        },
      },
      {
        field: 'treeName',
        headerName: '업무그룹',
        minWidth: 110,
        flex: 1,
        tooltipField: 'treeName',
        cellRenderer: (params: { data?: StatusRow }) => {
          const d = params.data;
          if (!d) return null;
          return <span className={d.assigned ? 'text-gray-700' : 'text-gray-400'}>{d.treeName ?? '미배정'}</span>;
        },
      },
      {
        field: 'skillsetName',
        headerName: '스킬셋명',
        minWidth: 130,
        flex: 1,
        cellRenderer: (params: { data?: StatusRow }) => {
          const d = params.data;
          if (!d) return null;
          return <span className={d.assigned ? 'font-medium' : 'text-gray-400'}>{d.skillsetName}</span>;
        },
      },
      {
        field: 'priority',
        headerName: '우선순위',
        width: 105,
        cellRenderer: (params: { data?: StatusRow }) => {
          const d = params.data;
          if (!d?.assigned) return <span className="text-gray-300 text-xs">-</span>;
          return <span className="font-bold text-[#405189]">{d.priority ?? '-'}</span>;
        },
      },
      {
        field: 'skillLevel',
        headerName: '스킬레벨',
        width: 105,
        cellRenderer: (params: { data?: StatusRow }) => {
          const d = params.data;
          if (!d?.assigned) return <span className="text-gray-300 text-xs">-</span>;
          return <span className="font-bold text-[#405189]">{d.skillLevel ?? '-'}</span>;
        },
      },
      {
        headerName: '상태',
        width: 90,
        sortable: false,
        filter: false,
        suppressHeaderMenuButton: true,
        cellRenderer: (params: { data?: StatusRow }) => {
          const d = params.data;
          if (!d) return null;
          return d.assigned ? (
            <Tag color="green" className="!text-xs">
              배정됨
            </Tag>
          ) : (
            <Tag color="default" className="!text-xs !text-gray-400">
              미배정
            </Tag>
          );
        },
      },
    ],
    [],
  );

  const { gridOptions: baseGridOptions, theme } = useAggridOptions();
  const gridOptions = useMemo(
    () => ({
      ...baseGridOptions,
      getRowId: ({ data }: { data: StatusRow }) => data.rowKey,
      pagination: false,
      statusBar: undefined,
      sideBar: false,
    }),
    [baseGridOptions],
  );

  const assignedCount = rows.filter((r) => r.assigned).length;
  const totalCount = rows.length;

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      title={
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-800">배정 현황</span>
          <span className="text-[11px] text-gray-400 font-normal">
            (상담사 {selectedAgents.length}명 × 스킬셋 {selectedSkillsets.length}건{!isLoading && ` · 배정됨 ${assignedCount}/${totalCount}`})
          </span>
          <span className="ml-2 text-[11px] text-orange-500 font-normal">읽기 전용</span>
        </div>
      }
      width={1060}
      styles={{ body: { padding: 0, height: 480 } }}
      destroyOnHidden
    >
      {isLoading ? (
        <div className="flex items-center justify-center h-[480px]">
          <Spin tip="배정 현황 조회 중..." />
        </div>
      ) : (
        <div style={{ height: 480 }}>
          <AgGridReact<StatusRow> rowData={rows} columnDefs={colDefs} gridOptions={gridOptions} theme={theme} />
        </div>
      )}
    </Modal>
  );
}
