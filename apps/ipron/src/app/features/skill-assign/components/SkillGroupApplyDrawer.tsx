/**
 * 스킬모음 적용 드로어.
 *
 * 진입: 스킬 배정 화면 하단 플로팅 액션바 [스킬모음 적용] — 상담사 1명 이상 체크 시 활성.
 * 구성:
 *  - 적용 대상 상담사 칩 (배정 화면에서 체크한 상담사)
 *  - 스킬모음 검색 / 단일 선택 목록 (읽기전용 — 등록/수정/삭제는 스킬셋 관리에서)
 *  - 멤버 스킬셋 P/L 미리보기 (읽기전용)
 *  - [적용] = 병합(upsert). 적용 후 드로어 유지 — 연속 적용 가능.
 */
import { useEffect, useMemo, useState } from 'react';
import type { ColDef, GridOptions } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Drawer, Input, Spin } from 'antd';
import { Search } from 'lucide-react';
import { toast } from '@/shared-util';
import type { AgentResponse } from '../../agent-master/types';
import { useApplySkillGroup, useGetSkillGroupMembers, useGetSkillGroups } from '../hooks/useSkillAssignQueries';
import type { SkillGroupMemberResponse, SkillGroupResponse } from '../types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

interface Props {
  open: boolean;
  /** 배정 화면에서 체크한 적용 대상 상담사 */
  agents: AgentResponse[];
  /** 카드 슬라이더 선택 테넌트 (전체 = undefined) */
  tenantId?: number;
  onClose: () => void;
}

const CHIP_MAX = 8;

