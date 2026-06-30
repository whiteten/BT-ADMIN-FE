/**
 * IVR 시나리오 목록 페이지.
 *
 * <p>시나리오 마스터 카드 그리드를 표시하고, 카드 클릭 시 상세 페이지로 이동한다.</p>
 * <p>FCA BotList 패턴 적용 — 시나리오 목록과 버전 관리를 별도 페이지로 분리.</p>
 */
import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { type BreadcrumbProps, Button, Empty, Input, Select } from 'antd';
import { ListChecks, Plus } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import ScenarioAssignedStatusModal, { type ScenarioAssignedStatusModalRef } from '../../features/scenario/components/ScenarioAssignedStatusModal';
import ScenarioCard from '../../features/scenario/components/ScenarioCard';
import ScenarioDeploySidebar from '../../features/scenario/components/ScenarioDeploySidebar';
import ScenarioMasterSheet, { type ScenarioMasterSheetRef } from '../../features/scenario/components/ScenarioMasterSheet';
import ScenarioTypeMultiSelect from '../../features/scenario/components/ScenarioTypeMultiSelect';
import { scenarioQueryKeys, useDeleteScenario, useGetScenarios } from '../../features/scenario/hooks/useScenarioQueries';
import { APPLY_STATUS, type Scenario, type ScenarioType } from '../../features/scenario/types';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb: BreadcrumbProps['items'] = [{ title: '시나리오 관리' }, { title: '시나리오/버전 관리', path: '/ivr/scenario/list' }];

type DeployFilter = 'applied' | 'reserved' | 'fail' | 'none';
const DEPLOY_FILTER_OPTIONS: { label: string; value: DeployFilter }[] = [
  { label: '배포', value: 'applied' },
  { label: '예약', value: 'reserved' },
  { label: '실패', value: 'fail' },
  { label: '미배포', value: 'none' },
];
const DEPLOY_FAIL_STATUSES: number[] = [APPLY_STATUS.SEND_FAIL, APPLY_STATUS.CMD_FAIL, APPLY_STATUS.APPLY_FAIL];

/** 배포여부 필터 매칭 — 선택된 분류 중 하나라도 시나리오의 시스템 상태와 일치하면 통과(OR). */
function matchesDeployFilter(s: Scenario, sel: DeployFilter[]): boolean {
  if (sel.length === 0) return true;
  const ds = s.deploySystems ?? [];
  if (sel.includes('none') && ds.length === 0) return true;
  return ds.some((d) => {
    const st = d.applyStatus;
    if (sel.includes('applied') && (st === APPLY_STATUS.APPLIED || (st == null && d.serviceVer))) return true;
    if (sel.includes('reserved') && st === APPLY_STATUS.PENDING) return true;
    if (sel.includes('fail') && st != null && DEPLOY_FAIL_STATUSES.includes(st)) return true;
    return false;
  });
}

