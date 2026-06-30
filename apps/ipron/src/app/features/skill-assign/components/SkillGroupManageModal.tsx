/**
 * 스킬모음 관리 와이드 모달 (변형 B — 목업 skillgroup-v3.html 변형B 기준)
 *
 * 구조:
 *  - 좌: 전체 스킬셋 조회 그리드 (검색 포함, 체크박스 다중 선택)
 *  - 중: 전송 버튼 → / ←
 *  - 우: 선택된 모음의 멤버 그리드 (우선순위/스킬레벨 인라인 편집)
 *
 * 스텝 전환:
 *  - 목록 뷰 (group-list): 스킬모음 셀렉트 + 좌우 2그리드
 *  - 폼 뷰 (group-form): 새 모음 등록/수정 인라인 폼
 *
 * SkillGroupFormDrawer 로직 흡수 — 중첩 오버레이 제거.
 *
 * [스킬모음 관리] 버튼 진입: SkillsetMasterList.tsx
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CellStyle, ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Form, Input, InputNumber, Modal, Spin } from 'antd';
import { ChevronLeft, Plus, Search, Trash2 } from 'lucide-react';
import { toast } from '@/shared-util';
import SkillsetGroupTree from '../../skillset-master/components/SkillsetGroupTree';
import { useGetSkillsetGroups } from '../../skillset-master/hooks/useSkillsetQueries';
import type { SkillsetGroupResponse } from '../../skillset-master/types/skillset';
import {
  useCreateSkillGroup,
  useDeleteSkillGroup,
  useGetAvailableSkillsets,
  useGetSkillGroupMembers,
  useGetSkillGroups,
  useUpdateSkillGroup,
} from '../hooks/useSkillAssignQueries';
import type { AvailableSkillsetResponse, SkillGroupMemberRequest, SkillGroupMemberResponse, SkillGroupResponse } from '../types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

// ─── 타입 ───────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  tenantId?: number | null;
  onClose: () => void;
}

interface MemberRow {
  skillsetId: number;
  skillsetName: string;
  priority: number;
  skillLevel: number;
}

type ViewMode = 'list' | 'form-create' | 'form-edit';

// React Query의 `data ?? []` 패턴은 매 렌더마다 새 [] 참조를 반환해 useEffect deps 루프를 유발한다.
// 모듈 레벨 상수로 안정적인 빈 배열 참조를 제공해 deps 비교가 안정되도록 한다.
const EMPTY_MEMBERS: SkillGroupMemberResponse[] = [];

// ─── 컴포넌트 ────────────────────────────────────────────────────────────────

export default function SkillGroupManageModal({ open, tenantId, onClose }: Props) {
  const tenantIdParam = tenantId ?? undefined;

  // ── 뷰 모드 ──────────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editTarget, setEditTarget] = useState<SkillGroupResponse | null>(null);

  // ── 모음 선택 (셀렉트) ────────────────────────────────────────────────────
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);

  // ── 좌측 업무그룹 트리 (스킬셋 필터) ──────────────────────────────────────
  // null=전체 / 0=미배정(treeId==null) / n=해당 업무그룹. 트리는 조회·필터 전용(편집 차단).
  const [selectedTreeId, setSelectedTreeId] = useState<number | null>(null);

  // ── 좌측 그리드 ───────────────────────────────────────────────────────────
  const [leftSearch, setLeftSearch] = useState('');
  const [leftChecked, setLeftChecked] = useState<Set<number>>(new Set());

  // ── 우측 멤버 편집 상태 ───────────────────────────────────────────────────
  const [memberRows, setMemberRows] = useState<MemberRow[]>([]);
  const [memberDirty, setMemberDirty] = useState(false);
  // memberDirty 를 ref 로도 보관 — 멤버 동기화 effect 에서 deps 없이 최신값을 읽기 위함.
  // deps 에 넣으면 dirty 토글마다 effect 가 재실행되어 편집 중 덮어쓰기 발생.
  const memberDirtyRef = useRef(memberDirty);
  memberDirtyRef.current = memberDirty;
  const [rightChecked, setRightChecked] = useState<Set<number>>(new Set());

  // ── 폼 (등록/수정) ────────────────────────────────────────────────────────
  const [form] = Form.useForm();

  // 닫힐 때 전체 초기화 — 닫힘 effect 는 open=false 인 경우만 실행되고,
  // 이 시점 fetchedMembers 는 disabled 쿼리라 EMPTY_MEMBERS 참조 그대로 → 루프 없음.
  useEffect(() => {
    if (!open) {
      setViewMode('list');
      setEditTarget(null);
      setSelectedGroupId(null);
      setSelectedTreeId(null);
      setLeftSearch('');
      setLeftChecked((prev) => (prev.size === 0 ? prev : new Set()));
      setMemberRows((prev) => (prev.length === 0 ? prev : []));
      setMemberDirty(false);
      setRightChecked((prev) => (prev.size === 0 ? prev : new Set()));
      form.resetFields();
    }
  }, [open, form]);

  // ── 쿼리 ─────────────────────────────────────────────────────────────────

  const { data: groups = [], isLoading: groupsLoading } = useGetSkillGroups({
    params: tenantIdParam != null ? { tenantId: tenantIdParam } : undefined,
    queryOptions: { enabled: open },
  });

  // 좌측 그리드: 활성/비활성 모두 포함 (전체 스킬셋)
  const { data: availableSkillsets = [], isLoading: skillsetsLoading } = useGetAvailableSkillsets({
    params: tenantIdParam != null ? { tenantId: tenantIdParam } : undefined,
    queryOptions: { enabled: open },
  });

  // 좌측 트리: 업무그룹(스킬셋 트리) — 스킬셋 관리 화면과 동일 훅/데이터.
  // 모달의 현재 테넌트로 필터. 편집은 차단(readOnly)하고 조회·필터만 한다.
  const { data: groupTree = [] } = useGetSkillsetGroups({
    params: tenantIdParam != null ? { tenantId: tenantIdParam } : undefined,
    queryOptions: { enabled: open },
  });

  // 선택된 모음 멤버 조회
  // EMPTY_MEMBERS 상수를 기본값으로 사용해 쿼리 미완료 시에도 동일 참조를 유지한다.
  // `?? []` 패턴은 매 렌더마다 새 [] 참조를 만들어 useEffect deps 루프를 유발하므로 금지.
  const { data: fetchedMembers = EMPTY_MEMBERS, isFetching: membersFetching } = useGetSkillGroupMembers(open && selectedGroupId != null ? selectedGroupId : null);

  // 모음 선택 변경·쿼리 완료 시 멤버 동기화
  //
  // [루프 방지 설계]
  //   루프 원인: fetchedMembers deps + selectedGroupId==null 분기의 무조건 setState([])
  //             → 새 [] 참조 → 리렌더 → fetchedMembers 새 참조(매 렌더) → effect 재실행 무한루프
  //
  //   3가지 장치로 루프 차단:
  //   ① 기본값을 모듈 레벨 EMPTY_MEMBERS 상수로 고정 → 쿼리 미완료 시 동일 참조, deps 변화 없음
  //   ② isFetching=true 중엔 effect skip → 빈 배열로 덮어쓰지 않음(쿼리 완료 후 한 번만 동기화)
  //   ③ selectedGroupId==null 분기의 setState는 함수형 업데이트로 조건부 실행 → 이미 빈 상태면 리렌더 없음
  const prevGroupIdRef = useRef<number | null>(null);
  useEffect(() => {
    if (selectedGroupId == null) {
      // ③ 기존이 비어 있으면 동일 참조 유지 — 불필요한 리렌더 차단
      setMemberRows((prev) => (prev.length === 0 ? prev : []));
      setMemberDirty(false);
      setRightChecked((prev) => (prev.size === 0 ? prev : new Set()));
      prevGroupIdRef.current = null;
      return;
    }
    // ② 쿼리가 진행 중이면 skip — 완료 후 fetchedMembers 참조가 바뀌면 effect 재실행됨
    if (membersFetching) return;
    if (selectedGroupId !== prevGroupIdRef.current || fetchedMembers !== EMPTY_MEMBERS) {
      // 모음 전환 또는 쿼리 완료 시 멤버 동기화
      // dirty(사용자 편집 중) 이고 같은 모음 안에서 fetch 완료된 경우엔 덮어쓰지 않는다
      const isSameGroup = selectedGroupId === prevGroupIdRef.current;
      if (isSameGroup && memberDirtyRef.current) {
        // 같은 모음 내 refetch 완료 + 편집 중 → 덮어쓰기 금지 (ref 로 읽어 deps 오염 방지)
        return;
      }
      setMemberRows(
        fetchedMembers.map((m) => ({
          skillsetId: m.skillsetId,
          skillsetName: m.skillsetName,
          priority: m.priority ?? 0,
          skillLevel: m.skillLevel ?? 0,
        })),
      );
      if (!isSameGroup) {
        setMemberDirty(false);
        setRightChecked(new Set());
      }
      prevGroupIdRef.current = selectedGroupId;
    }
  }, [selectedGroupId, fetchedMembers, membersFetching]);

  // 최초 모음 자동 선택
  // [MUD 수정] groups 는 React Query 배열로 매 렌더마다 새 참조.
  // groups 를 deps 에 넣으면 open==false 시에도 새 참조로 effect 가 재실행될 수 있다.
  // groups 첫 번째 ID 만 추출해 stable 한 primitive 값으로 deps 을 고정한다.
  const firstGroupId = groups.length > 0 ? groups[0].skillGroupId : null;
  useEffect(() => {
    if (open && firstGroupId != null && selectedGroupId == null) {
      setSelectedGroupId(firstGroupId);
    }
  }, [open, firstGroupId, selectedGroupId]);

  // ── 뮤테이션 ─────────────────────────────────────────────────────────────

  const { mutate: createGroup, isPending: isCreating } = useCreateSkillGroup({
    mutationOptions: {
      onSuccess: (created) => {
        toast.success('스킬모음이 등록되었습니다');
        setSelectedGroupId(created.skillGroupId);
        backToList();
      },
      onError: (err: unknown) => toast.error(extractMsg(err, '등록 실패')),
    },
  });

  const { mutate: updateGroup, isPending: isUpdating } = useUpdateSkillGroup({
    mutationOptions: {
      onSuccess: () => {
        toast.success('스킬모음이 수정되었습니다');
        backToList();
      },
      onError: (err: unknown) => toast.error(extractMsg(err, '수정 실패')),
    },
  });

  const { mutate: deleteGroup, isPending: isDeleting } = useDeleteSkillGroup({
    mutationOptions: {
      onSuccess: () => {
        toast.success('스킬모음이 삭제되었습니다');
        setSelectedGroupId(null);
        setMemberRows([]);
        setMemberDirty(false);
      },
      onError: (err: unknown) => toast.error(extractMsg(err, '삭제 실패')),
    },
  });

  const { mutate: saveMembers, isPending: isSaving } = useUpdateSkillGroup({
    mutationOptions: {
      onSuccess: () => {
        toast.success('멤버가 저장되었습니다');
        setMemberDirty(false);
      },
      onError: (err: unknown) => toast.error(extractMsg(err, '저장 실패')),
    },
  });

  // ── 좌측 필터 ────────────────────────────────────────────────────────────

  const memberSet = useMemo(() => new Set(memberRows.map((m) => m.skillsetId)), [memberRows]);

  // 트리 카운트 — 스킬셋 관리 화면의 treeDisplayCount 와 동일 의미.
  // "전체"=현재 테넌트의 전체 스킬셋, "미배정"=treeId==null 스킬셋.
  const totalSkillsetCount = availableSkillsets.length;
  const totalUnassignedCount = useMemo(() => availableSkillsets.filter((s) => s.treeId == null).length, [availableSkillsets]);

  // 좌측 스킬셋 필터 = (업무그룹 트리 선택) + (검색어).
  // 트리: null=전체 / 0=미배정(treeId==null) / n=해당 그룹 — SkillAssignList.filteredSkillsetsByGroup 패턴 동일.
  const filteredLeft = useMemo<AvailableSkillsetResponse[]>(() => {
    const kw = leftSearch.trim().toLowerCase();
    return availableSkillsets.filter((s) => {
      if (selectedTreeId === 0) {
        if (s.treeId != null) return false;
      } else if (selectedTreeId != null) {
        if (s.treeId !== selectedTreeId) return false;
      }
      if (kw && !s.skillsetName.toLowerCase().includes(kw) && !String(s.skillsetId).includes(kw)) return false;
      return true;
    });
  }, [availableSkillsets, leftSearch, selectedTreeId]);

  // ── 핸들러: 좌→우 이동 ────────────────────────────────────────────────────

  const handleAddSelected = () => {
    const toAdd = filteredLeft.filter((s) => leftChecked.has(s.skillsetId) && !memberSet.has(s.skillsetId));
    if (toAdd.length === 0) return;
    setMemberRows((prev) => [...prev, ...toAdd.map((s) => ({ skillsetId: s.skillsetId, skillsetName: s.skillsetName, priority: 0, skillLevel: 0 }))]);
    setMemberDirty(true);
    setLeftChecked(new Set());
  };

  const handleAddDblClick = (s: AvailableSkillsetResponse) => {
    if (memberSet.has(s.skillsetId)) return; // 중복 no-op
    setMemberRows((prev) => [...prev, { skillsetId: s.skillsetId, skillsetName: s.skillsetName, priority: 0, skillLevel: 0 }]);
    setMemberDirty(true);
  };

  // ── 핸들러: 우→좌 제거 ────────────────────────────────────────────────────

  const handleRemoveSelected = () => {
    if (rightChecked.size === 0) return;
    setMemberRows((prev) => prev.filter((m) => !rightChecked.has(m.skillsetId)));
    setMemberDirty(true);
    setRightChecked(new Set());
  };

  // ── 핸들러: 우측 P/L 편집 ─────────────────────────────────────────────────

  const handleUpdateMember = (skillsetId: number, field: 'priority' | 'skillLevel', value: number | null) => {
    setMemberRows((prev) => prev.map((m) => (m.skillsetId === skillsetId ? { ...m, [field]: value ?? 0 } : m)));
    setMemberDirty(true);
  };

  // ── 핸들러: 멤버 저장 ─────────────────────────────────────────────────────

  const handleSaveMembers = () => {
    if (selectedGroupId == null) return;
    const members: SkillGroupMemberRequest[] = memberRows.map((m) => ({
      skillsetId: m.skillsetId,
      priority: m.priority,
      skillLevel: m.skillLevel,
    }));
    const selectedGroup = groups.find((g) => g.skillGroupId === selectedGroupId);
    saveMembers({
      skillGroupId: selectedGroupId,
      body: {
        skillGroupName: selectedGroup?.skillGroupName ?? '',
        skillGroupDesc: selectedGroup?.skillGroupDesc ?? undefined,
        members,
      },
    });
  };

  // ── 핸들러: 모음 삭제 ─────────────────────────────────────────────────────

  const handleDeleteGroup = () => {
    if (selectedGroupId == null) return;
    const grp = groups.find((g) => g.skillGroupId === selectedGroupId);
    Modal.confirm({
      title: '스킬모음 삭제',
      content: `'${grp?.skillGroupName ?? ''}' 스킬모음을 삭제하시겠습니까?`,
      okType: 'danger',
      okText: '삭제',
      cancelText: '취소',
      onOk: () => deleteGroup(selectedGroupId),
    });
  };

  // ── 뷰 전환 ──────────────────────────────────────────────────────────────

  const backToList = () => {
    setViewMode('list');
    setEditTarget(null);
    form.resetFields();
  };

  const openCreateForm = () => {
    setViewMode('form-create');
    setEditTarget(null);
    form.resetFields();
  };

  const openEditForm = (grp: SkillGroupResponse) => {
    setViewMode('form-edit');
    setEditTarget(grp);
    form.setFieldsValue({ skillGroupName: grp.skillGroupName, skillGroupDesc: grp.skillGroupDesc });
  };

  // ── 폼 제출 ──────────────────────────────────────────────────────────────

  const onFormSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (viewMode === 'form-create') {
        createGroup({ tenantId: tenantIdParam, skillGroupName: values.skillGroupName, skillGroupDesc: values.skillGroupDesc, members: [] });
      } else if (viewMode === 'form-edit' && editTarget) {
        updateGroup({ skillGroupId: editTarget.skillGroupId, body: { skillGroupName: values.skillGroupName, skillGroupDesc: values.skillGroupDesc } });
      }
    } catch {
      // form validation: silent
    }
  };

  // ── ag-Grid 공통 (표준 훅) ────────────────────────────────────────────────
  // useAggridOptions 훅의 theme(quartz·fontSize13)·defaultColDef(filter:true) 를 기반으로 한다.
  // 모달 그리드라 페이징·사이드바·상태바는 끄고, 멀티셀렉트는 AgGridReact 직접 prop 으로 전달.
  const { gridOptions, defaultColDef: hookDefaultColDef } = useAggridOptions();
  const defaultColDef: ColDef = useMemo(() => ({ ...hookDefaultColDef, suppressHeaderMenuButton: true }), [hookDefaultColDef]);
  const stableGridOptions = useMemo(() => ({ ...gridOptions, statusBar: undefined, sideBar: false, pagination: false, rowNumbers: false }), [gridOptions]);
  // 멀티셀렉트 표준(규칙11): 체크박스 + 행클릭 토글 + Ctrl/Shift 없이 누적.
  const multiRowSelection = useMemo(
    () => ({ mode: 'multiRow' as const, checkboxes: true, headerCheckbox: true, enableClickSelection: true, enableSelectionWithoutKeys: true }),
    [],
  );

  // 좌측 그리드 컬럼: 스킬셋명 | 업무그룹(treeName, null→미배정) | 테넌트(전체보기 시만 표시)
  // tenantIdParam === null(전체 카드) 이면 테넌트 컬럼 노출, 단일 테넌트 선택 시 숨김.
  const leftColumnDefs: ColDef<AvailableSkillsetResponse>[] = useMemo(
    () => [
      { headerName: '스킬셋명', field: 'skillsetName', flex: 1.4, minWidth: 150, tooltipField: 'skillsetName' },
      {
        headerName: '업무그룹',
        field: 'treeName',
        flex: 1,
        minWidth: 120,
        tooltipField: 'treeName',
        filterValueGetter: (p) => p.data?.treeName ?? '미배정',
        cellRenderer: (p: ICellRendererParams<AvailableSkillsetResponse>) => {
          const v = p.data?.treeName;
          if (!v) return <span className="text-gray-400">미배정</span>;
          return <span className="text-gray-800">{v}</span>;
        },
      },
      { headerName: '테넌트', field: 'tenantName', flex: 1, minWidth: 110, tooltipField: 'tenantName', valueFormatter: (p) => p.value ?? '-', hide: tenantIdParam != null },
    ],
    [tenantIdParam],
  );

  // 우측 그리드 컬럼: 스킬셋명 | 우선순위(InputNumber) | 스킬레벨(InputNumber)
  // P/L 인라인 편집은 기존 antd InputNumber 동작을 cellRenderer 로 보존(min/max·controlled).
  const rightColumnDefs: ColDef<MemberRow>[] = useMemo(
    () => [
      { headerName: '스킬셋명', field: 'skillsetName', flex: 1, minWidth: 150, tooltipField: 'skillsetName' },
      {
        headerName: '우선순위',
        field: 'priority',
        width: 110,
        filter: 'agNumberColumnFilter',
        cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' } as CellStyle,
        cellRenderer: (p: ICellRendererParams<MemberRow>) => {
          const data = p.data;
          if (!data) return null;
          return (
            <InputNumber
              min={0}
              max={9}
              value={data.priority}
              onChange={(v) => handleUpdateMember(data.skillsetId, 'priority', v)}
              size="small"
              style={{ width: 60, textAlign: 'center' }}
            />
          );
        },
      },
      {
        headerName: '스킬레벨',
        field: 'skillLevel',
        width: 110,
        filter: 'agNumberColumnFilter',
        cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' } as CellStyle,
        cellRenderer: (p: ICellRendererParams<MemberRow>) => {
          const data = p.data;
          if (!data) return null;
          return (
            <InputNumber
              min={0}
              max={99}
              value={data.skillLevel}
              onChange={(v) => handleUpdateMember(data.skillsetId, 'skillLevel', v)}
              size="small"
              style={{ width: 60, textAlign: 'center' }}
            />
          );
        },
      },
    ],
    [],
  );

  // 그리드 선택 → 기존 Set 상태로 동기화(transfer 핸들러가 Set 을 읽으므로 동작 보존).
  // 좌측: 이미 멤버인 스킬셋은 추가 불가 → 선택돼도 Set 에서 제외(중복 no-op 유지).
  const leftRowId = useCallback((p: { data: AvailableSkillsetResponse }) => String(p.data.skillsetId), []);
  const rightRowId = useCallback((p: { data: MemberRow }) => String(p.data.skillsetId), []);
  const handleLeftSelectionChanged = useCallback(
    (rows: AvailableSkillsetResponse[]) => {
      setLeftChecked(new Set(rows.map((s) => s.skillsetId).filter((id) => !memberSet.has(id))));
    },
    [memberSet],
  );
  const handleRightSelectionChanged = useCallback((rows: MemberRow[]) => {
    setRightChecked(new Set(rows.map((m) => m.skillsetId)));
  }, []);

  // 트리는 readOnly — 편집/DnD 핸들러는 호출되지 않지만 필수 prop 이라 no-op 으로 채운다.
  // (onGroupReorder 는 미전달 → 그룹 드래그 비활성. readOnly 로 호버 액션 버튼도 미렌더.)
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  const treeNoop = useCallback((_group: SkillsetGroupResponse | null) => {}, []);
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  const treeDropNoop = useCallback(() => {}, []);

  const submitting = isCreating || isUpdating;

  // ── 렌더 ─────────────────────────────────────────────────────────────────

  const selectedGroup = groups.find((g) => g.skillGroupId === selectedGroupId) ?? null;

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={1320}
      title={
        <div className="flex items-center gap-2">
          {(viewMode === 'form-create' || viewMode === 'form-edit') && (
            <button
              type="button"
              onClick={backToList}
              className="inline-flex items-center justify-center w-7 h-7 rounded text-gray-400 hover:text-[#405189] hover:bg-gray-100 transition mr-1"
            >
              <ChevronLeft className="size-4" />
            </button>
          )}
          <span className="text-[15px] font-semibold text-gray-800">스킬모음 관리</span>
          {viewMode === 'form-create' && <span className="text-xs text-gray-400 font-normal">— 새 모음 등록</span>}
          {viewMode === 'form-edit' && editTarget && <span className="text-xs text-gray-400 font-normal">— 모음 수정: {editTarget.skillGroupName}</span>}
        </div>
      }
      footer={null}
      destroyOnClose={false}
      styles={{ body: { padding: 0, display: 'flex', flexDirection: 'column', minHeight: 540, maxHeight: '80vh', overflow: 'hidden' } }}
    >
      {/* ===== 폼 뷰 (등록/수정) ===== */}
      {(viewMode === 'form-create' || viewMode === 'form-edit') && (
        <div className="flex flex-col gap-4 p-6 flex-1 overflow-y-auto">
          <Form form={form} layout="vertical">
            <Form.Item
              label="모음 이름"
              name="skillGroupName"
              rules={[
                { required: true, message: '필수' },
                { max: 200, message: '200자 이내' },
              ]}
            >
              <Input maxLength={200} placeholder="예: 일반상담 풀세트" />
            </Form.Item>
            <Form.Item
              label="설명"
              name="skillGroupDesc"
              rules={[
                { max: 512, message: '512자 이내로 입력하세요' },
                {
                  validator: (_, value: string | undefined) => {
                    if (!value) return Promise.resolve();
                    const trimmed = value.replace(/\s/g, '');
                    if (trimmed.length > 0 && trimmed.length <= 10) {
                      return Promise.reject(new Error('설명은 공백 제외 11자 이상 입력해주세요'));
                    }
                    return Promise.resolve();
                  },
                },
              ]}
            >
              <Input.TextArea rows={3} maxLength={512} showCount placeholder="용도 설명 (선택)" />
            </Form.Item>
          </Form>
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
            <Button onClick={backToList}>취소</Button>
            <Button type="primary" loading={submitting} onClick={onFormSubmit}>
              저장
            </Button>
          </div>
        </div>
      )}

      {/* ===== 목록 뷰 (트리 + 2그리드) ===== */}
      {viewMode === 'list' && (
        <div className="flex flex-1 min-h-0 overflow-hidden" style={{ minHeight: 480 }}>
          {/* ── 좌0: 업무그룹 트리 (스킬셋 필터, 읽기전용) ── */}
          <div className="flex flex-col flex-shrink-0 border-r border-gray-100 overflow-hidden" style={{ width: 240 }}>
            <div className="flex items-center px-4 border-b border-gray-100 bg-gray-50 h-[46px] flex-shrink-0">
              <span className="text-[12.5px] font-bold text-gray-700">업무그룹</span>
            </div>
            <div className="flex-1 min-h-0">
              <SkillsetGroupTree
                groups={groupTree}
                totalSkillsetCount={totalSkillsetCount}
                totalUnassignedCount={totalUnassignedCount}
                selectedTreeId={selectedTreeId}
                selectedTenantId={tenantIdParam ?? null}
                onSelect={setSelectedTreeId}
                onCreateChild={treeNoop}
                onEdit={treeNoop}
                onDelete={treeNoop}
                onSkillsetDrop={treeDropNoop}
                readOnly
              />
            </div>
          </div>

          {/* ── 좌: 전체 스킬셋 ── */}
          <div className="flex flex-col flex-1 min-w-0 border-r border-gray-100">
            {/* 좌측 헤더 */}
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-gray-50 h-[46px] flex-shrink-0">
              <span className="text-[12.5px] font-bold text-gray-700 flex-1">전체 스킬셋</span>
              <span className="text-[11.5px] text-gray-400">
                <span className="font-semibold text-[#405189]">{filteredLeft.length}</span>건
              </span>
              <div className="flex items-center gap-1 pl-2 border-l border-gray-200">
                <Search className="size-3.5 text-gray-400" />
                <Input
                  size="small"
                  allowClear
                  placeholder="스킬셋명 검색"
                  value={leftSearch}
                  onChange={(e) => setLeftSearch(e.target.value)}
                  style={{ width: 150, border: 'none', boxShadow: 'none', background: 'transparent', padding: '0 4px' }}
                />
              </div>
            </div>
            {/* 좌측 그리드 (ag-Grid 표준) — 더블클릭=모음 추가, 멀티셀렉트=→ 버튼으로 일괄 추가 */}
            <div className="flex-1 min-h-0">
              <AgGridReact<AvailableSkillsetResponse>
                rowData={filteredLeft}
                columnDefs={leftColumnDefs}
                defaultColDef={defaultColDef}
                rowSelection={multiRowSelection}
                gridOptions={stableGridOptions}
                getRowId={leftRowId}
                loading={skillsetsLoading}
                isRowSelectable={(node) => !!node.data && !memberSet.has(node.data.skillsetId)}
                rowClassRules={{ 'opacity-40': (p) => !!p.data && memberSet.has(p.data.skillsetId) }}
                onRowDoubleClicked={(e) => e.data && handleAddDblClick(e.data)}
                onSelectionChanged={(e) => handleLeftSelectionChanged(e.api.getSelectedRows())}
              />
            </div>
          </div>

          {/* ── 중: 전송 버튼 ── */}
          <div className="flex flex-col items-center justify-center gap-2.5 px-1 bg-gray-50 border-l border-r border-gray-100 flex-shrink-0" style={{ width: 50 }}>
            <button
              type="button"
              title="선택 항목 추가"
              disabled={leftChecked.size === 0}
              onClick={handleAddSelected}
              className="w-[34px] h-[34px] rounded-md border border-gray-200 bg-white text-[#405189] flex items-center justify-center text-base transition hover:bg-[#405189] hover:text-white hover:border-[#405189] disabled:opacity-30 disabled:cursor-not-allowed"
            >
              →
            </button>
            <button
              type="button"
              title="선택 항목 제거"
              disabled={rightChecked.size === 0}
              onClick={handleRemoveSelected}
              className="w-[34px] h-[34px] rounded-md border border-[#fca5a5] bg-white text-red-500 flex items-center justify-center text-base transition hover:bg-red-500 hover:text-white hover:border-red-500 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ←
            </button>
          </div>

          {/* ── 우: 모음 멤버 ── */}
          <div className="flex flex-col flex-shrink-0 overflow-hidden" style={{ width: 440 }}>
            {/* 우측 헤더 */}
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-[#eef0f7] h-[46px] flex-shrink-0">
              <span className="text-[12.5px] font-bold text-[#405189] flex-1">모음 멤버</span>
              <span className="text-[11.5px] text-gray-400">
                <span className="font-semibold text-[#405189]">{memberRows.length}</span>건
              </span>
            </div>
            {/* 모음 셀렉트 + 새 모음 버튼 */}
            <div className="flex items-center gap-2 px-3 py-1.5 border-b border-gray-100 flex-shrink-0 h-[42px]">
              <span className="text-xs text-gray-500 whitespace-nowrap">스킬모음</span>
              {groupsLoading ? (
                <Spin size="small" />
              ) : (
                <select
                  value={selectedGroupId ?? ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    const nextId = v === '' ? null : Number(v);
                    if (memberDirty) {
                      // 미저장 상태에서 다른 모음으로 전환 시 경고
                      Modal.confirm({
                        title: '저장하지 않은 변경사항',
                        content: '저장하지 않은 변경사항이 있습니다. 이동하시겠습니까?',
                        okText: '이동',
                        cancelText: '취소',
                        onOk: () => {
                          setSelectedGroupId(nextId);
                          setMemberDirty(false);
                          setRightChecked(new Set());
                        },
                      });
                      return;
                    }
                    setSelectedGroupId(nextId);
                    setMemberDirty(false);
                    setRightChecked(new Set());
                  }}
                  className="flex-1 h-7 px-2 border border-gray-200 rounded text-xs font-[inherit] text-gray-700 outline-none focus:border-[#405189]"
                >
                  <option value="">모음을 선택하세요</option>
                  {groups.map((g) => (
                    <option key={g.skillGroupId} value={g.skillGroupId}>
                      {g.skillGroupName} (스킬 {g.memberCount}건)
                    </option>
                  ))}
                </select>
              )}
              {/* 수정 버튼 */}
              {selectedGroup && (
                <button
                  type="button"
                  title="모음 이름/설명 수정"
                  onClick={() => openEditForm(selectedGroup)}
                  className="flex-shrink-0 text-xs px-2 h-7 border border-gray-200 rounded bg-white text-gray-500 hover:text-[#405189] hover:border-[#c5cbe0] transition"
                >
                  수정
                </button>
              )}
              {/* 새 모음 버튼 */}
              <Button size="small" icon={<Plus className="size-3" />} onClick={openCreateForm} title="새 모음 추가" />
            </div>
            {/* 우측 그리드 (ag-Grid 표준) — 멤버 P/L 인라인 편집 + 멀티셀렉트=← 버튼으로 일괄 제거 */}
            <div className="flex-1 min-h-0 relative">
              {selectedGroupId == null ? (
                <div className="flex items-center justify-center h-full text-xs text-gray-400">위에서 스킬모음을 선택하세요</div>
              ) : (
                <AgGridReact<MemberRow>
                  rowData={memberRows}
                  columnDefs={rightColumnDefs}
                  defaultColDef={defaultColDef}
                  rowSelection={multiRowSelection}
                  gridOptions={stableGridOptions}
                  getRowId={rightRowId}
                  loading={membersFetching}
                  onSelectionChanged={(e) => handleRightSelectionChanged(e.api.getSelectedRows())}
                />
              )}
            </div>
            {/* 우측 푸터 */}
            <div className="flex items-center gap-2 px-4 py-2.5 border-t border-gray-100 bg-gray-50 flex-shrink-0" style={{ background: 'rgba(30,41,59,0.06)' }}>
              <Button danger size="small" icon={<Trash2 className="size-3" />} disabled={selectedGroupId == null || isDeleting} loading={isDeleting} onClick={handleDeleteGroup}>
                모음 삭제
              </Button>
              <div className="flex-1" />
              <Button size="small" onClick={onClose}>
                닫기
              </Button>
              <Button type="primary" size="small" disabled={!memberDirty || selectedGroupId == null} loading={isSaving} onClick={handleSaveMembers}>
                저장
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

function extractMsg(err: unknown, fallback: string): string {
  return (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;
}
