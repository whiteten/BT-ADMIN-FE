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
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Form, Input, InputNumber, Modal, Spin } from 'antd';
import { ChevronLeft, Plus, Search, Trash2 } from 'lucide-react';
import { toast } from '@/shared-util';
import {
  useCreateSkillGroup,
  useDeleteSkillGroup,
  useGetAvailableSkillsets,
  useGetSkillGroupMembers,
  useGetSkillGroups,
  useUpdateSkillGroup,
} from '../hooks/useSkillAssignQueries';
import type { AvailableSkillsetResponse, SkillGroupMemberRequest, SkillGroupMemberResponse, SkillGroupResponse } from '../types';

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

  const filteredLeft = useMemo<AvailableSkillsetResponse[]>(() => {
    const kw = leftSearch.trim().toLowerCase();
    return availableSkillsets.filter((s) => {
      if (kw && !s.skillsetName.toLowerCase().includes(kw) && !String(s.skillsetId).includes(kw)) return false;
      return true;
    });
  }, [availableSkillsets, leftSearch]);

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

  // ── 좌측 체크박스 ─────────────────────────────────────────────────────────

  const handleLeftCheckAll = (checked: boolean) => {
    setLeftChecked(checked ? new Set(filteredLeft.map((s) => s.skillsetId)) : new Set());
  };

  const handleLeftCheck = (skillsetId: number, checked: boolean) => {
    setLeftChecked((prev) => {
      const next = new Set(prev);
      if (checked) next.add(skillsetId);
      else next.delete(skillsetId);
      return next;
    });
  };

  // ── 우측 체크박스 ─────────────────────────────────────────────────────────

  const handleRightCheckAll = (checked: boolean) => {
    setRightChecked(checked ? new Set(memberRows.map((m) => m.skillsetId)) : new Set());
  };

  const handleRightCheck = (skillsetId: number, checked: boolean) => {
    setRightChecked((prev) => {
      const next = new Set(prev);
      if (checked) next.add(skillsetId);
      else next.delete(skillsetId);
      return next;
    });
  };

  const submitting = isCreating || isUpdating;

  // ── 렌더 ─────────────────────────────────────────────────────────────────

  const selectedGroup = groups.find((g) => g.skillGroupId === selectedGroupId) ?? null;
  const leftAllChecked = filteredLeft.length > 0 && filteredLeft.every((s) => leftChecked.has(s.skillsetId));
  const leftSomeChecked = filteredLeft.some((s) => leftChecked.has(s.skillsetId)) && !leftAllChecked;
  const rightAllChecked = memberRows.length > 0 && memberRows.every((m) => rightChecked.has(m.skillsetId));
  const rightSomeChecked = memberRows.some((m) => rightChecked.has(m.skillsetId)) && !rightAllChecked;

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={1060}
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

      {/* ===== 목록 뷰 (2그리드) ===== */}
      {viewMode === 'list' && (
        <div className="flex flex-1 min-h-0 overflow-hidden" style={{ minHeight: 480 }}>
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
            {/* 좌측 그리드 */}
            <div className="flex-1 overflow-auto">
              {skillsetsLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Spin size="small" />
                </div>
              ) : (
                <table className="w-full border-collapse text-xs" style={{ fontSize: '12.5px' }}>
                  <thead>
                    <tr>
                      <th className="w-9 text-center bg-gray-50 px-2 py-1.5 border-b border-gray-200 sticky top-0">
                        <input
                          type="checkbox"
                          checked={leftAllChecked}
                          ref={(el) => {
                            if (el) el.indeterminate = leftSomeChecked;
                          }}
                          onChange={(e) => handleLeftCheckAll(e.target.checked)}
                        />
                      </th>
                      <th className="text-left bg-gray-50 px-2.5 py-1.5 border-b border-gray-200 sticky top-0 font-semibold text-gray-500 whitespace-nowrap min-w-[130px]">
                        스킬셋명
                      </th>
                      <th className="text-left bg-gray-50 px-2.5 py-1.5 border-b border-gray-200 sticky top-0 font-semibold text-gray-500 whitespace-nowrap min-w-[80px]">
                        업무그룹
                      </th>
                      <th className="text-left bg-gray-50 px-2.5 py-1.5 border-b border-gray-200 sticky top-0 font-semibold text-gray-500 whitespace-nowrap w-[90px]">테넌트</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeft.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-8 text-gray-400 text-xs">
                          검색된 데이터가 없습니다
                        </td>
                      </tr>
                    ) : (
                      filteredLeft.map((s) => {
                        const alreadyMember = memberSet.has(s.skillsetId);
                        return (
                          <tr
                            key={s.skillsetId}
                            onDoubleClick={() => handleAddDblClick(s)}
                            className={`cursor-pointer border-b border-gray-100 transition ${alreadyMember ? 'opacity-40' : 'hover:bg-[#fafbfd]'}`}
                          >
                            <td className="text-center px-2 py-1.5">
                              <input
                                type="checkbox"
                                checked={leftChecked.has(s.skillsetId)}
                                disabled={alreadyMember}
                                onChange={(e) => handleLeftCheck(s.skillsetId, e.target.checked)}
                              />
                            </td>
                            <td className="px-2.5 py-1.5 max-w-[160px] truncate" title={s.skillsetName}>
                              {s.skillsetName}
                            </td>
                            <td className="px-2.5 py-1.5 text-gray-500">—</td>
                            <td className="px-2.5 py-1.5 text-gray-500 truncate">{s.tenantName ?? '-'}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              )}
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
            {/* 우측 그리드 */}
            <div className="flex-1 overflow-auto relative">
              {membersFetching ? (
                <div className="flex items-center justify-center py-10">
                  <Spin size="small" />
                </div>
              ) : (
                <table className="w-full border-collapse" style={{ fontSize: '12.5px' }}>
                  <colgroup>
                    <col style={{ width: 36 }} />
                    <col />
                    <col style={{ width: 72 }} />
                    <col style={{ width: 72 }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th className="text-center bg-gray-50 px-2 py-1.5 border-b border-gray-200 sticky top-0">
                        <input
                          type="checkbox"
                          checked={rightAllChecked}
                          ref={(el) => {
                            if (el) el.indeterminate = rightSomeChecked;
                          }}
                          onChange={(e) => handleRightCheckAll(e.target.checked)}
                        />
                      </th>
                      <th className="text-left bg-gray-50 px-2.5 py-1.5 border-b border-gray-200 sticky top-0 font-semibold text-gray-500 whitespace-nowrap">스킬셋명</th>
                      <th className="text-center bg-gray-50 px-1 py-1.5 border-b border-gray-200 sticky top-0 font-semibold text-gray-500 whitespace-nowrap">우선순위</th>
                      <th className="text-center bg-gray-50 px-1 py-1.5 border-b border-gray-200 sticky top-0 font-semibold text-gray-500 whitespace-nowrap">스킬레벨</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedGroupId == null ? (
                      <tr>
                        <td colSpan={4} className="text-center py-8 text-xs text-gray-400">
                          위에서 스킬모음을 선택하세요
                        </td>
                      </tr>
                    ) : memberRows.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-8 text-xs text-gray-400">
                          검색된 데이터가 없습니다
                        </td>
                      </tr>
                    ) : (
                      memberRows.map((m) => (
                        <tr key={m.skillsetId} className="border-b border-gray-100 hover:bg-[#fafbfd]">
                          <td className="text-center px-2 py-1">
                            <input type="checkbox" checked={rightChecked.has(m.skillsetId)} onChange={(e) => handleRightCheck(m.skillsetId, e.target.checked)} />
                          </td>
                          <td className="px-2.5 py-1 truncate max-w-[160px]" title={m.skillsetName}>
                            {m.skillsetName}
                          </td>
                          <td className="px-1 py-1 text-center">
                            <InputNumber
                              min={0}
                              max={9}
                              value={m.priority}
                              onChange={(v) => handleUpdateMember(m.skillsetId, 'priority', v)}
                              size="small"
                              style={{ width: 56, textAlign: 'center' }}
                            />
                          </td>
                          <td className="px-1 py-1 text-center">
                            <InputNumber
                              min={0}
                              max={99}
                              value={m.skillLevel}
                              onChange={(v) => handleUpdateMember(m.skillsetId, 'skillLevel', v)}
                              size="small"
                              style={{ width: 56, textAlign: 'center' }}
                            />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
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
