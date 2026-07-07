/**
 * 상담사 관리 목록 페이지 (AS-IS SWAT IPR20S4010 / IPR20S4020).
 *
 * 레이아웃: 상단 카드 슬라이더 + 하단 (좌 그룹트리 ↔ 스플리터 ↔ 우 ag-Grid).
 * 드래그앤드롭: 그리드 선택 행을 좌측 트리 노드에 드롭 → 그룹 이동 (다른 테넌트는 확인 모달).
 *
 * Phase 1 스코프 (memory: agent-master-phase1-exclude):
 *   - 매크로/인사말/스케줄/핸드폰·이메일/노드·DR노드/작업자·일시 제외
 *   - 엑셀 가져오기/내보내기 UI 는 후속 (BE endpoint 추가 후)
 */
import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Input, Modal, Select } from 'antd';
import { Download, Plus, Save, Search, Trash2, Upload, Users } from 'lucide-react';
import { useAuthStore, useBreadcrumbStore, useOperatorScopeStore } from '@/shared-store';
import { toast } from '@/shared-util';
import { GridRowColorLegend } from '../../components/GridRowColorLegend';
import { agentMasterApi } from '../../features/agent-master/api/agentMasterApi';
import AgentGroupFormDrawer from '../../features/agent-master/components/AgentGroupFormDrawer';
import AgentGroupTree from '../../features/agent-master/components/AgentGroupTree';
import AgentImportDrawer from '../../features/agent-master/components/AgentImportDrawer';
import AgentMasterFormDrawer from '../../features/agent-master/components/AgentMasterFormDrawer';
import AgentMasterTable from '../../features/agent-master/components/AgentMasterTable';
import AgentMediaStatusTable, { type AgentMediaStatusTableHandle, type MediaKey, type MediaOption } from '../../features/agent-master/components/AgentMediaStatusTable';
import { MEDIA_KEY_LABELS, MEDIA_TYPE_CODE_TO_KEY } from '../../features/agent-master/constants/codes';
import {
  agentMasterQueryKeys,
  useBulkGroupAgents,
  useBulkMediaAgents,
  useDeleteAgentGroup,
  useDeleteAgents,
  useGetAgentGroupTree,
  useGetAgentTenants,
  useGetAgents,
  useReorderAgentGroup,
} from '../../features/agent-master/hooks/useAgentMasterQueries';
import type { AgentGroupNode, AgentResponse, AgentUpdateRequest } from '../../features/agent-master/types';
import { useGetMediaTypes } from '../../features/media-type/hooks/useMediaTypeQueries';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb = [{ title: '상담사 관리' }, { title: '상담사' }, { title: '상담사 설정', path: '/ipron/agent-master' }];