export default function SkillGroupApplyDrawer({ open, agents, tenantId, onClose }: Props) {
  const { gridOptions: baseGridOptions } = useAggridOptions();
  const [groupSearch, setGroupSearch] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);

  // 닫힐 때 선택/검색 초기화
  useEffect(() => {
    if (!open) {
      setGroupSearch('');
      setSelectedGroupId(null);
    }
  }, [open]);

  const { data: groups = [], isLoading: groupsLoading } = useGetSkillGroups({
    params: tenantId != null ? { tenantId } : undefined,
    queryOptions: { enabled: open },
  });

  const filteredGroups = useMemo(() => {
    const kw = groupSearch.trim().toLowerCase();
    if (!kw) return groups;
    return groups.filter((g) => g.skillGroupName.toLowerCase().includes(kw) || (g.skillGroupDesc ?? '').toLowerCase().includes(kw));
  }, [groups, groupSearch]);

  const selectedGroup = useMemo(() => groups.find((g) => g.skillGroupId === selectedGroupId) ?? null, [groups, selectedGroupId]);

  // 선택 모음의 멤버 P/L 미리보기 (읽기전용)
  const { data: members = [], isFetching: membersFetching } = useGetSkillGroupMembers(open ? selectedGroupId : null);

  const { mutate: applyGroup, isPending: applying } = useApplySkillGroup({
    mutationOptions: {
      onSuccess: (result) => {
        // 적용 후 드로어 유지 — 다른 모음 연속 적용 가능
        toast.success(
          `'${selectedGroup?.skillGroupName ?? '-'}' 적용 완료 — 상담사 ${result.agentCount}명 × 스킬 ${result.memberCount}건 병합 (추가 ${result.added} · 갱신 ${result.updated})`,
        );
      },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '스킬모음 적용 실패';
        toast.error(msg);
      },
    },
  });

  const handleApply = () => {
    if (selectedGroupId == null || !agents.length) return;
    applyGroup({ skillGroupId: selectedGroupId, body: { agentIds: agents.map((a) => a.agentId) } });
  };

  const canApply = selectedGroupId != null && members.length > 0 && agents.length > 0 && !membersFetching;

  // ── 멤버 미리보기 그리드 (읽기전용, 단일 선택 없음, 페이징 없음) ──
  const memberColumns = useMemo<ColDef<SkillGroupMemberResponse>[]>(
    () => [
      { field: 'skillsetName', headerName: '스킬셋', flex: 1, minWidth: 160, tooltipField: 'skillsetName' },
      { headerName: '우선순위', width: 110, valueGetter: (p) => p.data?.priority ?? 0, filter: 'agNumberColumnFilter', cellStyle: { textAlign: 'center' } },
      { headerName: '스킬레벨', width: 110, valueGetter: (p) => p.data?.skillLevel ?? 0, filter: 'agNumberColumnFilter', cellStyle: { textAlign: 'center' } },
    ],
    [],
  );

  const memberGridOptions = useMemo<GridOptions<SkillGroupMemberResponse>>(
    () => ({
      ...baseGridOptions,
      statusBar: undefined,
      sideBar: false,
      pagination: false,
      rowNumbers: false,
      rowSelection: { mode: 'singleRow', checkboxes: false, enableClickSelection: false },
      getRowId: ({ data }) => String(data.skillsetId),
    }),
    [baseGridOptions],
  );

  return (
    <Drawer
      title="스킬모음 적용"
      closable={{ placement: 'end' }}
      size={720}
      open={open}
      onClose={onClose}
      footer={
        <div className="flex items-center gap-2">
          <Button onClick={onClose}>닫기</Button>
          <Button type="primary" disabled={!canApply} loading={applying} onClick={handleApply}>
            {canApply ? `적용 — 상담사 ${agents.length}명 × 스킬 ${members.length}건` : '적용'}
          </Button>
        </div>
      }
    >
      {/* ── 적용 대상 상담사 ── */}
      <div className="mb-5">
        <h5 className="flex items-center gap-2 text-xs font-bold text-gray-500 border-b border-dashed border-gray-200 pb-1.5 mb-2">적용 대상 상담사</h5>
        <div className="flex flex-wrap gap-1.5">
          {agents.slice(0, CHIP_MAX).map((a) => (
            <span key={a.agentId} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#eef1fb] text-[#405189] text-xs font-semibold">
              {a.agentName ?? '-'} <span className="font-normal text-[11px] text-[#7a86b3]">{a.agentLoginId ?? '-'}</span>
            </span>
          ))}
          {agents.length > CHIP_MAX && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs font-semibold">+{agents.length - CHIP_MAX}명</span>
          )}
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#f0fdf4] text-[#15803d] text-xs font-semibold">총 {agents.length}명</span>
        </div>
      </div>

      {/* ── 스킬모음 선택 (단일 선택) ── */}
      <div className="mb-5">
        <h5 className="flex items-center gap-2 text-xs font-bold text-gray-500 border-b border-dashed border-gray-200 pb-1.5 mb-2">
          스킬모음 선택 <span className="font-normal text-gray-400">(단일 선택)</span>
          <span className="ml-auto flex items-center gap-1.5 font-normal">
            <Input
              size="small"
              allowClear
              prefix={<Search className="size-3.5 text-gray-400" />}
              placeholder="모음명 검색"
              value={groupSearch}
              onChange={(e) => setGroupSearch(e.target.value)}
              style={{ width: 160 }}
            />
          </span>
        </h5>
        <div className="border border-gray-200 rounded-md overflow-y-auto max-h-[240px]">
          {groupsLoading ? (
            <div className="flex items-center justify-center py-6">
              <Spin size="small" />
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="flex items-center justify-center py-6 text-xs text-gray-400">
              {groupSearch.trim() ? `'${groupSearch}' 에 맞는 스킬모음이 없습니다` : '등록된 스킬모음이 없습니다'}
            </div>
          ) : (
            filteredGroups.map((g) => {
              const sel = g.skillGroupId === selectedGroupId;
              return (
                <div
                  key={g.skillGroupId}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedGroupId((prev) => (prev === g.skillGroupId ? null : g.skillGroupId))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedGroupId((prev) => (prev === g.skillGroupId ? null : g.skillGroupId));
                    }
                  }}
                  className={`flex items-center gap-2.5 px-3 py-2 border-b border-gray-100 last:border-b-0 cursor-pointer text-xs transition ${
                    sel ? 'bg-[#eef1fb] shadow-[inset_3px_0_0_#405189]' : 'hover:bg-[#fafbfd]'
                  }`}
                >
                  {/* 단일 선택 라디오 */}
                  <span
                    className={`flex-shrink-0 w-[15px] h-[15px] rounded-full border-2 ${sel ? 'border-[#405189]' : 'border-gray-400'}`}
                    style={sel ? { background: 'radial-gradient(circle, #405189 45%, #fff 50%)' } : undefined}
                  />
                  <span className="font-semibold text-gray-800 min-w-[130px] truncate">{g.skillGroupName}</span>
                  <span className="flex-1 min-w-0 text-gray-500 truncate">{g.skillGroupDesc || '—'}</span>
                  <span className="flex-shrink-0 text-[11px] text-gray-400 whitespace-nowrap">
                    스킬 {g.memberCount}건{g.updateDate ? ` · ${g.updateDate}` : ''}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── 멤버 스킬셋 미리보기 (읽기전용) ── */}
      <div className="mb-5">
        <h5 className="flex items-center gap-2 text-xs font-bold text-gray-500 border-b border-dashed border-gray-200 pb-1.5 mb-2">
          멤버 스킬셋 미리보기 {selectedGroup != null && !membersFetching && <span className="font-normal text-gray-400">({members.length}건)</span>}
        </h5>
        {selectedGroup == null ? (
          <div className="text-center text-xs text-gray-400 py-5 border border-dashed border-gray-200 rounded-md">위에서 스킬모음을 선택하면 멤버 스킬셋이 표시됩니다</div>
        ) : membersFetching ? (
          <div className="flex items-center justify-center py-5 border border-dashed border-gray-200 rounded-md">
            <Spin size="small" />
          </div>
        ) : members.length === 0 ? (
          <div className="text-center text-xs text-gray-400 py-5 border border-dashed border-gray-200 rounded-md">이 모음에 등록된 멤버 스킬셋이 없습니다</div>
        ) : (
          <div className="ag-theme-quartz h-[240px]">
            <AgGridReact<SkillGroupMemberResponse> rowData={members} columnDefs={memberColumns} gridOptions={memberGridOptions} />
          </div>
        )}
      </div>
    </Drawer>
  );
}