export default function ScenarioList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const modal = useModal();
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const [selectedTypes, setSelectedTypes] = useState<ScenarioType[]>([]);
  const [selectedDeploy, setSelectedDeploy] = useState<DeployFilter[]>([]);
  const [searchText, setSearchText] = useState('');
  const masterSheetRef = useRef<ScenarioMasterSheetRef>(null);
  const assignedStatusRef = useRef<ScenarioAssignedStatusModalRef>(null);
  // 목록에서 바로 배포(카드 '배포' 버튼) — 사이드바에 버전 드롭다운(기본 최신) 표시
  const [deploySidebar, setDeploySidebar] = useState<{ open: boolean; serviceId: number | null }>({ open: false, serviceId: null });
  // 신규 등록 직후 그 카드로 스크롤 + 하이라이트
  const pendingFocusIdRef = useRef<number | null>(null);
  const [focusedId, setFocusedId] = useState<number | null>(null);

  const queryParams = useMemo(() => {
    const params: Record<string, unknown> = {};
    if (selectedTypes.length > 0) params.types = selectedTypes.join(',');
    if (searchText.trim()) params.keyword = searchText.trim();
    return params;
  }, [selectedTypes, searchText]);

  const { data: scenarios = [] } = useGetScenarios({ params: queryParams });

  // 배포여부 필터는 클라이언트 측(목록 응답의 deploySystems 기준)
  // 정렬: serviceId 내림차순(최신순) — 새로 추가한 시나리오가 항상 맨 위에 노출되도록(수정해도 자리 고정)
  const filteredScenarios = useMemo(() => scenarios.filter((s) => matchesDeployFilter(s, selectedDeploy)).sort((a, b) => b.serviceId - a.serviceId), [scenarios, selectedDeploy]);

  // 신규 등록 후 목록이 갱신되어 새 카드가 나타나면 그 카드로 스크롤 + 잠시 하이라이트
  useEffect(() => {
    const id = pendingFocusIdRef.current;
    if (id == null || !filteredScenarios.some((s) => s.serviceId === id)) return;
    pendingFocusIdRef.current = null;
    setFocusedId(id);
    requestAnimationFrame(() => {
      document.getElementById(`scenario-card-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    const t = setTimeout(() => setFocusedId(null), 2500);
    return () => clearTimeout(t);
  }, [filteredScenarios]);

  const { mutate: deleteMutate } = useDeleteScenario({
    mutationOptions: {
      onSuccess: () => {
        toast.success('시나리오가 삭제되었습니다.');
        queryClient.invalidateQueries({ queryKey: scenarioQueryKeys.getScenarios._def });
      },
    },
  });

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => setSearchText(e.target.value);

  const handleDetail = useCallback(
    (serviceId: number) => {
      navigate(`../${serviceId}`);
    },
    [navigate],
  );

  const handleDelete = useCallback(
    (s: Scenario) => {
      modal.confirm.delete({
        onOk: () => deleteMutate({ serviceId: s.serviceId }),
        options: {
          title: '시나리오 삭제',
          content: `"${s.serviceName}" 시나리오를 삭제하시겠습니까?\n버전이 1개 이상 있으면 삭제 불가입니다.`,
        },
      });
    },
    [modal, deleteMutate],
  );

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      {/* ===== 상단 헤더 ===== */}
      <div className="flex items-center gap-3 px-7 py-5 h-[76px] bg-white bt-shadow">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">시나리오 타입</span>
          <ScenarioTypeMultiSelect value={selectedTypes} onChange={setSelectedTypes} />
        </div>
        <div className="ml-2 flex items-center gap-2">
          <span className="text-sm text-gray-600">배포 여부</span>
          <Select<DeployFilter[]>
            mode="multiple"
            placeholder="전체"
            value={selectedDeploy}
            onChange={setSelectedDeploy}
            options={DEPLOY_FILTER_OPTIONS}
            maxTagCount="responsive"
            allowClear
            style={{ minWidth: 200 }}
          />
        </div>
        <div className="ml-2 flex items-center gap-2">
          <span className="text-sm text-gray-600">시나리오명</span>
          <Input allowClear placeholder="검색어를 입력하세요." value={searchText} onChange={handleSearchChange} style={{ width: 240 }} />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button color="blue" variant="filled" icon={<ListChecks className="size-3.5" />} onClick={() => assignedStatusRef.current?.open()}>
            시스템별 할당 현황
          </Button>
          <Button type="primary" icon={<Plus className="size-3.5" />} onClick={() => masterSheetRef.current?.open()}>
            시나리오 추가
          </Button>
        </div>
      </div>

      {/* ===== 카드 그리드 ===== */}
      {filteredScenarios.length === 0 ? (
        <div className="flex items-center justify-center w-full h-full bg-white bt-shadow">
          <div className="flex flex-col items-center justify-center text-gray-400 gap-3">
            <Empty description={false} styles={{ image: { height: 60 } }} />
            <span className="text-sm">조건에 맞는 시나리오가 없습니다</span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(350px,1fr))] gap-4 w-full overflow-y-auto">
          {filteredScenarios.map((s) => (
            <ScenarioCard
              key={s.serviceId}
              scenario={s}
              highlighted={focusedId === s.serviceId}
              onDetail={handleDetail}
              onDelete={handleDelete}
              onShowAssigned={() => assignedStatusRef.current?.open(s.serviceId, s.serviceName)}
              onDeploy={() => setDeploySidebar({ open: true, serviceId: s.serviceId })}
            />
          ))}
        </div>
      )}

      {/* Sheets */}
      <ScenarioMasterSheet
        ref={masterSheetRef}
        onSuccess={(createdId) => {
          queryClient.invalidateQueries({ queryKey: scenarioQueryKeys.getScenarios._def });
          if (createdId != null) pendingFocusIdRef.current = createdId;
        }}
      />
      <ScenarioAssignedStatusModal ref={assignedStatusRef} />
      <ScenarioDeploySidebar
        open={deploySidebar.open}
        serviceId={deploySidebar.serviceId ?? 0}
        selectedVersion={null}
        enableVersionPicker
        onPublished={() => queryClient.invalidateQueries({ queryKey: scenarioQueryKeys.getScenarios._def })}
        onClose={() => setDeploySidebar({ open: false, serviceId: null })}
      />
    </div>
  );
}
