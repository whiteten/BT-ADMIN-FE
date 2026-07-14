/**
 * CTI 큐 관리 목록 페이지 (SWAT IPR20S3020)
 *
 * 멀티테넌트 개편(상담사 관리/내선 프로파일 정합): byNode/byTenant 뷰전환 + 탭바 + 카드 슬라이더 제거
 *   → 상단에 노드 Select + 테넌트 ScopeSelect 두 필터(각 "전체" 포함) + 요약.
 *   - 박스A: 노드/테넌트 스코프 필터 + 요약 + (엑셀/가져오기/검색)
 *   - 박스C: 좌측 업무그룹 트리 + 우측 CTI 큐 목록 ag-Grid (단일 그리드, 멤버 없음, 페이지네이션 없음)
 *
 * 행 더블클릭 → 5탭 Drawer (수정). "큐 등록" → 5탭 Drawer (그룹DN 결합 생성).
 *
 * 데이터: 전체 목록을 1회 조회 후 노드/테넌트/검색 필터는 모두 클라이언트.
 *
 * NOTE: routes.tsx / 메뉴 등록은 통합 워커 담당.
 */
import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Input, Modal, Select, Table } from 'antd';
import { Download, LayoutGrid, Network, Pencil, Plus, RotateCcw, Save, Search, Trash2, Upload } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import { ctiQueueApi } from '../../features/cti-queue/api/ctiQueueApi';
import CtiQueueBulkUpdateModal from '../../features/cti-queue/components/CtiQueueBulkUpdateModal';
import CtiQueueFormDrawer, { type CtiQueueDrawerState } from '../../features/cti-queue/components/CtiQueueFormDrawer';
import CtiQueueGroupDrawer from '../../features/cti-queue/components/CtiQueueGroupDrawer';
import CtiQueueGroupTree from '../../features/cti-queue/components/CtiQueueGroupTree';
import CtiQueueTable, { type MediaSkillCol } from '../../features/cti-queue/components/CtiQueueTable';
import {
  ctiQueueQueryKeys,
  useCreateCtiQueueGroup,
  useDeleteCtiQueueBatch,
  useDeleteCtiQueueGroup,
  useGetCtiQueueGroupOptions,
  useGetCtiQueueGroups,
  useGetCtiQueueMediaOptions,
  useGetCtiQueueSkillsetOptions,
  useGetCtiQueues,
  useMediaSkillsBatchCtiQueues,
  useReassignCtiQueueMembers,
  useReorderCtiQueueGroup,
  useUnassignCtiQueueMembers,
  useUpdateCtiQueueGroup,
} from '../../features/cti-queue/hooks/useCtiQueueQueries';
import {
  type CtiQueueGroupCreateRequest,
  type CtiQueueGroupReorderPosition,
  type CtiQueueGroupResponse,
  type CtiQueueGroupUpdateRequest,
  type CtiQueueMediaSkillFailure,
  type CtiQueueMediaSkillRowRequest,
  type CtiQueueResponse,
  MEDIA_SKILL_FIELD_MAP,
} from '../../features/cti-queue/types';
import { useGetDnProfileNodes, useGetDnProfileTenants } from '../../features/dn-profile/hooks/useDnProfileQueries';
import { useNodeTenantScope } from '../../features/node-scope/hooks/useNodeTenantScope';
import ScopeSelect from '@/components/custom/ScopeSelect';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb = [{ title: '번호자원관리' }, { title: '교환기 번호관리' }, { title: 'CTI 큐', path: '/ipron/cti-queue' }];

/** 활성 미디어 → 매트릭스 열 정의(스킬셋ID/레벨 필드 + 풀네임 라벨). */
function buildMediaSkillCols(mediaTypes: number[]): MediaSkillCol[] {
  return mediaTypes
    .filter((mt) => MEDIA_SKILL_FIELD_MAP[mt])
    .map((mt) => {
      const m = MEDIA_SKILL_FIELD_MAP[mt];
      return {
        mediaType: mt,
        // "VOIP 기본 SKILL" → "VOIP 기본 스킬" (라벨 약어/영문 노출 정돈)
        label: m.label.replace(' SKILL', ' 스킬'),
        idField: m.idKey as MediaSkillCol['idField'],
        levelField: m.levelKey as MediaSkillCol['levelField'],
      };
    });
}