export default function AgentMasterList() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);
  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const navigate = useNavigate();
  const modal = useModal();
  const queryClient = useQueryClient();

  const invalidateAgents = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: agentMasterQueryKeys.getList._def });
    queryClient.invalidateQueries({ queryKey: agentMasterQueryKeys.getTenants.queryKey });
  }, [queryClient]);

  // 활성 테넌트 (JWT) — 멀티테넌트 개편(브랜치 C-2): 화면 내 "전체+테넌트" 선택기 제거.
  // 세션은 활성 테넌트로 토큰 스코프되고, 등록도 활성 테넌트에 생성한다. 전환은 헤더 TenantChip.
  const ctxTenantId = useAuthStore((s) => {
    const t = s.userInfo?.tenant;
    return t ? Number(t) : null;
  });
  const activeTenantName = useAuthStore((s) => s.userInfo?.tenantName ?? null);

  // 운영자 모드(통합운영, 브랜치 E) — 시스템 관리자가 헤더 TenantChip 에서 진입.
  //  - 전체(actAsTenantId=null): tenantId 미전달 → apiClient 가 X-View-All-Tenants 주입 → 전체 테넌트 조회
  //  - 대행(actAsTenantId=X): tenantId=X 로 조회 스코프 + apiClient 가 X-Act-As-Tenant 주입 → X 대행 CUD
  const operatorMode = useOperatorScopeStore((s) => s.operatorMode);
  const actAsTenantId = useOperatorScopeStore((s) => s.actAsTenantId);
  const setActAsTenant = useOperatorScopeStore((s) => s.setActAsTenant);
  const opTenantId = actAsTenantId ? Number(actAsTenantId) : null;
  // 조회/등록 스코프: 일반=활성테넌트 / 운영자=대행테넌트(null=전체).
  const selectedTenantId = operatorMode ? opTenantId : ctxTenantId;

  // ─── State ──────────────────────────────────────────────────────────────
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [searchText, setSearchText] = useState('');
  const [selectedRows, setSelectedRows] = useState<AgentResponse[]>([]);
  // 우측 그리드 박스 탭: 'agent'(상담사 목록) / 'media'(미디어 관리 현황 매트릭스)
  const [gridTab, setGridTab] = useState<'agent' | 'media'>('agent');
  // 미디어 탭 선택 미디어 종류 — 탭 헤더 인라인 Select 로 제어 (동적 첫 번째로 자동 초기화)
  const [mediaKey, setMediaKey] = useState<MediaKey>('voip');
  // 미디어 탭 — 상단 액션바에서 저장 버튼 트리거를 위한 ref + dirty 카운트
  const mediaTableRef = useRef<AgentMediaStatusTableHandle>(null);
  const [mediaDirtyCount, setMediaDirtyCount] = useState(0);

  // 그룹배정 모달 — 선택 상담사를 다른 그룹으로 일괄 이동
  const [groupDeployOpen, setGroupDeployOpen] = useState(false);
  const [deployTargetGroupId, setDeployTargetGroupId] = useState<number | undefined>();

  const [treeWidth, setTreeWidth] = useState(260);
  const splitRef = useRef<HTMLDivElement>(null);

  // 상담그룹 Drawer (등록/수정) — 트리 액션에서 호출
  const [groupDrawer, setGroupDrawer] = useState<
    { open: false } | { open: true; mode: 'create'; tenantId?: number; priorGrpId?: number } | { open: true; mode: 'edit'; groupId: number }
  >({ open: false });

  // 상담사 Drawer (등록/수정) — 더블클릭 / [등록] 버튼에서 호출
  const [agentDrawer, setAgentDrawer] = useState<
    { open: false } | { open: true; mode: 'create'; tenantId?: number; groupId?: number } | { open: true; mode: 'edit'; agentId: number }
  >({ open: false });

  // 엑셀 가져오기 Drawer
  const [importDrawerOpen, setImportDrawerOpen] = useState(false);

  // ─── Queries ────────────────────────────────────────────────────────────
  const { data: agents = [], isLoading } = useGetAgents({
    params: { tenantId: selectedTenantId ?? undefined, groupId: selectedGroupId ?? undefined },
  });
  const { data: groupTree = [] } = useGetAgentGroupTree({
    params: { tenantId: selectedTenantId ?? undefined },
  });

  // 운영자 모드 전용 — 대행 선택기용 테넌트별 상담사 통계(전체/테넌트 카운트). view-all 로 전체 테넌트 반환.
  const { data: operatorTenants = [] } = useGetAgentTenants({ queryOptions: { enabled: operatorMode } });

  // TB_IC_MEDIA_USAGE 등록·활성 미디어 목록 (동적 노출)
  const { data: mediaTypeList = [] } = useGetMediaTypes();

  /** 서버 미디어 목록 → FE MediaOption 배열 (SWAT 정합 순서 유지). */
  const availableMediaOptions = useMemo<MediaOption[]>(() => {
    if (!mediaTypeList.length) return [];
    // 정렬 기준: MEDIA_TYPE_CODE_TO_KEY 키 순서(voip=0, chat=10 ...)
    const ORDER: Record<string, number> = {
      voip: 0,
      chat: 10,
      videoVoice: 20,
      videoChat: 30,
      email: 40,
      fax: 50,
      mvoip: 61,
      sms: 80,
    };
    return mediaTypeList
      .map((mt) => {
        const key = MEDIA_TYPE_CODE_TO_KEY[mt.mediaType] as MediaKey | undefined;
        if (!key) return null;
        const label = MEDIA_KEY_LABELS[key] ?? (mt.mediaAlias || key);
        return { key, label };
      })
      .filter((x): x is MediaOption => x !== null)
      .sort((a, b) => (ORDER[a.key] ?? 999) - (ORDER[b.key] ?? 999));
  }, [mediaTypeList]);

  // availableMediaOptions 로드 시: 현재 mediaKey 가 목록에 없으면 첫 번째 키로 리셋
  useEffect(() => {
    if (!availableMediaOptions.length) return;
    if (!availableMediaOptions.some((o) => o.key === mediaKey)) {
      setMediaKey(availableMediaOptions[0].key);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableMediaOptions]);

  // ─── Mutations ──────────────────────────────────────────────────────────
  const { mutate: deleteAgents, isPending: isDeleting } = useDeleteAgents({
    mutationOptions: {
      onSuccess: () => {
        toast.success('선택한 상담사가 삭제되었습니다');
        setSelectedRows([]);
      },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '삭제 실패';
        toast.error(msg);
      },
    },
  });

  // 그룹 일괄 변경 — 선택/드롭 상담사를 대상 그룹으로 1콜 이동 (207 best-effort)
  const { mutate: bulkGroupAgents } = useBulkGroupAgents({
    mutationOptions: {
      onSuccess: (result) => {
        if (result && result.failCount > 0) {
          toast.warning(`${result.successCount + result.failCount}명 중 ${result.failCount}명 그룹 변경 실패`);
        } else {
          toast.success('상담사 그룹이 변경되었습니다');
        }
        setSelectedRows([]);
      },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '그룹 이동 실패';
        toast.error(msg);
      },
    },
  });

  const { mutate: reorderGroup } = useReorderAgentGroup({
    mutationOptions: {
      onSuccess: () => {
        toast.success('상담그룹 순서가 변경되었습니다');
      },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '그룹 재배치 실패';
        toast.error(msg);
      },
    },
  });

  const { mutate: deleteGroup } = useDeleteAgentGroup({
    mutationOptions: {
      onSuccess: () => {
        toast.success('상담그룹이 삭제되었습니다');
        if (selectedGroupId != null) setSelectedGroupId(null);
      },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '그룹 삭제 실패';
        toast.error(msg);
      },
    },
  });

  // 미디어 관리 탭 저장 — dirty 행을 1콜 벌크 PUT (미디어 필드만, 단일 트랜잭션 전체 롤백)
  const { mutate: bulkMediaAgents, isPending: isSavingMedia } = useBulkMediaAgents({
    mutationOptions: {
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '미디어 옵션 저장 실패';
        toast.error(msg);
      },
    },
  });

  const handleSaveDirty = useCallback(
    (entries: { agentId: number; body: AgentUpdateRequest }[], clearDirty: () => void) => {
      if (entries.length === 0) return;
      const total = entries.length;
      // 미디어 필드(useGrpMdaOpt + mediaMatrix)만 1콜 벌크로 — 비미디어 필드 미전송.
      const items = entries.map(({ agentId, body }) => ({
        agentId,
        useGrpMdaOpt: body.useGrpMdaOpt,
        mediaMatrix: body.mediaMatrix,
      }));
      bulkMediaAgents(
        { items },
        {
          onSuccess: () => {
            toast.success(`미디어 옵션 ${total}행이 저장되었습니다`);
            clearDirty();
          },
          // 전체 롤백 — 실패 시 dirty 유지(clearDirty 미호출), 토스트는 훅 onError 처리.
        },
      );
    },
    [bulkMediaAgents],
  );

  // ─── Derived ────────────────────────────────────────────────────────────
  const filteredAgents = useMemo(() => {
    const kw = searchText.trim().toLowerCase();
    if (!kw) return agents;
    return agents.filter((r) => {
      const fields: (string | number | null | undefined)[] = [r.agentLoginId, r.agentName, r.agentAlias, r.tenantName, r.groupName, r.jikgup];
      return fields.some((f) => f != null && String(f).toLowerCase().includes(kw));
    });
  }, [agents, searchText]);

  // ─── Handlers ───────────────────────────────────────────────────────────

  const handleExcelExport = useCallback(async () => {
    try {
      const blob = await agentMasterApi.exportExcel({
        tenantId: selectedTenantId ?? undefined,
        groupId: selectedGroupId ?? undefined,
        keyword: searchText.trim() || undefined,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'agents.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message ?? '엑셀 내보내기 실패');
    }
  }, [selectedTenantId, selectedGroupId, searchText]);

  const handleImportOpen = useCallback(() => {
    if (operatorMode && opTenantId == null) {
      toast.warning('운영자 모드 전체 보기에서는 등록할 수 없습니다. 대행할 테넌트를 먼저 선택하세요.');
      return;
    }
    if (!selectedGroupId) {
      toast.error('좌측 상담그룹을 먼저 선택하세요');
      return;
    }
    setImportDrawerOpen(true);
  }, [operatorMode, opTenantId, selectedGroupId]);

  const handleCreate = useCallback(() => {
    // 운영자 모드 "전체"(대행 테넌트 미선택)에서는 생성 대상 테넌트가 모호 → 대행 테넌트 선택 요구.
    if (operatorMode && opTenantId == null) {
      toast.warning('운영자 모드 전체 보기에서는 등록할 수 없습니다. 대행할 테넌트를 먼저 선택하세요.');
      return;
    }
    setAgentDrawer({
      open: true,
      mode: 'create',
      tenantId: selectedTenantId ?? undefined,
      groupId: selectedGroupId ?? undefined,
    });
  }, [operatorMode, opTenantId, selectedTenantId, selectedGroupId]);

  const handleEdit = useCallback((a: AgentResponse) => setAgentDrawer({ open: true, mode: 'edit', agentId: a.agentId }), []);

  const handleDelete = useCallback(
    (a: AgentResponse) => {
      modal.confirm.execute({
        onOk: () => deleteAgents([a.agentId]),
        options: { title: '상담사 삭제', content: `"${a.agentName}" 상담사를 삭제하시겠습니까?` },
      });
    },
    [modal, deleteAgents],
  );

  const handleBulkDelete = useCallback(() => {
    if (selectedRows.length === 0) return;
    modal.confirm.execute({
      onOk: () => deleteAgents(selectedRows.map((r) => r.agentId)),
      options: {
        title: '상담사 일괄 삭제',
        content: `선택한 ${selectedRows.length}명의 상담사를 삭제하시겠습니까?`,
      },
    });
  }, [selectedRows, modal, deleteAgents]);

  // 그룹배정 — 선택 상담사를 대상 그룹으로 일괄 이동
  const handleGroupDeploy = useCallback(() => {
    if (selectedRows.length === 0) {
      toast.error('배정할 상담사를 선택하세요');
      return;
    }
    setDeployTargetGroupId(undefined);
    setGroupDeployOpen(true);
  }, [selectedRows]);

  const handleGroupDeployOk = useCallback(() => {
    if (!deployTargetGroupId) {
      toast.error('배정할 상담그룹을 선택하세요');
      return;
    }
    if (selectedRows.length === 0) return;
    bulkGroupAgents({ agentIds: selectedRows.map((a) => a.agentId), groupId: deployTargetGroupId });
    setGroupDeployOpen(false);
    setDeployTargetGroupId(undefined);
  }, [selectedRows, deployTargetGroupId, bulkGroupAgents]);

  const handleSelectGroup = useCallback((groupId: number | null) => {
    setSelectedGroupId(groupId);
    setSelectedRows([]);
  }, []);

  // 그룹 이동 (드래그앤드롭) — 페이로드 agentIds 를 targetGroupId 로 이동
  const handleAgentDrop = useCallback(
    (targetGroupId: number, agentIds: number[]) => {
      if (!agentIds || agentIds.length === 0) return;
      const dragged = agents.filter((a) => agentIds.includes(a.agentId));
      if (dragged.length === 0) return;

      const target = findGroup(groupTree, targetGroupId);
      const sourceTenantIds = new Set(dragged.map((r) => r.tenantId));
      const sourceGroupIds = new Set(dragged.map((r) => r.groupId));
      if (sourceGroupIds.size === 1 && sourceGroupIds.has(targetGroupId)) {
        // 같은 그룹으로 드롭 — 무시
        return;
      }
      const crossTenant = target && (sourceTenantIds.size > 1 || !sourceTenantIds.has(target.tenantId));

      // 드롭 그룹(target)으로 dragged 상담사 전원을 1콜 벌크 이동.
      // crossTenant 면 확인 다이얼로그를 거친 뒤 실행(테넌트 이동 안전장치 보존).
      const move = () => {
        bulkGroupAgents({ agentIds: dragged.map((r) => r.agentId), groupId: targetGroupId });
      };

      if (crossTenant) {
        modal.confirm.execute({
          onOk: () => move(),
          options: {
            title: '다른 테넌트로 이동',
            content: `대상 그룹의 테넌트가 다릅니다. ${dragged.length}명의 상담사를 ${target?.tenantName ?? '대상 테넌트'} 로 이동하시겠습니까?`,
          },
        });
      } else {
        move();
      }
    },
    [agents, groupTree, modal, bulkGroupAgents],
  );

  // ─── Splitter (트리 ↔ 그리드 리사이즈) ──────────────────────────────────
  const onSplitterMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = treeWidth;
      const onMove = (ev: MouseEvent) => {
        const delta = ev.clientX - startX;
        const next = Math.max(180, Math.min(480, startWidth + delta));
        setTreeWidth(next);
      };
      const onUp = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [treeWidth],
  );

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 w-full h-full">
      {/* ===== 박스 1: 헤더 (별도 박스) ===== */}
      <div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
        <div className="flex items-center px-4 h-[56px]">
          <span className="text-sm font-semibold text-gray-700">상담사 설정</span>
          <div className="ml-auto flex items-center gap-2">
            <Input
              allowClear
              prefix={<Search className="size-3.5 text-gray-400" />}
              placeholder="상담사 검색 (로그인ID/이름/별명/직급)"
              value={searchText}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchText(e.target.value)}
              style={{ width: 220 }}
            />
            <Button icon={<Download className="size-3.5" />} onClick={handleExcelExport}>
              엑셀
            </Button>
            <Button icon={<Upload className="size-3.5" />} onClick={handleImportOpen}>
              가져오기
            </Button>
          </div>
        </div>
      </div>

      {/* ===== 운영자 모드 전용: 대행 테넌트 선택기 (전체 ↔ 테넌트) ===== */}
      {operatorMode && (
        <div className="bg-amber-50 border border-amber-200 rounded-md flex items-center gap-2 px-3 py-2 flex-shrink-0 overflow-x-auto">
          <span className="text-[11px] font-bold text-amber-700 shrink-0 pr-1">운영자 · 테넌트</span>
          <button
            type="button"
            onClick={() => {
              setActAsTenant(null);
              setSelectedGroupId(null);
              setSelectedRows([]);
            }}
            className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs transition ${
              opTenantId == null ? 'border-amber-500 bg-amber-500 text-white' : 'border-amber-200 bg-white text-amber-800 hover:border-amber-400'
            }`}
          >
            전체
          </button>
          {operatorTenants.map((t) => {
            const selected = opTenantId === t.tenantId;
            return (
              <button
                key={t.tenantId}
                type="button"
                onClick={() => {
                  setActAsTenant(String(t.tenantId));
                  setSelectedGroupId(null);
                  setSelectedRows([]);
                }}
                title={`${t.tenantName ?? `테넌트 ${t.tenantId}`} · 상담사 ${t.totalCnt.toLocaleString()}명 — 선택 시 이 테넌트를 대행합니다`}
                className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs transition ${
                  selected ? 'border-amber-600 bg-amber-600 text-white shadow-[0_0_0_2px_rgba(217,119,6,.2)]' : 'border-amber-200 bg-white text-amber-800 hover:border-amber-400'
                }`}
              >
                <span className="font-medium truncate max-w-[130px]">{t.tenantName ?? `테넌트 ${t.tenantId}`}</span>
                <span className={selected ? 'text-white/80 text-[11px]' : 'text-amber-400 text-[11px]'}>{t.totalCnt.toLocaleString()}</span>
              </button>
            );
          })}
          {opTenantId != null && <span className="ml-auto shrink-0 text-[11px] font-bold text-amber-700">대행 중 — 등록/수정이 이 테넌트에 반영됩니다</span>}
        </div>
      )}

      {/* ===== 트리 ↔ ag-Grid 스플릿 ===== */}
      <div ref={splitRef} className="flex flex-1 min-h-0 gap-4">
        {/* 좌측 그룹 트리 — DN/ADN 패턴 정합으로 별도 박스 */}
        <div className="bg-white bt-shadow flex flex-col flex-shrink-0 overflow-hidden" style={{ width: treeWidth }}>
          <div className="flex items-center px-4 h-[44px] border-b border-gray-100 flex-shrink-0">
            <span className="text-sm font-semibold text-gray-700">상담그룹</span>
            <div className="ml-auto">
              <Button
                size="small"
                type="primary"
                icon={<Plus className="size-3.5" />}
                onClick={() =>
                  setGroupDrawer({
                    open: true,
                    mode: 'create',
                    tenantId: selectedTenantId ?? undefined,
                  })
                }
              >
                그룹 추가
              </Button>
            </div>
          </div>
          <div className="flex-1 min-h-0">
            <AgentGroupTree
              tree={groupTree}
              selectedGroupId={selectedGroupId}
              onSelectGroup={handleSelectGroup}
              onCreateChild={(parent) =>
                setGroupDrawer({
                  open: true,
                  mode: 'create',
                  tenantId: parent?.tenantId ?? selectedTenantId ?? undefined,
                  priorGrpId: parent?.groupId,
                })
              }
              onEditGroup={(g) => setGroupDrawer({ open: true, mode: 'edit', groupId: g.groupId })}
              onDeleteGroup={async (g) => {
                // SWAT식 사전 체크: 하위그룹/소속상담사 있으면 confirm 없이 toast.error
                let count = 0;
                try {
                  count = await agentMasterApi.getGroupChildrenCount(g.groupId);
                } catch {
                  toast.error('그룹 정보를 확인할 수 없습니다');
                  return;
                }
                if (count > 0) {
                  // BE가 하위그룹과 상담사 수를 합산해 반환 — 두 케이스 구분 불가 시 통합 메시지
                  toast.error(`소속 상담사 또는 하위 그룹이 ${count}개 있어 삭제할 수 없습니다`);
                  return;
                }
                modal.confirm.execute({
                  onOk: () => deleteGroup(g.groupId),
                  options: { title: '그룹 삭제', content: `"${g.groupName}" 그룹을 삭제하시겠습니까?` },
                });
              }}
              onAgentDrop={handleAgentDrop}
              onGroupReorder={(movedGroupId, position, referenceGroupId) => {
                reorderGroup({
                  id: movedGroupId,
                  body: { position, referenceGroupId },
                });
              }}
            />
          </div>
        </div>

        {/* 스플리터 (트리 박스와 그리드 박스 사이 gap-4 영역에 정렬) */}
        <div className="flex-shrink-0 -mx-2 w-4 cursor-col-resize relative group" onMouseDown={onSplitterMouseDown}>
          <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 w-px h-9 bg-gray-300 rounded group-hover:bg-[#405189] transition-colors" />
        </div>

        {/* 우측 그리드 — DN/ADN 패턴 정합으로 별도 박스 (탭: 상담사 / 미디어 관리) */}
        <div className="bg-white bt-shadow flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden">
          {/* 탭 헤더 + 컨텍스트 툴바 */}
          <div className="border-b border-gray-100 flex items-center gap-2 h-[44px] pr-5 flex-shrink-0">
            <div className="flex items-stretch h-full">
              <GridTab label="상담사" active={gridTab === 'agent'} onClick={() => setGridTab('agent')} />
              <GridTab label="미디어 관리" active={gridTab === 'media'} onClick={() => setGridTab('media')} />
            </div>
            {/* 미디어 탭 활성 시: 미디어 종류 Select 탭 헤더 인라인 배치 (별도 40px 툴바 행 제거) */}
            {gridTab === 'media' && (
              <div className="flex items-center gap-1.5 pl-3 border-l border-gray-100">
                <span className="text-[11px] font-semibold text-gray-500 whitespace-nowrap">미디어</span>
                <Select
                  size="small"
                  style={{ width: 130 }}
                  value={mediaKey}
                  onChange={(v: MediaKey) => setMediaKey(v)}
                  options={availableMediaOptions.map((o) => ({ value: o.key, label: o.label }))}
                />
              </div>
            )}
            <span className="text-xs text-gray-500">
              {filteredAgents.length.toLocaleString()}건
              {gridTab === 'agent' && <span className={selectedRows.length > 0 ? '' : 'invisible'}> 중 {selectedRows.length}건 선택</span>}
            </span>
            {gridTab === 'agent' && (
              <div className="ml-auto flex items-center gap-2">
                <Button
                  icon={<Users className="size-3.5" />}
                  onClick={handleGroupDeploy}
                  disabled={selectedRows.length === 0}
                  title={selectedRows.length === 0 ? '배정할 상담사를 선택하세요' : `${selectedRows.length}명 그룹배정`}
                >
                  그룹배정
                </Button>
                <Button
                  danger
                  icon={<Trash2 className="size-3.5" />}
                  onClick={handleBulkDelete}
                  loading={isDeleting}
                  disabled={selectedRows.length === 0}
                  title={selectedRows.length === 0 ? '삭제할 상담사를 선택하세요' : '선택한 상담사 삭제'}
                >
                  삭제
                </Button>
                <Button type="primary" icon={<Plus className="size-3.5" />} onClick={handleCreate}>
                  등록
                </Button>
              </div>
            )}
            {gridTab === 'media' && (
              <div className="ml-auto flex items-center gap-2">
                <GridRowColorLegend items={['dirty']} />
                <div className="w-px h-4 bg-gray-200 flex-shrink-0" />
                <Button
                  type="primary"
                  size="small"
                  icon={<Save className="size-3.5" />}
                  onClick={() => {
                    if (mediaDirtyCount === 0) {
                      toast.info('변경할 데이터가 존재하지 않습니다');
                      return;
                    }
                    mediaTableRef.current?.save();
                  }}
                  loading={isSavingMedia}
                >
                  저장
                </Button>
              </div>
            )}
          </div>
          <div className="flex-1 min-h-0">
            {gridTab === 'agent' ? (
              <AgentMasterTable
                rowData={filteredAgents}
                isLoading={isLoading}
                onRowDoubleClicked={handleEdit}
                onDelete={handleDelete}
                onSelectionChanged={setSelectedRows}
                onBulkDelete={handleBulkDelete}
                selectedCount={selectedRows.length}
                getDragAgentIds={(dragRow) => {
                  if (selectedRows.some((r) => r.agentId === dragRow.agentId)) {
                    return selectedRows.map((r) => r.agentId);
                  }
                  return [dragRow.agentId];
                }}
              />
            ) : (
              <AgentMediaStatusTable
                ref={mediaTableRef}
                rowData={filteredAgents}
                isLoading={isLoading}
                onRowDoubleClicked={handleEdit}
                onSaveDirty={handleSaveDirty}
                saving={isSavingMedia}
                mediaKey={mediaKey}
                onDirtyChange={setMediaDirtyCount}
                availableMediaOptions={availableMediaOptions}
              />
            )}
          </div>
        </div>
      </div>

      <AgentGroupFormDrawer
        open={groupDrawer.open}
        mode={groupDrawer.open && groupDrawer.mode === 'edit' ? 'edit' : 'create'}
        groupId={groupDrawer.open && groupDrawer.mode === 'edit' ? groupDrawer.groupId : undefined}
        initialTenantId={groupDrawer.open && groupDrawer.mode === 'create' ? groupDrawer.tenantId : undefined}
        initialPriorGrpId={groupDrawer.open && groupDrawer.mode === 'create' ? groupDrawer.priorGrpId : undefined}
        onClose={() => setGroupDrawer({ open: false })}
      />

      <AgentMasterFormDrawer
        open={agentDrawer.open}
        mode={agentDrawer.open && agentDrawer.mode === 'edit' ? 'edit' : 'create'}
        agentId={agentDrawer.open && agentDrawer.mode === 'edit' ? agentDrawer.agentId : undefined}
        initialTenantId={agentDrawer.open && agentDrawer.mode === 'create' ? agentDrawer.tenantId : undefined}
        initialGroupId={agentDrawer.open && agentDrawer.mode === 'create' ? agentDrawer.groupId : undefined}
        onClose={() => setAgentDrawer({ open: false })}
      />

      <AgentImportDrawer
        open={importDrawerOpen}
        tenantId={selectedTenantId}
        groupId={selectedGroupId}
        tenantName={activeTenantName}
        groupName={(() => {
          if (!selectedGroupId) return null;
          const findName = (nodes: AgentGroupNode[]): string | null => {
            for (const n of nodes) {
              if (n.groupId === selectedGroupId) return n.groupName;
              if (n.children?.length) {
                const found = findName(n.children);
                if (found) return found;
              }
            }
            return null;
          };
          return findName(groupTree);
        })()}
        onClose={() => setImportDrawerOpen(false)}
        onSuccess={() => {
          invalidateAgents();
          // DN 정본 패턴: 드로어는 닫지 않음 — 사용자가 성공/실패 집계·실패행 확인 후 직접 닫기
        }}
      />

      {/* ===== 그룹배정 모달 (SWAT IPR20S4010 poAgentDeploy 대응) ===== */}
      <Modal
        title={`그룹배정 — ${selectedRows.length}명`}
        open={groupDeployOpen}
        onOk={handleGroupDeployOk}
        onCancel={() => {
          setGroupDeployOpen(false);
          setDeployTargetGroupId(undefined);
        }}
        okText="배정"
        cancelText="취소"
        width={480}
      >
        <div className="mb-4 text-sm text-gray-600">선택한 상담사를 다른 상담그룹으로 일괄 이동합니다.</div>
        <div className="mb-2">
          <div className="max-h-48 overflow-y-auto border border-gray-100 rounded text-sm">
            {selectedRows.map((r) => (
              <div key={r.agentId} className="flex items-center gap-2 px-3 py-1.5 border-b border-gray-50 last:border-0">
                <span className="font-medium text-gray-800">{r.agentName}</span>
                <span className="text-gray-400 text-xs">({r.agentLoginId})</span>
                <span className="ml-auto text-xs text-gray-500">{r.groupName ?? '-'}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-4">
          <label className="text-sm font-medium text-gray-700 mb-1 block">
            배정할 상담그룹 <span className="text-red-500">*</span>
          </label>
          <Select
            style={{ width: '100%' }}
            placeholder="상담그룹을 선택하세요"
            value={deployTargetGroupId}
            onChange={(v) => setDeployTargetGroupId(v)}
            showSearch
            optionFilterProp="label"
            options={(() => {
              const flat: { value: number; label: string }[] = [];
              const walk = (nodes: AgentGroupNode[]) => {
                for (const n of nodes) {
                  flat.push({ value: n.groupId, label: `${'  '.repeat(Math.max(0, n.grpDepth - 1))}${n.groupName}` });
                  if (n.children?.length) walk(n.children);
                }
              };
              walk(groupTree);
              return flat;
            })()}
          />
        </div>
      </Modal>
    </div>
  );
}

function findGroup(tree: AgentGroupNode[], id: number): AgentGroupNode | null {
  for (const n of tree) {
    if (n.groupId === id) return n;
    if (n.children?.length) {
      const found = findGroup(n.children, id);
      if (found) return found;
    }
  }
  return null;
}

interface GridTabProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

function GridTab({ label, active, onClick }: GridTabProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative px-5 h-full text-sm font-semibold transition-colors ${active ? 'text-[#405189]' : 'text-gray-400 hover:text-gray-600'}`}
    >
      {label}
      {active && <span className="absolute left-0 bottom-0 w-full h-0.5 bg-[#405189]" />}
    </button>
  );
}