export default function CtiQueueList() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const modal = useModal();
  const queryClient = useQueryClient();

  // ─── State ────────────────────────────────────────────────────────────────
  const [searchText, setSearchText] = useState('');
  const [selectedTreeId, setSelectedTreeId] = useState<number | null>(null); // null=전체, 0=미배정, n=실제 트리
  const [selectedRows, setSelectedRows] = useState<CtiQueueResponse[]>([]);
  const [drawer, setDrawer] = useState<CtiQueueDrawerState>({ open: false });
  const [bulkModalOpen, setBulkModalOpen] = useState(false);

  // ─── 스킬 배정 보기(매트릭스 모드) ─────────────────────────────────────────────
  const [skillMatrixMode, setSkillMatrixMode] = useState(false);
  // 더티 오버라이드 맵: ctiqId → 변경된 스킬/레벨 필드만(field mask 원천).
  const [matrixDirty, setMatrixDirty] = useState<Record<number, Partial<CtiQueueMediaSkillRowRequest>>>({});
  // 매트릭스 저장 결과 모달(207 부분 성공). BE record 원형(successCount/totalCount/failures) 기준.
  const [matrixResult, setMatrixResult] = useState<{ open: boolean; successCount: number; totalCount: number; failures: CtiQueueMediaSkillFailure[] }>({
    open: false,
    successCount: 0,
    totalCount: 0,
    failures: [],
  });

  // 업무그룹 트리 Drawer (추가/수정)
  const [groupDrawerOpen, setGroupDrawerOpen] = useState(false);
  const [groupDrawerMode, setGroupDrawerMode] = useState<'create' | 'edit'>('create');
  const [groupDrawerParent, setGroupDrawerParent] = useState<CtiQueueGroupResponse | null>(null);
  const [groupDrawerTarget, setGroupDrawerTarget] = useState<CtiQueueGroupResponse | null>(null);
  const [groupDrawerTenantHint, setGroupDrawerTenantHint] = useState<number | null>(null);

  // ─── 내보내기/가져오기 상태 (GAP2/3) ─────────────────────────────────────────
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResultModal, setImportResultModal] = useState<{
    open: boolean;
    successCount: number;
    errors: { rowNum: number; message: string }[];
  }>({ open: false, successCount: 0, errors: [] });
  const importFileInputRef = useRef<HTMLInputElement>(null);

  // ─── Queries ──────────────────────────────────────────────────────────────
  const { data: allNodes = [] } = useGetDnProfileNodes();
  const { data: tenants = [] } = useGetDnProfileTenants();

  // 테넌트↔노드 스코프 — 공통 규칙(기본 테넌트→노드). useNodeTenantScope 참조.
  const {
    operatorMode,
    nodes,
    tenants: assignedTenants,
    selectedNodeId,
    setSelectedNodeId,
    tenantFilter,
    setTenantFilter,
    selectedTenantId,
    selectedTenantName,
  } = useNodeTenantScope(allNodes);

  const { data: rows = [], isLoading } = useGetCtiQueues();
  const { data: groupOptions = [] } = useGetCtiQueueGroupOptions(selectedTenantId);
  const { data: skillsetOptions = [] } = useGetCtiQueueSkillsetOptions(selectedTenantId);
  const { data: mediaOptions = [] } = useGetCtiQueueMediaOptions();

  // 노드/테넌트 스코프로 필터링된 행 (클라이언트 2필터)
  const rowsScoped = useMemo(() => {
    let list = rows;
    if (selectedNodeId != null) list = list.filter((r) => r.nodeId === selectedNodeId);
    if (selectedTenantId != null) list = list.filter((r) => r.tenantId === selectedTenantId);
    return list;
  }, [rows, selectedNodeId, selectedTenantId]);

  // 헤더 요약 — 현재 스코프 기준 총/활성.
  const summary = useMemo(() => {
    let active = 0;
    for (const r of rowsScoped) if (r.activateYn === 1) active += 1;
    return { total: rowsScoped.length, active };
  }, [rowsScoped]);

  // 등록 폼/트리/매트릭스에 넘길 테넌트/노드 컨텍스트 — 선택된 스코프(전체면 null → Drawer 에서 직접 선택).
  const ctxTenantId = selectedTenantId;
  const ctxNodeId = selectedNodeId;
  const ctxTenantName = selectedTenantName || (tenants.find((t) => t.tenantId === ctxTenantId)?.tenantName ?? null);
  const ctxNodeName = nodes.find((n) => n.nodeId === ctxNodeId)?.nodeName ?? null;

  // ─── 매트릭스 모드 파생값 ─────────────────────────────────────────────────────
  // 매트릭스 콤보 스킬셋은 "현재 편집 대상 테넌트(selectedTenantId)" 스코프로 조회.
  const { data: matrixSkillsetOptions = [] } = useGetCtiQueueSkillsetOptions(selectedTenantId);
  // 활성 미디어 → 매트릭스 열(라이선스 활성 미디어만 — 빈 컬럼 금지). 비어 있으면 VOIP/Chat/VideoVoice 폴백.
  const mediaSkillCols = useMemo<MediaSkillCol[]>(() => {
    const types = mediaOptions.length > 0 ? mediaOptions.map((m) => m.mediaType) : [0, 10, 20];
    return buildMediaSkillCols(types);
  }, [mediaOptions]);
  // 편집 가능 = 특정 테넌트 스코프 선택 시만(전체 = 비활성 — NOTES §스킬셋 셀 규칙).
  const matrixEditable = selectedTenantId != null;
  const matrixDirtyCount = useMemo(() => Object.keys(matrixDirty).length, [matrixDirty]);

  // 편집 대상 테넌트 변경 시 미저장 더티 초기화 — 테넌트 혼합 스킬셋 풀 오염 방지.
  useEffect(() => {
    setMatrixDirty({});
  }, [selectedTenantId]);

  // 등록 Drawer 테넌트/노드 Select 옵션 (전체 마스터)
  const tenantSelectOptions = useMemo(() => tenants.map((t) => ({ value: t.tenantId, label: t.tenantName ?? `테넌트 ${t.tenantId}` })), [tenants]);
  const nodeSelectOptions = useMemo(() => nodes.map((n) => ({ value: n.nodeId, label: n.nodeName ?? `노드 ${n.nodeId}` })), [nodes]);

  // ─── 업무그룹 트리 (TB_TR_CTIQ_MASTER) — 항상 조회 ──────────────────────────
  // 트리는 테넌트 단위. 현재 스코프 테넌트(카드/탭) 가 있으면 그 테넌트, 없으면 전체.
  const treeTenantId = ctxTenantId;
  const { data: groupTree = [] } = useGetCtiQueueGroups({
    params: treeTenantId != null ? { tenantId: treeTenantId } : undefined,
    queryOptions: { enabled: true },
  });

  // ─── 업무그룹 트리 ID 재귀 수집 (SWAT IPR20S3020 WITH RECURSIVE CTE 정합) ────────
  // 선택된 treeId 의 모든 하위 그룹 ID 를 FE 메모리에서 재귀 수집.
  // SWAT selCtiqList: treeId != 0 이면 SubTree CTE 로 하위 포함 — FE 는 groupTree 를 이용해 동등 구현.
  const treeDescendantIds = useMemo((): Set<number> => {
    if (selectedTreeId == null || selectedTreeId === 0) return new Set();
    const result = new Set<number>();
    const walk = (nodes: CtiQueueGroupResponse[]) => {
      for (const n of nodes) {
        if (n.treeId === selectedTreeId || result.has(n.treeId)) {
          // 자기 자신 및 모든 하위 노드 수집
          const collectAll = (sub: CtiQueueGroupResponse[]) => {
            for (const s of sub) {
              result.add(s.treeId);
              if ((s.children ?? []).length) collectAll(s.children);
            }
          };
          result.add(n.treeId);
          collectAll(n.children ?? []);
        } else if ((n.children ?? []).length) {
          walk(n.children);
        }
      }
    };
    walk(groupTree);
    return result;
  }, [selectedTreeId, groupTree]);

  // ─── 그리드 표시용 행 (스코프 + 트리 + 텍스트 검색) ───────────────────────────
  const rowsForGrid = useMemo(() => {
    let list = rowsScoped;
    // 업무그룹(treeName) 트리 필터 — 트리 노드 선택 시 적용 (0=미배정, null=전체)
    // SWAT CTE 재귀 정합: 선택 노드 하위 그룹(treeDescendantIds)도 포함
    if (selectedTreeId != null) {
      list = list.filter((r) => (selectedTreeId === 0 ? r.treeId == null : r.treeId != null && treeDescendantIds.has(r.treeId)));
    }
    const kw = searchText.trim().toLowerCase();
    if (kw) {
      list = list.filter((r) => [r.gdnNo, r.gdnName, r.ctiqName, r.tenantName, r.treeName].some((f) => f != null && String(f).toLowerCase().includes(kw)));
    }
    return list;
  }, [rowsScoped, searchText, selectedTreeId, treeDescendantIds]);

  // 트리 "전체/미배정" 카운트 — 현재 스코프(rowsScoped) 기준
  const treeDisplayCount = useMemo(() => {
    let total = 0;
    let unassigned = 0;
    for (const r of rowsScoped) {
      total += 1;
      if (r.treeId == null) unassigned += 1;
    }
    return { total, unassigned };
  }, [rowsScoped]);

  // ─── 트리에 내려보낼 그룹 ─────────────────────────────────────────────────────
  // 전체 테넌트(treeTenantId==null)에서 groupTree 는 전 테넌트 그룹을 담는다.
  // 스코프에 큐가 0인 테넌트(빈 테스트 그룹 등)는 통째로 숨긴다 — "스코프에 큐 있는 테넌트의 그룹만".
  //  · 특정 테넌트 스코프(treeTenantId!=null) 시엔 이미 테넌트 단위라 그대로.
  const treeGroups = useMemo(() => {
    if (treeTenantId != null) return groupTree; // 단일 테넌트 스코프 — 그대로
    const presentTenants = new Set<number>();
    for (const r of rowsScoped) if (r.tenantId != null) presentTenants.add(r.tenantId);
    return groupTree.filter((n) => n.tenantId != null && presentTenants.has(n.tenantId));
  }, [groupTree, treeTenantId, rowsScoped]);

  // 트리 노드별 배지 카운트 — 현재 스코프(rowsScoped)에서 각 배정 그룹(treeId)에 속한 큐 수.
  // BE getGroups 의 절대 멤버 수(node.ctiqCount, 전 스코프 고정값) 대신 사용해
  // 전체 칩/그리드와 동일한 분모를 유지한다.
  const treeScopedCount = useMemo(() => {
    const m = new Map<number, number>();
    for (const r of rowsScoped) {
      if (r.treeId == null) continue;
      m.set(r.treeId, (m.get(r.treeId) ?? 0) + 1);
    }
    return m;
  }, [rowsScoped]);

  // ─── Handlers ───────────────────────────────────────────────────────────────
  const { mutate: deleteQueueBatch, isPending: isDeleting } = useDeleteCtiQueueBatch({
    mutationOptions: {
      onSuccess: () => {
        toast.success('CTI 큐가 삭제되었습니다');
        setSelectedRows([]);
      },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '삭제 실패';
        toast.error(msg);
      },
    },
  });

  // ─── 매트릭스 저장 mutation ──────────────────────────────────────────────────
  const { mutate: saveMediaSkills, isPending: isSavingMatrix } = useMediaSkillsBatchCtiQueues({
    mutationOptions: {
      onSuccess: (result) => {
        const failures = result.failures ?? [];
        setMatrixResult({ open: true, successCount: result.successCount, totalCount: result.totalCount, failures });
        // 실패 행은 재시도 위해 더티 보존, 성공 행만 제거.
        const failedIds = new Set(failures.map((f) => f.ctiqId));
        setMatrixDirty((prev) => {
          const next: Record<number, Partial<CtiQueueMediaSkillRowRequest>> = {};
          for (const [id, ov] of Object.entries(prev)) {
            if (failedIds.has(Number(id))) next[Number(id)] = ov;
          }
          return next;
        });
        if (failures.length === 0) toast.success('스킬 배정이 저장되었습니다');
      },
      onError: (err: unknown) => toast.error(extractMsg(err, '스킬 배정 저장 실패')),
    },
  });

  // ─── 매트릭스 셀 변경 ────────────────────────────────────────────────────────
  // 원본값과 같아지면 해당 필드를 더티에서 제거, 행에 더티 필드가 없으면 행 자체 제거.
  const handleMatrixCellChange = useCallback(
    (ctiqId: number, field: keyof CtiQueueMediaSkillRowRequest & string, value: number | null) => {
      const orig = rows.find((r) => r.ctiqId === ctiqId);
      setMatrixDirty((prev) => {
        const rowOv: Partial<CtiQueueMediaSkillRowRequest> = { ...(prev[ctiqId] ?? {}) };
        const origVal = (orig?.[field as keyof CtiQueueResponse] ?? null) as number | null;
        // 레벨 정규화는 셀에서 이미 0~99 로 처리됨.
        if (origVal === value) {
          delete rowOv[field];
        } else {
          (rowOv as Record<string, number | null>)[field] = value;
        }
        const next = { ...prev };
        if (Object.keys(rowOv).length === 0) delete next[ctiqId];
        else next[ctiqId] = rowOv;
        return next;
      });
    },
    [rows],
  );

  const handleMatrixRevert = useCallback(() => {
    if (matrixDirtyCount === 0) return;
    modal.confirm.execute({
      onOk: () => setMatrixDirty({}),
      options: { title: '변경 되돌리기', content: `변경한 ${matrixDirtyCount}건의 스킬 배정을 모두 되돌리시겠습니까?` },
    });
  }, [matrixDirtyCount, modal]);

  const handleMatrixSave = useCallback(() => {
    if (matrixDirtyCount === 0) return;
    const rowsReq: CtiQueueMediaSkillRowRequest[] = Object.entries(matrixDirty).map(([id, ov]) => ({
      ctiqId: Number(id),
      fields: Object.keys(ov),
      ...ov,
    }));
    saveMediaSkills({ rows: rowsReq });
  }, [matrixDirty, matrixDirtyCount, saveMediaSkills]);

  // 토글: 매트릭스 진입/이탈. 미저장 더티가 있으면 이탈 시 확인.
  const toggleSkillMatrix = useCallback(() => {
    if (skillMatrixMode && matrixDirtyCount > 0) {
      modal.confirm.execute({
        onOk: () => {
          setMatrixDirty({});
          setSkillMatrixMode(false);
        },
        options: { title: '스킬 배정 보기 종료', content: `저장하지 않은 ${matrixDirtyCount}건의 변경이 있습니다. 종료하면 변경이 사라집니다.` },
      });
      return;
    }
    setSkillMatrixMode((v) => !v);
  }, [skillMatrixMode, matrixDirtyCount, modal]);

  const handleCreate = () => {
    setDrawer({ open: true, mode: 'create', tenantId: ctxTenantId, tenantName: ctxTenantName, nodeId: ctxNodeId, nodeName: ctxNodeName });
  };

  const handleEdit = (row: CtiQueueResponse) => {
    setDrawer({
      open: true,
      mode: 'edit',
      row,
      tenantId: row.tenantId,
      tenantName: row.tenantName,
      nodeId: row.nodeId,
      nodeName: nodes.find((n) => n.nodeId === row.nodeId)?.nodeName ?? null,
    });
  };

  const handleDeleteSelected = () => {
    if (selectedRows.length === 0) return;
    modal.confirm.execute({
      onOk: () => deleteQueueBatch(selectedRows.map((r) => r.ctiqId)),
      options: {
        title: 'CTI 큐 일괄 삭제',
        content: `선택한 ${selectedRows.length}건의 CTI 큐를 삭제하시겠습니까?`,
      },
    });
  };

  // ─── GAP2: Excel 내보내기 ────────────────────────────────────────────────────
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const blob = await ctiQueueApi.exportExcel(selectedTenantId != null ? { tenantId: selectedTenantId } : undefined);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      a.href = url;
      a.download = `CTI큐목록_${today}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Excel 내보내기에 실패했습니다');
    } finally {
      setIsExporting(false);
    }
  };

  // ─── GAP3: Excel 가져오기 ────────────────────────────────────────────────────
  const handleImportClick = () => {
    importFileInputRef.current?.click();
  };

  const handleImportFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // 파일 선택 후 input 초기화 (동일 파일 재선택 허용)
    e.target.value = '';
    setIsImporting(true);
    try {
      // BE 가 행별 성패를 항상 HTTP 200 · 평탄 data{successCount, errors[]} 로 반환(207/400 미사용).
      // importExcel 이 평탄 결과로 언래핑해 주므로 그대로 결과 모달에 사용한다.
      const result = await ctiQueueApi.importExcel(file);
      // 등록 성공 건이 있으면 그리드/테넌트카드 즉시 갱신
      if ((result.successCount ?? 0) > 0) {
        void queryClient.invalidateQueries({ queryKey: ctiQueueQueryKeys.getList._def });
        void queryClient.invalidateQueries({ queryKey: ctiQueueQueryKeys.getTenants.queryKey });
      }
      setImportResultModal({ open: true, successCount: result.successCount ?? 0, errors: result.errors ?? [] });
    } catch (err: unknown) {
      // 여기 도달 = 진짜 5xx · 네트워크 단절 등(정상 결과는 200 으로 위에서 처리). 한글 토스트만.
      toast.error(extractMsg(err, 'Excel 가져오기에 실패했습니다'));
    } finally {
      setIsImporting(false);
    }
  };

  // ─── 업무그룹 트리 mutations ────────────────────────────────────────────────
  const { mutate: createGroup, isPending: isCreatingGroup } = useCreateCtiQueueGroup({
    mutationOptions: {
      onSuccess: () => {
        toast.success('업무그룹이 추가되었습니다');
        setGroupDrawerOpen(false);
      },
      onError: (err: unknown) => toast.error(extractMsg(err, '추가 실패')),
    },
  });
  const { mutate: updateGroup, isPending: isUpdatingGroup } = useUpdateCtiQueueGroup({
    mutationOptions: {
      onSuccess: () => {
        toast.success('업무그룹이 수정되었습니다');
        setGroupDrawerOpen(false);
      },
      onError: (err: unknown) => toast.error(extractMsg(err, '수정 실패')),
    },
  });
  const { mutate: deleteGroup } = useDeleteCtiQueueGroup({
    mutationOptions: {
      onSuccess: () => toast.success('업무그룹이 삭제되었습니다'),
      onError: (err: unknown) => toast.error(extractMsg(err, '삭제 실패')),
    },
  });
  const { mutate: reassignMembers } = useReassignCtiQueueMembers({
    mutationOptions: {
      onSuccess: (count) => toast.success(`${count}건의 CTI 큐가 업무그룹에 배정되었습니다`),
      onError: (err: unknown) => toast.error(extractMsg(err, '배정 실패')),
    },
  });
  const { mutate: unassignMembers } = useUnassignCtiQueueMembers({
    mutationOptions: {
      onSuccess: (count) => toast.success(`${count}건의 CTI 큐 배정이 해제되었습니다`),
      onError: (err: unknown) => toast.error(extractMsg(err, '해제 실패')),
    },
  });
  const { mutate: reorderGroup } = useReorderCtiQueueGroup({
    mutationOptions: {
      onError: (err: unknown) => toast.error(extractMsg(err, '순서 변경 실패')),
    },
  });

  // ─── 업무그룹 트리 핸들러 ───────────────────────────────────────────────────
  const handleCreateGroup = useCallback(
    (parent: CtiQueueGroupResponse | null, tenantHint?: number | null) => {
      const targetTenant = parent?.tenantId ?? tenantHint ?? treeTenantId;
      if (targetTenant == null) {
        toast.warning('루트 그룹을 추가할 테넌트를 먼저 선택하세요');
        return;
      }
      setGroupDrawerMode('create');
      setGroupDrawerParent(parent);
      setGroupDrawerTarget(null);
      setGroupDrawerTenantHint(targetTenant);
      setGroupDrawerOpen(true);
    },
    [treeTenantId],
  );

  const handleEditGroup = useCallback((group: CtiQueueGroupResponse) => {
    setGroupDrawerMode('edit');
    setGroupDrawerParent(null);
    setGroupDrawerTarget(group);
    setGroupDrawerTenantHint(group.tenantId);
    setGroupDrawerOpen(true);
  }, []);

  const handleDeleteGroup = useCallback(
    (group: CtiQueueGroupResponse) => {
      modal.confirm.execute({
        onOk: () => deleteGroup(group.treeId),
        options: { title: '업무그룹 삭제', content: `"${group.treeName}" 그룹을 삭제하시겠습니까?` },
      });
    },
    [modal, deleteGroup],
  );

  const handleGroupDrawerSubmit = useCallback(
    (req: CtiQueueGroupCreateRequest | CtiQueueGroupUpdateRequest) => {
      if (groupDrawerMode === 'create') createGroup(req as CtiQueueGroupCreateRequest);
      else if (groupDrawerTarget) updateGroup({ id: groupDrawerTarget.treeId, body: req as CtiQueueGroupUpdateRequest });
    },
    [groupDrawerMode, groupDrawerTarget, createGroup, updateGroup],
  );

  // ─── 업무그룹 트리 D&D 재배치 ──────────────────────────────────────────────
  const handleGroupReorder = useCallback(
    (movedTreeId: number, position: CtiQueueGroupReorderPosition, referenceTreeId: number) => {
      reorderGroup({ treeId: movedTreeId, body: { position, referenceTreeId } });
    },
    [reorderGroup],
  );

  // ─── D&D: 큐 → 업무그룹 노드 ────────────────────────────────────────────────
  const handleCtiQueueDrop = useCallback(
    (target: { treeId: number; tenantId: number | null }, ctiqIds: number[]) => {
      // 미배정 (treeId=0) 은 테넌트 검증 불필요
      if (target.treeId === 0) {
        unassignMembers(ctiqIds);
        return;
      }
      // 동일 테넌트 검증
      const dragged = rows.filter((r) => ctiqIds.includes(r.ctiqId));
      const mismatches = dragged.filter((r) => r.tenantId !== target.tenantId);
      if (mismatches.length > 0) {
        const names = mismatches
          .map((r) => r.gdnName ?? r.ctiqName ?? String(r.ctiqId))
          .slice(0, 3)
          .join(', ');
        const extra = mismatches.length > 3 ? ` 외 ${mismatches.length - 3}건` : '';
        toast.error(`다른 테넌트의 CTI 큐는 이동할 수 없습니다: ${names}${extra}`);
        return;
      }
      reassignMembers({ ctiqIds, targetTreeId: target.treeId });
    },
    [rows, reassignMembers, unassignMembers],
  );

  const getDragCtiqIds = useCallback(
    (dragRow: CtiQueueResponse): number[] => {
      const selectedIds = selectedRows.map((r) => r.ctiqId);
      if (selectedIds.length > 0 && selectedIds.includes(dragRow.ctiqId)) return selectedIds;
      return [dragRow.ctiqId];
    },
    [selectedRows],
  );

  // 제목은 "CTI 큐 목록 (N건)" 만 — 노드/테넌트 스코프 접두 제거 (사용자 요청).
  // 매트릭스 모드에선 "CTI 큐 스킬 배정 (N건)".
  const gridHeaderText = useMemo(() => `CTI 큐 ${skillMatrixMode ? '스킬 배정' : '목록'} (${rowsForGrid.length.toLocaleString()}건)`, [rowsForGrid.length, skillMatrixMode]);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        {/* ===== 박스A: 노드/테넌트 스코프 필터 + 요약 + 액션 ===== */}
        <div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
          <div className="flex items-center px-4 h-[56px] gap-3">
            {/* 노드 필터 */}
            <div className="inline-flex items-center gap-1 h-8 pl-2 rounded-md border border-gray-200 bg-white">
              <Network className="size-3.5 shrink-0 text-blue-600" />
              <Select
                size="small"
                variant="borderless"
                value={selectedNodeId ?? '__all__'}
                onChange={(v) => {
                  setSelectedNodeId(v === '__all__' ? null : Number(v));
                  setSelectedTreeId(null);
                  setSelectedRows([]);
                }}
                options={[{ value: '__all__', label: '전체 노드' }, ...nodes.map((n) => ({ value: n.nodeId, label: n.nodeName }))]}
                style={{ width: 150 }}
                popupMatchSelectWidth={false}
              />
            </div>
            {/* 테넌트 필터 — 운영자 모드만 노출 (일반 콘솔은 토큰 테넌트로 고정) */}
            {operatorMode && (
              <ScopeSelect
                kind="tenant"
                options={assignedTenants.map((t) => ({ id: t.tenantId, name: t.tenantName }))}
                value={tenantFilter == null ? null : String(tenantFilter)}
                onChange={(id) => {
                  setTenantFilter(id == null ? null : Number(id));
                  setSelectedTreeId(null);
                  setSelectedRows([]);
                }}
              />
            )}
            {/* 요약 — 총/활성 */}
            <div className="flex items-center gap-4 text-[13px] ml-1 pl-3 border-l border-gray-200">
              <span className="text-gray-500">
                총 큐 <b className="text-gray-800 font-semibold">{summary.total.toLocaleString()}</b>
              </span>
              <span className="text-gray-500">
                활성 <b className="text-blue-600 font-semibold">{summary.active.toLocaleString()}</b>
              </span>
            </div>
            <div className="ml-auto flex items-center gap-2 flex-shrink-0">
              {/* BP-1: 화면 전역 액션(엑셀류) → 헤더 박스 */}
              <Button icon={<Download className="size-3.5" />} loading={isExporting} onClick={handleExport} title="CTI 큐 목록 Excel 내보내기">
                엑셀
              </Button>
              <Button icon={<Upload className="size-3.5" />} loading={isImporting} onClick={handleImportClick} title="Excel 파일로 CTI 큐 일괄 등록">
                가져오기
              </Button>
              <input ref={importFileInputRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleImportFileChange} />
              <Input
                allowClear
                prefix={<Search className="size-3.5 text-gray-400" />}
                placeholder="그룹DN번호 / 큐이름 검색"
                value={searchText}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchText(e.target.value)}
                style={{ width: 220 }}
              />
            </div>
          </div>
        </div>

        {/* ===== 박스C: 좌측 업무그룹 트리 + 우측 ag-Grid (항상 표시) ===== */}
        <div className="flex gap-4 flex-1 min-h-0">
          <div className="bg-white bt-shadow flex flex-col w-[280px] flex-shrink-0 overflow-hidden">
            <div className="flex items-center px-4 h-[44px] border-b border-gray-100">
              <span className="text-sm font-semibold text-gray-700">업무그룹</span>
              <button
                type="button"
                onClick={() => handleCreateGroup(null, treeTenantId)}
                disabled={treeTenantId == null}
                className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded border border-[#405189] text-[#405189] text-xs hover:bg-[#405189]/5 disabled:opacity-40 disabled:cursor-not-allowed"
                title={treeTenantId == null ? '테넌트를 먼저 선택하세요' : '루트 그룹 추가'}
              >
                <Plus className="size-3" /> 루트
              </button>
            </div>
            <div className="flex-1 min-h-0">
              <CtiQueueGroupTree
                groups={treeGroups}
                totalCtiqCount={treeDisplayCount.total}
                totalUnassignedCount={treeDisplayCount.unassigned}
                scopedCount={treeScopedCount}
                selectedTreeId={selectedTreeId}
                selectedTenantId={treeTenantId}
                onSelect={setSelectedTreeId}
                onCreateChild={(parent) => handleCreateGroup(parent, treeTenantId)}
                onEdit={handleEditGroup}
                onDelete={handleDeleteGroup}
                onCtiQueueDrop={handleCtiQueueDrop}
                onGroupReorder={handleGroupReorder}
              />
            </div>
          </div>

          <div className="bg-white bt-shadow flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2 h-[44px] flex-shrink-0">
              <span className="text-sm font-semibold text-gray-800">{gridHeaderText}</span>
              <span className={`text-xs text-gray-500 ${selectedRows.length === 0 ? 'invisible' : ''}`}>
                {rowsForGrid.length.toLocaleString()}건 중 {selectedRows.length}건 선택
              </span>
              <div className="ml-auto flex items-center gap-2">
                {/* 스킬 배정 보기 토글 — 컬럼셋 전환(일반 ↔ 미디어 스킬 매트릭스). */}
                <Button
                  type={skillMatrixMode ? 'primary' : 'default'}
                  icon={<LayoutGrid className="size-3.5" />}
                  onClick={toggleSkillMatrix}
                  title="미디어별 스킬셋·레벨을 큐별로 직접 편집"
                >
                  스킬 배정 보기
                </Button>
                {/* BP-2 CRUD 문법: [삭제 danger] → [보조: 일괄 설정 default] → [등록 primary] */}
                <Button
                  danger
                  icon={<Trash2 className="size-3.5" />}
                  onClick={handleDeleteSelected}
                  loading={isDeleting}
                  disabled={selectedRows.length === 0}
                  title={selectedRows.length === 0 ? '삭제할 큐를 선택하세요' : '선택한 큐 삭제'}
                >
                  삭제
                </Button>
                {/* P1: 일괄 설정 (BP-3: default variant, 인라인 색 제거) */}
                <Button
                  icon={<Pencil className="size-3.5" />}
                  onClick={() => setBulkModalOpen(true)}
                  disabled={selectedRows.length === 0}
                  title={selectedRows.length === 0 ? '설정할 큐를 선택하세요' : `선택한 ${selectedRows.length}건 일괄 설정`}
                >
                  일괄 설정{selectedRows.length > 0 ? ` (${selectedRows.length})` : ''}
                </Button>
                <Button type="primary" icon={<Plus className="size-3.5" />} onClick={handleCreate}>
                  큐 등록
                </Button>
              </div>
            </div>

            <div className="flex-1 min-h-0">
              <CtiQueueTable
                rowData={rowsForGrid}
                isLoading={isLoading}
                groupOptions={groupOptions}
                nodeOptions={nodeSelectOptions}
                groupView={true}
                selectedTenantId={ctxTenantId}
                onRowDoubleClicked={handleEdit}
                onSelectionChanged={setSelectedRows}
                getDragCtiqIds={getDragCtiqIds}
                skillMatrixMode={skillMatrixMode}
                mediaCols={mediaSkillCols}
                skillsetOptions={matrixSkillsetOptions}
                matrixEditable={matrixEditable}
                dirtyMap={matrixDirty}
                onMatrixCellChange={handleMatrixCellChange}
              />
            </div>

            {/* 매트릭스 모드 저장 바 — 더티 1건 이상 시 하단 고정 (반투명 슬레이트, GRID-STANDARD 규칙 9). */}
            {skillMatrixMode && matrixDirtyCount > 0 && (
              <div className="flex items-center gap-2.5 px-5 flex-shrink-0 text-[#e2e8f0]" style={{ height: 44, backgroundColor: 'rgba(30,41,59,0.88)' }}>
                <span className="text-sm">변경된 행 {matrixDirtyCount}건</span>
                <span className="flex-1" />
                <Button size="small" icon={<RotateCcw className="size-3.5" />} onClick={handleMatrixRevert} ghost>
                  되돌리기
                </Button>
                <Button type="primary" size="small" icon={<Save className="size-3.5" />} loading={isSavingMatrix} onClick={handleMatrixSave}>
                  변경 저장 ({matrixDirtyCount})
                </Button>
              </div>
            )}

            {/* 매트릭스 모드 + 전체 카드 선택 시 편집 비활성 안내 — 토스트 대신 액션 영역에 표기하지 않음(상주 캡션 금지).
                편집 비활성은 콤보·입력 disabled 로 표현됨. */}
          </div>
        </div>
      </div>

      <CtiQueueFormDrawer state={drawer} onClose={() => setDrawer({ open: false })} tenantOptions={tenantSelectOptions} nodeOptions={nodeSelectOptions} />

      {/* P1: 일괄 설정 모달 */}
      <CtiQueueBulkUpdateModal
        open={bulkModalOpen}
        selectedRows={selectedRows}
        skillsetOptions={skillsetOptions}
        groupOptions={groupOptions}
        mediaOptions={mediaOptions}
        onClose={() => setBulkModalOpen(false)}
      />

      {/* 매트릭스 저장 결과 모달 (207 부분 성공) */}
      <Modal
        open={matrixResult.open}
        title={`스킬 배정 저장 결과 — 성공 ${matrixResult.successCount}건${matrixResult.failures.length > 0 ? ` / 실패 ${matrixResult.failures.length}건` : ''}`}
        onCancel={() => setMatrixResult((s) => ({ ...s, open: false }))}
        footer={
          <Button type="primary" onClick={() => setMatrixResult((s) => ({ ...s, open: false }))}>
            확인
          </Button>
        }
        width={620}
      >
        {matrixResult.failures.length === 0 ? (
          <p className="text-green-600 font-medium">선택한 행의 스킬 배정이 모두 저장되었습니다.</p>
        ) : (
          <>
            <div className="flex gap-6 px-4 py-3 bg-gray-50 border border-gray-200 rounded mb-3">
              <div className="flex flex-col items-center">
                <span className="text-2xl font-bold text-green-600">{matrixResult.successCount}</span>
                <span className="text-xs text-gray-500">성공</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-2xl font-bold text-red-500">{matrixResult.failures.length}</span>
                <span className="text-xs text-gray-500">실패</span>
              </div>
            </div>
            <Table<CtiQueueMediaSkillFailure>
              size="small"
              dataSource={matrixResult.failures.map((f) => ({ ...f, key: f.ctiqId }))}
              columns={[
                { title: 'CTIQ ID', dataIndex: 'ctiqId', width: 90 },
                {
                  title: '그룹DN이름',
                  key: 'gdnName',
                  ellipsis: true,
                  render: (_v, row: CtiQueueMediaSkillFailure) => rows.find((r) => r.ctiqId === row.ctiqId)?.gdnName ?? '-',
                },
                {
                  title: '사유',
                  dataIndex: 'message',
                  ellipsis: true,
                  render: (v: string | null) => <span className="text-red-500 text-xs">{v ?? '알 수 없는 오류'}</span>,
                },
              ]}
              pagination={false}
              scroll={{ y: 260 }}
            />
          </>
        )}
      </Modal>

      {/* GAP3: 가져오기 결과 모달 */}
      <Modal
        open={importResultModal.open}
        title={`Excel 가져오기 결과 — 성공 ${importResultModal.successCount}건${importResultModal.errors.length > 0 ? ` / 오류 ${importResultModal.errors.length}건` : ''}`}
        onCancel={() => setImportResultModal((s) => ({ ...s, open: false }))}
        footer={
          <Button type="primary" onClick={() => setImportResultModal((s) => ({ ...s, open: false }))}>
            확인
          </Button>
        }
        width={600}
      >
        {importResultModal.errors.length === 0 ? (
          importResultModal.successCount > 0 ? (
            <p className="text-green-600 font-medium">{importResultModal.successCount}건이 모두 성공적으로 등록되었습니다.</p>
          ) : (
            <p className="text-gray-600">처리된 행이 없습니다. 엑셀 파일의 데이터 행을 확인해 주세요.</p>
          )
        ) : (
          <>
            {importResultModal.successCount > 0 && (
              <p className="text-gray-600 mb-2">
                {importResultModal.successCount}건 등록 성공 / {importResultModal.errors.length}건 오류
              </p>
            )}
            {importResultModal.successCount === 0 && <p className="text-red-600 mb-2">모든 행에서 오류가 발생했습니다.</p>}
            <Table
              size="small"
              dataSource={importResultModal.errors.map((e) => ({ ...e, key: e.rowNum }))}
              columns={[
                { title: '행 번호', dataIndex: 'rowNum', width: 80 },
                { title: '오류 내용', dataIndex: 'message', ellipsis: true },
              ]}
              pagination={false}
              scroll={{ y: 240 }}
            />
          </>
        )}
      </Modal>

      {/* 업무그룹 추가/수정 Drawer */}
      <CtiQueueGroupDrawer
        open={groupDrawerOpen}
        mode={groupDrawerMode}
        tenantId={groupDrawerTenantHint}
        parent={groupDrawerParent}
        group={groupDrawerTarget}
        onCancel={() => setGroupDrawerOpen(false)}
        onSubmit={handleGroupDrawerSubmit}
        loading={isCreatingGroup || isUpdatingGroup}
      />
    </div>
  );
}

function extractMsg(err: unknown, fallback: string): string {
  return (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;
}
